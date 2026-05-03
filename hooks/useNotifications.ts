// hooks/useNotifications.ts
// Real-time notifications via Firestore onSnapshot listener
//
// Required composite index (create in Firebase console or deploy firestore.indexes.json):
//   Collection : notifications
//   Fields     : userId ASC, createdAt DESC
//
// Without this index, Firestore will reject the query.
// The error callback below catches it gracefully so it never crashes the UI.

'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import {
  collection,
  query,
  where,
  orderBy,
  limit,
  onSnapshot,
} from 'firebase/firestore'
import { db } from '@/lib/firebase/config'
import { COLLECTIONS } from '@/lib/firebase/collections'
import { Notification } from '@/lib/types'
import {
  markNotificationRead,
  markAllNotificationsRead,
  clearAllNotifications,
} from '@/services/notificationService'

export function useNotifications(userId: string | null) {
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [unreadCount, setUnreadCount] = useState(0)
  // Track whether we have already logged the index error so we don't spam console
  const indexErrorLogged = useRef(false)

  useEffect(() => {
    if (!userId) return

    // Composite index required: notifications → userId ASC, createdAt DESC
    // Deploy firestore.indexes.json (at project root) or create manually in Firebase console.
    const q = query(
      collection(db, COLLECTIONS.NOTIFICATIONS),
      where('userId', '==', userId),
      orderBy('createdAt', 'desc'),
      limit(20)
    )

    const unsubscribe = onSnapshot(
      q,
      // ── Success callback ──────────────────────────────────────────────────
      (snap) => {
        // Filter out soft-deleted (cleared) notifications on the client
        const notifs = snap.docs
          .map((d) => ({ id: d.id, ...d.data() } as Notification))
          .filter((n) => !n.cleared)
        setNotifications(notifs)
        setUnreadCount(notifs.filter((n) => !n.read).length)
      },
      // ── Error callback — prevents "Uncaught Error in snapshot listener" ───
      (error) => {
        if (!indexErrorLogged.current) {
          indexErrorLogged.current = true
          if (error.code === 'failed-precondition') {
            console.warn(
              '[KHOJ] Firestore index missing for notifications query.\n' +
              'Create a composite index:\n' +
              '  Collection : notifications\n' +
              '  Field 1    : userId  (Ascending)\n' +
              '  Field 2    : createdAt (Descending)\n' +
              'Or deploy firestore.indexes.json from the project root.\n' +
              'Firebase console shortcut link is in the original error above.\n' +
              'Falling back to empty notifications until the index is ready.'
            )
          } else {
            console.error('[KHOJ] Notifications listener error:', error.message)
          }
        }
        // Graceful fallback — UI continues working without notifications
        setNotifications([])
        setUnreadCount(0)
      }
    )

    return () => unsubscribe()
  }, [userId])

  /** Mark a single notification as read (optimistic UI update + Firestore write) */
  const markRead = useCallback(
    async (notificationId: string) => {
      // Optimistic update so badge decrements immediately
      setNotifications((prev) =>
        prev.map((n) => (n.id === notificationId ? { ...n, read: true } : n))
      )
      setUnreadCount((prev) => Math.max(0, prev - 1))
      try {
        await markNotificationRead(notificationId)
      } catch {
        // onSnapshot will self-correct the state on next emission
      }
    },
    []
  )

  /** Mark all notifications for this user as read */
  const markAllRead = useCallback(
    async () => {
      if (!userId) return
      setNotifications((prev) => prev.map((n) => ({ ...n, read: true })))
      setUnreadCount(0)
      try {
        await markAllNotificationsRead(userId)
      } catch {
        // onSnapshot will self-correct
      }
    },
    [userId]
  )

  /** Soft-delete all notifications for this user (sets cleared = true in Firestore) */
  const clearAll = useCallback(
    async () => {
      if (!userId) return
      // Optimistic — empty the list immediately
      setNotifications([])
      setUnreadCount(0)
      try {
        await clearAllNotifications(userId)
      } catch {
        // onSnapshot will self-correct if Firestore write fails
      }
    },
    [userId]
  )

  return { notifications, unreadCount, markRead, markAllRead, clearAll }
}
