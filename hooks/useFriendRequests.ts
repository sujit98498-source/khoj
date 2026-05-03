// hooks/useFriendRequests.ts
// Real-time Firebase onSnapshot hooks for friend/connection system.

'use client'

import { useState, useEffect } from 'react'
import {
  collection,
  doc,
  query,
  where,
  onSnapshot,
  Timestamp,
} from 'firebase/firestore'
import { requireFirestoreDb } from '@/lib/firebase/config'
import { COLLECTIONS } from '@/lib/firebase/collections'
import type { FriendRequest, FriendStatus, Friendship } from '@/lib/types'

function tsToISO(ts: unknown): string {
  if (!ts) return new Date().toISOString()
  if (ts instanceof Timestamp) return ts.toDate().toISOString()
  if (typeof ts === 'string') return ts
  return new Date().toISOString()
}

// ── Real-time incoming requests ───────────────────────────────────────────────

/**
 * Listen for pending incoming friend requests in real-time.
 */
export function useIncomingRequests(myUid: string | null) {
  const [requests, setRequests] = useState<FriendRequest[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!myUid) { setRequests([]); setLoading(false); return }

    const q = query(
      collection(requireFirestoreDb(), COLLECTIONS.FRIEND_REQUESTS),
      where('toUserId', '==', myUid),
      where('status', '==', 'pending')
    )

    const unsub = onSnapshot(
      q,
      (snap) => {
        setRequests(
          snap.docs.map((d) => {
            const data = d.data()
            return {
              id: d.id,
              fromUserId: data.fromUserId,
              fromUserName: data.fromUserName,
              fromUserAvatar: data.fromUserAvatar ?? undefined,
              fromUserUsername: data.fromUserUsername ?? undefined,
              toUserId: data.toUserId,
              toUserName: data.toUserName,
              toUserAvatar: data.toUserAvatar ?? undefined,
              toUserUsername: data.toUserUsername ?? undefined,
              status: data.status,
              createdAt: tsToISO(data.createdAt),
              updatedAt: tsToISO(data.updatedAt),
            } as FriendRequest
          })
        )
        setLoading(false)
      },
      () => setLoading(false)
    )

    return () => unsub()
  }, [myUid])

  return { requests, loading }
}

// ── Real-time sent requests ───────────────────────────────────────────────────

export function useSentRequests(myUid: string | null) {
  const [requests, setRequests] = useState<FriendRequest[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!myUid) { setRequests([]); setLoading(false); return }

    const q = query(
      collection(requireFirestoreDb(), COLLECTIONS.FRIEND_REQUESTS),
      where('fromUserId', '==', myUid),
      where('status', '==', 'pending')
    )

    const unsub = onSnapshot(
      q,
      (snap) => {
        setRequests(
          snap.docs.map((d) => {
            const data = d.data()
            return {
              id: d.id,
              fromUserId: data.fromUserId,
              fromUserName: data.fromUserName,
              fromUserAvatar: data.fromUserAvatar ?? undefined,
              fromUserUsername: data.fromUserUsername ?? undefined,
              toUserId: data.toUserId,
              toUserName: data.toUserName,
              toUserAvatar: data.toUserAvatar ?? undefined,
              toUserUsername: data.toUserUsername ?? undefined,
              status: data.status,
              createdAt: tsToISO(data.createdAt),
              updatedAt: tsToISO(data.updatedAt),
            } as FriendRequest
          })
        )
        setLoading(false)
      },
      () => setLoading(false)
    )

    return () => unsub()
  }, [myUid])

  return { requests, loading }
}

// ── Real-time friends list ────────────────────────────────────────────────────

export function useFriends(myUid: string | null) {
  const [friends, setFriends] = useState<Friendship[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!myUid) { setFriends([]); setLoading(false); return }

    const q = query(
      collection(requireFirestoreDb(), COLLECTIONS.FRIENDS),
      where('userIds', 'array-contains', myUid)
    )

    const unsub = onSnapshot(
      q,
      (snap) => {
        setFriends(
          snap.docs.map((d) => {
            const data = d.data()
            return {
              id: d.id,
              userIds: data.userIds,
              userNames: data.userNames ?? {},
              userAvatars: data.userAvatars ?? {},
              userUsernames: data.userUsernames ?? {},
              createdAt: tsToISO(data.createdAt),
            } as Friendship
          })
        )
        setLoading(false)
      },
      () => setLoading(false)
    )

    return () => unsub()
  }, [myUid])

  return { friends, loading }
}

// ── Per-profile friend status ─────────────────────────────────────────────────

/**
 * Returns the connection status between the current user and another profile.
 * Used to render the Connect / Pending / Accept / Friends button.
 */
export function useFriendStatus(
  myUid: string | null,
  theirUid: string | null
) {
  const [status, setStatus] = useState<FriendStatus>('none')
  const [requestId, setRequestId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!myUid || !theirUid || myUid === theirUid) {
      setStatus('none')
      setRequestId(null)
      setLoading(false)
      return
    }

    setLoading(true)

    const friendshipId = `friends_${[myUid, theirUid].sort().join('_')}`
    let isConnected = false
    let sentRequestId: string | null = null
    let receivedRequestId: string | null = null
    let loaded = 0

    function markLoaded() {
      loaded += 1
      if (loaded >= 3) setLoading(false)
    }

    function deriveStatus() {
      if (isConnected) {
        setStatus('friends')
        setRequestId(null)
      } else if (sentRequestId) {
        setStatus('pending_sent')
        setRequestId(sentRequestId)
      } else if (receivedRequestId) {
        setStatus('pending_received')
        setRequestId(receivedRequestId)
      } else {
        setStatus('none')
        setRequestId(null)
      }
    }

    const unsubFriend = onSnapshot(
      doc(requireFirestoreDb(), COLLECTIONS.FRIENDS, friendshipId),
      (snap) => {
        isConnected = snap.exists()
        deriveStatus()
        markLoaded()
      },
      () => {
        isConnected = false
        deriveStatus()
        markLoaded()
      }
    )

    const sentQuery = query(
      collection(requireFirestoreDb(), COLLECTIONS.FRIEND_REQUESTS),
      where('fromUserId', '==', myUid),
      where('toUserId', '==', theirUid),
      where('status', '==', 'pending')
    )
    const unsubSent = onSnapshot(
      sentQuery,
      (snap) => {
        sentRequestId = snap.docs[0]?.id ?? null
        deriveStatus()
        markLoaded()
      },
      () => {
        sentRequestId = null
        deriveStatus()
        markLoaded()
      }
    )

    const receivedQuery = query(
      collection(requireFirestoreDb(), COLLECTIONS.FRIEND_REQUESTS),
      where('fromUserId', '==', theirUid),
      where('toUserId', '==', myUid),
      where('status', '==', 'pending')
    )
    const unsubReceived = onSnapshot(
      receivedQuery,
      (snap) => {
        receivedRequestId = snap.docs[0]?.id ?? null
        deriveStatus()
        markLoaded()
      },
      () => {
        receivedRequestId = null
        deriveStatus()
        markLoaded()
      }
    )

    return () => {
      unsubFriend()
      unsubSent()
      unsubReceived()
    }
  }, [myUid, theirUid])

  return { status, requestId, loading, setStatus, setRequestId }
}
