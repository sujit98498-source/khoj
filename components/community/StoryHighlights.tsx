// components/community/StoryHighlights.tsx
// Horizontal scrolling row of featured community stories
// Cards shown above the feed — quick visual scan

'use client'

import { PostType } from '@/lib/types'
import clsx from 'clsx'
import Link from 'next/link'

interface Highlight {
  id: string
  authorId: string
  title: string
  authorName: string
  authorXP: number
  type: PostType
  emoji: string
  gradient: string
  borderColor: string
}

const HIGHLIGHTS: Highlight[] = [
  {
    id: 'h1',
    authorId: 'user-arjun',
    title: 'From 0 to Top 10 in 6 months',
    authorName: 'Arjun M.',
    authorXP: 2340,
    type: 'Story',
    emoji: '🚀',
    gradient: 'from-khoj-accent/20 to-khoj-gold/10',
    borderColor: 'border-khoj-accent/30',
  },
  {
    id: 'h2',
    authorId: 'user-priya',
    title: 'My first $1000 freelance win through KHOJ',
    authorName: 'Priya S.',
    authorXP: 1890,
    type: 'Achievement',
    emoji: '💰',
    gradient: 'from-khoj-teal/20 to-blue-400/10',
    borderColor: 'border-khoj-teal/30',
  },
  {
    id: 'h3',
    authorId: 'user-rishi',
    title: 'Building in public: 90-day coding streak',
    authorName: 'Rishi N.',
    authorXP: 560,
    type: 'Story',
    emoji: '⚡',
    gradient: 'from-khoj-gold/20 to-orange-400/10',
    borderColor: 'border-khoj-gold/30',
  },
  {
    id: 'h4',
    authorId: 'user-karan',
    title: 'How I won a startup hackathon with 3 strangers',
    authorName: 'Karan B.',
    authorXP: 780,
    type: 'Showcase',
    emoji: '🏆',
    gradient: 'from-purple-400/20 to-pink-400/10',
    borderColor: 'border-purple-400/30',
  },
  {
    id: 'h5',
    authorId: 'user-meena',
    title: 'Rejected 12 times. Then ranked #7 nationally.',
    authorName: 'Meena K.',
    authorXP: 1440,
    type: 'Story',
    emoji: '◈',
    gradient: 'from-blue-400/20 to-khoj-teal/10',
    borderColor: 'border-blue-400/30',
  },
]

const TYPE_LABEL: Record<PostType, string> = {
  Story: 'Story',
  Achievement: 'Win',
  Discussion: 'Discussion',
  'Team-Up': 'Team-Up',
  Showcase: 'Showcase',
}

export function StoryHighlights() {
  return (
    <div className="mb-6">
      <div className="flex items-center justify-between mb-3">
        <p className="text-[10px] uppercase tracking-widest text-khoj-subtle font-body">
          Featured Stories
        </p>
        <Link
          href="/community/stories"
          className="relative z-10 text-[10px] uppercase tracking-wider text-khoj-accent hover:text-khoj-gold hover:underline font-body cursor-pointer transition-colors duration-150"
        >
          See all →
        </Link>
      </div>

      <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-none -mx-1 px-1">
        {HIGHLIGHTS.map((h) => (
          <button
            key={h.id}
            className={clsx(
              'flex-shrink-0 w-48 rounded-sm border p-4 text-left',
              'bg-gradient-to-br',
              h.gradient,
              h.borderColor,
              'hover:scale-[1.02] transition-all duration-200 active:scale-[0.98]'
            )}
          >
            <div className="flex items-center justify-between mb-3">
              <span className="text-2xl">{h.emoji}</span>
              <span className="text-[9px] uppercase tracking-widest text-khoj-subtle font-body">
                {TYPE_LABEL[h.type]}
              </span>
            </div>

            <p className="text-xs font-display font-bold text-khoj-text leading-snug mb-3 line-clamp-2">
              {h.title}
            </p>

            <Link
                href={`/profile/${h.authorId}`}
                onClick={(e) => e.stopPropagation()}
                className="flex items-center gap-2 group/author"
              >
                <div className="w-5 h-5 rounded-sm bg-khoj-muted/40 flex items-center justify-center text-[9px] font-display font-bold text-khoj-subtle group-hover/author:bg-khoj-accent/20 group-hover/author:text-khoj-accent transition-colors duration-150">
                  {h.authorName.charAt(0)}
                </div>
                <div>
                  <p className="text-[9px] text-khoj-subtle font-body group-hover/author:text-khoj-accent transition-colors duration-150 cursor-pointer">{h.authorName}</p>
                  <p className="text-[9px] text-khoj-gold font-mono">{h.authorXP} XP</p>
                </div>
              </Link>
          </button>
        ))}
      </div>
    </div>
  )
}