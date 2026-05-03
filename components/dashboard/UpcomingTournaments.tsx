'use client'

import { useState, useEffect } from 'react'
import { getAllTournaments } from '@/services/tournamentService'
import { Tournament } from '@/lib/types'
import { Card } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import Link from 'next/link'

export function UpcomingTournaments() {
  const [tournaments, setTournaments] = useState<Tournament[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchTournaments = async () => {
      try {
        setLoading(true)
        const data = await getAllTournaments()
        const upcoming = data
          .filter((t) => t.status === 'upcoming' || t.status === 'active')
          .slice(0, 5)
        setTournaments(upcoming)
      } catch (error) {
        console.error('Failed to fetch tournaments:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchTournaments()
  }, [])

  return (
    <Card>
      <h2 className="font-display font-bold mb-4">Upcoming Tournaments</h2>
      {loading ? (
        <div className="text-center text-khoj-subtle text-sm">Loading...</div>
      ) : tournaments.length === 0 ? (
        <div className="text-center text-khoj-subtle text-sm">No upcoming tournaments</div>
      ) : (
        <div className="space-y-2">
          {tournaments.map((tournament) => (
            <Link key={tournament.id} href={`/tournaments/${tournament.id}`}>
              <div className="p-3 bg-khoj-bg border border-khoj-border rounded-sm hover:border-khoj-accent/40 transition-all">
                <div className="flex justify-between items-start mb-2">
                  <h3 className="font-semibold text-sm">{tournament.title}</h3>
                  <Badge
                    label={tournament.status.toUpperCase()}
                    variant={tournament.status === 'active' ? 'warning' : 'default'}
                    size="sm"
                  />
                </div>
                <div className="flex justify-between text-xs text-khoj-subtle">
                  <span>{tournament.currentPlayers}/{tournament.maxPlayers} players</span>
                  <span>{tournament.category}</span>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </Card>
  )
}
