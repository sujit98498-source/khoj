// apps/mobile/hooks/useMessages.ts
// Stage 1 — real-time message stream for a single conversation.
// Also provides sendMessage() which updates the parent conversation doc.

import { useEffect, useState, useCallback } from 'react'
import {
  collection, query, orderBy, onSnapshot,
  addDoc, updateDoc, doc, serverTimestamp,
  increment, Timestamp,
} from 'firebase/firestore'
import { db, COLLECTIONS } from '@/lib/firebase'

export interface Message {
  id:          string
  senderId:    string
  senderName:  string
  content:     string
  type:        'text' | 'voice_call' | 'video_call' | 'missed_call'
  callData?:   { duration?: number; callType: 'voice' | 'video' }
  createdAt:   Timestamp | null
  readBy:      string[]
}

export function useMessages(conversationId: string | null) {
  const [messages, setMessages] = useState<Message[]>([])
  const [loading, setLoading]   = useState(true)

  useEffect(() => {
    if (!conversationId) { setLoading(false); return }

    const q = query(
      collection(db, COLLECTIONS.CONVERSATIONS, conversationId, 'messages'),
      orderBy('createdAt', 'asc'),
    )

    const unsub = onSnapshot(
      q,
      (snap) => {
        setMessages(snap.docs.map((d) => ({ id: d.id, ...d.data() } as Message)))
        setLoading(false)
      },
      () => setLoading(false),
    )

    return unsub
  }, [conversationId])

  /** Send a plain text message */
  const sendMessage = useCallback(
    async (params: {
      senderId:   string
      senderName: string
      content:    string
    }) => {
      if (!conversationId || !params.content.trim()) return

      const msgRef = collection(db, COLLECTIONS.CONVERSATIONS, conversationId, 'messages')
      await addDoc(msgRef, {
        senderId:   params.senderId,
        senderName: params.senderName,
        content:    params.content.trim(),
        type:       'text',
        createdAt:  serverTimestamp(),
        readBy:     [params.senderId],
      })

      // Update parent conversation snapshot
      await updateDoc(doc(db, COLLECTIONS.CONVERSATIONS, conversationId), {
        lastMessage:         params.content.trim(),
        lastMessageAt:       serverTimestamp(),
        lastMessageSenderId: params.senderId,
      })
    },
    [conversationId],
  )

  /** Insert a system-style call event message */
  const addCallMessage = useCallback(
    async (params: {
      senderId:   string
      senderName: string
      type:       'voice_call' | 'video_call' | 'missed_call'
      callType:   'voice' | 'video'
      duration?:  number
    }) => {
      if (!conversationId) return
      const label =
        params.type === 'missed_call'
          ? `Missed ${params.callType} call`
          : params.type === 'voice_call'
          ? `Voice call${params.duration ? ` · ${formatDuration(params.duration)}` : ''}`
          : `Video call${params.duration ? ` · ${formatDuration(params.duration)}` : ''}`

      const msgRef = collection(db, COLLECTIONS.CONVERSATIONS, conversationId, 'messages')
      await addDoc(msgRef, {
        senderId:   params.senderId,
        senderName: params.senderName,
        content:    label,
        type:       params.type,
        callData:   { callType: params.callType, duration: params.duration },
        createdAt:  serverTimestamp(),
        readBy:     [params.senderId],
      })

      await updateDoc(doc(db, COLLECTIONS.CONVERSATIONS, conversationId), {
        lastMessage:         label,
        lastMessageAt:       serverTimestamp(),
        lastMessageSenderId: params.senderId,
      })
    },
    [conversationId],
  )

  return { messages, loading, sendMessage, addCallMessage }
}

function formatDuration(seconds: number): string {
  const m = Math.floor(seconds / 60)
  const s = seconds % 60
  return `${m}:${String(s).padStart(2, '0')}`
}
