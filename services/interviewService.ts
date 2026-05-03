// services/interviewService.ts
// localStorage-backed interview scheduling service.
// Covers: schedule · update status · query by recruiter / candidate / application.
//
// ── How to connect Firestore later ───────────────────────────────────────────
// 1. Replace readAll/writeAll with:
//      await addDoc(collection(db, 'interviews'), data)         // scheduleInterview
//      await updateDoc(doc(db, 'interviews', id), { status })  // updateInterviewStatus
// 2. Query recruiter view:
//      getDocs(query(collection(db,'interviews'), where('recruiterId','==', uid)))
// 3. Query candidate view:
//      getDocs(query(collection(db,'interviews'), where('candidateId','==', uid)))
// 4. For real-time: onSnapshot instead of one-off getDocs.
// ─────────────────────────────────────────────────────────────────────────────

import type { InterviewSchedule, InterviewStatus, MeetingType } from '@/lib/types'

// ── Storage key ───────────────────────────────────────────────────────────────

const KEY = 'khoj_interviews'

// ── Low-level helpers ─────────────────────────────────────────────────────────

function genId(): string {
  return `iv_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`
}

function now(): string {
  return new Date().toISOString()
}

function readAll(): InterviewSchedule[] {
  if (typeof window === 'undefined') return []
  try {
    return JSON.parse(localStorage.getItem(KEY) ?? '[]') as InterviewSchedule[]
  } catch {
    return []
  }
}

function writeAll(data: InterviewSchedule[]): void {
  if (typeof window === 'undefined') return
  localStorage.setItem(KEY, JSON.stringify(data))
}

// ── Public create params ──────────────────────────────────────────────────────

export interface CreateInterviewParams {
  jobId: string
  jobTitle: string
  applicationId: string
  recruiterId: string
  recruiterName: string
  candidateId: string
  candidateName: string
  candidateUsername?: string
  candidateAvatarUrl?: string
  title: string
  date: string
  time: string
  timezone: string
  meetingType: MeetingType
  meetingLink?: string
  location?: string
  notes?: string
}

// ── Reads ─────────────────────────────────────────────────────────────────────

/** All interviews created by a recruiter, newest first. */
export function getInterviewsByRecruiter(recruiterId: string): InterviewSchedule[] {
  return readAll()
    .filter((i) => i.recruiterId === recruiterId)
    .sort((a, b) => b.scheduledAt.localeCompare(a.scheduledAt))
}

/** All interviews a candidate has been invited to, newest first. */
export function getInterviewsByCandidate(candidateId: string): InterviewSchedule[] {
  return readAll()
    .filter((i) => i.candidateId === candidateId)
    .sort((a, b) => b.scheduledAt.localeCompare(a.scheduledAt))
}

/** Interviews linked to a specific job application. */
export function getInterviewsByApplication(applicationId: string): InterviewSchedule[] {
  return readAll().filter((i) => i.applicationId === applicationId)
}

/** Single interview by id — null if not found. */
export function getInterview(id: string): InterviewSchedule | null {
  return readAll().find((i) => i.id === id) ?? null
}

/** Count of interviews in 'scheduled' state for the candidate (unread-style count). */
export function getPendingInterviewCount(candidateId: string): number {
  return readAll().filter(
    (i) => i.candidateId === candidateId && i.status === 'scheduled'
  ).length
}

/** Count summary for a recruiter's active interviews by status. */
export function getRecruiterInterviewCounts(
  recruiterId: string
): Record<InterviewStatus, number> {
  const all = getInterviewsByRecruiter(recruiterId)
  const base: Record<InterviewStatus, number> = {
    scheduled: 0,
    accepted: 0,
    declined: 0,
    reschedule_requested: 0,
    completed: 0,
    cancelled: 0,
  }
  for (const i of all) base[i.status]++
  return base
}

// ── Writes ────────────────────────────────────────────────────────────────────

/** Create and persist a new interview. Returns the created record. */
export function scheduleInterview(params: CreateInterviewParams): InterviewSchedule {
  const list = readAll()
  const interview: InterviewSchedule = {
    id: genId(),
    ...params,
    status: 'scheduled',
    scheduledAt: now(),
    updatedAt: now(),
  }
  writeAll([...list, interview])
  return interview
}

/**
 * Update the status of an interview.
 * Pass `rescheduleNote` when status is 'reschedule_requested'.
 * Returns the updated record or null if not found.
 */
export function updateInterviewStatus(
  id: string,
  status: InterviewStatus,
  rescheduleNote?: string
): InterviewSchedule | null {
  const list = readAll()
  const idx = list.findIndex((i) => i.id === id)
  if (idx === -1) return null
  list[idx] = {
    ...list[idx],
    status,
    rescheduleNote:
      rescheduleNote !== undefined ? rescheduleNote : list[idx].rescheduleNote,
    updatedAt: now(),
  }
  writeAll(list)
  return list[idx]
}

/** Hard-delete an interview record. */
export function deleteInterview(id: string): void {
  writeAll(readAll().filter((i) => i.id !== id))
}
