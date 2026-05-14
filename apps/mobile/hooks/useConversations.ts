// apps/mobile/hooks/useConversations.ts
// Stage 1 — real-time inbox: all conversations the current user is part of,
// sorted by most-recent message first.

import { useEffect, useState } from 'react'
import {
  collection, query, where, orderBy,
  onSnapshot, type Timestamp,
} from 'firebase/firestore'
import { db, COLLECTIONS } from '@/lib/firebase'

export interface Conversation {
  id:                  string
  participantIds:      string[]
  participants:        Record<string, { name: string; avatarUrl?: string; username?: string }>
  lastMessage:         string
  lastMessageAt:       Timestamp | null
  lastMessageSenderId: string
  unreadCount:         Record<string, number>
  createdAt:           Timestamp | null
}

export function useConversations(uid: string | null) {
  const [conversations, setConversations] = useState<Conversation[]>([])
  const [loading, setLoading]             = useState(true)

  useEffect(() => {
    if (!uid) { setLoading(false); return }

    const q = query(
      collection(db, COLLECTIONS.CONVERSATIONS),
      where('participantIds', 'array-contains', uid),
      orderBy('lastMessageAt', 'desc'),
    )

    const unsub = onSnapshot(
      q,
      (snap) => {
        setConversations(snap.docs.map((d) => ({ id: d.id, ...d.data() } as Conversation)))
        setLoading(false)
      },
      () => setLoading(false),
    )

    return unsub
  }, [uid])

  const totalUnread = conversations.reduce(
    (acc, c) => acc + (uid ? (c.unreadCount?.[uid] ?? 0) : 0),
    0,
  )

  return { conversations, loading, totalUnread }
}
