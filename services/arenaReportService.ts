// services/arenaReportService.ts
// Handles writing content reports from Arena to Firestore reports/{id}.
// Schema is compatible with admin review dashboard.

import { collection, addDoc, serverTimestamp } from 'firebase/firestore'
import { db } from '@/lib/firebase/config'

export type ReportTargetType = 'stream' | 'video' | 'clip'

export type ReportReason =
  | 'spam'
  | 'harassment'
  | 'scam'
  | 'fake_content'
  | 'copyright'
  | 'other'

export interface ArenaReportPayload {
  targetType: ReportTargetType
  targetId: string
  /** UID or name identifier of the content creator */
  creatorId: string
  reason: ReportReason
  /** Optional additional context from the reporter */
  details: string
  /** Firebase UID of the user submitting the report */
  reportedBy: string
}

/**
 * Writes a content report to Firestore `reports/{id}`.
 * Status starts as "open" for admin triage.
 */
export async function submitArenaReport(
  payload: ArenaReportPayload
): Promise<void> {
  await addDoc(collection(db, 'reports'), {
    ...payload,
    createdAt: serverTimestamp(),
    status: 'open',
  })
}
