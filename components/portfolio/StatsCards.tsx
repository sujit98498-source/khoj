// components/portfolio/StatsCards.tsx
// Grid of 4 key stats: XP, Rank, Wins, Win Rate

import { StatCard } from '@/components/ui/Card'
import { PortfolioUser } from '@/lib/types'

interface StatsCardsProps {
  user: PortfolioUser
}

export function StatsCards({ user }: StatsCardsProps) {
  const winRate =
    user.matchesPlayed > 0 ? Math.round((user.wins / user.matchesPlayed) * 100) : 0

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
      <StatCard label="Total XP" value={user.xp.toLocaleString()} accent="orange" />
      <StatCard label="Wins" value={user.wins} accent="gold" />
      <StatCard
        label="Rooms Played"
        value={user.matchesPlayed}
        accent="teal"
      />
      <StatCard label="Win Rate" value={`${winRate}%`} accent="orange" />
    </div>
  )
}
