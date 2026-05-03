// services/notificationService.ts
// In-app notifications stored in Firestore

import {
  collection,
  doc,
  addDoc,
  updateDoc,
  getDocs,
  query,
  where,
  orderBy,
  limit,
  writeBatch,
} from 'firebase/firestore'
import { db } from '@/lib/firebase/config'
import { COLLECTIONS } from '@/lib/firebase/collections'
import { Notification } from '@/lib/types'

type CreateNotificationInput = Omit<Notification, 'id' | 'read' | 'createdAt'>

/**
 * Infer a sensible actionUrl from notification type + metadata when none is explicitly provided.
 */
export function resolveNotificationUrl(
  type: Notification['type'],
  actionUrl?: string,
  metadata?: Record<string, string | number>
): string {
  if (actionUrl) return actionUrl
  switch (type) {
    case 'message':           return metadata?.conversationId
                                ? `/messages/${metadata.conversationId}`
                                : '/messages'
    case 'job_unlock':        return '/jobs'
    case 'result':
    case 'win':
    case 'tournament_start':  return '/tournaments'
    case 'xp_gained':
    case 'rank_change':       return '/leaderboard'
    case 'post_like':
    case 'post_comment':      return '/community'
    case 'new_follower':      return metadata?.followerId ? `/profile/${metadata.followerId}` : '/network'
    case 'connection_request': return '/network/requests'
    case 'connection_accepted': return '/network'
    case 'announcement':      return '/dashboard'
    default:                  return '/notifications'
  }
}

/**
 * Create a new notification for a user
 */
export async function createNotification(
  data: CreateNotificationInput
): Promise<void> {
  await addDoc(collection(db, COLLECTIONS.NOTIFICATIONS), {
    ...data,
    // Ensure actionUrl is always stored so click handlers can use it
    actionUrl: data.actionUrl ?? resolveNotificationUrl(data.type, undefined, data.metadata),
    read: false,
    createdAt: new Date().toISOString(),
  })
}

/**
 * Fetch all notifications for a user (latest 20)
 */
export async function getUserNotifications(userId: string): Promise<Notification[]> {
  const q = query(
    collection(db, COLLECTIONS.NOTIFICATIONS),
    where('userId', '==', userId),
    orderBy('createdAt', 'desc'),
    limit(20)
  )
  const snap = await getDocs(q)
  return snap.docs.map((d) => ({ id: d.id, ...d.data() } as Notification))
}

/**
 * Mark a single notification as read
 */
export async function markNotificationRead(notificationId: string): Promise<void> {
  const ref = doc(db, COLLECTIONS.NOTIFICATIONS, notificationId)
  await updateDoc(ref, { read: true })
}

/**
 * Mark all notifications for a user as read
 */
export async function markAllNotificationsRead(userId: string): Promise<void> {
  const q = query(
    collection(db, COLLECTIONS.NOTIFICATIONS),
    where('userId', '==', userId),
    where('read', '==', false)
  )
  const snap = await getDocs(q)
  const batch = writeBatch(db)
  snap.docs.forEach((d) => batch.update(d.ref, { read: true }))
  await batch.commit()
}

/**
 * Soft-delete all notifications for a user by setting cleared = true.
 * Documents are kept in Firestore for audit purposes and can be restored.
 */
export async function clearAllNotifications(userId: string): Promise<void> {
  const q = query(
    collection(db, COLLECTIONS.NOTIFICATIONS),
    where('userId', '==', userId)
  )
  const snap = await getDocs(q)
  if (snap.empty) return
  const batch = writeBatch(db)
  snap.docs.forEach((d) => batch.update(d.ref, { cleared: true, read: true }))
  await batch.commit()
}

/**
 * Send job unlock notification
 */
export async function notifyJobUnlock(
  userId: string,
  jobTitle: string,
  company: string
): Promise<void> {
  await createNotification({
    userId,
    type: 'job_unlock',
    title: '🎯 New Job Unlocked!',
    message: `You've unlocked the ${jobTitle} position at ${company}!`,
    actionUrl: '/jobs',
    metadata: { jobTitle, company },
  })
}
