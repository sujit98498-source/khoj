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
import { requireFirestoreDb } from '@/lib/firebase/config'
import { COLLAB_COLLECTIONS as C } from './collabCollections'
import type { Opportunity } from '@/lib/types'
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

function toMillis(value: unknown): number {
  if (!value) return 0
  if (typeof value === 'string') return new Date(value).getTime() || 0
  if (value instanceof Date) return value.getTime()
  if (typeof value === 'object' && value !== null) {
    if ('toMillis' in value && typeof (value as { toMillis: unknown }).toMillis === 'function') {
      return (value as { toMillis: () => number }).toMillis()
    }
    if ('toDate' in value && typeof (value as { toDate: unknown }).toDate === 'function') {
      return (value as { toDate: () => Date }).toDate().getTime()
    }
  }
  return 0
}

function toIso(value: unknown): string {
  if (!value) return new Date().toISOString()
  if (typeof value === 'string') return value
  if (value instanceof Date) return value.toISOString()
  if (typeof value === 'object' && value !== null && 'toDate' in value && typeof (value as { toDate: unknown }).toDate === 'function') {
    return (value as { toDate: () => Date }).toDate().toISOString()
  }
  return new Date().toISOString()
}

function sortByFieldDesc<T>(items: T[], field: keyof T): T[] {
  return [...items].sort((a, b) => toMillis(b[field]) - toMillis(a[field]))
}

// ── Room ──────────────────────────────────────────────────────────────────────
export async function getCollabRoom(roomId: string): Promise<CollabRoom | null> {
  try {
    const snap = await getDoc(doc(requireFirestoreDb(), C.ROOMS, roomId))
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
    where('visibility', '==', 'public'),
  ]

  const q = query(collection(requireFirestoreDb(), C.ROOMS), ...constraints)
  return onSnapshot(q, (snap) => {
    let rooms = snap.docs
      .map((d) => withId<CollabRoom>(d))
      .filter((r) => r.roomType === 'startup' && r.status === 'active')

    // Client-side secondary filters (Firestore composite index limits)
    if (filters.isRecruiting === true) {
      rooms = rooms.filter((r) => r.isRecruiting === true)
    }
    if (filters.stage) {
      rooms = rooms.filter((r) => r.startup?.stage === filters.stage)
    }
    if (filters.commitment) {
      rooms = rooms.filter((r) => r.startup?.commitment === filters.commitment)
    }
    if (filters.locationMode) {
      rooms = rooms.filter((r) => r.startup?.locationMode === filters.locationMode)
    }

    onChange(sortByFieldDesc(rooms, 'lastActivityAt').slice(0, filters.limitCount ?? 30))
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
    doc(requireFirestoreDb(), C.ROOMS, roomId),
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
    collection(requireFirestoreDb(), C.ROOMS, roomId, C.MEMBERS),
    where('status', 'in', ['active', 'trial']),
  )
  return onSnapshot(q, (snap) => {
    onChange(snap.docs.map((d) => withId<RoomMember>(d)))
  })
}

export async function getRoomMember(roomId: string, userId: string): Promise<RoomMember | null> {
  const snap = await getDoc(doc(requireFirestoreDb(), C.ROOMS, roomId, C.MEMBERS, userId))
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
    collection(requireFirestoreDb(), C.ROOMS, roomId, C.ROLES),
  )
  return onSnapshot(
    q,
    (snap) => {
      const roles = snap.docs
        .map((d) => withId<StartupRole>(d))
        .filter((r) => r.status === 'open' || r.status === 'paused')
        .sort((a, b) => toMillis(b.createdAt) - toMillis(a.createdAt))
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
    collection(requireFirestoreDb(), C.ROOMS, roomId, C.ROLE_APPLICATIONS),
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
    collection(requireFirestoreDb(), C.ROOMS, roomId, C.ROLE_APPLICATIONS),
    where('applicantId', '==', userId),
  )
  return onSnapshot(
    q,
    (snap) => {
      const apps = snap.docs.map((d) => withId<import('@/types/collaboration').RoleApplication>(d))
      onChange(sortByFieldDesc(apps, 'createdAt'))
    },
    (err) => { console.error('subscribeMyRoleApplications error:', err) },
  )
}

// ── Join requests ─────────────────────────────────────────────────────────────
/** Founder view: all pending requests for a room */
export function subscribeRoomJoinRequests(
  roomId: string,
  onChange: (requests: JoinRequest[]) => void,
): () => void {
  const q = query(collection(requireFirestoreDb(), C.ROOMS, roomId, C.JOIN_REQUESTS))
  return onSnapshot(q, (snap) => {
    const requests = snap.docs
      .map((d) => withId<JoinRequest>(d))
      .filter((request) => request.status === 'pending')
    onChange(sortByFieldDesc(requests, 'createdAt'))
  })
}

/** Requester view: their own requests */
export function subscribeUserJoinRequests(
  userId: string,
  onChange: (requests: JoinRequest[]) => void,
): () => void {
  const q = query(
    collectionGroup(requireFirestoreDb(), C.JOIN_REQUESTS),
    where('userId', '==', userId),
  )
  return onSnapshot(q, (snap) => {
    const requests = snap.docs
      .map((d) => withId<JoinRequest>(d))
      .filter((request) => request.status === 'pending')
    onChange(sortByFieldDesc(requests, 'createdAt'))
  })
}

// ── Invites ───────────────────────────────────────────────────────────────────
/** Target user view: pending invites for them */
export function subscribeUserInvites(
  targetUserId: string,
  onChange: (invites: StartupInvite[]) => void,
): () => void {
  const q = query(
    collectionGroup(requireFirestoreDb(), C.INVITES),
    where('targetUserId', '==', targetUserId),
  )
  return onSnapshot(q, (snap) => {
    const invites = snap.docs
      .map((d) => withId<StartupInvite>(d))
      .filter((invite) => invite.status === 'pending')
    onChange(sortByFieldDesc(invites, 'createdAt'))
  })
}

/** Founder view: invites sent from a room */
export function subscribeRoomInvites(
  roomId: string,
  onChange: (invites: StartupInvite[]) => void,
): () => void {
  const q = query(collection(requireFirestoreDb(), C.ROOMS, roomId, C.INVITES))
  return onSnapshot(q, (snap) => {
    const invites = snap.docs
      .map((d) => withId<StartupInvite>(d))
      .filter((invite) => invite.status === 'pending')
    onChange(sortByFieldDesc(invites, 'createdAt'))
  })
}

// ── Assets ────────────────────────────────────────────────────────────────────
export function subscribeRoomAssets(
  roomId: string,
  onChange: (assets: RoomAsset[]) => void,
): () => void {
  const q = query(
    collection(requireFirestoreDb(), C.ROOMS, roomId, C.ASSETS),
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
  const q = query(collection(requireFirestoreDb(), C.ROOMS, roomId, C.SESSIONS))
  return onSnapshot(q, (snap) => {
    const sessions = snap.docs
      .map((d) => withId<StartupSession>(d))
      .filter((session) => session.status === 'scheduled' || session.status === 'live')
    onChange(sortByFieldDesc(sessions, 'createdAt').slice(0, 10))
  })
}

// ── Milestones ────────────────────────────────────────────────────────────────
export function subscribeMilestones(
  roomId: string,
  onChange: (milestones: Milestone[]) => void,
): () => void {
  const q = query(
    collection(requireFirestoreDb(), C.ROOMS, roomId, C.MILESTONES),
    orderBy('createdAt', 'asc'),
  )
  return onSnapshot(q, (snap) => {
    onChange(snap.docs.map((d) => withId<Milestone>(d)))
  })
}

// ── Startup profiles ──────────────────────────────────────────────────────────
export async function getStartupProfile(userId: string): Promise<StartupProfile | null> {
  const snap = await getDoc(doc(requireFirestoreDb(), C.STARTUP_PROFILES, userId))
  if (!snap.exists()) return null
  return snap.data() as StartupProfile
}

export async function getPublicStartupProfiles(limitCount = 50): Promise<StartupProfile[]> {
  const snap = await getDocs(
    query(
      collection(requireFirestoreDb(), C.STARTUP_PROFILES),
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
  const q = query(collection(requireFirestoreDb(), 'users', userId, C.ROOM_MEMBERSHIPS))
  return onSnapshot(q, (snap) => {
    const memberships = snap.docs
      .map((d) => d.data() as UserRoomMembership)
      .filter((membership) => membership.status === 'active')
    onChange(sortByFieldDesc(memberships, 'joinedAt'))
  })
}

// ── Founder inbox counts ──────────────────────────────────────────────────────
export function subscribeFounderInboxCounts(
  roomId: string,
  onChange: (counts: { pendingRequests: number }) => void,
): () => void {
  const q = query(collection(requireFirestoreDb(), C.ROOMS, roomId, C.JOIN_REQUESTS))
  return onSnapshot(q, (snap) => {
    onChange({ pendingRequests: snap.docs.filter((item) => item.data().status === 'pending').length })
  })
}

// ── Access requests ───────────────────────────────────────────────────────────
/** Founder view: all access requests for a room */
export function subscribeAccessRequests(
  roomId: string,
  onChange: (requests: AccessRequest[]) => void,
): () => void {
  const q = query(
    collection(requireFirestoreDb(), C.ROOMS, roomId, C.ACCESS_REQUESTS),
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
  const docRef = doc(requireFirestoreDb(), C.ROOMS, roomId, C.ACCESS, userId)
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
    query(collection(requireFirestoreDb(), 'users', userId, C.ROOM_MEMBERSHIPS)),
  )
  return sortByFieldDesc(
    snap.docs
      .map((d) => d.data() as UserRoomMembership)
      .filter((membership) => membership.status === 'active'),
    'joinedAt',
  )
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
      collection(requireFirestoreDb(), 'users', userId, 'portfolioActivities'),
      orderBy('createdAt', 'desc'),
      limit(limitCount),
    ),
  )
  return snap.docs.map((d) => ({ ...(d.data() as object), id: d.id } as PortfolioActivity))
}

// ── Opportunity Market ────────────────────────────────────────────────────────

function docToOpportunity(id: string, data: Record<string, unknown>): Opportunity {
  return {
    ...(data as Omit<Opportunity, 'id'>),
    id,
    createdAt: toIso(data.createdAt),
    updatedAt: data.updatedAt ? toIso(data.updatedAt) : undefined,
    skillsRequired: Array.isArray(data.skillsRequired) ? data.skillsRequired.map(String) : [],
  }
}

export async function getOpenOpportunities(
  type?: string,
  limitCount = 30,
): Promise<Opportunity[]> {
  const snap = await getDocs(
    query(collection(requireFirestoreDb(), 'opportunities'), where('status', '==', 'open')),
  )
  const opportunities = snap.docs
    .map((d) => docToOpportunity(d.id, d.data() as Record<string, unknown>))
    .filter((opportunity) => !type || opportunity.type === type)

  return sortByFieldDesc(opportunities, 'createdAt').slice(0, limitCount)
}
