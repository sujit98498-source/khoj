// services/mediaService.ts
// Firestore + Firebase Storage operations for the KHOJ media system.
// Collection: media/{mediaId}
// Storage: media/{userId}/{mediaId}/video, clips/{userId}/{mediaId}/clip, thumbnails/{userId}/{mediaId}

import {
  collection,
  doc,
  addDoc,
  getDoc,
  getDocs,
  setDoc,
  deleteDoc,
  updateDoc,
  onSnapshot,
  query,
  where,
  orderBy,
  serverTimestamp,
  increment,
  Timestamp,
  limit,
  collectionGroup,
} from 'firebase/firestore'
import {
  ref,
  uploadBytesResumable,
  getDownloadURL,
  UploadTaskSnapshot,
} from 'firebase/storage'
import { requireFirestoreDb, requireFirebaseStorage } from '@/lib/firebase/config'

// ── Types ──────────────────────────────────────────────────────────────────────

export type MediaType = 'video' | 'clip'
export type MediaStatus = 'published' | 'draft'
export type MediaVisibility = 'public' | 'private'

export const MEDIA_CATEGORIES = [
  'Education',
  'Technology',
  'Startup',
  'Gaming',
  'Entertainment',
  'Lifestyle',
  'Music',
  'Other',
] as const

export const MEDIA_PURPOSES = [
  'Journey Update',
  'Skill Proof',
  'Project Demo',
  'Startup Pitch',
  'Gaming Highlight',
  'Tutorial',
  'Competition Entry',
  'Live Highlight',
] as const

export type MediaCategory = typeof MEDIA_CATEGORIES[number]
export type MediaPurpose = typeof MEDIA_PURPOSES[number]

export interface MediaDoc {
  id: string
  type: MediaType
  title: string
  description: string
  category: string
  purpose: string
  tags: string[]
  visibility: MediaVisibility
  videoUrl: string
  thumbnailUrl: string
  creatorId: string
  creatorName: string
  creatorPhoto: string
  views: number
  likes: number
  saves: number
  reports: number
  status: MediaStatus
  /** Duration in seconds */
  duration: number
  /** File size in bytes */
  size: number
  createdAt: string | Timestamp
  updatedAt: string | Timestamp
}

export interface CreateMediaPayload {
  type: MediaType
  title: string
  description: string
  category: string
  purpose: string
  tags: string[]
  visibility: MediaVisibility
  creatorId: string
  creatorName: string
  creatorPhoto: string
}

// ── Upload progress callback ──────────────────────────────────────────────────

export type UploadStage =
  | 'idle'
  | 'uploading_video'
  | 'uploading_thumbnail'
  | 'saving'
  | 'done'
  | 'error'

export interface UploadProgress {
  stage: UploadStage
  percent: number
  error?: string
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function toMediaDoc(id: string, data: Record<string, unknown>): MediaDoc {
  return {
    id,
    type: (data.type as MediaType) ?? 'video',
    title: (data.title as string) ?? '',
    description: (data.description as string) ?? '',
    category: (data.category as string) ?? '',
    purpose: (data.purpose as string) ?? '',
    tags: (data.tags as string[]) ?? [],
    visibility: (data.visibility as MediaVisibility) ?? 'public',
    videoUrl: (data.videoUrl as string) ?? '',
    thumbnailUrl: (data.thumbnailUrl as string) ?? '',
    creatorId: (data.creatorId as string) ?? '',
    creatorName: (data.creatorName as string) ?? '',
    creatorPhoto: (data.creatorPhoto as string) ?? '',
    views: (data.views as number) ?? 0,
    likes: (data.likes as number) ?? 0,
    saves: (data.saves as number) ?? 0,
    reports: (data.reports as number) ?? 0,
    status: (data.status as MediaStatus) ?? 'published',
    duration: (data.duration as number) ?? 0,
    size: (data.size as number) ?? 0,
    createdAt:
      data.createdAt instanceof Timestamp
        ? data.createdAt.toDate().toISOString()
        : (data.createdAt as string) ?? new Date().toISOString(),
    updatedAt:
      data.updatedAt instanceof Timestamp
        ? data.updatedAt.toDate().toISOString()
        : (data.updatedAt as string) ?? new Date().toISOString(),
  }
}

function uploadFile(
  storagePath: string,
  file: File,
  onProgress: (pct: number) => void,
): Promise<string> {
  return new Promise((resolve, reject) => {
    const storageRef = ref(requireFirebaseStorage(), storagePath)
    const task = uploadBytesResumable(storageRef, file)

    task.on(
      'state_changed',
      (snap: UploadTaskSnapshot) => {
        const pct = Math.round((snap.bytesTransferred / snap.totalBytes) * 100)
        onProgress(pct)
      },
      (err) => {
        // Log the real Firebase Storage error code so it shows in DevTools
        console.error('[mediaService] Storage upload error:', {
          code: err.code,
          message: err.message,
          serverResponse: err.serverResponse,
          path: storagePath,
        })
        reject(err)
      },
      async () => {
        try {
          const url = await getDownloadURL(task.snapshot.ref)
          resolve(url)
        } catch (err) {
          console.error('[mediaService] getDownloadURL error:', err)
          reject(err)
        }
      },
    )
  })
}

// ── Upload video or clip ──────────────────────────────────────────────────────

export async function uploadMedia(
  payload: CreateMediaPayload,
  videoFile: File,
  thumbnailFile: File | null,
  duration: number,
  status: MediaStatus,
  onProgress: (p: UploadProgress) => void,
): Promise<string> {
  const { creatorId, type } = payload
  const timestamp = Date.now()

  // Derive file extension from the actual file (mp4 / webm / mov)
  const videoExt = videoFile.name.split('.').pop()?.toLowerCase() ?? 'mp4'
  const videoPath =
    type === 'clip'
      ? `clips/${creatorId}/${timestamp}.${videoExt}`
      : `videos/${creatorId}/${timestamp}.${videoExt}`

  const thumbExt = thumbnailFile
    ? (thumbnailFile.name.split('.').pop()?.toLowerCase() ?? 'jpg')
    : 'jpg'
  const thumbPath = `thumbnails/${creatorId}/${timestamp}.${thumbExt}`

  console.log('[mediaService] Starting upload:', { type, videoPath, thumbPath, status })

  try {
    // ── 1. Upload video to Storage ──────────────────────────────────────────
    onProgress({ stage: 'uploading_video', percent: 0 })
    const videoUrl = await uploadFile(
      videoPath,
      videoFile,
      (pct) => onProgress({ stage: 'uploading_video', percent: pct }),
    )
    console.log('[mediaService] Video uploaded:', videoUrl)

    // ── 2. Upload thumbnail (optional) ─────────────────────────────────────
    let thumbnailUrl = ''
    if (thumbnailFile) {
      onProgress({ stage: 'uploading_thumbnail', percent: 0 })
      thumbnailUrl = await uploadFile(
        thumbPath,
        thumbnailFile,
        (pct) => onProgress({ stage: 'uploading_thumbnail', percent: pct }),
      )
      console.log('[mediaService] Thumbnail uploaded:', thumbnailUrl)
    }

    // ── 3. Write Firestore document ─────────────────────────────────────────
    onProgress({ stage: 'saving', percent: 100 })
    const colRef = collection(requireFirestoreDb(), 'media')
    const docRef = await addDoc(colRef, {
      // Content type + identity
      type,
      title: payload.title,
      description: payload.description,
      category: payload.category,
      purpose: payload.purpose,
      tags: payload.tags,
      visibility: payload.visibility,

      // Media URLs
      videoUrl,
      thumbnailUrl,

      // Creator info — stored as both creatorId/creatorName AND ownerId/ownerName
      creatorId,
      creatorName: payload.creatorName,
      creatorPhoto: payload.creatorPhoto,
      ownerId: creatorId,
      ownerName: payload.creatorName,

      // Counters
      views: 0,
      likes: 0,
      saves: 0,
      reports: 0,

      // Meta
      status,
      duration,
      size: videoFile.size,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    })

    console.log('[mediaService] Firestore doc created:', docRef.id)
    onProgress({ stage: 'done', percent: 100 })
    return docRef.id
  } catch (err: unknown) {
    const code = (err as { code?: string })?.code ?? 'unknown'
    const msg  = err instanceof Error ? err.message : 'Upload failed'
    console.error('[mediaService] uploadMedia failed:', { code, msg, err })
    onProgress({ stage: 'error', percent: 0, error: msg })
    throw err
  }
}

// ── Subscribe to media list ───────────────────────────────────────────────────

export function subscribeMediaByType(
  type: MediaType,
  callback: (items: MediaDoc[]) => void,
): () => void {
  const q = query(
    collection(requireFirestoreDb(), 'media'),
    where('type', '==', type),
    where('status', '==', 'published'),
    where('visibility', '==', 'public'),
    orderBy('createdAt', 'desc'),
    limit(50),
  )

  return onSnapshot(
    q,
    (snap) => {
      callback(snap.docs.map((d) => toMediaDoc(d.id, d.data() as Record<string, unknown>)))
    },
    (err) => {
      console.error('[mediaService] subscribeMediaByType error:', {
        code: (err as { code?: string }).code,
        message: err.message,
        type,
      })
      // Still call back with empty array so loading state clears in the UI
      callback([])
    },
  )
}

// ── Get single media doc ──────────────────────────────────────────────────────

export async function getMedia(mediaId: string): Promise<MediaDoc | null> {
  const snap = await getDoc(doc(requireFirestoreDb(), 'media', mediaId))
  if (!snap.exists()) return null
  return toMediaDoc(snap.id, snap.data() as Record<string, unknown>)
}

// ── Increment view count (once per session guard in the component) ────────────

export async function incrementViews(mediaId: string): Promise<void> {
  await updateDoc(doc(requireFirestoreDb(), 'media', mediaId), {
    views: increment(1),
  })
}

// ── Like system (subcollection: media/{mediaId}/likes/{userId}) ──────────────

/** Returns true if the given user has already liked this media. */
export async function getUserLike(mediaId: string, userId: string): Promise<boolean> {
  const snap = await getDoc(doc(requireFirestoreDb(), 'media', mediaId, 'likes', userId))
  return snap.exists()
}

/**
 * Toggle a like.
 * - liked=true  → write likes/{userId}, increment counter
 * - liked=false → delete likes/{userId}, decrement counter
 */
export async function toggleLike(
  mediaId: string,
  userId: string,
  liked: boolean,
): Promise<void> {
  const likeRef = doc(requireFirestoreDb(), 'media', mediaId, 'likes', userId)
  const mediaRef = doc(requireFirestoreDb(), 'media', mediaId)
  if (liked) {
    await setDoc(likeRef, { createdAt: serverTimestamp() })
    await updateDoc(mediaRef, { likes: increment(1) })
  } else {
    await deleteDoc(likeRef)
    await updateDoc(mediaRef, { likes: increment(-1) })
  }
}

// ── Fetch related media (same category, not same doc) ────────────────────────

export async function getRelatedMedia(
  mediaId: string,
  category: string,
  type: MediaType,
): Promise<MediaDoc[]> {
  const q = query(
    collection(requireFirestoreDb(), 'media'),
    where('category', '==', category),
    where('type', '==', type),
    where('status', '==', 'published'),
    where('visibility', '==', 'public'),
    orderBy('createdAt', 'desc'),
    limit(6),
  )
  const snap = await getDocs(q)
  return snap.docs
    .map((d) => toMediaDoc(d.id, d.data() as Record<string, unknown>))
    .filter((m) => m.id !== mediaId)
}

// ── Human-readable helpers ────────────────────────────────────────────────────

export function formatDuration(seconds: number): string {
  if (!seconds) return '0:00'
  const h = Math.floor(seconds / 3600)
  const m = Math.floor((seconds % 3600) / 60)
  const s = Math.floor(seconds % 60)
  if (h > 0) return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
  return `${m}:${String(s).padStart(2, '0')}`
}

export function formatViews(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`
  return String(n)
}

export function timeAgo(value: string | Timestamp): string {
  const date =
    value instanceof Timestamp ? value.toDate() : new Date(value as string)
  const diff = Date.now() - date.getTime()
  const s = Math.floor(diff / 1000)
  if (s < 60) return 'just now'
  const m = Math.floor(s / 60)
  if (m < 60) return `${m}m ago`
  const h = Math.floor(m / 60)
  if (h < 24) return `${h}h ago`
  const d = Math.floor(h / 24)
  if (d < 7) return `${d}d ago`
  const w = Math.floor(d / 7)
  if (w < 5) return `${w}w ago`
  const mo = Math.floor(d / 30)
  return `${mo}mo ago`
}

// ── Comments ──────────────────────────────────────────────────────────────────

export interface MediaComment {
  id: string
  text: string
  authorId: string
  authorName: string
  authorPhoto: string
  likes: number
  replyCount: number
  createdAt: string | Timestamp
}

export interface CommentReply {
  id: string
  text: string
  authorId: string
  authorName: string
  authorPhoto: string
  createdAt: string | Timestamp
}

function toComment(id: string, data: Record<string, unknown>): MediaComment {
  return {
    id,
    text: (data.text as string) ?? '',
    authorId: (data.authorId as string) ?? '',
    authorName: (data.authorName as string) ?? '',
    authorPhoto: (data.authorPhoto as string) ?? '',
    likes: (data.likes as number) ?? 0,
    replyCount: (data.replyCount as number) ?? 0,
    createdAt:
      data.createdAt instanceof Timestamp
        ? data.createdAt.toDate().toISOString()
        : (data.createdAt as string) ?? new Date().toISOString(),
  }
}

function toReply(id: string, data: Record<string, unknown>): CommentReply {
  return {
    id,
    text: (data.text as string) ?? '',
    authorId: (data.authorId as string) ?? '',
    authorName: (data.authorName as string) ?? '',
    authorPhoto: (data.authorPhoto as string) ?? '',
    createdAt:
      data.createdAt instanceof Timestamp
        ? data.createdAt.toDate().toISOString()
        : (data.createdAt as string) ?? new Date().toISOString(),
  }
}

export async function addComment(
  mediaId: string,
  text: string,
  author: { uid: string; name: string; photo: string },
): Promise<void> {
  const trimmed = text.trim()
  if (!trimmed) return
  await addDoc(collection(requireFirestoreDb(), 'media', mediaId, 'comments'), {
    text: trimmed,
    authorId: author.uid,
    authorName: author.name,
    authorPhoto: author.photo,
    likes: 0,
    replyCount: 0,
    createdAt: serverTimestamp(),
  })
}

// ── Comment likes (media/{mediaId}/comments/{commentId}/likes/{userId}) ───────

export async function getCommentLike(
  mediaId: string,
  commentId: string,
  userId: string,
): Promise<boolean> {
  const snap = await getDoc(doc(requireFirestoreDb(), 'media', mediaId, 'comments', commentId, 'likes', userId))
  return snap.exists()
}

export async function toggleCommentLike(
  mediaId: string,
  commentId: string,
  userId: string,
  liked: boolean,
): Promise<void> {
  const likeRef = doc(requireFirestoreDb(), 'media', mediaId, 'comments', commentId, 'likes', userId)
  const commentRef = doc(requireFirestoreDb(), 'media', mediaId, 'comments', commentId)
  if (liked) {
    await setDoc(likeRef, { createdAt: serverTimestamp() })
    await updateDoc(commentRef, { likes: increment(1) })
  } else {
    await deleteDoc(likeRef)
    await updateDoc(commentRef, { likes: increment(-1) })
  }
}

// ── Replies (media/{mediaId}/comments/{commentId}/replies) ────────────────────

export async function addReply(
  mediaId: string,
  commentId: string,
  text: string,
  author: { uid: string; name: string; photo: string },
): Promise<void> {
  const trimmed = text.trim()
  if (!trimmed) return
  await addDoc(collection(requireFirestoreDb(), 'media', mediaId, 'comments', commentId, 'replies'), {
    text: trimmed,
    authorId: author.uid,
    authorName: author.name,
    authorPhoto: author.photo,
    createdAt: serverTimestamp(),
  })
  await updateDoc(doc(requireFirestoreDb(), 'media', mediaId, 'comments', commentId), {
    replyCount: increment(1),
  })
}

export function subscribeReplies(
  mediaId: string,
  commentId: string,
  callback: (replies: CommentReply[]) => void,
): () => void {
  const q = query(
    collection(requireFirestoreDb(), 'media', mediaId, 'comments', commentId, 'replies'),
    orderBy('createdAt', 'asc'),
  )
  return onSnapshot(
    q,
    (snap) => {
      callback(snap.docs.map((d) => toReply(d.id, d.data() as Record<string, unknown>)))
    },
    (err) => {
      console.error('[mediaService] subscribeReplies error:', err.message)
      callback([])
    },
  )
}

export async function deleteComment(mediaId: string, commentId: string): Promise<void> {
  await deleteDoc(doc(requireFirestoreDb(), 'media', mediaId, 'comments', commentId))
}

export async function deleteReply(
  mediaId: string,
  commentId: string,
  replyId: string,
): Promise<void> {
  await deleteDoc(doc(requireFirestoreDb(), 'media', mediaId, 'comments', commentId, 'replies', replyId))
  await updateDoc(doc(requireFirestoreDb(), 'media', mediaId, 'comments', commentId), {
    replyCount: increment(-1),
  })
}

export function subscribeComments(
  mediaId: string,
  callback: (comments: MediaComment[]) => void,
): () => void {
  const q = query(
    collection(requireFirestoreDb(), 'media', mediaId, 'comments'),
    orderBy('createdAt', 'asc'),
  )
  return onSnapshot(
    q,
    (snap) => {
      callback(snap.docs.map((d) => toComment(d.id, d.data() as Record<string, unknown>)))
    },
    (err) => {
      console.error('[mediaService] subscribeComments error:', err.message)
      callback([])
    },
  )
}
