// components/community/PostCard.tsx
// Main community post card — avatar, content, image, reactions, actions
// Supports all 5 post types and 5 circles

'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { CommunityPost, PostType, CIRCLES } from '@/lib/types'
import { ReactionBar } from './ReactionBar'
import { CommentDrawer } from './CommentDrawer'
import { ReportPostModal } from './ReportPostModal'
import { getDisplayCommentCount, isPostSaved, savePost, timeAgo } from '@/services/communityService'
import clsx from 'clsx'
import toast from 'react-hot-toast'

const POST_TYPE_CONFIG: Record<PostType, { label: string; color: string; bg: string }> = {
  Story: { label: 'Story', color: 'text-khoj-gold', bg: 'bg-khoj-gold/10 border-khoj-gold/30' },
  Achievement: { label: 'Achievement', color: 'text-khoj-teal', bg: 'bg-khoj-teal/10 border-khoj-teal/30' },
  Discussion: { label: 'Discussion', color: 'text-blue-400', bg: 'bg-blue-400/10 border-blue-400/30' },
  'Team-Up': { label: 'Team-Up', color: 'text-khoj-accent', bg: 'bg-khoj-accent/10 border-khoj-accent/30' },
  Showcase: { label: 'Showcase', color: 'text-purple-400', bg: 'bg-purple-400/10 border-purple-400/30' },
}

const AVATAR_COLORS = ['#FF4D00', '#FFB800', '#00D4AA', '#6366f1', '#ec4899', '#14b8a6']

function PostAvatar({ name, xp }: { name: string; xp: number }) {
  const color = AVATAR_COLORS[name.charCodeAt(0) % AVATAR_COLORS.length]
  return (
    <div
      className="w-10 h-10 rounded-sm flex-shrink-0 flex items-center justify-center font-display font-bold text-sm"
      style={{ backgroundColor: `${color}20`, border: `1px solid ${color}40`, color }}
    >
      {name.charAt(0).toUpperCase()}
    </div>
  )
}

interface PostCardProps {
  post: CommunityPost
  currentUserId: string | null
  currentUserName?: string
  currentUserXP?: number
  featured?: boolean
  onSaveChange?: (saved: boolean, post: CommunityPost) => void
}

export function PostCard({
  post,
  currentUserId,
  currentUserName,
  currentUserXP,
  featured = false,
  onSaveChange,
}: PostCardProps) {
  const [showComments, setShowComments] = useState(false)
  const [saved, setSaved] = useState(false)
  const [savingPost, setSavingPost] = useState(false)
  const [expanded, setExpanded] = useState(false)
  const [commentCount, setCommentCount] = useState(getDisplayCommentCount(post))
  const [showMenu, setShowMenu] = useState(false)
  const [showReportModal, setShowReportModal] = useState(false)

  const circle = CIRCLES.find((c) => c.id === post.circle)
  const isOwner = currentUserId === post.authorId
  const typeConfig = POST_TYPE_CONFIG[post.type]
  const isLong = post.content.length > 280

  useEffect(() => {
    setCommentCount(getDisplayCommentCount(post))
  }, [post])

  useEffect(() => {
    let isActive = true

    if (!currentUserId) {
      setSaved(false)
      return
    }

    isPostSaved(post.id, currentUserId).then((value) => {
      if (isActive) {
        setSaved(value)
      }
    })

    return () => {
      isActive = false
    }
  }, [post.id, currentUserId])

  const handleSave = async () => {
    if (!currentUserId) {
      toast.error('Sign in to save posts')
      return
    }
    setSavingPost(true)
    try {
      const nextSaved = await savePost(post.id, currentUserId)
      setSaved(nextSaved)
      onSaveChange?.(nextSaved, post)
      toast.success(nextSaved ? '✓ Saved' : 'Removed from saved')
    } catch {
      toast.error('Failed to save')
    } finally {
      setSavingPost(false)
    }
  }

  const handleShare = () => {
    const url = `${window.location.origin}/community?post=${post.id}`
    navigator.clipboard?.writeText(url).then(() => toast.success('Link copied!'))
  }

  return (
    <>
      {showComments && (
        <CommentDrawer
          post={post}
          currentUser={
            currentUserId
              ? { uid: currentUserId, name: currentUserName ?? 'You', xp: currentUserXP ?? 0 }
              : null
          }
          onCommentAdded={() => setCommentCount((count) => count + 1)}
          onClose={() => setShowComments(false)}
        />
      )}

      {showReportModal && (
        <ReportPostModal
          open={showReportModal}
          post={post}
          reporterUserId={currentUserId}
          reporterName={currentUserName}
          onClose={() => setShowReportModal(false)}
        />
      )}

      <article
        className={clsx(
          'bg-khoj-card border rounded-sm transition-all duration-200 group',
          featured
            ? 'border-khoj-accent/30 shadow-[0_0_30px_rgba(255,77,0,0.07)]'
            : 'border-khoj-border hover:border-khoj-border/80',
          post.pinned && 'border-l-2 border-l-khoj-accent'
        )}
      >
        {post.pinned && (
          <div className="flex items-center gap-2 px-5 pt-3 pb-0">
            <span className="text-[9px] uppercase tracking-widest text-khoj-accent font-body font-bold">
              ◈ Featured
            </span>
          </div>
        )}

        <div className="p-5">
          <div className="flex items-start gap-3 mb-4">
            <Link
              href={`/profile/${post.authorId}`}
              onClick={(e) => e.stopPropagation()}
              className="flex items-start gap-3 flex-1 min-w-0 group/author"
            >
              <PostAvatar name={post.authorName} xp={post.authorXP} />

              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-body font-semibold text-khoj-text text-sm group-hover/author:text-khoj-accent transition-colors duration-150 cursor-pointer">{post.authorName}</span>
                  <span className="text-[10px] font-mono text-khoj-gold">{post.authorXP.toLocaleString()} XP</span>
                  {post.authorSkills.slice(0, 2).map((s) => (
                    <span
                      key={s}
                      className="text-[9px] uppercase tracking-wider px-1.5 py-0.5 bg-khoj-muted/30 text-khoj-subtle rounded-sm font-body"
                    >
                      {s}
                    </span>
                  ))}
                </div>

                <div className="flex items-center gap-2 mt-1">
                  <span
                    className={clsx(
                      'text-[9px] uppercase tracking-wider font-body font-bold px-2 py-0.5 border rounded-sm',
                      typeConfig.bg,
                      typeConfig.color
                    )}
                  >
                    {typeConfig.label}
                  </span>

                  {circle && (
                    <span className={clsx('text-[10px] font-body', circle.color)}>
                      {circle.icon} {circle.label}
                    </span>
                  )}

                  <span className="text-[10px] text-khoj-muted font-body ml-auto">
                    {timeAgo(post.createdAt)}
                  </span>
                </div>
              </div>
            </Link>

            <div className="relative flex-shrink-0">
              <button
                type="button"
                onClick={() => setShowMenu((value) => !value)}
                className="rounded-sm border border-transparent px-2 py-1 text-khoj-subtle transition-all duration-150 hover:border-khoj-border hover:bg-khoj-muted/20 hover:text-khoj-text"
                aria-label="Open post actions"
              >
                ⋯
              </button>

              {showMenu && (
                <div className="absolute right-0 top-10 z-20 min-w-[160px] overflow-hidden rounded-sm border border-khoj-border bg-khoj-card shadow-[0_0_20px_rgba(0,0,0,0.2)]">
                  {isOwner ? (
                    <div className="px-3 py-2 text-xs font-body text-khoj-muted">
                      This is your post
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => {
                        setShowMenu(false)
                        setShowReportModal(true)
                      }}
                      className="w-full px-3 py-2 text-left text-xs font-body text-red-400 hover:bg-red-500/10"
                    >
                      ⚑ Report Post
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>

          <div className="mb-4">
            <p
              className={clsx(
                'text-sm text-khoj-text font-body leading-relaxed whitespace-pre-line',
                !expanded && isLong && 'line-clamp-4'
              )}
            >
              {post.content}
            </p>
            {isLong && (
              <button
                onClick={() => setExpanded((e) => !e)}
                className="text-xs text-khoj-accent hover:underline font-body mt-2"
              >
                {expanded ? 'Show less' : 'Read more'}
              </button>
            )}
          </div>

          {post.imageUrl && (
            <div className="mb-4 rounded-sm overflow-hidden border border-khoj-border">
              <img
                src={post.imageUrl}
                alt="Post attachment"
                className="w-full object-cover max-h-72"
                loading="lazy"
              />
            </div>
          )}

          <div className="mb-4">
            <ReactionBar post={post} userId={currentUserId} />
          </div>

          <div className="border-t border-khoj-border/60 pt-3">
            <div className="flex items-center gap-1 flex-wrap">
              <ActionBtn
                icon="💬"
                label={commentCount > 0 ? `${commentCount} Comment${commentCount === 1 ? '' : 's'}` : 'Comment'}
                onClick={() => setShowComments(true)}
              />
              <ActionBtn
                icon="↗"
                label="Share"
                onClick={handleShare}
              />
              <ActionBtn
                icon={saved ? '★' : '☆'}
                label={saved ? 'Saved' : 'Save'}
                onClick={handleSave}
                active={saved}
                loading={savingPost}
              />
            </div>
          </div>
        </div>
      </article>
    </>
  )
}

function ActionBtn({
  icon,
  label,
  onClick,
  active = false,
  loading = false,
}: {
  icon: string
  label: string
  onClick: () => void
  active?: boolean
  loading?: boolean
}) {
  return (
    <button
      onClick={onClick}
      disabled={loading}
      className={clsx(
        'flex items-center gap-1.5 px-3 py-1.5 rounded-sm text-xs font-body font-medium transition-all duration-150 border',
        active
          ? 'text-khoj-accent border-khoj-accent/30 bg-khoj-accent/5'
          : 'text-khoj-subtle border-transparent hover:text-khoj-text hover:bg-khoj-muted/20 hover:border-khoj-border'
      )}
    >
      <span className="text-sm leading-none">{icon}</span>
      <span>{label}</span>
    </button>
  )
}