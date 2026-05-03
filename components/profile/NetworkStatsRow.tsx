'use client'

import Link from 'next/link'
import type { NetworkCounts, NetworkTab } from '@/services/networkService'

interface NetworkStatsRowProps {
  userId: string
  counts: NetworkCounts
  loading?: boolean
}

const STATS: Array<{ key: NetworkTab; label: string }> = [
  { key: 'connections', label: 'Connections' },
  { key: 'followers', label: 'Followers' },
  { key: 'following', label: 'Following' },
]

function formatCount(value: number) {
  return new Intl.NumberFormat('en', { notation: value >= 10000 ? 'compact' : 'standard' }).format(value)
}

export function NetworkStatsRow({ userId, counts, loading = false }: NetworkStatsRowProps) {
  return (
    <div className="grid grid-cols-3 overflow-hidden rounded-sm border border-khoj-border bg-khoj-card">
      {STATS.map((stat, index) => (
        <Link
          key={stat.key}
          href={`/profile/${userId}/network?tab=${stat.key}`}
          className={[
            'group px-4 py-3 text-center transition-colors hover:bg-khoj-accent/10 focus:outline-none focus-visible:ring-1 focus-visible:ring-inset focus-visible:ring-khoj-accent',
            index > 0 ? 'border-l border-khoj-border' : '',
          ].join(' ')}
        >
          <p className="text-lg font-display font-bold text-khoj-text group-hover:text-khoj-accent">
            {loading ? '...' : formatCount(counts[stat.key])}
          </p>
          <p className="mt-0.5 text-[10px] font-body font-semibold uppercase tracking-[0.16em] text-khoj-subtle">
            {stat.label}
          </p>
        </Link>
      ))}
    </div>
  )
}
