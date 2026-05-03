'use client'

import { useState, useEffect } from 'react'
import { getLeaderboard } from '@/services/userService'
import { KhojUser } from '@/lib/types'
import { Card, StatCard } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { AppShell } from '@/components/layout/AppShell'
import { PageHeader } from '@/components/layout/PageHeader'

export default function LeaderboardPage() {
  const [users, setUsers] = useState<KhojUser[]>([])
  const [loading, setLoading] = useState(true)
  const [limit, setLimit] = useState(50)

  useEffect(() => {
    const fetchLeaderboard = async () => {
      try {
        setLoading(true)
        const data = await getLeaderboard(limit)
        setUsers(data)
      } catch (error) {
        console.error('Failed to fetch leaderboard:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchLeaderboard()
  }, [limit])

  const getMedalEmoji = (rank: number) => {
    if (rank === 1) return '🥇'
    if (rank === 2) return '🥈'
    if (rank === 3) return '🥉'
    return ''
  }

  return (
    <AppShell>
      <div className="animate-slide-up space-y-8 pb-12">

        <PageHeader
          eyebrow="KHOJ Rankings"
          title="Leaderboard"
          subtitle="Top developers ranked by XP earned across tournaments, matches, and contributions."
        />

      {/* Top 3 Highlights */}
      {!loading && users.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {users.slice(0, 3).map((user, idx) => (
            <Card key={user.uid} glow className="text-center">
              <div className="text-4xl mb-3">{getMedalEmoji(idx + 1)}</div>
              <h3 className="font-display font-bold mb-2">{user.name}</h3>
              <p className="text-2xl font-display font-bold text-khoj-accent mb-3">{user.xp.toLocaleString()}</p>
              <Badge label={`Rank #${idx + 1}`} variant="info" />
            </Card>
          ))}
        </div>
      )}

      {/* Full Leaderboard */}
      <Card>
        {loading ? (
          <div className="text-center text-khoj-subtle">Loading leaderboard...</div>
        ) : users.length === 0 ? (
          <div className="text-center text-khoj-subtle">No users yet</div>
        ) : (
          <div className="space-y-1">
            <div className="grid grid-cols-12 gap-4 px-4 py-3 border-b border-khoj-border text-xs font-semibold text-khoj-subtle">
              <div className="col-span-1">Rank</div>
              <div className="col-span-5">Name</div>
              <div className="col-span-2 text-right">XP</div>
              <div className="col-span-2 text-right">Wins</div>
              <div className="col-span-2 text-right">Rooms</div>
            </div>
            {users.map((user, idx) => (
              <div
                key={user.uid}
                className="grid grid-cols-12 gap-4 px-4 py-3 hover:bg-khoj-muted/30 transition-colors"
              >
                <div className="col-span-1 font-semibold text-khoj-accent">
                  {getMedalEmoji(idx + 1)} #{idx + 1}
                </div>
                <div className="col-span-5 font-semibold">{user.name}</div>
                <div className="col-span-2 text-right font-mono">{user.xp.toLocaleString()}</div>
                <div className="col-span-2 text-right font-mono">{user.wins}</div>
                <div className="col-span-2 text-right font-mono">{user.matchesPlayed}</div>
              </div>
            ))}
          </div>
        )}
      </Card>

      {/* Load More */}
      {!loading && (
        <div className="text-center">
          <button
            onClick={() => setLimit(limit + 50)}
            className="px-6 py-2 border border-khoj-border rounded-sm hover:border-khoj-accent/50 transition-all text-sm"
          >
            Load More
          </button>
        </div>
      )}
      </div>
    </AppShell>
  )
}
