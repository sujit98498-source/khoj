'use client'

import { Tournament } from '@/lib/types'
import { useAuth } from '@/hooks/useAuth'
import { TournamentCard } from './TournamentCard'

interface TournamentListProps {
  tournaments: Tournament[]
  onJoined?: () => void
}

export function TournamentList({ tournaments, onJoined }: TournamentListProps) {
  const { khojUser } = useAuth()

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {tournaments.map((tournament) => (
        <TournamentCard
          key={tournament.id}
          tournament={tournament}
          userId={khojUser?.uid ?? ''}
          onJoined={onJoined}
        />
      ))}
    </div>
  )
}
