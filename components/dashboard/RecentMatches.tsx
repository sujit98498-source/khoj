'use client'

import { useState, useEffect } from 'react'
import { getUserMatches } from '@/services/matchService'
import { Match } from '@/lib/types'
import { Card } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'

interface RecentMatchesProps {
  userId: string
}

export function RecentMatches({ userId }: RecentMatchesProps) {
  const [matches, setMatches] = useState<Match[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchMatches = async () => {
      try {
        setLoading(true)
        const data = await getUserMatches(userId)
        setMatches(data.slice(0, 5))
      } catch (error) {
        console.error('Failed to fetch matches:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchMatches()
  }, [userId])

  return (
    <Card>
      <h2 className="font-display font-bold mb-4">Recent Rooms</h2>
      {loading ? (
        <div className="text-center text-khoj-subtle text-sm">Loading...</div>
      ) : matches.length === 0 ? (
        <div className="text-center text-khoj-subtle text-sm">No rooms yet</div>
      ) : (
        <div className="space-y-2">
          {matches.map((match) => (
            <div key={match.id} className="p-3 bg-khoj-bg border border-khoj-border rounded-sm">
              <div className="flex justify-between items-center">
                <div className="text-sm">
                  <p className="font-semibold">{match.player1Name} vs {match.player2Name}</p>
                  <p className="text-xs text-khoj-subtle">
                    {match.player1Score} - {match.player2Score}
                  </p>
                </div>
                <Badge
                  label={match.status.toUpperCase()}
                  variant={match.status === 'completed' ? 'success' : 'default'}
                  size="sm"
                />
              </div>
            </div>
          ))}
        </div>
      )}
    </Card>
  )
}
