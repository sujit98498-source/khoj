// app/arena/media/[mediaId]/page.tsx
// Media detail / player page for uploaded videos and clips.

'use client'

import { useEffect, useRef, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { useAuth } from '@/hooks/useAuth'
import { AppShell } from '@/components/layout/AppShell'
import { ReportModal } from '@/components/reports/ReportModal'
import {
  getMedia,
  incrementViews,
  toggleLike,
  getUserLike,
  getRelatedMedia,
  formatDuration,
  formatViews,
  timeAgo,
  MediaDoc,
  addComment,
  subscribeComments,
  MediaComment,
  CommentReply,
  getCommentLike,
  toggleCommentLike,
  addReply,
  subscribeReplies,
  deleteComment,
  deleteReply,
} from '@/services/mediaService'
import {
  trackView,
  trackLike,
  trackShare,
  trackWatchTime,
} from '@/services/studioAnalyticsService'
import toast from 'react-hot-toast'

export default function MediaDetailPage() {
  const { mediaId } = useParams<{ mediaId: string }>()
  const router = useRouter()
  const { khojUser, firebaseUser } = useAuth()

  const [media, setMedia]         = useState<MediaDoc | null | undefined>(undefined)
  const [related, setRelated]     = useState<MediaDoc[]>([])
  const [liked, setLiked]         = useState(false)
  const [likeCount, setLikeCount] = useState(0)
  const [showReport, setShowReport] = useState(false)

  // Comments
  const [comments, setComments]       = useState<MediaComment[]>([])
  const [commentText, setCommentText] = useState('')
  const [submitting, setSubmitting]   = useState(false)
  const commentsEndRef = useRef<HTMLDivElement>(null)
  // Watch-time tracking
  const watchIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const watchSecondsRef  = useRef(0)

  // Load media + increment views (once per session)
  useEffect(() => {
    if (!mediaId) return

    getMedia(mediaId).then((doc) => {
      setMedia(doc)
      if (!doc) return
      setLikeCount(doc.likes)
      const sessionKey = `viewed_${mediaId}`
      if (!sessionStorage.getItem(sessionKey)) {
        incrementViews(mediaId)
        sessionStorage.setItem(sessionKey, '1')
        // Fire-and-forget analytics view event
        trackView(mediaId, doc.type as 'video' | 'clip', doc.creatorId, firebaseUser?.uid)
      }
      // Load related
      getRelatedMedia(mediaId, doc.category, doc.type).then(setRelated)
    })
  }, [mediaId, firebaseUser])

  // Watch-time tracking — tick every 10 s while on page
  useEffect(() => {
    if (!mediaId || !media) return
    watchIntervalRef.current = setInterval(() => {
      watchSecondsRef.current += 10
      trackWatchTime(mediaId, (media as MediaDoc).type as 'video' | 'clip', (media as MediaDoc).creatorId, 10)
    }, 10_000)
    return () => {
      if (watchIntervalRef.current) clearInterval(watchIntervalRef.current)
    }
  }, [mediaId, media])

  // Load this user's like status whenever user or media changes
  useEffect(() => {
    if (!mediaId || !firebaseUser) return
    getUserLike(mediaId, firebaseUser.uid).then(setLiked)
  }, [mediaId, firebaseUser])

  // Subscribe to comments
  useEffect(() => {
    if (!mediaId) return
    const unsub = subscribeComments(mediaId, setComments)
    return unsub
  }, [mediaId])

  async function handleLike() {
    if (!firebaseUser) { router.push('/auth/login'); return }
    if (!mediaId) return
    const next = !liked
    setLiked(next)
    setLikeCount((c) => c + (next ? 1 : -1))
    try {
      await toggleLike(mediaId, firebaseUser.uid, next)
      if (media) trackLike(mediaId, (media as MediaDoc).type as 'video' | 'clip', (media as MediaDoc).creatorId, next)
    } catch {
      // revert on error
      setLiked(!next)
      setLikeCount((c) => c + (next ? -1 : 1))
    }
  }

  function handleShare() {
    navigator.clipboard.writeText(window.location.href)
      .then(() => {
        toast.success('Link copied!', { icon: '🔗' })
        if (media) trackShare(mediaId, (media as MediaDoc).type as 'video' | 'clip', (media as MediaDoc).creatorId)
      })
      .catch(() => toast.error('Could not copy link'))
  }

  async function handleComment(e: React.FormEvent) {
    e.preventDefault()
    if (!firebaseUser) { router.push('/auth/login'); return }
    if (!commentText.trim() || submitting || !mediaId) return
    setSubmitting(true)
    try {
      await addComment(mediaId, commentText, {
        uid: firebaseUser.uid,
        name: khojUser?.name ?? firebaseUser.displayName ?? 'Anonymous',
        photo: khojUser?.avatarUrl ?? firebaseUser.photoURL ?? '',
      })
      setCommentText('')
      setTimeout(() => commentsEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 100)
    } catch {
      toast.error('Failed to post comment')
    } finally {
      setSubmitting(false)
    }
  }

  // Loading state
  if (media === undefined) {
    return (
      <AppShell>
        <div className="flex items-center justify-center h-64">
          <div className="w-6 h-6 border-2 border-[#ff5a00] border-t-transparent rounded-full animate-spin" />
        </div>
      </AppShell>
    )
  }

  // Not found
  if (media === null) {
    return (
      <AppShell>
        <div className="flex flex-col items-center justify-center py-32 text-center space-y-4">
          <div className="w-16 h-16 rounded-2xl bg-zinc-900 border border-zinc-800 flex items-center justify-center">
            <svg className="w-7 h-7 text-zinc-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6">
              <path d="M9.172 16.172a4 4 0 0 1 5.656 0M9 10h.01M15 10h.01M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0z" />
            </svg>
          </div>
          <div>
            <p className="text-white font-bold text-base">Media not found</p>
            <p className="text-zinc-500 text-sm mt-1">This video or clip may have been removed.</p>
          </div>
          <Link href="/arena" className="text-[#ff5a00] hover:text-orange-400 text-sm font-semibold transition-colors">
            ← Back to Arena
          </Link>
        </div>
      </AppShell>
    )
  }

  const accentColor = media.type === 'clip' ? '#a855f7' : '#ff5a00'

  return (
    <AppShell>
      <div className="max-w-6xl mx-auto space-y-6">

        {/* Back nav */}
        <Link
          href="/arena"
          className="inline-flex items-center gap-1.5 text-zinc-500 hover:text-white text-sm transition-colors"
        >
          <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M15 18l-6-6 6-6" />
          </svg>
          Back to Arena
        </Link>

        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">

          {/* ── Main column ── */}
          <div className="xl:col-span-2 space-y-4">

            {/* Video player */}
            <div className="relative bg-zinc-950 rounded-2xl overflow-hidden shadow-2xl shadow-black/60">
              {media.videoUrl ? (
                <video
                  src={media.videoUrl}
                  controls
                  className="w-full max-h-[560px] object-contain bg-black"
                  poster={media.thumbnailUrl || undefined}
                  playsInline
                />
              ) : (
                <div className="aspect-video flex items-center justify-center bg-zinc-900">
                  <div className="w-14 h-14 rounded-full bg-white/5 border border-white/10 flex items-center justify-center">
                    <svg className="w-6 h-6 text-zinc-600" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M8 5v14l11-7z" />
                    </svg>
                  </div>
                </div>
              )}
            </div>

            {/* Title + meta */}
            <div className="space-y-3">
              <h1 className="text-white text-xl font-bold leading-snug">{media.title}</h1>

              <div className="flex items-center justify-between flex-wrap gap-3">
                {/* Creator */}
                <div className="flex items-center gap-2.5">
                  {media.creatorPhoto ? (
                    <img src={media.creatorPhoto} alt={media.creatorName} className="w-9 h-9 rounded-full object-cover" />
                  ) : (
                    <div className="w-9 h-9 rounded-full flex items-center justify-center" style={{ backgroundColor: `${accentColor}15`, border: `1px solid ${accentColor}25` }}>
                      <span className="font-bold text-sm" style={{ color: accentColor }}>{media.creatorName.charAt(0).toUpperCase()}</span>
                    </div>
                  )}
                  <div>
                    <p className="text-white text-sm font-semibold leading-none">{media.creatorName}</p>
                    <p className="text-zinc-500 text-xs mt-0.5">{timeAgo(media.createdAt)}</p>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-2">
                  {/* Like */}
                  <button
                    onClick={handleLike}
                    className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-semibold border transition-all ${
                      liked
                        ? 'bg-[#ff5a00]/10 border-[#ff5a00]/40 text-[#ff5a00]'
                        : 'bg-zinc-900 border-zinc-700 text-zinc-400 hover:border-[#ff5a00]/30 hover:text-[#ff5a00]/70'
                    }`}
                  >
                    <svg className="w-4 h-4" viewBox="0 0 24 24" fill={liked ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
                    </svg>
                    <span>{formatViews(likeCount)}</span>
                  </button>

                  {/* Share */}
                  <button
                    onClick={handleShare}
                    className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-semibold bg-zinc-900 border border-zinc-700 text-zinc-400 hover:text-white hover:border-zinc-600 transition-all"
                  >
                    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <circle cx="18" cy="5" r="3" /><circle cx="6" cy="12" r="3" /><circle cx="18" cy="19" r="3" />
                      <line x1="8.59" y1="13.51" x2="15.42" y2="17.49" /><line x1="15.41" y1="6.51" x2="8.59" y2="10.49" />
                    </svg>
                    Share
                  </button>

                  {/* Report */}
                  {firebaseUser && firebaseUser.uid !== media.creatorId && (
                    <button
                      onClick={() => setShowReport(true)}
                      className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-semibold bg-zinc-900 border border-zinc-700 text-zinc-500 hover:text-red-400 hover:border-red-500/30 transition-all"
                    >
                      <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z" /><line x1="4" y1="22" x2="4" y2="15" />
                      </svg>
                      Report
                    </button>
                  )}
                </div>
              </div>

              {/* Stats row */}
              <div className="flex items-center gap-3 text-zinc-500 text-xs">
                <span>{formatViews(media.views)} views</span>
                <span>·</span>
                <span>{formatDuration(media.duration)}</span>
                <span>·</span>
                <span
                  className="px-2 py-0.5 rounded-md text-[10px] font-semibold border capitalize"
                  style={{ color: accentColor, borderColor: `${accentColor}40`, backgroundColor: `${accentColor}10` }}
                >
                  {media.type}
                </span>
                {media.category && (
                  <>
                    <span>·</span>
                    <span>{media.category}</span>
                  </>
                )}
              </div>

              {/* Description */}
              {media.description && (
                <div className="bg-[#101218] border border-zinc-800 rounded-xl p-4">
                  <p className="text-zinc-300 text-sm leading-relaxed whitespace-pre-wrap">{media.description}</p>
                </div>
              )}

              {/* Tags */}
              {media.tags && media.tags.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {media.tags.map((tag) => (
                    <span key={tag} className="text-xs text-zinc-500 bg-zinc-900 border border-zinc-700 px-2.5 py-1 rounded-lg">
                      #{tag}
                    </span>
                  ))}
                </div>
              )}

              {/* ── Comments ── */}
              <div className="space-y-4 pt-2">
                <h3 className="text-white text-sm font-bold tracking-wide">
                  Comments <span className="text-zinc-500 font-normal">({comments.length})</span>
                </h3>

                {/* Input */}
                <form onSubmit={handleComment} className="flex gap-3 items-start">
                  {firebaseUser ? (
                    <>
                      {(khojUser?.avatarUrl || firebaseUser.photoURL) ? (
                        <img
                          src={khojUser?.avatarUrl ?? firebaseUser.photoURL!}
                          alt="you"
                          className="w-8 h-8 rounded-full object-cover flex-shrink-0 mt-0.5"
                        />
                      ) : (
                        <div className="w-8 h-8 rounded-full flex-shrink-0 mt-0.5 flex items-center justify-center bg-[#ff5a00]/15 border border-[#ff5a00]/25">
                          <span className="text-xs font-bold text-[#ff5a00]">
                            {(khojUser?.name ?? firebaseUser.displayName ?? 'A').charAt(0).toUpperCase()}
                          </span>
                        </div>
                      )}
                      <div className="flex-1 flex gap-2 items-end">
                        <textarea
                          value={commentText}
                          onChange={(e) => setCommentText(e.target.value)}
                          onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleComment(e as unknown as React.FormEvent) } }}
                          placeholder="Add a comment…"
                          rows={1}
                          maxLength={500}
                          className="flex-1 bg-[#101218] border border-zinc-800 rounded-xl px-3 py-2 text-sm text-white placeholder-zinc-600 resize-none focus:outline-none focus:border-[#ff5a00]/50 transition-colors"
                        />
                        <button
                          type="submit"
                          disabled={!commentText.trim() || submitting}
                          className="px-4 py-2 rounded-xl text-sm font-semibold bg-[#ff5a00] text-white hover:bg-[#ff4400] disabled:opacity-40 disabled:cursor-not-allowed transition-colors flex-shrink-0"
                        >
                          {submitting ? '…' : 'Post'}
                        </button>
                      </div>
                    </>
                  ) : (
                    <p className="text-zinc-500 text-sm">
                      <button onClick={() => router.push('/auth/login')} className="text-[#ff5a00] hover:underline">Sign in</button> to comment.
                    </p>
                  )}
                </form>

                {/* List */}
                <div className="space-y-4">
                  {comments.map((c) => (
                    <CommentItem
                      key={c.id}
                      comment={c}
                      mediaId={mediaId!}
                      mediaOwnerId={media.creatorId}
                      currentUserId={firebaseUser?.uid ?? null}
                      currentUserName={khojUser?.name ?? firebaseUser?.displayName ?? 'Anonymous'}
                      currentUserPhoto={khojUser?.avatarUrl ?? firebaseUser?.photoURL ?? ''}
                      onLoginRequired={() => router.push('/auth/login')}
                    />
                  ))}
                  {comments.length === 0 && (
                    <p className="text-zinc-600 text-sm text-center py-6">No comments yet. Be the first!</p>
                  )}
                  <div ref={commentsEndRef} />
                </div>
              </div>

            </div>
          </div>

          {/* ── Related sidebar ── */}
          <div className="space-y-4">
            <h3 className="text-white text-sm font-bold tracking-wide">Related</h3>
            {related.length === 0 ? (
              <div className="text-zinc-600 text-xs py-8 text-center">
                No related content found.
              </div>
            ) : (
              <div className="space-y-3">
                {related.map((rel) => (
                  <RelatedCard key={rel.id} media={rel} />
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Report modal */}
      {showReport && firebaseUser && media && (
        <ReportModal
          targetType={media.type}
          targetId={media.id}
          targetTitle={media.title}
          targetPreview={media.thumbnailUrl || undefined}
          targetOwnerId={media.creatorId}
          targetOwnerName={media.creatorName}
          reportedBy={firebaseUser.uid}
          reporterName={khojUser?.name ?? firebaseUser.displayName ?? 'Anonymous'}
          onClose={() => setShowReport(false)}
        />
      )}
    </AppShell>
  )
}

// ── Related card (compact horizontal) ────────────────────────────────────────

function RelatedCard({ media }: { media: MediaDoc }) {
  const accentColor = media.type === 'clip' ? '#a855f7' : '#ff5a00'
  const initial = media.creatorName.charAt(0).toUpperCase()

  return (
    <Link href={`/arena/media/${media.id}`} className="flex gap-3 group hover:bg-zinc-900/50 rounded-xl p-2 transition-colors cursor-pointer">
      {/* Thumbnail */}
      <div className={`relative flex-shrink-0 rounded-lg overflow-hidden bg-zinc-900 ${media.type === 'clip' ? 'w-16 aspect-[9/14]' : 'w-28 aspect-video'}`}>
        {media.thumbnailUrl ? (
          <img src={media.thumbnailUrl} alt={media.title} className="w-full h-full object-cover" />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center">
            <svg className="w-4 h-4 text-zinc-700" viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z" /></svg>
          </div>
        )}
        {media.duration > 0 && (
          <span className="absolute bottom-1 right-1 bg-black/80 text-white text-[9px] font-mono px-1 py-px rounded">
            {formatDuration(media.duration)}
          </span>
        )}
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0 space-y-1">
        <p className="text-white text-xs font-semibold line-clamp-2 leading-snug group-hover:text-zinc-100">{media.title}</p>
        <p className="text-zinc-600 text-[11px] truncate">{media.creatorName}</p>
        <p className="text-zinc-700 text-[10px]">{formatViews(media.views)} views · {timeAgo(media.createdAt)}</p>
      </div>
    </Link>
  )
}

// ── CommentItem (like + reply) ────────────────────────────────────────────────

function CommentItem({
  comment,
  mediaId,
  mediaOwnerId,
  currentUserId,
  currentUserName,
  currentUserPhoto,
  onLoginRequired,
}: {
  comment: MediaComment
  mediaId: string
  mediaOwnerId: string
  currentUserId: string | null
  currentUserName: string
  currentUserPhoto: string
  onLoginRequired: () => void
}) {
  const [liked, setLiked]             = useState(false)
  const [likeCount, setLikeCount]     = useState(comment.likes)
  const [showReplyForm, setShowReplyForm] = useState(false)
  const [replyText, setReplyText]     = useState('')
  const [submitting, setSubmitting]   = useState(false)
  const [deleting, setDeleting]       = useState(false)
  const [showReplies, setShowReplies] = useState(false)
  const [replies, setReplies]         = useState<CommentReply[]>([])

  // Load this user's like on the comment
  useEffect(() => {
    if (!currentUserId) return
    getCommentLike(mediaId, comment.id, currentUserId).then(setLiked)
  }, [mediaId, comment.id, currentUserId])

  // Subscribe to replies when expanded
  useEffect(() => {
    if (!showReplies) return
    const unsub = subscribeReplies(mediaId, comment.id, setReplies)
    return unsub
  }, [mediaId, comment.id, showReplies])

  async function handleLike() {
    if (!currentUserId) { onLoginRequired(); return }
    const next = !liked
    setLiked(next)
    setLikeCount((c) => c + (next ? 1 : -1))
    try {
      await toggleCommentLike(mediaId, comment.id, currentUserId, next)
    } catch {
      setLiked(!next)
      setLikeCount((c) => c + (next ? -1 : 1))
    }
  }

  async function handleReply(e: React.FormEvent) {
    e.preventDefault()
    if (!currentUserId) { onLoginRequired(); return }
    if (!replyText.trim() || submitting) return
    setSubmitting(true)
    try {
      await addReply(mediaId, comment.id, replyText, {
        uid: currentUserId,
        name: currentUserName,
        photo: currentUserPhoto,
      })
      setReplyText('')
      setShowReplies(true)
    } catch {
      toast.error('Failed to post reply')
    } finally {
      setSubmitting(false)
    }
  }

  async function handleDeleteComment() {
    if (!currentUserId || deleting) return
    setDeleting(true)
    try {
      await deleteComment(mediaId, comment.id)
    } catch {
      toast.error('Failed to delete comment')
      setDeleting(false)
    }
  }

  async function handleDeleteReply(replyId: string) {
    try {
      await deleteReply(mediaId, comment.id, replyId)
    } catch {
      toast.error('Failed to delete reply')
    }
  }

  const totalReplies = showReplies ? replies.length : comment.replyCount
  const canDelete = currentUserId === comment.authorId || currentUserId === mediaOwnerId

  return (
    <div className="flex gap-3">
      {/* Avatar */}
      {comment.authorPhoto ? (
        <img src={comment.authorPhoto} alt={comment.authorName} className="w-8 h-8 rounded-full object-cover flex-shrink-0 mt-0.5" />
      ) : (
        <div className="w-8 h-8 rounded-full flex-shrink-0 mt-0.5 flex items-center justify-center bg-zinc-800 border border-zinc-700">
          <span className="text-xs font-bold text-zinc-400">{comment.authorName.charAt(0).toUpperCase()}</span>
        </div>
      )}

      <div className="flex-1 min-w-0 space-y-1">
        {/* Name + time + delete */}
        <div className="flex items-center gap-2">
          <span className="text-white text-xs font-semibold">{comment.authorName}</span>
          <span className="text-zinc-600 text-[10px]">{timeAgo(comment.createdAt)}</span>
          {canDelete && (
            <button
              onClick={handleDeleteComment}
              disabled={deleting}
              className="ml-auto text-[10px] text-zinc-600 hover:text-red-400 transition-colors disabled:opacity-40"
              title="Delete comment"
            >
              {deleting ? '…' : 'Delete'}
            </button>
          )}
        </div>
        <p className="text-zinc-300 text-sm leading-relaxed whitespace-pre-wrap break-words">{comment.text}</p>

        {/* Action row */}
        <div className="flex items-center gap-4 pt-0.5">
          {/* Like button */}
          <button
            onClick={handleLike}
            className={`flex items-center gap-1 text-[11px] font-semibold transition-colors ${liked ? 'text-[#ff5a00]' : 'text-zinc-500 hover:text-zinc-300'}`}
          >
            <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill={liked ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
            </svg>
            {likeCount > 0 ? likeCount : 'Like'}
          </button>

          {/* Reply toggle */}
          <button
            onClick={() => { setShowReplyForm((v) => !v); if (!showReplyForm && totalReplies > 0) setShowReplies(true) }}
            className="text-[11px] font-semibold text-zinc-500 hover:text-zinc-300 transition-colors"
          >
            Reply
          </button>

          {/* Show/hide replies */}
          {totalReplies > 0 && (
            <button
              onClick={() => setShowReplies((v) => !v)}
              className="text-[11px] font-semibold text-zinc-500 hover:text-[#ff5a00] transition-colors"
            >
              {showReplies ? 'Hide replies' : `${totalReplies} repl${totalReplies === 1 ? 'y' : 'ies'}`}
            </button>
          )}
        </div>

        {/* Reply input */}
        {showReplyForm && (
          <form onSubmit={handleReply} className="flex gap-2 items-end pt-1">
            <textarea
              value={replyText}
              onChange={(e) => setReplyText(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleReply(e as unknown as React.FormEvent) } }}
              placeholder={`Reply to ${comment.authorName}…`}
              rows={1}
              maxLength={500}
              className="flex-1 bg-[#101218] border border-zinc-800 rounded-xl px-3 py-1.5 text-xs text-white placeholder-zinc-600 resize-none focus:outline-none focus:border-[#ff5a00]/50 transition-colors"
            />
            <button
              type="submit"
              disabled={!replyText.trim() || submitting}
              className="px-3 py-1.5 rounded-xl text-xs font-semibold bg-[#ff5a00] text-white hover:bg-[#ff4400] disabled:opacity-40 disabled:cursor-not-allowed transition-colors flex-shrink-0"
            >
              {submitting ? '…' : 'Reply'}
            </button>
          </form>
        )}

        {/* Replies list */}
        {showReplies && replies.length > 0 && (
          <div className="space-y-3 pt-2 pl-3 border-l-2 border-zinc-800 mt-1">
            {replies.map((r) => (
              <div key={r.id} className="flex gap-2">
                {r.authorPhoto ? (
                  <img src={r.authorPhoto} alt={r.authorName} className="w-6 h-6 rounded-full object-cover flex-shrink-0 mt-0.5" />
                ) : (
                  <div className="w-6 h-6 rounded-full flex-shrink-0 mt-0.5 flex items-center justify-center bg-zinc-800 border border-zinc-700">
                    <span className="text-[9px] font-bold text-zinc-400">{r.authorName.charAt(0).toUpperCase()}</span>
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-white text-xs font-semibold">{r.authorName}</span>
                    <span className="text-zinc-600 text-[10px]">{timeAgo(r.createdAt)}</span>
                    {currentUserId === r.authorId && (
                      <button
                        onClick={() => handleDeleteReply(r.id)}
                        className="ml-auto text-[10px] text-zinc-600 hover:text-red-400 transition-colors"
                        title="Delete reply"
                      >
                        Delete
                      </button>
                    )}
                  </div>
                  <p className="text-zinc-300 text-xs mt-0.5 leading-relaxed whitespace-pre-wrap break-words">{r.text}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
