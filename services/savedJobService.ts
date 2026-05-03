// services/savedJobService.ts
// localStorage-backed saved jobs service.
// Users can bookmark any JobPost; the service stores a snapshot so cards
// still render even if the original job is later deleted or deactivated.
//
// ── How to connect Firestore later ───────────────────────────────────────────
// 1. setDoc(doc(db, 'savedJobs', id), data)            // saveJob
// 2. deleteDoc(doc(db, 'savedJobs', id))               // unsaveJob
// 3. getDocs(query(collection(db,'savedJobs'), where('userId','==', uid)))
//                                                      // getSavedJobsByUser
// 4. Real-time: onSnapshot for live badge counts.
// ─────────────────────────────────────────────────────────────────────────────

import type { SavedJob, JobPost } from '@/lib/types'

const KEY = 'khoj_saved_jobs'

// ── Low-level helpers ─────────────────────────────────────────────────────────

function readAll(): SavedJob[] {
  if (typeof window === 'undefined') return []
  try {
    return JSON.parse(localStorage.getItem(KEY) ?? '[]') as SavedJob[]
  } catch {
    return []
  }
}

function writeAll(data: SavedJob[]): void {
  if (typeof window === 'undefined') return
  localStorage.setItem(KEY, JSON.stringify(data))
}

/** Deterministic ID ensures idempotent save operations. */
function savedId(userId: string, jobId: string) {
  return `saved_${userId}_${jobId}`
}

// ── Reads ─────────────────────────────────────────────────────────────────────

/** All jobs saved by a user, newest first. */
export function getSavedJobsByUser(userId: string): SavedJob[] {
  return readAll()
    .filter((s) => s.userId === userId)
    .sort((a, b) => b.savedAt.localeCompare(a.savedAt))
}

/** Whether the user has saved a specific job. */
export function isJobSaved(jobId: string, userId: string): boolean {
  return readAll().some((s) => s.id === savedId(userId, jobId))
}

/** Count of saved jobs for a user — use for badge display. */
export function getSavedJobCount(userId: string): number {
  return readAll().filter((s) => s.userId === userId).length
}

// ── Writes ────────────────────────────────────────────────────────────────────

/**
 * Save a job for a user. Idempotent — calling twice does not duplicate.
 * Returns the SavedJob record.
 */
export function saveJob(job: JobPost, userId: string): SavedJob {
  const list = readAll()
  const id = savedId(userId, job.id)
  const existing = list.find((s) => s.id === id)
  if (existing) return existing

  const saved: SavedJob = {
    id,
    userId,
    jobId: job.id,
    jobTitle: job.title,
    company: job.company,
    location: job.location,
    workType: job.workType,
    salaryMin: job.salaryMin,
    salaryMax: job.salaryMax,
    salaryCurrency: job.salaryCurrency,
    category: job.category,
    deadline: job.deadline,
    savedAt: new Date().toISOString(),
  }
  writeAll([...list, saved])
  return saved
}

/** Remove a saved job. Idempotent — no-op if not saved. */
export function unsaveJob(jobId: string, userId: string): void {
  writeAll(readAll().filter((s) => s.id !== savedId(userId, jobId)))
}

/** Toggle save state. Returns true if the job is now saved, false if unsaved. */
export function toggleSaveJob(job: JobPost, userId: string): boolean {
  if (isJobSaved(job.id, userId)) {
    unsaveJob(job.id, userId)
    return false
  } else {
    saveJob(job, userId)
    return true
  }
}
