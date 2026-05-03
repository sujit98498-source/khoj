// services/trackService.ts
// Firestore operations for the KHOJ Tracks system.

import {
  collection,
  doc,
  addDoc,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
  deleteDoc,
  onSnapshot,
  query,
  where,
  orderBy,
  limit,
  serverTimestamp,
  increment,
  Timestamp,
  writeBatch,
} from 'firebase/firestore'
import { db } from '@/lib/firebase/config'

// ── Types ─────────────────────────────────────────────────────────────────────

export type TrackLevel      = 'beginner' | 'intermediate' | 'advanced'
export type TrackStatus     = 'published' | 'draft'
export type TrackVisibility = 'public' | 'private'
export type LessonType      = 'video' | 'clip' | 'live_replay' | 'text'
export type SubmissionType  = 'text' | 'link' | 'file' | 'video'
export type EnrollmentStatus = 'in_progress' | 'completed'
export type SubmissionStatus = 'submitted' | 'reviewed' | 'approved' | 'rejected'

export const TRACK_CATEGORIES = [
  'Coding', 'Startup', 'Design', 'Gaming',
  'Business', 'Marketing', 'Language', 'Other',
] as const
export type TrackCategory = typeof TRACK_CATEGORIES[number]

export interface TrackDoc {
  id: string
  title: string
  description: string
  category: TrackCategory | string
  level: TrackLevel
  creatorId: string
  creatorName: string
  creatorPhoto: string
  thumbnailUrl: string
  visibility: TrackVisibility
  status: TrackStatus
  lessonCount: number
  enrolledCount: number
  completedCount: number
  challengeCount: number
  averageRating: number
  tags: string[]
  createdAt: Timestamp | string
  updatedAt: Timestamp | string
}

export interface TrackLesson {
  id: string
  title: string
  description: string
  type: LessonType
  mediaId: string
  videoUrl: string
  thumbnailUrl: string
  duration: number
  order: number
  isPreview: boolean
  createdAt: Timestamp | string
}

export interface TrackChallenge {
  id: string
  title: string
  description: string
  instructions: string
  difficulty: 'easy' | 'medium' | 'hard'
  points: number
  submissionType: SubmissionType
  dueDate: string
  order: number
  createdAt: Timestamp | string
}

export interface TrackEnrollment {
  trackId: string
  title: string
  category: string
  thumbnailUrl: string
  progressPercent: number
  completedLessons: string[]
  totalLessons: number
  completedChallenges: string[]
  totalChallenges: number
  status: EnrollmentStatus
  enrolledAt: Timestamp | string
  completedAt: Timestamp | string | null
  lastLessonId: string
}

export interface TrackProgress {
  userId: string
  userName: string
  completedLessons: string[]
  completedChallenges: string[]
  progressPercent: number
  lastWatchedLessonId: string
  updatedAt: Timestamp | string
}

export interface TrackSubmission {
  id: string
  userId: string
  userName: string
  userPhoto: string
  challengeId: string
  content: string
  fileUrl: string
  videoUrl: string
  status: SubmissionStatus
  score: number
  feedback: string
  submittedAt: Timestamp | string
  reviewedAt: Timestamp | string | null
}

export interface UserBadge {
  id: string
  trackId: string
  trackTitle: string
  badgeName: string
  category: string
  issuedAt: Timestamp | string
  shareUrl: string
}

// ── Leaderboard ───────────────────────────────────────────────────────────────

export interface LeaderboardEntry {
  userId: string
  userName: string
  userAvatar: string
  xp: number
  rank: number
  updatedAt: Timestamp | string
}

export const XP_PER_LESSON = 10
export const XP_DEFAULT_CHALLENGE = 50

// ── Leaderboard functions ─────────────────────────────────────────────────────

export async function upsertLeaderboard(
  trackId: string,
  userId: string,
  userName: string,
  userAvatar: string,
  xpDelta: number
): Promise<void> {
  const ref = doc(db, 'leaderboards', trackId, 'users', userId)
  const snap = await getDoc(ref)
  if (snap.exists()) {
    await updateDoc(ref, {
      xp: increment(xpDelta),
      userName,
      userAvatar,
      updatedAt: serverTimestamp(),
    })
  } else {
    await setDoc(ref, {
      userId,
      userName,
      userAvatar,
      xp: xpDelta,
      rank: 0,
      updatedAt: serverTimestamp(),
    })
  }
}

export function subscribeLeaderboard(
  trackId: string,
  onUpdate: (entries: LeaderboardEntry[]) => void
): () => void {
  return onSnapshot(
    query(
      collection(db, 'leaderboards', trackId, 'users'),
      orderBy('xp', 'desc'),
      limit(10)
    ),
    (snap) => {
      const entries = snap.docs.map((d, idx) => ({
        ...(d.data() as Omit<LeaderboardEntry, 'rank'>),
        rank: idx + 1,
      } as LeaderboardEntry))
      onUpdate(entries)
    },
    console.warn
  )
}

export function subscribeUserLeaderboardEntry(
  trackId: string,
  userId: string,
  onUpdate: (entry: LeaderboardEntry | null) => void
): () => void {
  return onSnapshot(
    doc(db, 'leaderboards', trackId, 'users', userId),
    (snap) => {
      onUpdate(snap.exists() ? ({ ...snap.data(), rank: 0 } as LeaderboardEntry) : null)
    },
    console.warn
  )
}

// ── Utility ───────────────────────────────────────────────────────────────────

export function timeAgoTrack(ts: Timestamp | string | null | undefined): string {
  if (!ts) return ''
  const date = typeof ts === 'string' ? new Date(ts) : ts.toDate()
  const diff  = Date.now() - date.getTime()
  const mins  = Math.floor(diff / 60000)
  if (mins < 1)   return 'just now'
  if (mins < 60)  return `${mins}m ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24)   return `${hrs}h ago`
  const days = Math.floor(hrs / 24)
  if (days < 30)  return `${days}d ago`
  return date.toLocaleDateString()
}

export function formatDurationTrack(seconds: number): string {
  if (!seconds) return '0:00'
  const h = Math.floor(seconds / 3600)
  const m = Math.floor((seconds % 3600) / 60)
  const s = seconds % 60
  if (h > 0) return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
  return `${m}:${String(s).padStart(2, '0')}`
}

export function levelColor(level: TrackLevel): string {
  if (level === 'beginner')     return 'text-green-400'
  if (level === 'intermediate') return 'text-yellow-400'
  return 'text-red-400'
}

export function levelBg(level: TrackLevel): string {
  if (level === 'beginner')     return 'bg-green-500/15 text-green-400 border-green-500/25'
  if (level === 'intermediate') return 'bg-yellow-500/15 text-yellow-400 border-yellow-500/25'
  return 'bg-red-500/15 text-red-400 border-red-500/25'
}

// ── Tracks CRUD ───────────────────────────────────────────────────────────────

export async function createTrack(data: Omit<TrackDoc, 'id' | 'createdAt' | 'updatedAt'>): Promise<string> {
  const ref = await addDoc(collection(db, 'tracks'), {
    ...data,
    enrolledCount: 0,
    completedCount: 0,
    averageRating: 0,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  })
  return ref.id
}

export async function updateTrack(trackId: string, data: Partial<TrackDoc>): Promise<void> {
  const { id: _id, createdAt: _ca, ...rest } = data as any
  await updateDoc(doc(db, 'tracks', trackId), {
    ...rest,
    updatedAt: serverTimestamp(),
  })
}

export async function deleteTrack(trackId: string): Promise<void> {
  await updateDoc(doc(db, 'tracks', trackId), {
    status: 'draft',
    visibility: 'private',
    updatedAt: serverTimestamp(),
  })
}

export async function getTrack(trackId: string): Promise<TrackDoc | null> {
  const snap = await getDoc(doc(db, 'tracks', trackId))
  if (!snap.exists()) return null
  return { id: snap.id, ...snap.data() } as TrackDoc
}

export function subscribeTracks(
  filters: { category?: string; level?: string; status?: TrackStatus },
  onUpdate: (tracks: TrackDoc[]) => void
): () => void {
  let q = query(
    collection(db, 'tracks'),
    where('status', '==', filters.status ?? 'published'),
    where('visibility', '==', 'public'),
    orderBy('enrolledCount', 'desc'),
    limit(50)
  )
  return onSnapshot(q, (snap) => {
    let tracks = snap.docs.map((d) => ({ id: d.id, ...d.data() } as TrackDoc))
    if (filters.category && filters.category !== 'All') {
      tracks = tracks.filter((t) => t.category === filters.category)
    }
    if (filters.level) {
      tracks = tracks.filter((t) => t.level === filters.level)
    }
    onUpdate(tracks)
  }, console.warn)
}

export function subscribeCreatorTracks(
  creatorId: string,
  onUpdate: (tracks: TrackDoc[]) => void
): () => void {
  const q = query(
    collection(db, 'tracks'),
    where('creatorId', '==', creatorId),
    orderBy('createdAt', 'desc')
  )
  return onSnapshot(q, (snap) => {
    onUpdate(snap.docs.map((d) => ({ id: d.id, ...d.data() } as TrackDoc)))
  }, console.warn)
}

// ── Lessons ───────────────────────────────────────────────────────────────────

export async function addLesson(
  trackId: string,
  data: Omit<TrackLesson, 'id' | 'createdAt'>
): Promise<string> {
  const ref = await addDoc(collection(db, 'tracks', trackId, 'lessons'), {
    ...data,
    createdAt: serverTimestamp(),
  })
  await updateDoc(doc(db, 'tracks', trackId), {
    lessonCount: increment(1),
    updatedAt: serverTimestamp(),
  })
  return ref.id
}

export async function updateLesson(
  trackId: string,
  lessonId: string,
  data: Partial<TrackLesson>
): Promise<void> {
  const { id: _id, createdAt: _ca, ...rest } = data as any
  await updateDoc(doc(db, 'tracks', trackId, 'lessons', lessonId), rest)
}

export async function deleteLesson(trackId: string, lessonId: string): Promise<void> {
  await deleteDoc(doc(db, 'tracks', trackId, 'lessons', lessonId))
  await updateDoc(doc(db, 'tracks', trackId), {
    lessonCount: increment(-1),
    updatedAt: serverTimestamp(),
  })
}

export async function getLessons(trackId: string): Promise<TrackLesson[]> {
  const snap = await getDocs(
    query(collection(db, 'tracks', trackId, 'lessons'), orderBy('order', 'asc'))
  )
  return snap.docs.map((d) => ({ id: d.id, ...d.data() } as TrackLesson))
}

export function subscribeLessons(
  trackId: string,
  onUpdate: (lessons: TrackLesson[]) => void
): () => void {
  return onSnapshot(
    query(collection(db, 'tracks', trackId, 'lessons'), orderBy('order', 'asc')),
    (snap) => onUpdate(snap.docs.map((d) => ({ id: d.id, ...d.data() } as TrackLesson))),
    console.warn
  )
}

// ── Challenges ────────────────────────────────────────────────────────────────

export async function addChallenge(
  trackId: string,
  data: Omit<TrackChallenge, 'id' | 'createdAt'>
): Promise<string> {
  const ref = await addDoc(collection(db, 'tracks', trackId, 'challenges'), {
    ...data,
    createdAt: serverTimestamp(),
  })
  await updateDoc(doc(db, 'tracks', trackId), {
    challengeCount: increment(1),
    updatedAt: serverTimestamp(),
  })
  return ref.id
}

export async function getChallenges(trackId: string): Promise<TrackChallenge[]> {
  const snap = await getDocs(
    query(collection(db, 'tracks', trackId, 'challenges'), orderBy('order', 'asc'))
  )
  return snap.docs.map((d) => ({ id: d.id, ...d.data() } as TrackChallenge))
}

// ── Enrollment ────────────────────────────────────────────────────────────────

export async function enrollInTrack(
  userId: string,
  track: TrackDoc,
  totalLessons: number,
  totalChallenges: number,
  userName = '',
  userAvatar = ''
): Promise<void> {
  const enrollRef = doc(db, 'users', userId, 'trackEnrollments', track.id)
  const existing  = await getDoc(enrollRef)
  if (existing.exists()) return // already enrolled

  await setDoc(enrollRef, {
    trackId: track.id,
    title: track.title,
    category: track.category,
    thumbnailUrl: track.thumbnailUrl,
    progressPercent: 0,
    completedLessons: [],
    totalLessons,
    completedChallenges: [],
    totalChallenges,
    status: 'in_progress',
    enrolledAt: serverTimestamp(),
    completedAt: null,
    lastLessonId: '',
  })

  // Increment track enrolledCount
  await updateDoc(doc(db, 'tracks', track.id), { enrolledCount: increment(1) })

  // Init progress doc
  await setDoc(doc(db, 'tracks', track.id, 'progress', userId), {
    userId,
    userName,
    completedLessons: [],
    completedChallenges: [],
    progressPercent: 0,
    lastWatchedLessonId: '',
    updatedAt: serverTimestamp(),
  }, { merge: true })

  // Init leaderboard entry with 0 XP
  const lbRef = doc(db, 'leaderboards', track.id, 'users', userId)
  const lbSnap = await getDoc(lbRef)
  if (!lbSnap.exists()) {
    await setDoc(lbRef, {
      userId,
      userName,
      userAvatar,
      xp: 0,
      rank: 0,
      updatedAt: serverTimestamp(),
    })
  }
}

export async function getEnrollment(
  userId: string,
  trackId: string
): Promise<TrackEnrollment | null> {
  const snap = await getDoc(doc(db, 'users', userId, 'trackEnrollments', trackId))
  if (!snap.exists()) return null
  return snap.data() as TrackEnrollment
}

export function subscribeEnrollment(
  userId: string,
  trackId: string,
  onUpdate: (enrollment: TrackEnrollment | null) => void
): () => void {
  return onSnapshot(
    doc(db, 'users', userId, 'trackEnrollments', trackId),
    (snap) => onUpdate(snap.exists() ? (snap.data() as TrackEnrollment) : null),
    console.warn
  )
}

export function subscribeAllEnrollments(
  userId: string,
  onUpdate: (enrollments: TrackEnrollment[]) => void
): () => void {
  return onSnapshot(
    query(
      collection(db, 'users', userId, 'trackEnrollments'),
      orderBy('enrolledAt', 'desc')
    ),
    (snap) => onUpdate(snap.docs.map((d) => d.data() as TrackEnrollment)),
    console.warn
  )
}

// ── Progress ──────────────────────────────────────────────────────────────────

export async function markLessonComplete(
  userId: string,
  userName: string,
  trackId: string,
  lessonId: string,
  totalLessons: number,
  totalChallenges: number,
  userAvatar = ''
): Promise<{ xpEarned: number }> {
  const progressRef   = doc(db, 'tracks', trackId, 'progress', userId)
  const enrollmentRef = doc(db, 'users', userId, 'trackEnrollments', trackId)

  const [progSnap, enrollSnap] = await Promise.all([
    getDoc(progressRef),
    getDoc(enrollmentRef),
  ])

  const existing = progSnap.exists() ? (progSnap.data() as TrackProgress) : null
  const completed = existing?.completedLessons ?? []

  if (completed.includes(lessonId)) return { xpEarned: 0 } // already done

  const newCompleted = [...completed, lessonId]
  const newPercent   = Math.round(
    (newCompleted.length / Math.max(totalLessons, 1)) * 100
  )
  const isDone = newPercent >= 100

  await setDoc(progressRef, {
    userId,
    userName,
    completedLessons: newCompleted,
    completedChallenges: existing?.completedChallenges ?? [],
    progressPercent: newPercent,
    lastWatchedLessonId: lessonId,
    updatedAt: serverTimestamp(),
  }, { merge: true })

  const enrollUpdate: Record<string, unknown> = {
    completedLessons: newCompleted,
    progressPercent: newPercent,
    lastLessonId: lessonId,
  }
  if (isDone) {
    enrollUpdate.status = 'completed'
    enrollUpdate.completedAt = serverTimestamp()
    await updateDoc(doc(db, 'tracks', trackId), { completedCount: increment(1) })
    await awardBadge(userId, trackId, '')
  }

  if (enrollSnap.exists()) {
    await updateDoc(enrollmentRef, enrollUpdate)
  }

  // ── Award XP on leaderboard ──
  await upsertLeaderboard(trackId, userId, userName, userAvatar, XP_PER_LESSON)

  return { xpEarned: XP_PER_LESSON }
}

export async function getProgress(
  trackId: string,
  userId: string
): Promise<TrackProgress | null> {
  const snap = await getDoc(doc(db, 'tracks', trackId, 'progress', userId))
  if (!snap.exists()) return null
  return snap.data() as TrackProgress
}

// ── Submissions ───────────────────────────────────────────────────────────────

export async function submitChallenge(
  trackId: string,
  userId: string,
  userName: string,
  userPhoto: string,
  challengeId: string,
  content: string,
  fileUrl = '',
  videoUrl = '',
  points = XP_DEFAULT_CHALLENGE
): Promise<string> {
  const ref = await addDoc(collection(db, 'tracks', trackId, 'submissions'), {
    userId,
    userName,
    userPhoto,
    challengeId,
    content,
    fileUrl,
    videoUrl,
    status: 'submitted',
    score: 0,
    feedback: '',
    submittedAt: serverTimestamp(),
    reviewedAt: null,
  })

  // ── Award XP on leaderboard immediately on submit ──
  await upsertLeaderboard(trackId, userId, userName, userPhoto, points)

  // ── Track completedChallenges in progress doc ──
  const progressRef = doc(db, 'tracks', trackId, 'progress', userId)
  const progSnap = await getDoc(progressRef)
  if (progSnap.exists()) {
    const prog = progSnap.data() as TrackProgress
    if (!prog.completedChallenges?.includes(challengeId)) {
      await updateDoc(progressRef, {
        completedChallenges: [...(prog.completedChallenges ?? []), challengeId],
        updatedAt: serverTimestamp(),
      })
    }
  }

  // ── Track completedChallenges in enrollment doc ──
  const enrollRef = doc(db, 'users', userId, 'trackEnrollments', trackId)
  const enrollSnap = await getDoc(enrollRef)
  if (enrollSnap.exists()) {
    const enroll = enrollSnap.data() as TrackEnrollment
    if (!enroll.completedChallenges?.includes(challengeId)) {
      await updateDoc(enrollRef, {
        completedChallenges: [...(enroll.completedChallenges ?? []), challengeId],
      })
    }
  }

  return ref.id
}

export async function reviewSubmission(
  trackId: string,
  submissionId: string,
  status: SubmissionStatus,
  score: number,
  feedback: string
): Promise<void> {
  await updateDoc(doc(db, 'tracks', trackId, 'submissions', submissionId), {
    status,
    score,
    feedback,
    reviewedAt: serverTimestamp(),
  })
}

export function subscribeSubmissions(
  trackId: string,
  onUpdate: (subs: TrackSubmission[]) => void
): () => void {
  return onSnapshot(
    query(
      collection(db, 'tracks', trackId, 'submissions'),
      orderBy('submittedAt', 'desc')
    ),
    (snap) => onUpdate(snap.docs.map((d) => ({ id: d.id, ...d.data() } as TrackSubmission))),
    console.warn
  )
}

export function subscribeRecentSubmissions(
  trackId: string,
  onUpdate: (subs: TrackSubmission[]) => void
): () => void {
  return onSnapshot(
    query(
      collection(db, 'tracks', trackId, 'submissions'),
      orderBy('submittedAt', 'desc'),
      limit(8)
    ),
    (snap) => onUpdate(snap.docs.map((d) => ({ id: d.id, ...d.data() } as TrackSubmission))),
    console.warn
  )
}

export function subscribeUserSubmissions(
  trackId: string,
  userId: string,
  onUpdate: (subs: TrackSubmission[]) => void
): () => void {
  return onSnapshot(
    query(
      collection(db, 'tracks', trackId, 'submissions'),
      where('userId', '==', userId),
      orderBy('submittedAt', 'desc')
    ),
    (snap) => onUpdate(snap.docs.map((d) => ({ id: d.id, ...d.data() } as TrackSubmission))),
    console.warn
  )
}

// ── Badges ────────────────────────────────────────────────────────────────────

export async function awardBadge(
  userId: string,
  trackId: string,
  trackTitle: string
): Promise<void> {
  const badgeRef = doc(db, 'users', userId, 'badges', trackId)
  const existing = await getDoc(badgeRef)
  if (existing.exists()) return
  await setDoc(badgeRef, {
    trackId,
    trackTitle,
    badgeName: `${trackTitle} Graduate`,
    category: '',
    issuedAt: serverTimestamp(),
    shareUrl: `/tracks/${trackId}`,
  })
}

export function subscribeBadges(
  userId: string,
  onUpdate: (badges: UserBadge[]) => void
): () => void {
  return onSnapshot(
    collection(db, 'users', userId, 'badges'),
    (snap) => onUpdate(snap.docs.map((d) => ({ id: d.id, ...d.data() } as UserBadge))),
    console.warn
  )
}
