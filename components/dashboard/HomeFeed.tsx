// components/dashboard/HomeFeed.tsx
// KHOJ Home Feed — tabbed feed replacing the static Announcements panel.
// "Startups" tab shows live room memberships; other tabs use placeholder data
// until Firebase queries are wired per tab.

'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { FeedItem, FeedItemType, PLACEHOLDER_FEED, PLACEHOLDER_FOLLOWING_IDS } from '@/lib/dashboard/homeFeed'
import { FeedCard } from './FeedCard'
import { Button } from '@/components/ui/Button'
import { getUserMemberships } from '@/lib/collaboration/roomQueries'
import type { UserRoomMembership } from '@/types/collaboration'

// ── Tab definitions ───────────────────────────────────────────────────────────

type FeedTab = 'for-you' | 'following' | 'startups' | 'tracks' | 'opportunities' | 'achievements'

const TABS: { id: FeedTab; label: string }[] = [
  { id: 'for-you',       label: 'For You' },
  { id: 'following',     label: 'Following' },
  { id: 'startups',      label: 'Startups' },
  { id: 'tracks',        label: 'Tracks' },
  { id: 'opportunities', label: 'Opportunities' },
  { id: 'achievements',  label: 'Achievements' },
]

const TAB_TYPES: Partial<Record<FeedTab, FeedItemType[]>> = {
  startups:      ['Startup'],
  tracks:        ['Track'],
  opportunities: ['Opportunity'],
  achievements:  ['Achievement'],
}

// ── Filter logic ──────────────────────────────────────────────────────────────

function filterFeed(tab: FeedTab, followingIds: string[]): FeedItem[] {
  if (tab === 'for-you') return PLACEHOLDER_FEED
  if (tab === 'following') {
    return PLACEHOLDER_FEED.filter((item) => followingIds.includes(item.authorId))
  }
  const types = TAB_TYPES[tab]
  if (types) return PLACEHOLDER_FEED.filter((item) => types.includes(item.type))
  return PLACEHOLDER_FEED
}

// ── Empty state ───────────────────────────────────────────────────────────────

const EMPTY_MESSAGES: Record<FeedTab, string> = {
  'for-you':       'No activity yet.',
  'following':     'Follow creators, founders, and builders to see their posts here.',
  'startups':      'No startup updates yet.',
  'tracks':        'No track activity yet.',
  'opportunities': 'No opportunities posted yet.',
  'achievements':  'No achievements shared yet.',
}

function FeedEmpty({ tab }: { tab: FeedTab }) {
  return (
    <div className="rounded-sm border border-khoj-border bg-khoj-card px-6 py-10 text-center space-y-4">
      <p className="text-3xl" aria-hidden>◎</p>
      <p className="text-khoj-text font-bold text-sm">Nothing here yet</p>
      <p className="text-khoj-subtle text-xs max-w-xs mx-auto">{EMPTY_MESSAGES[tab]}</p>
      <div className="flex items-center justify-center gap-2 flex-wrap pt-1">
        <Link href="/arena">
          <Button variant="secondary" size="sm">Explore Arena</Button>
        </Link>
        <Link href="/tracks">
          <Button variant="secondary" size="sm">Join a Track</Button>
        </Link>
        <Link href="/rooms">
          <Button size="sm">Create Startup Room</Button>
        </Link>
      </div>
    </div>
  )
}

// ── Main component ────────────────────────────────────────────────────────────

interface HomeFeedProps {
  userId?: string
}

export function HomeFeed({ userId }: HomeFeedProps) {
  const [activeTab, setActiveTab] = useState<FeedTab>('for-you')
  const [memberships, setMemberships] = useState<UserRoomMembership[]>([])

  useEffect(() => {
    if (!userId) return
    getUserMemberships(userId).then(setMemberships).catch(() => {})
  }, [userId])

  // TODO: replace PLACEHOLDER_FOLLOWING_IDS with a Firestore query
  const items = filterFeed(activeTab, PLACEHOLDER_FOLLOWING_IDS)

  return (
    <section className="space-y-4">
      {/* Header */}
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-[10px] uppercase tracking-[0.2em] text-khoj-accent font-body font-semibold">
            KHOJ Home Feed
          </p>
          <h2 className="text-xl font-display font-bold text-khoj-text mt-1">
            See what builders are doing
          </h2>
          <p className="text-xs text-khoj-subtle font-body mt-0.5">
            Founders, creators, and learners in your field.
          </p>
        </div>
        <Link href="/community">
          <Button variant="secondary" size="sm">Open Community</Button>
        </Link>
      </div>

      {/* Tab bar */}
      <div className="flex gap-1 flex-wrap border-b border-khoj-border/60 pb-3">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setActiveTab(tab.id)}
            className={`px-3 py-1.5 rounded-sm text-xs font-semibold transition-all ${
              activeTab === tab.id
                ? 'bg-khoj-accent text-white shadow-[0_0_12px_rgba(255,77,0,0.3)]'
                : 'text-khoj-subtle hover:text-khoj-text hover:bg-khoj-border/40'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Feed items */}
      {activeTab === 'startups' ? (
        memberships.length === 0 ? (
          <FeedEmpty tab={activeTab} />
        ) : (
          <div className="space-y-3">
            {memberships.map((m) => (
              <Link key={m.roomId} href={`/rooms/${m.roomId}`}>
                <div className="bg-khoj-card border border-khoj-border rounded-xl p-4 hover:border-khoj-accent/40 transition-colors cursor-pointer flex items-center justify-between gap-3">
                  <div>
                    <p className="text-khoj-text text-sm font-semibold">{m.title || 'Startup Room'}</p>
                    <p className="text-khoj-subtle text-xs mt-0.5 capitalize">{m.roomRole} · {m.roomType}</p>
                  </div>
                  <span className="text-khoj-accent text-xs font-mono">→</span>
                </div>
              </Link>
            ))}
            <Link href="/rooms">
              <Button variant="secondary" size="sm" className="w-full mt-2">Browse All Startup Rooms</Button>
            </Link>
          </div>
        )
      ) : items.length === 0 ? (
        <FeedEmpty tab={activeTab} />
      ) : (
        <div className="space-y-4">
          {items.map((item) => (
            <FeedCard key={item.id} item={item} />
          ))}
        </div>
      )}
    </section>
  )
}
