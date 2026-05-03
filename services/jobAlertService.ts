// services/jobAlertService.ts
// localStorage-backed job alerts service.
// Users create keyword/category/location alerts; recruiters would trigger them
// when posting matching jobs (notification layer added separately).
//
// ── How to connect Firestore later ───────────────────────────────────────────
// 1. addDoc(collection(db,'jobAlerts'), data)          // createAlert
// 2. updateDoc(doc(db,'jobAlerts', id), updates)       // updateAlert, toggleAlert
// 3. deleteDoc(doc(db,'jobAlerts', id))                // deleteAlert
// 4. getDocs(query(collection(db,'jobAlerts'), where('userId','==', uid)))
// ─────────────────────────────────────────────────────────────────────────────

import type { JobAlert, AlertFrequency, JobCategory, WorkType } from '@/lib/types'

const KEY = 'khoj_job_alerts'

// ── Low-level helpers ─────────────────────────────────────────────────────────

function genId(): string {
  return `alert_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`
}

function now(): string {
  return new Date().toISOString()
}

function readAll(): JobAlert[] {
  if (typeof window === 'undefined') return []
  try {
    return JSON.parse(localStorage.getItem(KEY) ?? '[]') as JobAlert[]
  } catch {
    return []
  }
}

function writeAll(data: JobAlert[]): void {
  if (typeof window === 'undefined') return
  localStorage.setItem(KEY, JSON.stringify(data))
}

// ── Create params ─────────────────────────────────────────────────────────────

export interface CreateAlertParams {
  userId: string
  label: string
  keyword?: string
  category?: JobCategory
  location?: string
  workType?: WorkType
  salaryMin?: number
  salaryMax?: number
  frequency: AlertFrequency
}

// ── Reads ─────────────────────────────────────────────────────────────────────

/** All alerts for a user, newest first. */
export function getAlertsByUser(userId: string): JobAlert[] {
  return readAll()
    .filter((a) => a.userId === userId)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
}

/** Count of active alerts — use for badge display. */
export function getActiveAlertCount(userId: string): number {
  return readAll().filter((a) => a.userId === userId && a.active).length
}

/** Total alert count (active + paused) — use for total badge. */
export function getTotalAlertCount(userId: string): number {
  return readAll().filter((a) => a.userId === userId).length
}

// ── Writes ────────────────────────────────────────────────────────────────────

/** Create a new job alert. Returns the created record. */
export function createAlert(params: CreateAlertParams): JobAlert {
  const list = readAll()
  const alert: JobAlert = {
    id: genId(),
    ...params,
    active: true,
    createdAt: now(),
    updatedAt: now(),
  }
  writeAll([...list, alert])
  return alert
}

/** Update alert fields. Returns the updated record or null if not found. */
export function updateAlert(
  id: string,
  updates: Partial<
    Pick<
      JobAlert,
      | 'label'
      | 'keyword'
      | 'category'
      | 'location'
      | 'workType'
      | 'salaryMin'
      | 'salaryMax'
      | 'frequency'
    >
  >
): JobAlert | null {
  const list = readAll()
  const idx = list.findIndex((a) => a.id === id)
  if (idx === -1) return null
  list[idx] = { ...list[idx], ...updates, updatedAt: now() }
  writeAll(list)
  return list[idx]
}

/** Toggle active/paused state. Returns new active value. */
export function toggleAlert(id: string): boolean {
  const list = readAll()
  const idx = list.findIndex((a) => a.id === id)
  if (idx === -1) return false
  list[idx] = { ...list[idx], active: !list[idx].active, updatedAt: now() }
  writeAll(list)
  return list[idx].active
}

/** Delete an alert permanently. */
export function deleteAlert(id: string): void {
  writeAll(readAll().filter((a) => a.id !== id))
}
