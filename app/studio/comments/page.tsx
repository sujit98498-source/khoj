// app/studio/comments/page.tsx
// KHOJ Studio — Comments across creator's content

'use client'

import { useEffect, useState } from 'react'
import { useAuth } from '@/hooks/useAuth'
import Link from 'next/link'
import {
  subscribeStudioContent,
  StudioMediaItem,
} from '@/services/studioAnalyticsService'
import {
  subscribeComments,
  deleteComment,
  MediaComment,
} from '@/services/mediaService'
import { timeAgo } from '@/services/mediaService'
import toast from 'react-hot-toast'

interface CommentWithSource extends MediaComment {
  mediaId: string
  mediaTitle: string
}

export default function StudioCommentsPage() {
  const { firebaseUser } = useAuth()
  const uid = firebaseUser?.uid ?? null

  const [allComments, setAllComments] = useState<CommentWithSource[]>([])
  const [loading, setLoading] = useState(true)
  const [deleting, setDeleting] = useState<string | null>(null)

  useEffect(() => {
    if (!uid) return

    // First load all creator content, then subscribe to comments for each
    const unsubs: (() => void)[] = []
    const commentMap = new Map<string, CommentWithSource[]>()

    const contentUnsub = subscribeStudioContent(uid, (items: StudioMediaItem[]) => {
      // Unsubscribe previous comment listeners
      unsubs.forEach((u) => u())
      unsubs.length = 0

      if (items.length === 0) {
        setAllComments([])
        setLoading(false)
        return
      }

      let loaded = 0
      const total = items.length

      items.forEach((item) => {
        const commentUnsub = subscribeComments(item.id, (comments: MediaComment[]) => {
          commentMap.set(item.id, comments.map((c) => ({
            ...c,
            mediaId: item.id,
            mediaTitle: item.title,
          })))

          // Merge all comments sorted by createdAt desc
          const merged: CommentWithSource[] = []
          commentMap.forEach((list) => merged.push(...list))
          merged.sort((a, b) => {
            const ta = (a.createdAt && typeof a.createdAt !== 'string') ? a.createdAt.seconds : 0
            const tb = (b.createdAt && typeof b.createdAt !== 'string') ? b.createdAt.seconds : 0
            return tb - ta
          })
          setAllComments(merged)

          loaded++
          if (loaded >= total) setLoading(false)
        })
        unsubs.push(commentUnsub)
      })
    })

    return () => {
      contentUnsub()
      unsubs.forEach((u) => u())
    }
  }, [uid])

  async function handleDelete(mediaId: string, commentId: string) {
    if (!confirm('Delete this comment?')) return
    setDeleting(commentId)
    try {
      await deleteComment(mediaId, commentId)
      toast.success('Comment deleted')
    } catch {
      toast.error('Failed to delete comment')
    } finally {
      setDeleting(null)
    }
  }

  if (!uid) return null

  return (
    <div className="p-8 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-white text-2xl font-bold tracking-tight">Comments</h1>
        <p className="text-zinc-500 text-sm mt-0.5">All comments across your content</p>
      </div>

      {loading ? (
        <CommentSkeleton />
      ) : allComments.length === 0 ? (
        <div className="bg-[#0d0e14] border border-[#1e1e2e] rounded-2xl flex flex-col items-center justify-center py-20 space-y-3">
          <div className="w-14 h-14 rounded-2xl bg-zinc-900 border border-zinc-800 flex items-center justify-center">
            <svg className="w-7 h-7 text-zinc-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
          </div>
          <p className="text-zinc-500 text-sm">No comments yet</p>
          <p className="text-zinc-700 text-xs">Comments on your videos and clips will appear here.</p>
        </div>
      ) : (
        <div className="bg-[#0d0e14] border border-[#1e1e2e] rounded-2xl overflow-hidden">
          {/* Table header */}
          <div className="grid grid-cols-[1fr_200px_120px_80px] gap-4 px-5 py-3 border-b border-zinc-800 bg-zinc-900/30">
            <span className="text-zinc-600 text-xs font-semibold">Comment</span>
            <span className="text-zinc-600 text-xs font-semibold">Content</span>
            <span className="text-zinc-600 text-xs font-semibold">Date</span>
            <span className="text-zinc-600 text-xs font-semibold text-right">Action</span>
          </div>

          <div className="divide-y divide-zinc-900">
            {allComments.map((comment) => (
              <div key={comment.id} className="grid grid-cols-[1fr_200px_120px_80px] gap-4 px-5 py-4 hover:bg-zinc-900/40 transition-colors items-center">
                {/* Comment */}
                <div className="flex items-start gap-3 min-w-0">
                  <div className="w-7 h-7 flex-shrink-0 rounded-full overflow-hidden bg-zinc-800 border border-zinc-700">
                    {comment.authorPhoto ? (
                      <img src={comment.authorPhoto} alt={comment.authorName} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-zinc-500 text-[10px] font-bold">
                        {comment.authorName?.[0]?.toUpperCase() ?? '?'}
                      </div>
                    )}
                  </div>
                  <div className="min-w-0">
                    <p className="text-zinc-300 text-xs font-semibold truncate">{comment.authorName}</p>
                    <p className="text-zinc-400 text-xs mt-0.5 line-clamp-2">{comment.text}</p>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-zinc-600 text-[10px]">♥ {comment.likes}</span>
                      {comment.replyCount > 0 && (
                        <span className="text-zinc-600 text-[10px]">↩ {comment.replyCount} replies</span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Source content */}
                <div className="min-w-0">
                  <Link
                    href={`/arena/media/${comment.mediaId}`}
                    className="text-[#ff5a00] text-xs hover:underline truncate block"
                  >
                    {comment.mediaTitle}
                  </Link>
                </div>

                {/* Date */}
                <div className="text-zinc-500 text-xs">{timeAgo(comment.createdAt)}</div>

                {/* Action */}
                <div className="flex justify-end">
                  <button
                    onClick={() => handleDelete(comment.mediaId, comment.id)}
                    disabled={deleting === comment.id}
                    className="w-7 h-7 rounded-lg bg-zinc-800 hover:bg-red-500/20 border border-transparent hover:border-red-500/30 flex items-center justify-center transition-colors disabled:opacity-40"
                    title="Delete comment"
                  >
                    {deleting === comment.id ? (
                      <div className="w-3 h-3 border border-red-400 border-t-transparent rounded-full animate-spin" />
                    ) : (
                      <svg className="w-3.5 h-3.5 text-zinc-400 hover:text-red-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/>
                        <path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4h6v2"/>
                      </svg>
                    )}
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

function CommentSkeleton() {
  return (
    <div className="bg-[#0d0e14] border border-[#1e1e2e] rounded-2xl overflow-hidden">
      {[...Array(6)].map((_, i) => (
        <div key={i} className="flex items-start gap-4 px-5 py-4 border-b border-zinc-900">
          <div className="w-7 h-7 rounded-full bg-zinc-800 animate-pulse flex-shrink-0" />
          <div className="flex-1 space-y-2">
            <div className="h-2.5 bg-zinc-800 rounded animate-pulse w-24" />
            <div className="h-2.5 bg-zinc-900 rounded animate-pulse w-48" />
          </div>
          <div className="h-2.5 w-16 bg-zinc-800 rounded animate-pulse" />
        </div>
      ))}
    </div>
  )
}
