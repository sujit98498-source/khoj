// components/community/ReactionBar.tsx
// Five-reaction bar: Like · Fire · Clap · Insightful · Support
// Handles optimistic local toggling and Firestore sync

'use client'

import { useState, useEffect } from 'react'
import { reactToPost, getUserReaction } from '@/services/communityService'
import { CommunityPost, ReactionType } from '@/lib/types'
import clsx from 'clsx'

interface ReactionConfig {
  key: ReactionType
  icon: string
  label: string
  activeClass: string
}

const REACTIONS: ReactionConfig[] = [
  { key: 'like', icon: '♥', label: 'Like', activeClass: 'text-red-400 border-red-400/40 bg-red-400/10' },
  { key: 'fire', icon: '🔥', label: 'Fire', activeClass: 'text-orange-400 border-orange-400/40 bg-orange-400/10' },
  { key: 'clap', icon: '👏', label: 'Clap', activeClass: 'text-khoj-gold border-khoj-gold/40 bg-khoj-gold/10' },
]

interface ReactionBarProps {
  post: CommunityPost
  userId: string | null
  compact?: boolean
}

export function ReactionBar({ post, userId, compact = false }: ReactionBarProps) {
  const [localReactions, setLocalReactions] = useState(post.reactions)
  const [activeReaction, setActiveReaction] = useState<ReactionType | null>(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!userId) return
    getUserReaction(post.id, userId).then((r) => setActiveReaction(r))
  }, [post.id, userId])

  const handleReact = async (reaction: ReactionType) => {
    if (!userId || loading) return
    setLoading(true)

    const prev = activeReaction
    const isSame = prev === reaction

    setLocalReactions((r) => ({
      ...r,
      ...(prev && !isSame ? { [prev]: Math.max(0, r[prev] - 1) } : {}),
      [reaction]: isSame ? Math.max(0, r[reaction] - 1) : r[reaction] + 1,
    }))
    setActiveReaction(isSame ? null : reaction)

    try {
      await reactToPost(post.id, userId, reaction)
    } catch {
      setLocalReactions(post.reactions)
      setActiveReaction(prev)
    } finally {
      setLoading(false)
    }
  }

  const total = Object.values(localReactions).reduce((a, b) => a + b, 0)

  if (compact) {
    const topTwo = REACTIONS.filter((r) => localReactions[r.key] > 0)
      .sort((a, b) => localReactions[b.key] - localReactions[a.key])
      .slice(0, 2)

    return (
      <div className="flex items-center gap-1.5">
        {topTwo.map((r) => (
          <span key={r.key} className="text-sm">{r.icon}</span>
        ))}
        {total > 0 && (
          <span className="text-xs text-khoj-subtle font-body">{total.toLocaleString()}</span>
        )}
      </div>
    )
  }

  return (
    <div className="flex items-center gap-1.5 flex-wrap">
      {REACTIONS.map((r) => {
        const count = localReactions[r.key]
        const isActive = activeReaction === r.key

        return (
          <button
            key={r.key}
            onClick={() => handleReact(r.key)}
            title={r.label}
            disabled={!userId}
            className={clsx(
              'flex items-center gap-1.5 px-2.5 py-1 rounded-sm border text-xs font-body font-medium transition-all duration-150',
              isActive
                ? r.activeClass
                : 'border-khoj-border text-khoj-subtle hover:border-khoj-muted hover:text-khoj-text',
              !userId && 'cursor-default opacity-60'
            )}
          >
            <span className="text-sm leading-none">{r.icon}</span>
            {count > 0 && (
              <span className={clsx('font-mono text-[11px]', isActive ? '' : 'text-khoj-muted')}>
                {count >= 1000 ? `${(count / 1000).toFixed(1)}k` : count}
              </span>
            )}
          </button>
        )
      })}
    </div>
  )
}