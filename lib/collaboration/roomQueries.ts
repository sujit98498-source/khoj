// lib/collaboration/roomQueries.ts
// Firestore read operations for Collaboration Rooms.
// All functions return typed data and handle missing docs gracefully.

import {
  collection,
  doc,
  getDoc,
  getDocs,
  query,
  where,
  orderBy,
  limit,
  onSnapshot,
  QueryConstraint,
  collectionGroup,
} from 'firebase/firestore'
import { db } from '@/lib/firebase/config'
import { COLLAB_COLLECTIONS as C } from './collabCollections'
import type {
  CollabRoom,
  RoomMember,
  StartupRole,
  JoinRequest,
  StartupInvite,
  RoomAsset,
  StartupSession,
  Milestone,
  StartupProfile,
  UserRoomMembership,
  AccessRequest,
  RoomAccess,
} from '@/types/collaboration'

// ── Helpers ───────────────────────────────────────────────────────────────────
function withId<T>(docSnap: { id: string; data(): unknown }): T {
  return { ...(docSnap.data() as object), id: docSnap.id } as T
}

// ── Room ──────────────────────────────────────────────────────────────────────
export async function getCollabRoom(roomId: string): Promise<CollabRoom | null> {
  try {
    const snap = await getDoc(doc(db, C.ROOMS, roomId))
    if (!snap.exists()) return null
    return withId<CollabRoom>(snap)
  } catch (err) {
    // Permission denied on a non-existent legacy room → treat as "not found"
    console.warn('[roomQueries] getCollabRoom permission/not-found:', roomId, err)
    return null
  }
}

/** Subscribe to startup rooms for the browse/discovery view. */
export function subscribeStartupRooms(
  filters: {
    stage?: string
    roleType?: string
    commitment?: string
    locationMode?: string
    isRecruiting?: boolean
    limitCount?: number
  },
  onChange: (rooms: CollabRoom[]) => void,
): () => void {
  const constraints: QueryConstraint[] = [
    where('roomType', '==', 'startup'),
    where('status', '==', 'active'),
    where('visibility', '==', 'public'),
    orderBy('lastActivityAt', 'desc'),
    limit(filters.limitCount ?? 30),
  ]

  if (filters.isRecruiting === true) {
    constraints.splice(-2, 0, where('isRecruiting', '==', true))
  }

  const q = query(collection(db, C.ROOMS), ...constraints)
  return onSnapshot(q, (snap) => {
    let rooms = snap.docs.map((d) => withId<CollabRoom>(d))

    // Client-side secondary filters (Firestore composite index limits)
    if (filters.stage) {
      rooms = rooms.filter((r) => r.startup?.stage === filters.stage)
    }
    if (filters.commitment) {
      rooms = rooms.filter((r) => r.startup?.commitment === filters.commitment)
    }
    if (filters.locationMode) {
      rooms = rooms.filter((r) => r.startup?.locationMode === filters.locationMode)
    }

    onChange(rooms)
  }, (err) => {
    console.error('[roomQueries] subscribeStartupRooms error', err)
    onChange([])
  })
}

/** Subscribe to a single room document. */
export function subscribeCollabRoom(
  roomId: string,
  onChange: (room: CollabRoom | null) => void,
): () => void {
  return onSnapshot(
    doc(db, C.ROOMS, roomId),
    (snap) => { onChange(snap.exists() ? withId<CollabRoom>(snap) : null) },
    (err) => {
      // Permission denied on legacy room ID → treat as null (not a collab room)
      console.warn('[roomQueries] subscribeCollabRoom error:', roomId, err)
      onChange(null)
    },
  )
}

// ── Members ───────────────────────────────────────────────────────────────────
export function subscribeRoomMembers(
  roomId: string,
  onChange: (members: RoomMember[]) => void,
): () => void {
  const q = query(
    collection(db, C.ROOMS, roomId, C.MEMBERS),
    where('status', 'in', ['active', 'trial']),
  )
  return onSnapshot(q, (snap) => {
    onChange(snap.docs.map((d) => withId<RoomMember>(d)))
  })
}

export async function getRoomMember(roomId: string, userId: string): Promise<RoomMember | null> {
  const snap = await getDoc(doc(db, C.ROOMS, roomId, C.MEMBERS, userId))
  if (!snap.exists()) return null
  return withId<RoomMember>(snap)
}

// ── Roles ─────────────────────────────────────────────────────────────────────
export function subscribeStartupRoles(
  roomId: string,
  onChange: (roles: StartupRole[]) => void,
): () => void {
  // NOTE: No compound where+orderBy — that would require a composite index.
  // We fetch the full collection and sort/filter client-side instead.
  const q = query(
    collection(db, C.ROOMS, roomId, C.ROLES),
  )
  return onSnapshot(
    q,
    (snap) => {
      const roles = snap.docs
        .map((d) => withId<StartupRole>(d))
        .filter((r) => r.status === 'open' || r.status === 'paused')
        .sort((a, b) => {
          const ta = (a.createdAt as any)?.toMillis?.() ?? 0
          const tb = (b.createdAt as any)?.toMillis?.() ?? 0
          return tb - ta
        })
      console.log('Roles fetched', roles)
      onChange(roles)
    },
    (err) => {
      console.error('subscribeStartupRoles error:', err)
    },
  )
}

// ── Role applications ──────────────────────────────────────────────────────────
/** Founder view: all role applications for a room */
export function subscribeRoleApplications(
  roomId: string,
  onChange: (applications: import('@/types/collaboration').RoleApplication[]) => void,
): () => void {
  const q = query(
    collection(db, C.ROOMS, roomId, C.ROLE_APPLICATIONS),
    orderBy('createdAt', 'desc'),
  )
  return onSnapshot(
    q,
    (snap) => {
      const apps = snap.docs.map((d) => withId<import('@/types/collaboration').RoleApplication>(d))
      console.log('Role applications fetched', apps)
      onChange(apps)
    },
    (err) => { console.error('subscribeRoleApplications error:', err) },
  )
}

/** Applicant view: their own applications across a room */
export function subscribeMyRoleApplications(
  roomId: string,
  userId: string,
  onChange: (applications: import('@/types/collaboration').RoleApplication[]) => void,
): () => void {
  const q = query(
    collection(db, C.ROOMS, roomId, C.ROLE_APPLICATIONS),
    where('applicantId', '==', userId),
    orderBy('createdAt', 'desc'),
  )
  return onSnapshot(
    q,
    (snap) => onChange(snap.docs.map((d) => withId<import('@/types/collaboration').RoleApplication>(d))),
    (err) => { console.error('subscribeMyRoleApplications error:', err) },
  )
}

// ── Join requests ─────────────────────────────────────────────────────────────
/** Founder view: all pending requests for a room */
export function subscribeRoomJoinRequests(
  roomId: string,
  onChange: (requests: JoinRequest[]) => void,
): () => void {
  const q = query(
    collection(db, C.ROOMS, roomId, C.JOIN_REQUESTS),
    where('status', '==', 'pending'),
    orderBy('createdAt', 'desc'),
  )
  return onSnapshot(q, (snap) => {
    onChange(snap.docs.map((d) => withId<JoinRequest>(d)))
  })
}

/** Requester view: their own requests */
export function subscribeUserJoinRequests(
  userId: string,
  onChange: (requests: JoinRequest[]) => void,
): () => void {
  const q = query(
    collectionGroup(db, C.JOIN_REQUESTS),
    where('userId', '==', userId),
    where('status', '==', 'pending'),
    orderBy('createdAt', 'desc'),
  )
  return onSnapshot(q, (snap) => {
    onChange(snap.docs.map((d) => withId<JoinRequest>(d)))
  })
}

// ── Invites ───────────────────────────────────────────────────────────────────
/** Target user view: pending invites for them */
export function subscribeUserInvites(
  targetUserId: string,
  onChange: (invites: StartupInvite[]) => void,
): () => void {
  const q = query(
    collectionGroup(db, C.INVITES),
    where('targetUserId', '==', targetUserId),
    where('status', '==', 'pending'),
    orderBy('createdAt', 'desc'),
  )
  return onSnapshot(q, (snap) => {
    onChange(snap.docs.map((d) => withId<StartupInvite>(d)))
  })
}

/** Founder view: invites sent from a room */
export function subscribeRoomInvites(
  roomId: string,
  onChange: (invites: StartupInvite[]) => void,
): () => void {
  const q = query(
    collection(db, C.ROOMS, roomId, C.INVITES),
    where('status', '==', 'pending'),
    orderBy('createdAt', 'desc'),
  )
  return onSnapshot(q, (snap) => {
    onChange(snap.docs.map((d) => withId<StartupInvite>(d)))
  })
}

// ── Assets ────────────────────────────────────────────────────────────────────
export function subscribeRoomAssets(
  roomId: string,
  onChange: (assets: RoomAsset[]) => void,
): () => void {
  const q = query(
    collection(db, C.ROOMS, roomId, C.ASSETS),
    orderBy('createdAt', 'desc'),
  )
  return onSnapshot(q, (snap) => {
    onChange(snap.docs.map((d) => withId<RoomAsset>(d)))
  })
}

// ── Sessions ──────────────────────────────────────────────────────────────────
export function subscribeRoomSessions(
  roomId: string,
  onChange: (sessions: StartupSession[]) => void,
): () => void {
  const q = query(
    collection(db, C.ROOMS, roomId, C.SESSIONS),
    where('status', 'in', ['scheduled', 'live']),
    orderBy('createdAt', 'desc'),
    limit(10),
  )
  return onSnapshot(q, (snap) => {
    onChange(snap.docs.map((d) => withId<StartupSession>(d)))
  })
}

// ── Milestones ────────────────────────────────────────────────────────────────
export function subscribeMilestones(
  roomId: string,
  onChange: (milestones: Milestone[]) => void,
): () => void {
  const q = query(
    collection(db, C.ROOMS, roomId, C.MILESTONES),
    orderBy('createdAt', 'asc'),
  )
  return onSnapshot(q, (snap) => {
    onChange(snap.docs.map((d) => withId<Milestone>(d)))
  })
}

// ── Startup profiles ──────────────────────────────────────────────────────────
export async function getStartupProfile(userId: string): Promise<StartupProfile | null> {
  const snap = await getDoc(doc(db, C.STARTUP_PROFILES, userId))
  if (!snap.exists()) return null
  return snap.data() as StartupProfile
}

export async function getPublicStartupProfiles(limitCount = 50): Promise<StartupProfile[]> {
  const snap = await getDocs(
    query(
      collection(db, C.STARTUP_PROFILES),
      where('visibility', '==', 'public'),
      limit(limitCount),
    ),
  )
  return snap.docs.map((d) => d.data() as StartupProfile)
}

// ── User room memberships ─────────────────────────────────────────────────────
export function subscribeUserMemberships(
  userId: string,
  onChange: (memberships: UserRoomMembership[]) => void,
): () => void {
  const q = query(
    collection(db, 'users', userId, C.ROOM_MEMBERSHIPS),
    where('status', '==', 'active'),
    orderBy('joinedAt', 'desc'),
  )
  return onSnapshot(q, (snap) => {
    onChange(snap.docs.map((d) => d.data() as UserRoomMembership))
  })
}

// ── Founder inbox counts ──────────────────────────────────────────────────────
export function subscribeFounderInboxCounts(
  roomId: string,
  onChange: (counts: { pendingRequests: number }) => void,
): () => void {
  const q = query(
    collection(db, C.ROOMS, roomId, C.JOIN_REQUESTS),
    where('status', '==', 'pending'),
  )
  return onSnapshot(q, (snap) => {
    onChange({ pendingRequests: snap.size })
  })
}

// ── Access requests ───────────────────────────────────────────────────────────
/** Founder view: all access requests for a room */
export function subscribeAccessRequests(
  roomId: string,
  onChange: (requests: AccessRequest[]) => void,
): () => void {
  const q = query(
    collection(db, C.ROOMS, roomId, C.ACCESS_REQUESTS),
    orderBy('createdAt', 'desc'),
  )
  return onSnapshot(
    q,
    (snap) => onChange(snap.docs.map((d) => withId<AccessRequest>(d))),
    (err) => { console.error('[roomQueries] subscribeAccessRequests error', err) },
  )
}

/** Viewer check: does this user have granted access? */
export function subscribeMyAccess(
  roomId: string,
  userId: string,
  onChange: (access: RoomAccess | null) => void,
): () => void {
  const docRef = doc(db, C.ROOMS, roomId, C.ACCESS, userId)
  return onSnapshot(
    docRef,
    (snap) => onChange(snap.exists() ? (snap.data() as RoomAccess) : null),
    (err) => {
      // Permission denied simply means no access granted yet
      console.warn('[roomQueries] subscribeMyAccess:', err)
      onChange(null)
    },
  )
}

// ── User room memberships (one-shot) ─────────────────────────────────────────
export async function getUserMemberships(userId: string): Promise<UserRoomMembership[]> {
  const snap = await getDocs(
    query(
      collection(db, 'users', userId, C.ROOM_MEMBERSHIPS),
      where('status', '==', 'active'),
      orderBy('joinedAt', 'desc'),
    ),
  )
  return snap.docs.map((d) => d.data() as UserRoomMembership)
}

// ── Portfolio activities ──────────────────────────────────────────────────────
export interface PortfolioActivity {
  id: string
  type: string
  roomId?: string
  startupName?: string
  roleTitle?: string
  createdAt: unknown
}

export async function getPortfolioActivities(
  userId: string,
  limitCount = 20,
): Promise<PortfolioActivity[]> {
  const snap = await getDocs(
    query(
      collection(db, 'users', userId, 'portfolioActivities'),
      orderBy('createdAt', 'desc'),
      limit(limitCount),
    ),
  )
  return snap.docs.map((d) => ({ ...(d.data() as object), id: d.id } as PortfolioActivity))
}

// ── Opportunity Market ────────────────────────────────────────────────────────
import type { Opportunity } from '@/lib/types'

export async function getOpenOpportunities(
  type?: string,
  limitCount = 30,
): Promise<Opportunity[]> {
  const constraints: QueryConstraint[] = [where('status', '==', 'open'), limit(limitCount)]
  if (type) constraints.unshift(where('type', '==', type))
  const snap = await getDocs(query(collection(db, 'opportunities'), ...constraints))
  return snap.docs.map((d) => ({ ...(d.data() as object), id: d.id } as Opportunity))
}
