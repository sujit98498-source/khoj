// components/dashboard/FeedCard.tsx
// Individual KHOJ Home Feed card.
// Supports all 6 feed types with matching badges, CTAs, and action buttons.

'use client'

import { useState } from 'react'
import Link from 'next/link'
import { formatDistanceToNow } from 'date-fns'
import toast from 'react-hot-toast'
import { FeedItem, FeedItemType } from '@/lib/dashboard/homeFeed'
import { Card } from '@/components/ui/Card'

// ── Type config ───────────────────────────────────────────────────────────────

const TYPE_CONFIG: Record<
  FeedItemType,
  { label: string; color: string; bg: string; icon: string }
> = {
  Startup: {
    label: 'Startup',
    color: 'text-khoj-accent',
    bg: 'bg-khoj-accent/10 border-khoj-accent/30',
    icon: '◈',
  },
  Progress: {
    label: 'Progress',
    color: 'text-khoj-teal',
    bg: 'bg-khoj-teal/10 border-khoj-teal/30',
    icon: '◫',
  },
  Opportunity: {
    label: 'Opportunity',
    color: 'text-khoj-gold',
    bg: 'bg-khoj-gold/10 border-khoj-gold/30',
    icon: '◉',
  },
  Achievement: {
    label: 'Achievement',
    color: 'text-amber-400',
    bg: 'bg-amber-400/10 border-amber-400/30',
    icon: '▲',
  },
  Arena: {
    label: 'Arena',
    color: 'text-purple-400',
    bg: 'bg-purple-400/10 border-purple-400/30',
    icon: '▶',
  },
  Project: {
    label: 'Project',
    color: 'text-blue-400',
    bg: 'bg-blue-400/10 border-blue-400/30',
    icon: '◻',
  },
}

const CTA_LABELS: Record<FeedItemType, string> = {
  Startup: 'View Startup Room',
  Progress: 'Open KHOJ AI',
  Opportunity: 'View Opportunity',
  Achievement: 'View Profile',
  Arena: 'Watch Video',
  Project: 'View Project',
}

const AVATAR_PALETTE = ['#FF4D00', '#FFB800', '#00D4AA', '#6366f1', '#ec4899', '#14b8a6']

function avatarColor(name: string): string {
  return AVATAR_PALETTE[name.charCodeAt(0) % AVATAR_PALETTE.length]
}

function safeTimeAgo(iso: string): string {
  try {
    return formatDistanceToNow(new Date(iso), { addSuffix: true })
  } catch {
    return ''
  }
}

// ── Component ─────────────────────────────────────────────────────────────────

interface FeedCardProps {
  item: FeedItem
}

export function FeedCard({ item }: FeedCardProps) {
  const [liked, setLiked] = useState(false)
  const [likeCount, setLikeCount] = useState(item.likes)
  const [showMenu, setShowMenu] = useState(false)
  const [expanded, setExpanded] = useState(false)

  const config = TYPE_CONFIG[item.type]
  const color = avatarColor(item.authorName)
  const isLong = item.content.length > 220

  const handleLike = () => {
    setLiked((prev) => {
      setLikeCount((c) => (prev ? c - 1 : c + 1))
      return !prev
    })
  }

  const handleComment = () => {
    toast('Comments coming soon.', { icon: '💬' })
  }

  const handleShare = () => {
    if (item.relatedUrl && typeof window !== 'undefined') {
      void navigator.clipboard?.writeText(window.location.origin + item.relatedUrl)
      toast.success('Link copied to clipboard!')
    }
  }

  const handleReport = () => {
    setShowMenu(false)
    toast.success('Reported. Our team will review this.')
  }

  return (
    <Card className="group relative">
      {/* ── Header ────────────────────────────────────────────────────────── */}
      <div className="flex items-start justify-between gap-3 mb-3">
        {/* Avatar + author */}
        <div className="flex items-center gap-3 min-w-0">
          <div
            className="w-10 h-10 rounded-sm flex-shrink-0 flex items-center justify-center font-display font-bold text-sm select-none"
            style={{
              backgroundColor: `${color}18`,
              border: `1px solid ${color}38`,
              color,
            }}
            aria-hidden
          >
            {item.authorName.charAt(0).toUpperCase()}
          </div>
          <div className="min-w-0">
            <p className="text-sm font-bold text-khoj-text leading-tight truncate">
              {item.authorName}
            </p>
            <p className="text-[10px] text-khoj-subtle font-body">
              {item.authorRole}&nbsp;·&nbsp;{safeTimeAgo(item.timestamp)}
            </p>
          </div>
        </div>

        {/* Badge + three-dot menu */}
        <div className="flex items-center gap-2 flex-shrink-0">
          <span
            className={`inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider px-2 py-1 rounded-sm border ${config.bg} ${config.color}`}
          >
            <span aria-hidden>{config.icon}</span>
            {config.label}
          </span>

          <div className="relative">
            <button
              type="button"
              onClick={() => setShowMenu((v) => !v)}
              className="w-7 h-7 flex items-center justify-center rounded-sm text-khoj-subtle hover:text-khoj-text hover:bg-khoj-border/50 transition-colors text-base leading-none"
              aria-label="More options"
            >
              ···
            </button>
            {showMenu && (
              <>
                {/* backdrop */}
                <div
                  className="fixed inset-0 z-10"
                  onClick={() => setShowMenu(false)}
                />
                <div className="absolute right-0 top-8 z-20 w-36 bg-khoj-card border border-khoj-border rounded-sm shadow-xl overflow-hidden">
                  <button
                    type="button"
                    onClick={handleReport}
                    className="w-full text-left px-3 py-2.5 text-xs text-red-400 hover:bg-red-500/10 transition-colors"
                  >
                    Report post
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowMenu(false)}
                    className="w-full text-left px-3 py-2.5 text-xs text-khoj-subtle hover:bg-khoj-border/30 transition-colors"
                  >
                    Dismiss
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {/* ── Content ───────────────────────────────────────────────────────── */}
      <div className="mb-3">
        <p
          className={`text-sm text-khoj-text font-body leading-relaxed whitespace-pre-line ${
            !expanded && isLong ? 'line-clamp-3' : ''
          }`}
        >
          {item.content}
        </p>
        {isLong && (
          <button
            type="button"
            onClick={() => setExpanded((v) => !v)}
            className="text-xs text-khoj-accent hover:text-orange-400 font-semibold mt-1 transition-colors"
          >
            {expanded ? 'Show less' : 'Read more'}
          </button>
        )}
      </div>

      {/* ── Thumbnail ─────────────────────────────────────────────────────── */}
      {item.thumbnailUrl && (
        <div className="mb-3 rounded-sm overflow-hidden border border-khoj-border">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={item.thumbnailUrl}
            alt={item.relatedTitle ?? 'Feed post image'}
            className="w-full h-44 object-cover"
            loading="lazy"
          />
        </div>
      )}

      {/* ── Footer: actions + CTA ─────────────────────────────────────────── */}
      <div className="flex items-center justify-between gap-3 pt-3 border-t border-khoj-border/50">
        {/* Action buttons */}
        <div className="flex items-center gap-1">
          {/* Like */}
          <button
            type="button"
            onClick={handleLike}
            aria-label={liked ? 'Unlike' : 'Like'}
            className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-sm text-xs font-semibold transition-all border ${
              liked
                ? 'text-khoj-accent bg-khoj-accent/10 border-khoj-accent/30'
                : 'text-khoj-subtle hover:text-khoj-text hover:bg-khoj-border/40 border-transparent'
            }`}
          >
            <span aria-hidden>{liked ? '♥' : '♡'}</span>
            <span>{likeCount}</span>
          </button>

          {/* Comment */}
          <button
            type="button"
            onClick={handleComment}
            aria-label="Comment"
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-sm text-xs font-semibold text-khoj-subtle hover:text-khoj-text hover:bg-khoj-border/40 border border-transparent transition-all"
          >
            <span aria-hidden>◎</span>
            <span>{item.comments}</span>
          </button>

          {/* Share */}
          <button
            type="button"
            onClick={handleShare}
            aria-label="Share"
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-sm text-xs font-semibold text-khoj-subtle hover:text-khoj-text hover:bg-khoj-border/40 border border-transparent transition-all"
          >
            <span aria-hidden>↗</span>
            <span>Share</span>
          </button>
        </div>

        {/* CTA */}
        {item.relatedUrl && (
          <Link
            href={item.relatedUrl}
            className="text-xs font-bold text-khoj-accent hover:text-orange-400 transition-colors flex-shrink-0"
          >
            {CTA_LABELS[item.type]} →
          </Link>
        )}
      </div>
    </Card>
  )
}
