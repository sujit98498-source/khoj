// services/reportService.ts
// Global unified report service — writes to Firestore `reports/{id}`.
// Used by all content types: streams, videos, clips, posts, comments, users,
// jobs, rooms, tournaments. Admin reads from this collection.

import {
  collection,
  addDoc,
  doc,
  updateDoc,
  serverTimestamp,
  query,
  orderBy,
  onSnapshot,
  getDocs,
  where,
  Timestamp,
} from 'firebase/firestore'
import { db } from '@/lib/firebase/config'

// ── Types ─────────────────────────────────────────────────────────────────────

export type ReportTargetType =
  | 'stream'
  | 'video'
  | 'clip'
  | 'post'
  | 'comment'
  | 'user'
  | 'job'
  | 'room'
  | 'tournament'

export type ReportStatus = 'pending' | 'reviewed' | 'dismissed' | 'action_taken'

export interface Report {
  id: string
  targetType: ReportTargetType
  targetId: string
  targetTitle: string
  targetPreview: string
  targetOwnerId: string
  targetOwnerName: string
  reason: string
  details: string
  reportedBy: string
  reporterName: string
  status: ReportStatus
  createdAt: string | Timestamp
  reviewedAt: string | Timestamp | null
  reviewedBy: string | null
  actionTaken: string | null
}

export interface CreateReportPayload {
  targetType: ReportTargetType
  targetId: string
  targetTitle: string
  targetPreview: string
  targetOwnerId: string
  targetOwnerName: string
  reason: string
  details: string
  reportedBy: string
  reporterName: string
}

// ── Create ────────────────────────────────────────────────────────────────────

/**
 * Creates a report in `reports/{id}`.
 * Checks for duplicate: same reporter + same target → throws DuplicateReportError.
 */
export async function createReport(payload: CreateReportPayload): Promise<string> {
  // Duplicate check: same user already reported this content
  const dupQuery = query(
    collection(db, 'reports'),
    where('reportedBy', '==', payload.reportedBy),
    where('targetId', '==', payload.targetId),
    where('targetType', '==', payload.targetType)
  )
  const dupSnap = await getDocs(dupQuery)
  if (!dupSnap.empty) {
    throw new Error('DUPLICATE_REPORT')
  }

  const ref = await addDoc(collection(db, 'reports'), {
    ...payload,
    status: 'pending',
    createdAt: serverTimestamp(),
    reviewedAt: null,
    reviewedBy: null,
    actionTaken: null,
  })
  return ref.id
}

// ── Admin reads ───────────────────────────────────────────────────────────────

/** Live subscription to all reports, newest first. Admin only. */
export function subscribeReports(
  callback: (reports: Report[]) => void
): () => void {
  const q = query(collection(db, 'reports'), orderBy('createdAt', 'desc'))
  return onSnapshot(q, (snap) => {
    const items: Report[] = snap.docs.map((d) => ({
      id: d.id,
      ...(d.data() as Omit<Report, 'id'>),
    }))
    callback(items)
  })
}

// ── Admin actions ─────────────────────────────────────────────────────────────

/** Mark a report as reviewed */
export async function markReportReviewed(
  reportId: string,
  adminUid: string
): Promise<void> {
  await updateDoc(doc(db, 'reports', reportId), {
    status: 'reviewed',
    reviewedAt: serverTimestamp(),
    reviewedBy: adminUid,
    actionTaken: 'reviewed',
  })
}

/** Dismiss a report (no action required) */
export async function dismissReport(
  reportId: string,
  adminUid: string
): Promise<void> {
  await updateDoc(doc(db, 'reports', reportId), {
    status: 'dismissed',
    reviewedAt: serverTimestamp(),
    reviewedBy: adminUid,
    actionTaken: 'dismissed',
  })
}

/**
 * Soft-delete the reported target content and mark report as action_taken.
 * Sets `isDeleted: true, deletedByAdmin: true, deletedAt: serverTimestamp()`
 * on the target document, based on targetType → collection mapping.
 */
export async function removeReportTarget(
  reportId: string,
  targetType: ReportTargetType,
  targetId: string,
  adminUid: string
): Promise<void> {
  // Soft-delete the target
  const targetCollection = TARGET_COLLECTION[targetType]
  if (targetCollection) {
    await updateDoc(doc(db, targetCollection, targetId), {
      isDeleted: true,
      deletedByAdmin: true,
      deletedAt: serverTimestamp(),
    })
  }

  // Update report
  await updateDoc(doc(db, 'reports', reportId), {
    status: 'action_taken',
    reviewedAt: serverTimestamp(),
    reviewedBy: adminUid,
    actionTaken: 'target_removed',
  })
}

// ── Helpers ───────────────────────────────────────────────────────────────────

const TARGET_COLLECTION: Partial<Record<ReportTargetType, string>> = {
  stream:     'streams',
  post:       'communityPosts',
  comment:    'communityComments',
  user:       'users',
  job:        'jobs',
  room:       'rooms',
  tournament: 'tournaments',
  // video/clip are mock data — no Firestore doc to soft-delete
}

/** Route to navigate to the target for admin "View Target" */
export function getTargetRoute(
  targetType: ReportTargetType,
  targetId: string
): string {
  switch (targetType) {
    case 'stream':     return `/streams/${targetId}`
    case 'video':      return `/arena?v=${targetId}`
    case 'clip':       return `/arena?c=${targetId}`
    case 'post':       return `/community?post=${targetId}`
    case 'comment':    return `/community?post=${targetId}`
    case 'user':       return `/profile/${targetId}`
    case 'job':        return `/jobs/${targetId}`
    case 'room':       return `/rooms/${targetId}`
    case 'tournament': return `/tournaments/${targetId}`
    default:           return '/arena'
  }
}

/** Human-readable label for a target type */
export const TARGET_TYPE_LABEL: Record<ReportTargetType, string> = {
  stream:     'Live Stream',
  video:      'Video',
  clip:       'Clip',
  post:       'Community Post',
  comment:    'Comment',
  user:       'User/Profile',
  job:        'Job Listing',
  room:       'Room',
  tournament: 'Tournament',
}
