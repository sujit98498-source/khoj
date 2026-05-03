// components/community/CommentDrawer.tsx
// Slide-in right panel showing comments for a post
// Real-time subscription via Firestore, falls back to mock data

'use client'

import { useState, useEffect, useRef } from 'react'
import { subscribeToComments, addComment, timeAgo } from '@/services/communityService'
import { CommunityPost, CommunityComment } from '@/lib/types'
import { Button } from '@/components/ui/Button'
import clsx from 'clsx'
import toast from 'react-hot-toast'

interface CommentDrawerProps {
  post: CommunityPost
  currentUser: { uid: string; name: string; xp: number } | null
  onClose: () => void
  onCommentAdded?: () => void
}

function Avatar({ name, xp, size = 'sm' }: { name: string; xp: number; size?: 'sm' | 'md' }) {
  const colors = ['#FF4D00', '#FFB800', '#00D4AA', '#6366f1', '#ec4899']
  const color = colors[name.charCodeAt(0) % colors.length]
  const dim = size === 'sm' ? 'w-7 h-7 text-[11px]' : 'w-9 h-9 text-sm'

  return (
    <div
      className={clsx('rounded-sm flex items-center justify-center font-display font-bold flex-shrink-0', dim)}
      style={{ backgroundColor: `${color}20`, border: `1px solid ${color}40`, color }}
    >
      {name.charAt(0).toUpperCase()}
    </div>
  )
}

export function CommentDrawer({ post, currentUser, onClose, onCommentAdded }: CommentDrawerProps) {
  const [comments, setComments] = useState<CommunityComment[]>([])
  const [draft, setDraft] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const unsub = subscribeToComments(post.id, setComments)
    return () => unsub()
  }, [post.id])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [comments.length])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!draft.trim() || !currentUser) return

    const optimisticComment: CommunityComment = {
      id: `optimistic-${Date.now()}`,
      postId: post.id,
      authorId: currentUser.uid,
      authorName: currentUser.name,
      authorXP: currentUser.xp,
      content: draft.trim(),
      createdAt: new Date().toISOString(),
    }

    setSubmitting(true)
    setComments((prev) => [...prev, optimisticComment])
    setDraft('')

    try {
      const createdComment = await addComment(
        post.id,
        currentUser.uid,
        currentUser.name,
        currentUser.xp,
        optimisticComment.content
      )

      setComments((prev) => prev.map((comment) => (
        comment.id === optimisticComment.id ? createdComment : comment
      )))
      onCommentAdded?.()
    } catch {
      setComments((prev) => prev.filter((comment) => comment.id !== optimisticComment.id))
      toast.error('Failed to post comment')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <>
      <div
        className="fixed inset-0 bg-black/40 backdrop-blur-sm z-40"
        onClick={onClose}
      />

      <div className="fixed right-0 top-0 h-full w-full max-w-md bg-khoj-card border-l border-khoj-border z-50 flex flex-col animate-slide-right shadow-2xl">
        <div className="flex items-center justify-between px-6 py-5 border-b border-khoj-border flex-shrink-0">
          <div>
            <p className="text-[10px] uppercase tracking-widest text-khoj-subtle font-body">Comments</p>
            <p className="font-display font-bold text-khoj-text mt-0.5 text-sm line-clamp-1">
              {post.authorName}'s post
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-khoj-subtle hover:text-khoj-text transition text-lg w-8 h-8 flex items-center justify-center"
          >
            ✕
          </button>
        </div>

        <div className="px-6 py-4 border-b border-khoj-border bg-khoj-bg/50 flex-shrink-0">
          <p className="text-xs text-khoj-subtle font-body line-clamp-2 leading-relaxed">{post.content}</p>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-4 space-y-5">
          {comments.length === 0 ? (
            <div className="py-12 text-center">
              <p className="text-3xl mb-3">💬</p>
              <p className="text-sm text-khoj-subtle font-body">Be the first to comment</p>
            </div>
          ) : (
            comments.map((c) => (
              <div key={c.id} className="flex gap-3">
                <Avatar name={c.authorName} xp={c.authorXP} />
                <div className="flex-1 min-w-0">
                  <div className="flex items-baseline gap-2 mb-1">
                    <span className="text-sm font-body font-semibold text-khoj-text">{c.authorName}</span>
                    <span className="text-[10px] font-mono text-khoj-gold">{c.authorXP} XP</span>
                    <span className="text-[10px] text-khoj-muted font-body ml-auto">{timeAgo(c.createdAt)}</span>
                  </div>
                  <p className="text-sm text-khoj-subtle font-body leading-relaxed">{c.content}</p>
                  <button className="text-[10px] text-khoj-muted hover:text-khoj-accent font-body mt-2 transition">
                    Reply
                  </button>
                </div>
              </div>
            ))
          )}
          <div ref={bottomRef} />
        </div>

        <div className="px-6 py-4 border-t border-khoj-border flex-shrink-0">
          {currentUser ? (
            <form onSubmit={handleSubmit} className="flex gap-3">
              <Avatar name={currentUser.name} xp={currentUser.xp} size="md" />
              <div className="flex-1 flex flex-col gap-2">
                <textarea
                  value={draft}
                  onChange={(e) => setDraft(e.target.value)}
                  placeholder="Write a comment..."
                  rows={2}
                  className="w-full px-3 py-2 bg-khoj-bg border border-khoj-border rounded-sm text-sm text-khoj-text placeholder-khoj-subtle font-body focus:outline-none focus:border-khoj-accent resize-none transition-colors"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) handleSubmit(e as any)
                  }}
                />
                <div className="flex justify-between items-center">
                  <p className="text-[10px] text-khoj-muted font-body">⌘+Enter to post</p>
                  <Button size="sm" type="submit" loading={submitting} disabled={!draft.trim()}>
                    Post
                  </Button>
                </div>
              </div>
            </form>
          ) : (
            <p className="text-xs text-khoj-subtle font-body text-center py-2">
              Sign in to comment
            </p>
          )}
        </div>
      </div>
    </>
  )
}