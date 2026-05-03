// services/streamService.ts
// Firestore operations for the Live Stream system
// Collection: streams/{streamId}
// Sub-collection: streams/{streamId}/messages/{messageId}
// Sub-collection: streams/{streamId}/joinRequests/{requestId}
// Sub-collection: streams/{streamId}/participants/{userId}

import {
  collection,
  doc,
  setDoc,
  addDoc,
  updateDoc,
  deleteDoc,
  getDoc,
  getDocs,
  onSnapshot,
  query,
  where,
  orderBy,
  serverTimestamp,
  runTransaction,
  writeBatch,
  Timestamp,
  increment,
  limit,
  Unsubscribe,
} from 'firebase/firestore'
import { requireFirestoreDb } from '@/lib/firebase/config'
import { Stream, StreamMessage, StreamCategory, JoinRequest, StreamParticipant } from '@/lib/types'

// ── Helpers ───────────────────────────────────────────────────────────────────

function toStream(id: string, data: Record<string, unknown>): Stream {
  return {
    id,
    title: (data.title as string) ?? '',
    description: (data.description as string) ?? '',
    category: (data.category as StreamCategory) ?? 'Other',
    visibility: (data.visibility as 'public' | 'private') ?? 'public',
    status: (data.status as 'live' | 'ended') ?? 'live',
    hostId: (data.hostId as string) ?? '',
    hostName: (data.hostName as string) ?? '',
    hostPhoto: (data.hostPhoto as string) ?? '',
    viewerCount: (data.viewerCount as number) ?? 0,
    likeCount: (data.likeCount as number) ?? 0,
    thumbnailUrl: (data.thumbnailUrl as string) ?? '',
    chatEnabled: (data.chatEnabled as boolean) ?? true,
    createdAt:
      data.createdAt instanceof Timestamp
        ? data.createdAt.toDate().toISOString()
        : (data.createdAt as string) ?? new Date().toISOString(),
    endedAt:
      data.endedAt instanceof Timestamp
        ? data.endedAt.toDate().toISOString()
        : data.endedAt
        ? (data.endedAt as string)
        : null,
  }
}

function toMessage(id: string, data: Record<string, unknown>): StreamMessage {
  return {
    id,
    userId: (data.userId as string) ?? '',
    userName: (data.userName as string) ?? '',
    userPhoto: (data.userPhoto as string) ?? '',
    text: (data.text as string) ?? '',
    createdAt:
      data.createdAt instanceof Timestamp
        ? data.createdAt.toDate().toISOString()
        : (data.createdAt as string) ?? new Date().toISOString(),
    isDeleted: (data.isDeleted as boolean) ?? false,
    reportCount: (data.reportCount as number) ?? 0,
  }
}

// ── Create Stream ─────────────────────────────────────────────────────────────

export interface CreateStreamPayload {
  title: string
  description: string
  category: StreamCategory
  visibility: 'public' | 'private'
  chatEnabled: boolean
  thumbnailUrl?: string
  hostId: string
  hostName: string
  hostPhoto: string
}

export async function createStream(payload: CreateStreamPayload): Promise<string> {
  const streamsRef = collection(requireFirestoreDb(), 'streams')
  const docRef = await addDoc(streamsRef, {
    title: payload.title.trim(),
    description: payload.description.trim(),
    category: payload.category,
    visibility: payload.visibility,
    status: 'live',
    hostId: payload.hostId,
    hostName: payload.hostName,
    hostPhoto: payload.hostPhoto,
    viewerCount: 0,
    likeCount: 0,
    thumbnailUrl: payload.thumbnailUrl ?? '',
    chatEnabled: payload.chatEnabled,
    createdAt: serverTimestamp(),
    endedAt: null,
  })
  return docRef.id
}

// ── Get Single Stream ─────────────────────────────────────────────────────────

export async function getStreamById(streamId: string): Promise<Stream | null> {
  const docRef = doc(requireFirestoreDb(), 'streams', streamId)
  const snap = await getDoc(docRef)
  if (!snap.exists()) return null
  return toStream(snap.id, snap.data() as Record<string, unknown>)
}

// ── Update Stream Thumbnail ───────────────────────────────────────────────────
// Called by the host client after capturing a video frame to Firebase Storage.

export async function updateStreamThumbnail(
  streamId: string,
  thumbnailUrl: string
): Promise<void> {
  const docRef = doc(requireFirestoreDb(), 'streams', streamId)
  await updateDoc(docRef, { thumbnailUrl })
}

// ── Subscribe to Live Streams ─────────────────────────────────────────────────
// NOTE: Only filter by status to avoid a composite index requirement.
// Visibility filter and sort are applied client-side.

export function subscribeLiveStreams(
  onUpdate: (streams: Stream[]) => void
): Unsubscribe {
  const q = query(
    collection(requireFirestoreDb(), 'streams'),
    where('status', '==', 'live'),
    limit(100)
  )
  return onSnapshot(
    q,
    (snap) => {
      const streams = snap.docs
        .map((d) => toStream(d.id, d.data() as Record<string, unknown>))
        // client-side: public only, sorted newest first
        .filter((s) => s.visibility === 'public')
        .sort((a, b) => (b.createdAt > a.createdAt ? 1 : -1))
      onUpdate(streams)
    },
    (err) => {
      console.error('[streamService] subscribeLiveStreams error:', err)
      onUpdate([])
    }
  )
}

// ── Subscribe to a Single Stream (real-time) ──────────────────────────────────

export function subscribeStream(
  streamId: string,
  onUpdate: (stream: Stream | null) => void
): Unsubscribe {
  const docRef = doc(requireFirestoreDb(), 'streams', streamId)
  return onSnapshot(docRef, (snap) => {
    if (!snap.exists()) {
      onUpdate(null)
      return
    }
    onUpdate(toStream(snap.id, snap.data() as Record<string, unknown>))
  })
}

// ── End Stream ────────────────────────────────────────────────────────────────

export async function endStream(streamId: string): Promise<void> {
  const docRef = doc(requireFirestoreDb(), 'streams', streamId)
  await updateDoc(docRef, {
    status: 'ended',
    endedAt: serverTimestamp(),
  })
}

// ── Viewer Count ──────────────────────────────────────────────────────────────

export async function incrementViewerCount(streamId: string): Promise<void> {
  const docRef = doc(requireFirestoreDb(), 'streams', streamId)
  await updateDoc(docRef, { viewerCount: increment(1) })
}

export async function decrementViewerCount(streamId: string): Promise<void> {
  const docRef = doc(requireFirestoreDb(), 'streams', streamId)
  // Use transaction to prevent negative count
  await runTransaction(requireFirestoreDb(), async (tx) => {
    const snap = await tx.get(docRef)
    if (!snap.exists()) return
    const current = (snap.data().viewerCount as number) ?? 0
    tx.update(docRef, { viewerCount: Math.max(0, current - 1) })
  })
}

// ── Chat Messages ─────────────────────────────────────────────────────────────

export async function sendMessage(
  streamId: string,
  payload: { userId: string; userName: string; userPhoto: string; text: string }
): Promise<void> {
  const text = payload.text.trim()
  if (!text) return
  const messagesRef = collection(requireFirestoreDb(), 'streams', streamId, 'messages')
  await addDoc(messagesRef, {
    userId: payload.userId,
    userName: payload.userName,
    userPhoto: payload.userPhoto,
    text,
    createdAt: serverTimestamp(),
    isDeleted: false,
    reportCount: 0,
  })
}

export function subscribeMessages(
  streamId: string,
  onUpdate: (messages: StreamMessage[]) => void
): Unsubscribe {
  const q = query(
    collection(requireFirestoreDb(), 'streams', streamId, 'messages'),
    where('isDeleted', '==', false),
    orderBy('createdAt', 'asc'),
    limit(200)
  )
  return onSnapshot(q, (snap) => {
    const messages = snap.docs.map((d) =>
      toMessage(d.id, d.data() as Record<string, unknown>)
    )
    onUpdate(messages)
  })
}

// ── Join Requests ─────────────────────────────────────────────────────────────

function toJoinRequest(id: string, data: Record<string, unknown>): JoinRequest {
  return {
    id,
    userId: (data.userId as string) ?? '',
    userName: (data.userName as string) ?? '',
    userPhoto: (data.userPhoto as string) ?? '',
    status: (data.status as JoinRequest['status']) ?? 'pending',
    createdAt:
      data.createdAt instanceof Timestamp
        ? data.createdAt.toDate().toISOString()
        : (data.createdAt as string) ?? new Date().toISOString(),
    respondedAt:
      data.respondedAt instanceof Timestamp
        ? data.respondedAt.toDate().toISOString()
        : data.respondedAt
        ? (data.respondedAt as string)
        : null,
  }
}

/**
 * Send a join request from a viewer.
 * Returns the new request document ID.
 * Throws if the user already has a pending or accepted request.
 */
export async function sendJoinRequest(
  streamId: string,
  payload: { userId: string; userName: string; userPhoto: string }
): Promise<string> {
  // Check existing requests client-side so stale declined docs never block
  // a new request and we avoid depending on a compound/in query.
  const existing = await getDocs(
    query(
      collection(requireFirestoreDb(), 'streams', streamId, 'joinRequests'),
      where('userId', '==', payload.userId)
    )
  )
  const activeRequest = existing.docs
    .map((d) => d.data() as Record<string, unknown>)
    .find((data) => data.status === 'pending' || data.status === 'accepted')

  if (activeRequest) {
    const status = activeRequest.status as string
    throw new Error(
      status === 'accepted'
        ? 'You are already a guest in this stream.'
        : 'You already have a pending request to join this stream.'
    )
  }

  const ref = await addDoc(collection(requireFirestoreDb(), 'streams', streamId, 'joinRequests'), {
    userId: payload.userId,
    userName: payload.userName,
    userPhoto: payload.userPhoto,
    status: 'pending',
    createdAt: serverTimestamp(),
    respondedAt: null,
  })
  return ref.id
}

/**
 * Subscribe to pending join requests for a stream (host view).
 * Only pending status — accepted/declined are not needed by the host panel.
 * Sorted client-side by createdAt asc (oldest first) to avoid a composite index.
 */
export function subscribeJoinRequests(
  streamId: string,
  onUpdate: (requests: JoinRequest[]) => void
): Unsubscribe {
  const q = query(
    collection(requireFirestoreDb(), 'streams', streamId, 'joinRequests'),
    where('status', '==', 'pending')
  )
  return onSnapshot(q, (snap) => {
    const sorted = snap.docs
      .map((d) => toJoinRequest(d.id, d.data() as Record<string, unknown>))
      .sort((a, b) => (a.createdAt > b.createdAt ? 1 : -1))
    onUpdate(sorted)
  })
}

/**
 * Subscribe to a viewer's own most-recent join request for a stream.
 * Returns the newest request so pending/accepted status is never shadowed by
 * an old declined record.
 */
export function subscribeMyJoinRequest(
  streamId: string,
  userId: string,
  onUpdate: (request: JoinRequest | null) => void
): Unsubscribe {
  const q = query(
    collection(requireFirestoreDb(), 'streams', streamId, 'joinRequests'),
    where('userId', '==', userId)
  )
  return onSnapshot(q, (snap) => {
    if (snap.empty) {
      onUpdate(null)
      return
    }
    // Sort desc by createdAt client-side — most recent request wins
    const sorted = snap.docs
      .map((d) => toJoinRequest(d.id, d.data() as Record<string, unknown>))
      .sort((a, b) => (b.createdAt > a.createdAt ? 1 : -1))
    onUpdate(sorted[0])
  })
}

/**
 * Host accepts a join request → updates status + adds user to participants.
 * Atomic batch write: both writes succeed or both fail.
 */
export async function acceptJoinRequest(
  streamId: string,
  request: JoinRequest
): Promise<void> {
  const batch = writeBatch(requireFirestoreDb())
  const requestRef = doc(requireFirestoreDb(), 'streams', streamId, 'joinRequests', request.id)
  const participantRef = doc(requireFirestoreDb(), 'streams', streamId, 'participants', request.userId)

  batch.update(requestRef, {
    status: 'accepted',
    respondedAt: serverTimestamp(),
  })
  batch.set(participantRef, {
    userId: request.userId,
    userName: request.userName,
    userPhoto: request.userPhoto,
    role: 'guest',
    micOn: false,
    camOn: false,
    screenOn: false,
    joinedAt: serverTimestamp(),
  })
  await batch.commit()
}

/**
 * Host declines a join request.
 */
export async function declineJoinRequest(
  streamId: string,
  requestId: string
): Promise<void> {
  const requestRef = doc(requireFirestoreDb(), 'streams', streamId, 'joinRequests', requestId)
  await updateDoc(requestRef, {
    status: 'declined',
    respondedAt: serverTimestamp(),
  })
}

// ── Participants ──────────────────────────────────────────────────────────────

function toParticipant(data: Record<string, unknown>): StreamParticipant {
  return {
    userId: (data.userId as string) ?? '',
    userName: (data.userName as string) ?? '',
    userPhoto: (data.userPhoto as string) ?? '',
    // Participants sub-collection only ever stores 'host' or 'guest'
    role: (data.role as StreamParticipant['role']) ?? 'guest',
    joinedAt:
      data.joinedAt instanceof Timestamp
        ? data.joinedAt.toDate().toISOString()
        : (data.joinedAt as string) ?? new Date().toISOString(),
  }
}

/**
 * Subscribe to active participants (host + guests) for a stream.
 */
export function subscribeParticipants(
  streamId: string,
  onUpdate: (participants: StreamParticipant[]) => void
): Unsubscribe {
  const q = query(
    collection(requireFirestoreDb(), 'streams', streamId, 'participants'),
    orderBy('joinedAt', 'asc')
  )
  return onSnapshot(q, (snap) => {
    const participants = snap.docs
      .map((d) => toParticipant(d.data() as Record<string, unknown>))
      .filter((participant) => participant.role === 'host' || participant.role === 'guest')
    onUpdate(participants)
  })
}

/**
 * Ensure host is listed as a participant when they start the stream.
 */
export async function ensureHostParticipant(
  streamId: string,
  host: { userId: string; userName: string; userPhoto: string }
): Promise<void> {
  const ref = doc(requireFirestoreDb(), 'streams', streamId, 'participants', host.userId)
  const snap = await getDoc(ref)
  if (!snap.exists()) {
    await setDoc(ref, {
      userId: host.userId,
      userName: host.userName,
      userPhoto: host.userPhoto,
      role: 'host',
      joinedAt: serverTimestamp(),
    })
  }
}

/**
 * Guest voluntarily leaves the stream.
 * Removes from participants and deletes all their join requests so they can
 * cleanly request again later without seeing a stale 'declined' toast.
 */
export async function leaveAsGuest(streamId: string, userId: string): Promise<void> {
  await deleteDoc(doc(requireFirestoreDb(), 'streams', streamId, 'participants', userId))
  const q = query(
    collection(requireFirestoreDb(), 'streams', streamId, 'joinRequests'),
    where('userId', '==', userId)
  )
  const snap = await getDocs(q)
  await Promise.all(snap.docs.map((d) => deleteDoc(d.ref)))
}

/**
 * Host removes a guest from the stream.
 */
export async function removeGuest(streamId: string, guestUserId: string): Promise<void> {
  await deleteDoc(doc(requireFirestoreDb(), 'streams', streamId, 'participants', guestUserId))
  // Mark their request as declined so they know
  const q = query(
    collection(requireFirestoreDb(), 'streams', streamId, 'joinRequests'),
    where('userId', '==', guestUserId),
    where('status', '==', 'accepted')
  )
  const snap = await getDocs(q)
  await Promise.all(
    snap.docs.map((d) => updateDoc(d.ref, { status: 'declined', respondedAt: serverTimestamp() }))
  )
}

// ── Likes ─────────────────────────────────────────────────────────────────────

/**
 * Toggle like on a stream.
 * Uses a transaction to safely update likeCount (never below 0).
 * Returns the new liked state: true = now liked, false = now unliked.
 */
export async function toggleLike(streamId: string, userId: string): Promise<boolean> {
  const likeRef = doc(requireFirestoreDb(), 'streams', streamId, 'likes', userId)
  const streamRef = doc(requireFirestoreDb(), 'streams', streamId)
  return runTransaction(requireFirestoreDb(), async (tx) => {
    const likeSnap = await tx.get(likeRef)
    if (likeSnap.exists()) {
      // Unlike
      tx.delete(likeRef)
      const streamSnap = await tx.get(streamRef)
      const current = (streamSnap.data()?.likeCount as number) ?? 0
      tx.update(streamRef, { likeCount: Math.max(0, current - 1) })
      return false
    } else {
      // Like
      tx.set(likeRef, { userId, createdAt: serverTimestamp() })
      tx.update(streamRef, { likeCount: increment(1) })
      return true
    }
  })
}

/**
 * Subscribe to the current user's like state for a stream.
 */
export function subscribeUserLike(
  streamId: string,
  userId: string,
  onUpdate: (liked: boolean) => void
): Unsubscribe {
  const likeRef = doc(requireFirestoreDb(), 'streams', streamId, 'likes', userId)
  return onSnapshot(likeRef, (snap) => {
    onUpdate(snap.exists())
  })
}

// ── Follow ────────────────────────────────────────────────────────────────────

export interface FollowPayload {
  currentUserId: string
  currentUserName: string
  currentUserPhoto: string
  targetUserId: string
  targetUserName: string
  targetUserPhoto: string
}

/**
 * Toggle follow for a user.
 * Writes to both users/{currentUserId}/following/{targetUserId}
 * and users/{targetUserId}/followers/{currentUserId}.
 * Returns the new following state: true = now following.
 */
export async function toggleFollow(payload: FollowPayload): Promise<boolean> {
  const followingRef = doc(
    requireFirestoreDb(),
    'users',
    payload.currentUserId,
    'following',
    payload.targetUserId
  )
  const followerRef = doc(
    requireFirestoreDb(),
    'users',
    payload.targetUserId,
    'followers',
    payload.currentUserId
  )
  const followingSnap = await getDoc(followingRef)
  if (followingSnap.exists()) {
    // Unfollow
    await Promise.all([deleteDoc(followingRef), deleteDoc(followerRef)])
    return false
  } else {
    // Follow
    const now = serverTimestamp()
    await Promise.all([
      setDoc(followingRef, {
        userId: payload.targetUserId,
        userName: payload.targetUserName,
        userPhoto: payload.targetUserPhoto,
        followedAt: now,
      }),
      setDoc(followerRef, {
        userId: payload.currentUserId,
        userName: payload.currentUserName,
        userPhoto: payload.currentUserPhoto,
        followedAt: now,
      }),
    ])
    return true
  }
}

/**
 * Subscribe to the following state between two users.
 * Resolves to true if currentUserId follows targetUserId.
 */
export function subscribeFollowing(
  currentUserId: string,
  targetUserId: string,
  onUpdate: (following: boolean) => void
): Unsubscribe {
  const followingRef = doc(requireFirestoreDb(), 'users', currentUserId, 'following', targetUserId)
  return onSnapshot(followingRef, (snap) => {
    onUpdate(snap.exists())
  })
}
