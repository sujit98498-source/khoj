// services/studioAnalyticsService.ts
// Analytics tracking + Studio data service for KHOJ Studio.
// All writes are fire-and-forget (non-blocking) from the UI.

import {
  collection,
  doc,
  addDoc,
  getDoc,
  getDocs,
  updateDoc,
  setDoc,
  onSnapshot,
  query,
  where,
  orderBy,
  limit,
  increment,
  serverTimestamp,
  Timestamp,
} from 'firebase/firestore'
import { requireFirestoreDb } from '@/lib/firebase/config'

// ── Types ──────────────────────────────────────────────────────────────────────

export type ContentType = 'video' | 'clip' | 'stream'
export type EventType =
  | 'view'
  | 'like'
  | 'comment'
  | 'share'
  | 'save'
  | 'follow'
  | 'watch_time'
  | 'profile_click'

export interface CreatorStats {
  totalViews: number
  totalLikes: number
  totalUploads: number
  totalVideos: number
  totalClips: number
  totalStreams: number
  totalWatchTimeSeconds: number
  totalFollowers: number
  liveHours: number
  profileViews: number
  updatedAt: string | Timestamp
}

export interface StudioMediaItem {
  id: string
  type: ContentType
  title: string
  thumbnailUrl: string
  visibility: string
  views: number
  likes: number
  commentCount: number
  shares: number
  status: string
  duration: number
  createdAt: string | Timestamp
  videoUrl?: string
}

export interface OpportunityInsight {
  id: string
  type: 'recruiter_view' | 'company_watch' | 'scout_view' | 'message_request'
  title: string
  description: string
  sourceUserId: string
  sourceName: string
  contentId?: string
  createdAt: string | Timestamp
  isRead: boolean
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function toStudioItem(id: string, data: Record<string, unknown>): StudioMediaItem {
  return {
    id,
    type: (data.type as ContentType) ?? 'video',
    title: (data.title as string) ?? '',
    thumbnailUrl: (data.thumbnailUrl as string) ?? '',
    visibility: (data.visibility as string) ?? 'public',
    views: (data.views as number) ?? 0,
    likes: (data.likes as number) ?? 0,
    commentCount: (data.commentCount as number) ?? 0,
    shares: (data.shares as number) ?? 0,
    status: (data.status as string) ?? 'published',
    duration: (data.duration as number) ?? 0,
    createdAt:
      data.createdAt instanceof Timestamp
        ? data.createdAt.toDate().toISOString()
        : (data.createdAt as string) ?? new Date().toISOString(),
    videoUrl: (data.videoUrl as string) ?? '',
  }
}

function toOpportunity(id: string, data: Record<string, unknown>): OpportunityInsight {
  return {
    id,
    type: (data.type as OpportunityInsight['type']) ?? 'recruiter_view',
    title: (data.title as string) ?? '',
    description: (data.description as string) ?? '',
    sourceUserId: (data.sourceUserId as string) ?? '',
    sourceName: (data.sourceName as string) ?? '',
    contentId: (data.contentId as string) ?? undefined,
    isRead: (data.isRead as boolean) ?? false,
    createdAt:
      data.createdAt instanceof Timestamp
        ? data.createdAt.toDate().toISOString()
        : (data.createdAt as string) ?? new Date().toISOString(),
  }
}

// ── Analytics tracking (fire and forget) ─────────────────────────────────────

async function emitEvent(
  creatorId: string,
  contentId: string,
  contentType: ContentType,
  eventType: EventType,
  value: number,
  viewerId?: string,
): Promise<void> {
  try {
    await addDoc(collection(requireFirestoreDb(), 'analyticsEvents'), {
      creatorId,
      contentId,
      contentType,
      viewerId: viewerId ?? null,
      eventType,
      value,
      createdAt: serverTimestamp(),
    })
  } catch (err) {
    // Non-fatal — analytics must never break the main flow
    console.warn('[studioAnalytics] emitEvent failed:', err)
  }
}

/** Track a view. Increments creatorStats.totalViews. */
export function trackView(
  contentId: string,
  contentType: ContentType,
  creatorId: string,
  viewerId?: string,
): void {
  // Fire and forget
  emitEvent(creatorId, contentId, contentType, 'view', 1, viewerId)
  updateDoc(doc(requireFirestoreDb(), 'creatorStats', creatorId), {
    totalViews: increment(1),
  }).catch(() => {
    // First view for this creator — doc may not exist yet
    setDoc(
      doc(requireFirestoreDb(), 'creatorStats', creatorId),
      { totalViews: 1, totalLikes: 0, totalUploads: 0, totalVideos: 0, totalClips: 0,
        totalStreams: 0, totalWatchTimeSeconds: 0, totalFollowers: 0, liveHours: 0,
        profileViews: 0, updatedAt: serverTimestamp() },
      { merge: true },
    ).catch(console.warn)
  })
}

/** Track a like event. Increments creatorStats.totalLikes. */
export function trackLike(
  contentId: string,
  contentType: ContentType,
  creatorId: string,
  liked: boolean,
): void {
  emitEvent(creatorId, contentId, contentType, 'like', liked ? 1 : -1)
  updateDoc(doc(requireFirestoreDb(), 'creatorStats', creatorId), {
    totalLikes: increment(liked ? 1 : -1),
  }).catch(console.warn)
}

/** Track a share event. */
export function trackShare(
  contentId: string,
  contentType: ContentType,
  creatorId: string,
): void {
  emitEvent(creatorId, contentId, contentType, 'share', 1)
  // Also increment media.shares
  updateDoc(doc(requireFirestoreDb(), 'media', contentId), {
    shares: increment(1),
  }).catch(console.warn)
}

/** Track a save/bookmark event. */
export function trackSave(
  contentId: string,
  contentType: ContentType,
  creatorId: string,
  saved: boolean,
): void {
  emitEvent(creatorId, contentId, contentType, 'save', saved ? 1 : -1)
}

/** Track watch time (call every 10s while playing). Updates media + creatorStats. */
export function trackWatchTime(
  contentId: string,
  contentType: ContentType,
  creatorId: string,
  seconds: number,
): void {
  if (seconds <= 0) return
  emitEvent(creatorId, contentId, contentType, 'watch_time', seconds)
  updateDoc(doc(requireFirestoreDb(), 'media', contentId), {
    watchTimeSeconds: increment(seconds),
  }).catch(console.warn)
  updateDoc(doc(requireFirestoreDb(), 'creatorStats', creatorId), {
    totalWatchTimeSeconds: increment(seconds),
  }).catch(console.warn)
}

/** Called when a live stream ends. Adds liveHours to creatorStats. */
export function trackLiveHours(creatorId: string, liveHours: number): void {
  if (liveHours <= 0) return
  updateDoc(doc(requireFirestoreDb(), 'creatorStats', creatorId), {
    liveHours: increment(liveHours),
    totalStreams: increment(1),
  }).catch(console.warn)
}

/** Increment creatorStats.totalUploads when content is published. */
export function trackUpload(creatorId: string, type: 'video' | 'clip'): void {
  updateDoc(doc(requireFirestoreDb(), 'creatorStats', creatorId), {
    totalUploads: increment(1),
    ...(type === 'video' ? { totalVideos: increment(1) } : { totalClips: increment(1) }),
  }).catch(console.warn)
}

// ── Read creator stats ────────────────────────────────────────────────────────

const DEFAULT_STATS: CreatorStats = {
  totalViews: 0, totalLikes: 0, totalUploads: 0,
  totalVideos: 0, totalClips: 0, totalStreams: 0,
  totalWatchTimeSeconds: 0, totalFollowers: 0,
  liveHours: 0, profileViews: 0, updatedAt: new Date().toISOString(),
}

export function subscribeCreatorStats(
  creatorId: string,
  callback: (stats: CreatorStats) => void,
): () => void {
  return onSnapshot(
    doc(requireFirestoreDb(), 'creatorStats', creatorId),
    (snap) => {
      if (!snap.exists()) { callback(DEFAULT_STATS); return }
      const d = snap.data() as Record<string, unknown>
      callback({
        totalViews:            (d.totalViews            as number) ?? 0,
        totalLikes:            (d.totalLikes            as number) ?? 0,
        totalUploads:          (d.totalUploads          as number) ?? 0,
        totalVideos:           (d.totalVideos           as number) ?? 0,
        totalClips:            (d.totalClips            as number) ?? 0,
        totalStreams:          (d.totalStreams           as number) ?? 0,
        totalWatchTimeSeconds: (d.totalWatchTimeSeconds as number) ?? 0,
        totalFollowers:        (d.totalFollowers        as number) ?? 0,
        liveHours:             (d.liveHours             as number) ?? 0,
        profileViews:          (d.profileViews          as number) ?? 0,
        updatedAt: d.updatedAt instanceof Timestamp
          ? d.updatedAt.toDate().toISOString()
          : (d.updatedAt as string) ?? new Date().toISOString(),
      })
    },
    (err) => {
      console.warn('[studioAnalytics] subscribeCreatorStats error:', err.message)
      callback(DEFAULT_STATS)
    },
  )
}

// ── Studio content list ───────────────────────────────────────────────────────

export function subscribeStudioContent(
  creatorId: string,
  callback: (items: StudioMediaItem[]) => void,
): () => void {
  const q = query(
    collection(requireFirestoreDb(), 'media'),
    where('creatorId', '==', creatorId),
    orderBy('createdAt', 'desc'),
    limit(100),
  )
  return onSnapshot(
    q,
    (snap) => {
      callback(snap.docs.map((d) => toStudioItem(d.id, d.data() as Record<string, unknown>)))
    },
    (err) => {
      console.warn('[studioAnalytics] subscribeStudioContent error:', err.message)
      callback([])
    },
  )
}

/** Soft-delete: set status to 'deleted'. Hides from Arena, stays in Studio as deleted. */
export async function softDeleteMedia(mediaId: string): Promise<void> {
  await updateDoc(doc(requireFirestoreDb(), 'media', mediaId), {
    status: 'deleted',
    updatedAt: serverTimestamp(),
  })
}

// ── Top content ───────────────────────────────────────────────────────────────

export async function getTopContent(
  creatorId: string,
  limitCount = 5,
): Promise<StudioMediaItem[]> {
  const q = query(
    collection(requireFirestoreDb(), 'media'),
    where('creatorId', '==', creatorId),
    where('status', '==', 'published'),
    orderBy('views', 'desc'),
    limit(limitCount),
  )
  const snap = await getDocs(q)
  return snap.docs.map((d) => toStudioItem(d.id, d.data() as Record<string, unknown>))
}

// ── View counts by day (last N days) for charts ───────────────────────────────

export interface DayCount {
  label: string   // e.g. "Apr 20"
  views: number
  watchTime: number
}

export async function getViewsByDay(
  creatorId: string,
  days: number,
): Promise<DayCount[]> {
  const since = new Date()
  since.setDate(since.getDate() - days)

  const q = query(
    collection(requireFirestoreDb(), 'analyticsEvents'),
    where('creatorId', '==', creatorId),
    where('eventType', 'in', ['view', 'watch_time']),
    where('createdAt', '>=', Timestamp.fromDate(since)),
    orderBy('createdAt', 'asc'),
    limit(2000),
  )

  const snap = await getDocs(q)
  const map = new Map<string, { views: number; watchTime: number }>()

  // Build a bucket for each day
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date()
    d.setDate(d.getDate() - i)
    const label = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
    map.set(label, { views: 0, watchTime: 0 })
  }

  for (const docSnap of snap.docs) {
    const data = docSnap.data() as Record<string, unknown>
    const ts = data.createdAt instanceof Timestamp ? data.createdAt.toDate() : new Date()
    const label = ts.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
    if (!map.has(label)) continue
    const bucket = map.get(label)!
    if (data.eventType === 'view') bucket.views += 1
    if (data.eventType === 'watch_time') bucket.watchTime += (data.value as number) ?? 0
  }

  return Array.from(map.entries()).map(([label, v]) => ({ label, ...v }))
}

// ── Opportunity insights ──────────────────────────────────────────────────────

export function subscribeOpportunityInsights(
  creatorId: string,
  callback: (items: OpportunityInsight[]) => void,
): () => void {
  const q = query(
    collection(requireFirestoreDb(), 'opportunityInsights', creatorId, 'items'),
    orderBy('createdAt', 'desc'),
    limit(10),
  )
  return onSnapshot(
    q,
    (snap) => {
      callback(snap.docs.map((d) => toOpportunity(d.id, d.data() as Record<string, unknown>)))
    },
    (err) => {
      console.warn('[studioAnalytics] subscribeOpportunityInsights error:', err.message)
      callback([])
    },
  )
}

// ── Human-readable helpers ────────────────────────────────────────────────────

export function formatWatchTime(seconds: number): string {
  if (seconds < 60) return `${seconds}s`
  const h = Math.floor(seconds / 3600)
  const m = Math.floor((seconds % 3600) / 60)
  if (h > 0) return `${h}h ${m}m`
  return `${m}m`
}

export function formatNumber(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`
  return String(n)
}

export function formatHours(seconds: number): string {
  const h = seconds / 3600
  return `${h.toFixed(1)} hrs`
}
