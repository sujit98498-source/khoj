// lib/collaboration/roomMutations.ts
// Client-side Firestore mutations for Collaboration Rooms.
// These run directly on the client where security rules are sufficient.
// Complex multi-document transitions should use Cloud Functions (functions/src/).

import {
  collection,
  doc,
  getDoc,
  setDoc,
  addDoc,
  updateDoc,
  deleteDoc,
  serverTimestamp,
  increment,
  writeBatch,
  Timestamp,
} from 'firebase/firestore'
import { db } from '@/lib/firebase/config'
import { COLLAB_COLLECTIONS as C } from './collabCollections'
import { slugify, permissionsForRole } from './roomTypes'
import type {
  CollabRoom,
  StartupRole,
  RoleApplication,
  CompensationPreference,
  JoinRequest,
  StartupInvite,
  Milestone,
  StartupProfile,
  UserRoomMembership,
  RoomMember,
  CreateStartupRoomPayload,
  SubmitJoinRequestPayload,
  SendInvitePayload,
  CreateSessionPayload,
  RoomType,
  RoomVisibility,
  MilestoneStatus,
  StartupProfile as SP,
} from '@/types/collaboration'

// ── Publish a role as an Opportunity Market listing ───────────────────────────
async function publishRoleAsOpportunity(
  roomId: string,
  roleId: string,
  role: Omit<StartupRole, 'id' | 'createdAt' | 'updatedAt' | 'seatsFilled' | 'createdBy'>,
  meta: { roomTitle: string; founderName: string; founderUid: string; stage?: string; locationMode?: string },
  now: ReturnType<typeof serverTimestamp>,
): Promise<string> {
  const oppRef = doc(collection(db, 'opportunities'))
  const oppData: Record<string, unknown> = {
    type: role.roleType === 'cofounder' ? 'cofounder' : 'startup_job',
    sourceType: 'startup_room_role',
    roomId,
    roleId,
    startupName: meta.roomTitle,
    title: role.title,
    description: role.description,
    startupStage: meta.stage ?? null,
    category: role.category ?? '',
    skillsRequired: role.mustHaveSkills ?? [],
    compensationType: role.compensationType ?? 'equity',
    equityRange: role.equityRange ?? null,
    weeklyCommitment: role.weeklyCommitment ?? null,
    remoteAllowed: meta.locationMode === 'remote',
    postedBy: meta.founderUid,
    postedByName: meta.founderName,
    status: 'open',
    createdAt: now,
    updatedAt: now,
  }
  await setDoc(oppRef, oppData)
  return oppRef.id
}

// ── Create startup room (client-side; prefer Cloud Function for atomicity) ─────
export async function createStartupRoom(
  userId: string,
  displayName: string,
  avatarUrl: string,
  payload: CreateStartupRoomPayload,
): Promise<string> {
  const now = serverTimestamp()
  const slug = slugify(payload.title)

  const roomRef = doc(collection(db, C.ROOMS))
  const roomId = roomRef.id

  const roomData: Omit<CollabRoom, 'id'> = {
    title:                    payload.title,
    slug,
    roomType:                 'startup',
    visibility:               payload.visibility,
    status:                   'active',
    createdBy:                userId,
    summary:                  payload.summary,
    coverImageUrl:            payload.coverImageUrl ?? null,
    tags:                     payload.tags ?? [],
    memberCount:              1,
    openRoleCount:            0,   // createStartupRole will increment if createDefaultRole is true
    pendingJoinRequestCount:  0,
    currentLiveSessionId:     null,
    isRecruiting:             true,
    founderName:              displayName || undefined,
    lastActivityAt:           now as unknown as Timestamp,
    createdAt:                now as unknown as Timestamp,
    updatedAt:                now as unknown as Timestamp,
    startup:                  payload.startup,
    visibilityMode:           payload.visibilityMode ?? 'public_preview',
    protectedDetailsEnabled:  payload.protectedDetailsEnabled ?? true,
    privateFilesEnabled:      payload.privateFilesEnabled ?? false,
  }

  const batch = writeBatch(db)

  // Room doc
  batch.set(roomRef, roomData)

  // Owner member doc
  const memberRef = doc(db, C.ROOMS, roomId, C.MEMBERS, userId)
  const member: Omit<RoomMember, 'id'> = {
    userId,
    roomRole: 'owner',
    status: 'active',
    permissions: permissionsForRole('owner'),
    joinedAt: now as unknown as Timestamp,
    joinedVia: 'create',
    profileSnapshot: { displayName, avatarUrl, roleCategories: [] },
  }
  batch.set(memberRef, member)

  // User membership index
  const membershipRef = doc(db, 'users', userId, C.ROOM_MEMBERSHIPS, roomId)
  const membership: UserRoomMembership = {
    roomId,
    title: payload.title,
    ...(payload.coverImageUrl ? { coverImageUrl: payload.coverImageUrl } : {}),
    roomType: 'startup',
    roomRole: 'owner',
    status: 'active',
    joinedAt: now as unknown as Timestamp,
  }
  batch.set(membershipRef, membership)

  await batch.commit()

  // Create default role in a separate write AFTER the batch commits.
  // This is required because Firestore rules evaluate each write against the
  // *committed* database state, not the batch. The roles rule checks for an
  // existing member doc — which is written in the batch above and only becomes
  // readable by rules after batch.commit() resolves.
  if (payload.createDefaultRole) {
    const defaultRoleSnippet: Omit<StartupRole, 'id' | 'createdAt' | 'updatedAt' | 'seatsFilled' | 'createdBy'> = {
      title:        payload.defaultRoleTitle || 'Co-founder',
      category:     payload.defaultRoleCategory || 'Engineering',
      roleType:     'cofounder',
      seats:        1,
      status:       'open',
      description:  payload.defaultRoleDescription || 'Looking for a technical co-founder.',
      publishToMarket: payload.publishDefaultRoleToMarket ?? false,
    }
    await createStartupRole(roomId, userId, defaultRoleSnippet, {
      roomTitle:    payload.title,
      founderName:  displayName,
      founderUid:   userId,
      stage:        payload.startup?.stage,
      locationMode: payload.startup?.locationMode,
    })
  }

  return roomId
}

// ── Create a role ─────────────────────────────────────────────────────────────
export interface RolePublishMeta {
  roomTitle: string
  founderName: string
  founderUid: string
  stage?: string
  locationMode?: string
}

export async function createStartupRole(
  roomId: string,
  creatorId: string,
  role: Omit<StartupRole, 'id' | 'createdAt' | 'updatedAt' | 'seatsFilled' | 'createdBy'>,
  publishMeta?: RolePublishMeta,
): Promise<string> {
  if (!role.title?.trim()) throw new Error('Role title is required')
  if (!role.description?.trim()) throw new Error('Role description is required')

  const now = serverTimestamp()
  const roleRef = doc(collection(db, C.ROOMS, roomId, C.ROLES))
  const roleId  = roleRef.id

  const roleData: Record<string, unknown> = {
    ...role,
    seatsFilled: 0,
    createdBy: creatorId,
    createdAt: now,
    updatedAt: now,
  }

  // Publish to Opportunity Market if requested
  if (role.publishToMarket && publishMeta) {
    try {
      const oppId = await publishRoleAsOpportunity(roomId, roleId, role, publishMeta, now)
      roleData.opportunityId = oppId
    } catch (err) {
      console.warn('createStartupRole: opportunity publish failed (non-critical)', err)
    }
  }

  await setDoc(roleRef, roleData)

  // Update open role count on the room
  await updateDoc(doc(db, C.ROOMS, roomId), {
    openRoleCount: increment(1),
    updatedAt: now,
  })

  return roleId
}

// ── Submit role application ───────────────────────────────────────────────────
export async function submitRoleApplication(
  roomId: string,
  applicantId: string,
  applicantName: string,
  applicantPhoto: string,
  roleId: string,
  roleTitle: string,
  message: string,
  portfolioLink: string,
  skills: string[],
  weeklyCommitment?: number,
  compensationPreference?: CompensationPreference,
  introVideoLink?: string,
): Promise<string> {
  const now = serverTimestamp()
  const payload: Record<string, unknown> = {
    roleId,
    roleTitle,
    applicantId,
    applicantName,
    applicantPhoto,
    message,
    portfolioLink,
    skills,
    status: 'pending',
    createdAt: now,
    decidedAt: null,
    decidedBy: null,
  }
  if (weeklyCommitment != null)       payload.weeklyCommitment       = weeklyCommitment
  if (compensationPreference != null) payload.compensationPreference = compensationPreference
  if (introVideoLink?.trim())         payload.introVideoLink         = introVideoLink.trim()

  const ref = await addDoc(collection(db, C.ROOMS, roomId, C.ROLE_APPLICATIONS), payload)
  console.log('Role application submitted', { id: ref.id, roomId, roleId, applicantId })
  return ref.id
}

// ── Review role application (accept / reject) ─────────────────────────────────
export async function reviewRoleApplication(
  roomId: string,
  applicationId: string,
  applicantId: string,
  roleId: string,
  applicantName: string,
  applicantPhoto: string,
  roleTitle: string,
  action: 'accept' | 'reject',
  reviewerId: string,
  roomTitle?: string,
): Promise<void> {
  const now = serverTimestamp()
  const batch = writeBatch(db)

  // 1. Update application status
  batch.update(doc(db, C.ROOMS, roomId, C.ROLE_APPLICATIONS, applicationId), {
    status: action === 'accept' ? 'accepted' : 'rejected',
    decidedAt: now,
    decidedBy: reviewerId,
  })

  if (action === 'accept') {
    // 2. Create member doc as co-founder
    batch.set(doc(db, C.ROOMS, roomId, C.MEMBERS, applicantId), {
      userId: applicantId,
      roomRole: 'cofounder',
      status: 'active',
      permissions: permissionsForRole('cofounder'),
      joinedAt: now,
      joinedVia: 'application',
      profileSnapshot: {
        displayName: applicantName,
        avatarUrl: applicantPhoto,
        roleCategories: [],
      },
      functionalRole: roleTitle,
      joinedFromApplicationId: applicationId,
      approvedBy: reviewerId,
    })

    // 3. Increment room memberCount
    batch.update(doc(db, C.ROOMS, roomId), {
      memberCount: increment(1),
      updatedAt: now,
    })
  }

  await batch.commit()

  if (action === 'accept') {
    // 4. Write user roomMembership index (own-user write, must be after batch)
    await setDoc(doc(db, 'users', applicantId, C.ROOM_MEMBERSHIPS, roomId), {
      roomId,
      title: roomTitle ?? '',
      roomType: 'startup' as const,
      roomRole: 'cofounder' as const,
      status: 'active' as const,
      joinedAt: now,
    })

    // 5. Update role seatsFilled; close role if all seats now filled
    try {
      const roleRef  = doc(db, C.ROOMS, roomId, C.ROLES, roleId)
      const roleSnap = await getDoc(roleRef)
      if (roleSnap.exists()) {
        const rd          = roleSnap.data() as { seats: number; seatsFilled: number; opportunityId?: string }
        const newFilled   = (rd.seatsFilled ?? 0) + 1
        const shouldClose = newFilled >= (rd.seats ?? 1)
        await updateDoc(roleRef, {
          seatsFilled: increment(1),
          ...(shouldClose ? { status: 'closed' } : {}),
          updatedAt: now,
        })
        if (shouldClose) {
          await updateDoc(doc(db, C.ROOMS, roomId), {
            openRoleCount: increment(-1),
            updatedAt: now,
          })
          // Close the linked opportunity listing if the role is now full
          if (rd.opportunityId) {
            try {
              await updateDoc(doc(db, 'opportunities', rd.opportunityId), {
                status: 'closed',
                updatedAt: now,
              })
            } catch (_e) {
              console.warn('reviewRoleApplication: failed to close opportunity', _e)
            }
          }
        }
      }
    } catch (err) {
      // Non-critical — log and continue
      console.warn('reviewRoleApplication: failed to update role seatsFilled', err)
    }

    // 6. Write portfolio activity for the accepted applicant
    try {
      const activityRef = doc(collection(db, 'users', applicantId, 'portfolioActivities'))
      await setDoc(activityRef, {
        type: 'startup_role_accepted',
        roomId,
        startupName: roomTitle ?? '',
        roleTitle,
        createdAt: now,
      })
    } catch (_e) {
      console.warn('reviewRoleApplication: portfolio activity write failed (non-critical)', _e)
    }
  }
}

// ── Submit join request ───────────────────────────────────────────────────────
export async function submitJoinRequest(
  userId: string,
  userSnapshot: RoomMember['profileSnapshot'],
  payload: SubmitJoinRequestPayload,
): Promise<string> {
  const now = serverTimestamp()
  const ref = await addDoc(
    collection(db, C.ROOMS, payload.roomId, C.JOIN_REQUESTS),
    {
      userId,
      roleId: payload.roleId ?? null,
      requestType: payload.requestType,
      status: 'pending',
      message: payload.message,
      links: payload.links ?? [],
      proofSnapshot: payload.proofSnapshot ?? null,
      userSnapshot,
      createdAt: now,
      updatedAt: now,
      respondedAt: null,
      expiresAt: null,
    } as Omit<JoinRequest, 'id'> & Record<string, unknown>,
  )

  await updateDoc(doc(db, C.ROOMS, payload.roomId), {
    pendingJoinRequestCount: increment(1),
    updatedAt: now,
  })

  return ref.id
}

// ── Withdraw join request ─────────────────────────────────────────────────────
export async function withdrawJoinRequest(roomId: string, requestId: string): Promise<void> {
  const now = serverTimestamp()
  await updateDoc(doc(db, C.ROOMS, roomId, C.JOIN_REQUESTS, requestId), {
    status: 'withdrawn',
    updatedAt: now,
  })
  await updateDoc(doc(db, C.ROOMS, roomId), {
    pendingJoinRequestCount: increment(-1),
    updatedAt: now,
  })
}

// ── Send invite ───────────────────────────────────────────────────────────────
export async function sendStartupInvite(
  sentBy: string,
  room: Pick<CollabRoom, 'id' | 'title' | 'summary' | 'coverImageUrl'>,
  role: { id: string; title: string; category: string; roleType: string } | null,
  payload: SendInvitePayload,
): Promise<string> {
  const now = serverTimestamp()
  const ref = await addDoc(
    collection(db, C.ROOMS, room.id, C.INVITES),
    {
      targetUserId: payload.targetUserId,
      roleId: payload.roleId ?? null,
      sentBy,
      status: 'pending',
      message: payload.message ?? '',
      roomSnapshot: {
        title: room.title,
        summary: room.summary,
        ...(room.coverImageUrl ? { coverImageUrl: room.coverImageUrl } : {}),
      },
      roleSnapshot: role
        ? { title: role.title, category: role.category, roleType: role.roleType }
        : null,
      createdAt: now,
      updatedAt: now,
      respondedAt: null,
      expiresAt: null,
    } as Omit<StartupInvite, 'id'> & Record<string, unknown>,
  )
  return ref.id
}

// ── Respond to invite (client-side; prefer Cloud Function for atomicity) ───────
export async function respondToInvite(
  userId: string,
  roomId: string,
  inviteId: string,
  action: 'accept' | 'decline',
  invite: StartupInvite,
  userSnapshot: RoomMember['profileSnapshot'],
): Promise<void> {
  const now = serverTimestamp()
  const batch = writeBatch(db)

  batch.update(doc(db, C.ROOMS, roomId, C.INVITES, inviteId), {
    status: action === 'accept' ? 'accepted' : 'declined',
    respondedAt: now,
    updatedAt: now,
  })

  if (action === 'accept') {
    const role = invite.roleSnapshot?.roleType ?? 'member'
    const roomRole = role === 'cofounder' ? 'cofounder' : 'member'

    batch.set(doc(db, C.ROOMS, roomId, C.MEMBERS, userId), {
      userId,
      roomRole,
      status: 'active',
      permissions: permissionsForRole(roomRole as 'cofounder' | 'member'),
      joinedAt: now,
      joinedVia: 'invite',
      profileSnapshot: userSnapshot,
    })

    batch.set(doc(db, 'users', userId, C.ROOM_MEMBERSHIPS, roomId), {
      roomId,
      title: invite.roomSnapshot?.title ?? '',
      ...(invite.roomSnapshot?.coverImageUrl ? { coverImageUrl: invite.roomSnapshot.coverImageUrl } : {}),
      roomType: 'startup' as RoomType,
      roomRole,
      status: 'active',
      joinedAt: now,
    })

    batch.update(doc(db, C.ROOMS, roomId), {
      memberCount: increment(1),
      updatedAt: now,
    })
  }

  await batch.commit()
}

// ── Revoke invite ─────────────────────────────────────────────────────────────
export async function revokeInvite(roomId: string, inviteId: string): Promise<void> {
  await updateDoc(doc(db, C.ROOMS, roomId, C.INVITES, inviteId), {
    status: 'revoked',
    updatedAt: serverTimestamp(),
  })
}

// ── Update room ───────────────────────────────────────────────────────────────
export async function updateCollabRoom(
  roomId: string,
  updates: Partial<Pick<CollabRoom, 'title' | 'summary' | 'coverImageUrl' | 'tags' | 'isRecruiting' | 'startup' | 'visibility'>>,
): Promise<void> {
  await updateDoc(doc(db, C.ROOMS, roomId), {
    ...updates,
    updatedAt: serverTimestamp(),
    lastActivityAt: serverTimestamp(),
  })
}

// ── Create session ────────────────────────────────────────────────────────────
export async function createStartupSession(
  creatorId: string,
  roomId: string,
  payload: CreateSessionPayload,
): Promise<{ sessionId: string; liveKitRoomName: string }> {
  const now = serverTimestamp()
  const sessionRef = doc(collection(db, C.ROOMS, roomId, C.SESSIONS))
  const sessionId = sessionRef.id
  const liveKitRoomName = `startup_${roomId}_${sessionId}`.slice(0, 64)

  const batch = writeBatch(db)
  batch.set(sessionRef, {
    title:          payload.title,
    sessionType:    payload.sessionType,
    status:         'scheduled',
    createdBy:      creatorId,
    liveKitRoomName,
    startsAt:       payload.startsAt ? new Date(payload.startsAt) : null,
    endedAt:        null,
    participantCount: 0,
    createdAt:      now,
  })

  batch.update(doc(db, C.ROOMS, roomId), {
    currentLiveSessionId: sessionId,
    lastActivityAt: now,
    updatedAt: now,
  })

  await batch.commit()
  return { sessionId, liveKitRoomName }
}

// ── End session ───────────────────────────────────────────────────────────────
export async function endStartupSession(roomId: string, sessionId: string): Promise<void> {
  const now = serverTimestamp()
  const batch = writeBatch(db)
  batch.update(doc(db, C.ROOMS, roomId, C.SESSIONS, sessionId), {
    status: 'ended',
    endedAt: now,
  })
  batch.update(doc(db, C.ROOMS, roomId), {
    currentLiveSessionId: null,
    updatedAt: now,
  })
  await batch.commit()
}

// ── Milestones ────────────────────────────────────────────────────────────────
export async function createMilestone(
  roomId: string,
  creatorId: string,
  data: Pick<Milestone, 'title' | 'description' | 'ownerIds' | 'dueAt'>,
): Promise<string> {
  const now = serverTimestamp()
  const ref = await addDoc(collection(db, C.ROOMS, roomId, C.MILESTONES), {
    ...data,
    status: 'todo' as MilestoneStatus,
    createdBy: creatorId,
    createdAt: now,
    updatedAt: now,
  })
  return ref.id
}

export async function updateMilestoneStatus(
  roomId: string,
  milestoneId: string,
  status: MilestoneStatus,
): Promise<void> {
  await updateDoc(doc(db, C.ROOMS, roomId, C.MILESTONES, milestoneId), {
    status,
    updatedAt: serverTimestamp(),
  })
}

// ── Startup profile upsert ────────────────────────────────────────────────────
export async function upsertStartupProfile(
  userId: string,
  profile: Omit<SP, 'userId' | 'updatedAt'>,
): Promise<void> {
  await setDoc(
    doc(db, C.STARTUP_PROFILES, userId),
    { ...profile, userId, updatedAt: serverTimestamp() },
    { merge: true },
  )
}

// ── Delete room (soft delete) ─────────────────────────────────────────────────
export async function softDeleteRoom(roomId: string): Promise<void> {
  await updateDoc(doc(db, C.ROOMS, roomId), {
    status: 'deleted',
    updatedAt: serverTimestamp(),
  })
}

// ── Review join request (client-side fallback) ────────────────────────────────
export async function reviewJoinRequest(
  roomId: string,
  requestId: string,
  action: 'accept' | 'decline',
  userId: string,
): Promise<void> {
  const now = serverTimestamp()
  const batch = writeBatch(db)

  batch.update(doc(db, C.ROOMS, roomId, C.JOIN_REQUESTS, requestId), {
    status: action === 'accept' ? 'accepted' : 'declined',
    respondedAt: now,
    updatedAt: now,
  })

  if (action === 'accept') {
    const memberRef = doc(db, C.ROOMS, roomId, C.MEMBERS, userId)
    batch.set(memberRef, {
      userId,
      roomRole: 'member',
      status: 'active',
      permissions: permissionsForRole('member'),
      joinedAt: now,
      updatedAt: now,
      profileSnapshot: {},
      inviteId: null,
      requestId,
    })
    batch.update(doc(db, C.ROOMS, roomId), {
      memberCount: increment(1),
      pendingJoinRequestCount: increment(-1),
      updatedAt: now,
    })
  } else {
    batch.update(doc(db, C.ROOMS, roomId), {
      pendingJoinRequestCount: increment(-1),
      updatedAt: now,
    })
  }

  await batch.commit()
}

// ── Submit access request ─────────────────────────────────────────────────────
export async function submitAccessRequest(
  roomId: string,
  userId: string,
  userName: string,
  userPhoto: string,
  reason: string,
): Promise<string> {
  const now = serverTimestamp()
  const ref = await addDoc(collection(db, C.ROOMS, roomId, C.ACCESS_REQUESTS), {
    userId,
    userName,
    userPhoto,
    reason,
    status: 'pending',
    createdAt: now,
    decidedAt: null,
    decidedBy: null,
  })
  return ref.id
}

// ── Review access request ─────────────────────────────────────────────────────
export async function reviewAccessRequest(
  roomId: string,
  requestId: string,
  applicantId: string,
  action: 'accept' | 'reject',
  reviewerId: string,
): Promise<void> {
  const now = serverTimestamp()
  const batch = writeBatch(db)

  batch.update(doc(db, C.ROOMS, roomId, C.ACCESS_REQUESTS, requestId), {
    status: action === 'accept' ? 'accepted' : 'rejected',
    decidedAt: now,
    decidedBy: reviewerId,
  })

  if (action === 'accept') {
    batch.set(doc(db, C.ROOMS, roomId, C.ACCESS, applicantId), {
      userId: applicantId,
      level: 'details',
      grantedAt: now,
      grantedBy: reviewerId,
    })
  }

  await batch.commit()
}
