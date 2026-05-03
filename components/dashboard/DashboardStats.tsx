'use client'

import { KhojUser } from '@/lib/types'
import { Card } from '@/components/ui/Card'
import { getLevel } from '@/components/ui/XPBar'

interface DashboardStatsProps {
  user: KhojUser
}

export function DashboardStats({ user }: DashboardStatsProps) {
  const { level, name } = getLevel(user.xp)
  const winRate = user.matchesPlayed > 0
    ? ((user.wins / user.matchesPlayed) * 100).toFixed(1)
    : '0'

  return (
    <div className="space-y-4">
      <Card>
        <div className="text-center">
          <p className="text-xs text-khoj-subtle mb-2">CURRENT LEVEL</p>
          <p className="text-3xl font-display font-bold text-khoj-accent mb-1">{level}</p>
          <p className="text-sm font-semibold">{name}</p>
        </div>
      </Card>

      <div className="grid grid-cols-2 gap-3">
        <Card>
          <p className="text-xs text-khoj-subtle mb-2">WIN RATE</p>
          <p className="text-2xl font-display font-bold text-khoj-teal">{winRate}%</p>
        </Card>
        <Card>
          <p className="text-xs text-khoj-subtle mb-2">RANK</p>
          <p className="text-2xl font-display font-bold text-khoj-accent">#{user.rank}</p>
        </Card>
      </div>
    </div>
  )
}
