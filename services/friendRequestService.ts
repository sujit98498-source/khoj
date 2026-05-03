// services/friendRequestService.ts
// Firebase Firestore-backed friend/connection request system.
//
// Collections:
//   friendRequests/{id}  — pending/accepted/declined/cancelled requests
//   friends/{id}         — established friendships (both UIDs in userIds[])
//
// All functions are async and return typed data.
// ─────────────────────────────────────────────────────────────────────────────

import {
  collection,
  doc,
  addDoc,
  setDoc,
  updateDoc,
  deleteDoc,
  getDoc,
  getDocs,
  query,
  where,
  serverTimestamp,
  Timestamp,
} from 'firebase/firestore'
import { requireFirestoreDb } from '@/lib/firebase/config'
import { COLLECTIONS } from '@/lib/firebase/collections'
import { createNotification } from '@/services/notificationService'
import type { FriendRequest, FriendRequestStatus, Friendship } from '@/lib/types'

// ── Helpers ───────────────────────────────────────────────────────────────────

function tsToISO(ts: unknown): string {
  if (!ts) return new Date().toISOString()
  if (ts instanceof Timestamp) return ts.toDate().toISOString()
  if (typeof ts === 'string') return ts
  return new Date().toISOString()
}

function docToRequest(id: string, d: Record<string, unknown>): FriendRequest {
  return {
    id,
    fromUserId: d.fromUserId as string,
    fromUserName: d.fromUserName as string,
    fromUserAvatar: d.fromUserAvatar as string | undefined,
    fromUserUsername: d.fromUserUsername as string | undefined,
    toUserId: d.toUserId as string,
    toUserName: d.toUserName as string,
    toUserAvatar: d.toUserAvatar as string | undefined,
    toUserUsername: d.toUserUsername as string | undefined,
    status: d.status as FriendRequestStatus,
    createdAt: tsToISO(d.createdAt),
    updatedAt: tsToISO(d.updatedAt),
  }
}

function docToFriendship(id: string, d: Record<string, unknown>): Friendship {
  return {
    id,
    userIds: d.userIds as string[],
    userNames: (d.userNames ?? {}) as Record<string, string>,
    userAvatars: (d.userAvatars ?? {}) as Record<string, string>,
    userUsernames: (d.userUsernames ?? {}) as Record<string, string>,
    createdAt: tsToISO(d.createdAt),
  }
}

function tsToMillis(ts: unknown): number {
  if (!ts) return 0
  if (ts instanceof Timestamp) return ts.toMillis()
  if (typeof ts === 'string') return new Date(ts).getTime() || 0
  if (typeof ts === 'object' && ts !== null && 'toMillis' in ts) {
    return (ts as { toMillis: () => number }).toMillis()
  }
  return 0
}

// ── Friend Requests ───────────────────────────────────────────────────────────

/**
 * Send a friend/connection request from one user to another.
 * Prevents: sending to self, duplicate pending requests, re-requesting if already friends.
 * Returns the new request ID.
 */
export async function sendFriendRequest(
  from: { uid: string; name: string; avatar?: string; username?: string },
  to: { uid: string; name: string; avatar?: string; username?: string }
): Promise<string> {
  if (from.uid === to.uid) throw new Error('Cannot send a request to yourself')

  // Check for existing pending request in either direction
  const existing = await getFriendRequestBetween(from.uid, to.uid)
  if (existing && existing.status === 'pending') {
    throw new Error('A pending request already exists between these users')
  }

  // Check if already friends
  const alreadyFriends = await areFriends(from.uid, to.uid)
  if (alreadyFriends) throw new Error('Already connected')

  const ref = await addDoc(collection(requireFirestoreDb(), COLLECTIONS.FRIEND_REQUESTS), {
    fromUserId: from.uid,
    fromUserName: from.name,
    fromUserAvatar: from.avatar ?? null,
    fromUserUsername: from.username ?? null,
    toUserId: to.uid,
    toUserName: to.name,
    toUserAvatar: to.avatar ?? null,
    toUserUsername: to.username ?? null,
    status: 'pending' as FriendRequestStatus,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  })

  // Notify the recipient
  await createNotification({
    userId: to.uid,
    type: 'connection_request',
    title: `${from.name} wants to connect with you`,
    message: `${from.name} sent you a connection request.`,
    actionUrl: '/network/requests',
  }).catch(() => {/* non-critical */})

  return ref.id
}

/**
 * Cancel a sent request (by the sender).
 */
export async function cancelFriendRequest(requestId: string): Promise<void> {
  await deleteDoc(doc(requireFirestoreDb(), COLLECTIONS.FRIEND_REQUESTS, requestId))
}

/**
 * Accept a received friend request.
 * Creates a friendship document and updates the request status.
 */
export async function acceptFriendRequest(
  requestId: string,
  acceptorUid: string
): Promise<void> {
  const reqRef = doc(requireFirestoreDb(), COLLECTIONS.FRIEND_REQUESTS, requestId)
  const reqSnap = await getDoc(reqRef)
  if (!reqSnap.exists()) throw new Error('Request not found')

  const d = reqSnap.data()
  if (d.toUserId !== acceptorUid) throw new Error('Not authorized to accept this request')
  if (d.status !== 'pending') throw new Error('Request is no longer pending')

  // Create friendship document
  const friendshipId = `friends_${[d.fromUserId, d.toUserId].sort().join('_')}`
  await setDoc(doc(requireFirestoreDb(), COLLECTIONS.FRIENDS, friendshipId), {
    userIds: [d.fromUserId, d.toUserId],
    userNames: { [d.fromUserId]: d.fromUserName, [d.toUserId]: d.toUserName },
    userAvatars: { [d.fromUserId]: d.fromUserAvatar ?? '', [d.toUserId]: d.toUserAvatar ?? '' },
    userUsernames: { [d.fromUserId]: d.fromUserUsername ?? '', [d.toUserId]: d.toUserUsername ?? '' },
    createdAt: serverTimestamp(),
  })

  const now = serverTimestamp()
  await Promise.all([
    setDoc(doc(requireFirestoreDb(), 'users', d.fromUserId, 'connections', d.toUserId), {
      uid: d.toUserId,
      name: d.toUserName,
      username: d.toUserUsername ?? '',
      avatarUrl: d.toUserAvatar ?? '',
      connectedAt: now,
    }),
    setDoc(doc(requireFirestoreDb(), 'users', d.toUserId, 'connections', d.fromUserId), {
      uid: d.fromUserId,
      name: d.fromUserName,
      username: d.fromUserUsername ?? '',
      avatarUrl: d.fromUserAvatar ?? '',
      connectedAt: now,
    }),
  ])

  // Update request status
  await updateDoc(reqRef, { status: 'accepted', updatedAt: serverTimestamp() })

  // Notify the original sender
  await createNotification({
    userId: d.fromUserId,
    type: 'connection_accepted',
    title: `${d.toUserName} accepted your connection request`,
    message: `You and ${d.toUserName} are now connected.`,
    actionUrl: `/profile/${d.toUserId}`,
  }).catch(() => {/* non-critical */})
}

/**
 * Decline a received friend request.
 */
export async function declineFriendRequest(requestId: string): Promise<void> {
  await updateDoc(doc(requireFirestoreDb(), COLLECTIONS.FRIEND_REQUESTS, requestId), {
    status: 'declined',
    updatedAt: serverTimestamp(),
  })
}

/**
 * Remove an existing friendship.
 */
export async function removeFriend(uid1: string, uid2: string): Promise<void> {
  const friendshipId = `friends_${[uid1, uid2].sort().join('_')}`
  await Promise.all([
    deleteDoc(doc(requireFirestoreDb(), COLLECTIONS.FRIENDS, friendshipId)),
    deleteDoc(doc(requireFirestoreDb(), 'users', uid1, 'connections', uid2)),
    deleteDoc(doc(requireFirestoreDb(), 'users', uid2, 'connections', uid1)),
  ])
}

// ── Query helpers ─────────────────────────────────────────────────────────────

/**
 * Get the existing request between two users (in either direction), or null.
 */
export async function getFriendRequestBetween(
  uid1: string,
  uid2: string
): Promise<FriendRequest | null> {
  const q1 = query(
    collection(requireFirestoreDb(), COLLECTIONS.FRIEND_REQUESTS),
    where('fromUserId', '==', uid1)
  )
  const q2 = query(
    collection(requireFirestoreDb(), COLLECTIONS.FRIEND_REQUESTS),
    where('toUserId', '==', uid1)
  )

  const [snap1, snap2] = await Promise.all([getDocs(q1), getDocs(q2)])
  const docs = [...snap1.docs, ...snap2.docs]
    .map((d) => ({ id: d.id, data: d.data() as Record<string, unknown> }))
    .filter((item) => {
      const from = String(item.data.fromUserId ?? '')
      const to = String(item.data.toUserId ?? '')
      return (from === uid1 && to === uid2) || (from === uid2 && to === uid1)
    })
    .sort((a, b) => tsToMillis(b.data.updatedAt ?? b.data.createdAt) - tsToMillis(a.data.updatedAt ?? a.data.createdAt))

  const pending = docs.find((item) => item.data.status === 'pending')
  const selected = pending ?? docs[0]
  return selected ? docToRequest(selected.id, selected.data) : null
}

/**
 * Check if two users are already friends.
 */
export async function areFriends(uid1: string, uid2: string): Promise<boolean> {
  const friendshipId = `friends_${[uid1, uid2].sort().join('_')}`
  const snap = await getDoc(doc(requireFirestoreDb(), COLLECTIONS.FRIENDS, friendshipId))
  return snap.exists()
}

/**
 * Get all incoming (pending) requests for a user.
 */
export async function getIncomingRequests(userId: string): Promise<FriendRequest[]> {
  const q = query(
    collection(requireFirestoreDb(), COLLECTIONS.FRIEND_REQUESTS),
    where('toUserId', '==', userId)
  )
  const snap = await getDocs(q)
  return snap.docs
    .map((d) => docToRequest(d.id, d.data() as Record<string, unknown>))
    .filter((request) => request.status === 'pending')
}

/**
 * Get all sent (pending) requests by a user.
 */
export async function getSentRequests(userId: string): Promise<FriendRequest[]> {
  const q = query(
    collection(requireFirestoreDb(), COLLECTIONS.FRIEND_REQUESTS),
    where('fromUserId', '==', userId)
  )
  const snap = await getDocs(q)
  return snap.docs
    .map((d) => docToRequest(d.id, d.data() as Record<string, unknown>))
    .filter((request) => request.status === 'pending')
}

/**
 * Get all friendships for a user.
 */
export async function getFriends(userId: string): Promise<Friendship[]> {
  const q = query(
    collection(requireFirestoreDb(), COLLECTIONS.FRIENDS),
    where('userIds', 'array-contains', userId)
  )
  const snap = await getDocs(q)
  return snap.docs.map((d) => docToFriendship(d.id, d.data() as Record<string, unknown>))
}
