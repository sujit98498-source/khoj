'use client'

import { KhojUser } from '@/lib/types'

interface LeaderboardRowProps {
  user: KhojUser
  rank: number
}

export function LeaderboardRow({ user, rank }: LeaderboardRowProps) {
  const getMedalEmoji = (rank: number) => {
    if (rank === 1) return '🥇'
    if (rank === 2) return '🥈'
    if (rank === 3) return '🥉'
    return ''
  }

  return (
    <div className="grid grid-cols-12 gap-4 px-4 py-3 hover:bg-khoj-muted/30 transition-colors border-b border-khoj-border/30 last:border-b-0">
      <div className="col-span-1 font-semibold text-khoj-accent flex items-center">
        {getMedalEmoji(rank)} #{rank}
      </div>
      <div className="col-span-5 flex items-center">
        <div className="w-10 h-10 bg-khoj-accent rounded-full flex items-center justify-center text-white font-bold mr-3">
          {user.name.charAt(0).toUpperCase()}
        </div>
        <div>
          <p className="font-semibold">{user.name}</p>
          <p className="text-xs text-khoj-subtle">{user.email}</p>
        </div>
      </div>
      <div className="col-span-2 text-right font-mono font-semibold">
        {user.xp.toLocaleString()}
      </div>
      <div className="col-span-2 text-right font-mono">{user.wins}</div>
      <div className="col-span-2 text-right font-mono">{user.matchesPlayed}</div>
    </div>
  )
}
