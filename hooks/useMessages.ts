// hooks/useMessages.ts
// Real-time Firebase onSnapshot listeners for conversations and messages.
// Replaces the old 3-second polling approach.

'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import {
  collection,
  doc,
  updateDoc,
  query,
  where,
  orderBy,
  onSnapshot,
  Timestamp,
} from 'firebase/firestore'
import { requireFirestoreDb } from '@/lib/firebase/config'
import { COLLECTIONS, subCollections } from '@/lib/firebase/collections'
import { markConversationRead } from '@/services/messageService'
import { getUserById } from '@/services/userService'
import type { Conversation, DirectMessage } from '@/lib/types'

function tsToISO(ts: unknown): string {
  if (!ts) return new Date().toISOString()
  if (ts instanceof Timestamp) return ts.toDate().toISOString()
  if (typeof ts === 'string') return ts
  return new Date().toISOString()
}

// ── Conversations list ────────────────────────────────────────────────────────

export function useConversations(uid: string | null) {
  const [conversations, setConversations] = useState<Conversation[]>([])
  const [unreadTotal, setUnreadTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  // Track which conversation IDs we've already enriched so we don't repeat the fetch
  const enrichedRef = useRef<Set<string>>(new Set())

  useEffect(() => {
    if (!uid) {
      setConversations([])
      setUnreadTotal(0)
      setLoading(false)
      return
    }

    const q = query(
      collection(requireFirestoreDb(), COLLECTIONS.CONVERSATIONS),
      where('participantIds', 'array-contains', uid),
      orderBy('lastMessageAt', 'desc')
    )

    const unsub = onSnapshot(
      q,
      async (snap) => {
        const convos: Conversation[] = snap.docs.map((d) => {
          const data = d.data()
          return {
            id: d.id,
            participants: data.participants ?? [],
            participantIds: data.participantIds ?? [],
            lastMessage: data.lastMessage,
            lastMessageAt: data.lastMessageAt ? tsToISO(data.lastMessageAt) : undefined,
            lastMessageSenderId: data.lastMessageSenderId,
            createdAt: tsToISO(data.createdAt),
            updatedAt: data.updatedAt ? tsToISO(data.updatedAt) : undefined,
            unreadCount: data.unreadCount ?? {},
          } as Conversation
        })

        // ── Enrich incomplete participants in the background ──────────────
        // Detects: empty array, missing entries, "Unknown User" names, nameless
        // entries, or uid-prefix fallbacks (e.g. "User (abc12345)") from a
        // previous failed repair that should retry now the user doc may exist.
        const isNameBroken = (name?: string) =>
          !name || name === 'Unknown User' || name.startsWith('User (')

        const needsEnrich = convos.filter((c) => {
          if (enrichedRef.current.has(c.id)) return false
          if (c.participantIds.length < 2) return false
          return (
            c.participants.length === 0 ||
            c.participants.length < c.participantIds.length ||
            c.participants.some((p) => isNameBroken(p.name))
          )
        })

        if (needsEnrich.length > 0) {
          needsEnrich.forEach((c) => enrichedRef.current.add(c.id))

          needsEnrich.forEach(async (c) => {
            try {
              // Fetch all participant users in parallel
              const users = await Promise.all(
                c.participantIds.map((pid) => getUserById(pid))
              )

              // Build participant objects with robust name fallbacks.
              // Handles user docs that have: missing name, empty name, Firebase Auth
              // displayName/photoURL fields, or were never fully populated.
              const rebuilt = c.participantIds.map((pid, i) => {
                // Re-use existing entry if it already has a valid name
                const kept = c.participants.find(
                  (p) =>
                    p.uid === pid &&
                    p.name &&
                    p.name !== 'Unknown User' &&
                    !p.name.startsWith('User (')
                )
                if (kept) return kept

                const user = users[i] as (typeof users[number]) & {
                  displayName?: string
                  photoURL?: string
                }
                if (user) {
                  const name =
                    user.name ||
                    user.username ||
                    (user as any).displayName ||
                    user.email?.split('@')[0] ||
                    `User (${pid.slice(0, 8)})`
                  const avatarUrl = user.avatarUrl || (user as any).photoURL || undefined
                  return {
                    uid: pid,
                    name,
                    username: user.username ?? '',
                    avatarUrl,
                  }
                }
                // User doc missing — safe fallback with visible uid prefix
                console.warn(
                  `[useConversations] User doc missing for uid=${pid} in conversation ${c.id}`
                )
                return { uid: pid, name: `User (${pid.slice(0, 8)})`, username: '' }
              })

              // If ANY rebuilt entry is still nameless, allow retry on next snapshot
              const stillBroken = rebuilt.some((p) => !p.name)
              if (stillBroken) {
                enrichedRef.current.delete(c.id)
              }

              const convoRef = doc(requireFirestoreDb(), COLLECTIONS.CONVERSATIONS, c.id)
              await updateDoc(convoRef, { participants: rebuilt }).catch(() => {})
              // onSnapshot re-fires with the corrected participants
            } catch {
              enrichedRef.current.delete(c.id) // allow retry on next snapshot
            }
          })
        }

        setConversations(convos)
        setUnreadTotal(convos.reduce((sum, c) => sum + (c.unreadCount[uid] ?? 0), 0))
        setLoading(false)
      },
      (err) => {
        console.error('useConversations error:', err)
        setLoading(false)
      }
    )

    return () => unsub()
  }, [uid])

  // Kept for API compatibility — no-op since listeners auto-update
  const reload = useCallback(() => {}, [])

  return { conversations, unreadTotal, loading, reload }
}

// ── Single chat thread ────────────────────────────────────────────────────────

export function useChatMessages(
  conversationId: string | null,
  myUid: string | null
) {
  const [messages, setMessages] = useState<DirectMessage[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!conversationId || !myUid) {
      setMessages([])
      setLoading(false)
      return
    }

    const q = query(
      collection(requireFirestoreDb(), subCollections.messages(conversationId)),
      orderBy('createdAt', 'asc')
    )

    const unsub = onSnapshot(
      q,
      (snap) => {
        const msgs: DirectMessage[] = snap.docs.map((d) => {
          const data = d.data()
          return {
            id: d.id,
            conversationId,
            senderId: data.senderId,
            text: data.text,
            createdAt: tsToISO(data.createdAt),
            readBy: data.readBy ?? [],
          }
        })
        setMessages(msgs)
        setLoading(false)
        // Mark as read when new messages arrive
        markConversationRead(conversationId, myUid).catch(() => {})
      },
      (err) => {
        console.error('useChatMessages error:', err)
        setLoading(false)
      }
    )

    return () => unsub()
  }, [conversationId, myUid])

  // Kept for API compatibility
  const reload = useCallback(() => {}, [])

  return { messages, loading, reload }
}

// ── Typing indicator ──────────────────────────────────────────────────────────

/**
 * Returns whether the other participant is currently typing.
 * Listens to the `typing` map on the conversation document.
 * Considers a timestamp "active" if it was written within the last 5 seconds.
 */
export function useTypingStatus(
  conversationId: string | null,
  otherUid: string | null
): boolean {
  const [isTyping, setIsTyping] = useState(false)

  useEffect(() => {
    if (!conversationId || !otherUid) { setIsTyping(false); return }

    const convoRef = doc(requireFirestoreDb(), COLLECTIONS.CONVERSATIONS, conversationId)
    const unsub = onSnapshot(convoRef, (snap) => {
      if (!snap.exists()) { setIsTyping(false); return }
      const typing = snap.data()?.typing as Record<string, Timestamp> | undefined
      const ts = typing?.[otherUid]
      if (!ts) { setIsTyping(false); return }
      const age = Date.now() - ts.toDate().getTime()
      setIsTyping(age < 5000)
    }, () => setIsTyping(false))

    return () => unsub()
  }, [conversationId, otherUid])

  return isTyping
}

// ── User online presence ──────────────────────────────────────────────────────

/**
 * Returns whether a user is online (active in the last 3 minutes).
 * Listens to the `lastActive` field on their user document.
 */
export function useUserPresence(uid: string | null): boolean {
  const [isOnline, setIsOnline] = useState(false)

  useEffect(() => {
    if (!uid) { setIsOnline(false); return }

    const userRef = doc(requireFirestoreDb(), 'users', uid)
    const unsub = onSnapshot(userRef, (snap) => {
      if (!snap.exists()) { setIsOnline(false); return }
      const lastActive = snap.data()?.lastActive
      if (!lastActive) { setIsOnline(false); return }
      const t = lastActive instanceof Timestamp
        ? lastActive.toDate().getTime()
        : new Date(lastActive as string).getTime()
      setIsOnline(Date.now() - t < 3 * 60 * 1000)
    }, () => setIsOnline(false))

    return () => unsub()
  }, [uid])

  return isOnline
}
