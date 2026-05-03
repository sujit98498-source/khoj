// services/startupEvaluationService.ts
// KHOJ AI — Client-side Firestore helpers for startup evaluations
// Used by UI components to fetch / listen to evaluations

import { db } from '@/lib/firebase/config'
import {
  collection,
  doc,
  getDoc,
  getDocs,
  query,
  where,
  orderBy,
  limit,
  onSnapshot,
  Unsubscribe,
} from 'firebase/firestore'
import type { StartupEvaluationResult } from '@/lib/ai/startupEvaluation'

export interface StoredEvaluation extends StartupEvaluationResult {
  evaluationId: string
  userId: string
  roomId: string | null
  startupId: string | null
  startupName: string
  visibility: 'private' | 'public'
  createdAt: string
  updatedAt: string
  restricted?: boolean
}

// ── Fetch a single evaluation by ID ──────────────────────────────────────────
export async function getEvaluationById(evaluationId: string): Promise<StoredEvaluation | null> {
  const snap = await getDoc(doc(db, 'startupEvaluations', evaluationId))
  if (!snap.exists()) return null
  return { evaluationId: snap.id, ...snap.data() } as StoredEvaluation
}

// ── Fetch the latest room AI evaluation summary (public fields only) ──────────
export async function getLatestRoomEvaluation(
  roomId: string
): Promise<Pick<StoredEvaluation, 'evaluationId' | 'overallScore' | 'ratingLabel' | 'summary' | 'confidenceLevel' | 'createdAt'> | null> {
  const q = query(
    collection(db, 'rooms', roomId, 'aiEvaluations'),
    orderBy('createdAt', 'desc'),
    limit(1)
  )
  const snap = await getDocs(q)
  if (snap.empty) return null
  const d = snap.docs[0]
  return { evaluationId: d.id, ...d.data() } as any
}

// ── Listen to room AI evaluations (real-time) ─────────────────────────────────
export function subscribeToRoomEvaluation(
  roomId: string,
  callback: (data: Pick<StoredEvaluation, 'evaluationId' | 'overallScore' | 'ratingLabel' | 'summary' | 'confidenceLevel' | 'createdAt'> | null) => void
): Unsubscribe {
  const q = query(
    collection(db, 'rooms', roomId, 'aiEvaluations'),
    orderBy('createdAt', 'desc'),
    limit(1)
  )
  return onSnapshot(q, (snap) => {
    if (snap.empty) { callback(null); return }
    const d = snap.docs[0]
    callback({ evaluationId: d.id, ...d.data() } as any)
  })
}

// ── Fetch all evaluations for a user ─────────────────────────────────────────
export async function getUserEvaluations(userId: string): Promise<StoredEvaluation[]> {
  const q = query(
    collection(db, 'startupEvaluations'),
    where('userId', '==', userId),
    orderBy('createdAt', 'desc'),
    limit(20)
  )
  const snap = await getDocs(q)
  return snap.docs.map((d) => ({ evaluationId: d.id, ...d.data() })) as StoredEvaluation[]
}
