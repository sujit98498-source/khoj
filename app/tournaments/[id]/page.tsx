'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { format } from 'date-fns'
import { useParams } from 'next/navigation'
import { doc, getDoc } from 'firebase/firestore'
import { db } from '@/lib/firebase/config'
import { COLLECTIONS } from '@/lib/firebase/collections'
import { getMatchesByTournament } from '@/services/matchService'
import { startTournamentEsewaPayment } from '@/services/paymentService'
import { Tournament, Match } from '@/lib/types'
import { Card, StatCard } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { EmptyState } from '@/components/ui/EmptyState'
import { LoadingSpinner } from '@/components/ui/LoadingSpinner'
import { PageHeader } from '@/components/layout/PageHeader'
import { useAuth } from '@/hooks/useAuth'
import toast from 'react-hot-toast'

type TournamentRecord = Partial<Tournament> & { name?: string; title?: string }

function normalizeTournament(data: TournamentRecord, id: string): Tournament {
  const title = data.title || data.name || 'Untitled Tournament'

  return {
    id,
    title,
    name: data.name || title,
    description: data.description || 'Rules and format will be shared by the organizers.',
    category: data.category || 'General',
    maxPlayers: data.maxPlayers ?? 0,
    currentPlayers: data.currentPlayers ?? data.participants?.length ?? 0,
    entryFee: data.entryFee ?? 0,
    prizeXP: data.prizeXP ?? 0,
    prizeMoney: data.prizeMoney ?? 0,
    startDate: data.startDate ?? '',
    endDate: data.endDate ?? '',
    status: data.status ?? 'upcoming',
    participants: data.participants ?? [],
    createdBy: data.createdBy ?? 'admin',
    createdAt: data.createdAt ?? '',
  }
}

function formatSafeDate(value: string) {
  if (!value) return 'TBD'
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? 'TBD' : format(date, 'MMM d, yyyy, h:mm a')
}

function getStatusVariant(status: Tournament['status']) {
  if (status === 'active') return 'success'
  if (status === 'upcoming') return 'warning'
  return 'default'
}

export default function TournamentDetailPage() {
  const params = useParams<{ id: string | string[] }>()
  const id = Array.isArray(params?.id) ? params.id[0] : params?.id ?? ''
  const { khojUser } = useAuth()
  const [tournament, setTournament] = useState<Tournament | null>(null)
  const [matches, setMatches] = useState<Match[]>([])
  const [loading, setLoading] = useState(true)
  const [joining, setJoining] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const loadTournament = useCallback(async () => {
    if (!id) {
      setTournament(null)
      setLoading(false)
      return
    }

    console.log('Tournament detail id:', id)
    setLoading(true)
    setError(null)

    try {
      const ref = doc(db, COLLECTIONS.TOURNAMENTS, id)
      const snap = await getDoc(ref)

      if (!snap.exists()) {
        setTournament(null)
        setMatches([])
        return
      }

      const tournamentData = normalizeTournament(snap.data() as TournamentRecord, snap.id)
      setTournament(tournamentData)

      try {
        const matchesData = await getMatchesByTournament(id)
        setMatches(matchesData)
      } catch (matchError) {
        console.error('Failed to fetch matches:', matchError)
        setMatches([])
      }
    } catch (fetchError) {
      console.error('Failed to fetch tournament:', fetchError)
      setError('Failed to load tournament details.')
      setTournament(null)
      setMatches([])
    } finally {
      setLoading(false)
    }
  }, [id])

  useEffect(() => {
    void loadTournament()
  }, [loadTournament])

  const handleEsewaPayment = async (selectedTournament: Tournament) => {
    if (!khojUser) {
      toast.error('Please sign in to continue')
      return
    }

    if (selectedTournament.participants.includes(khojUser.uid)) {
      toast.success('✅ Joined')
      return
    }

    if ((selectedTournament.currentPlayers || selectedTournament.participants.length) >= selectedTournament.maxPlayers) {
      toast.error('Tournament Full')
      return
    }

    if (selectedTournament.status === 'completed') {
      toast.error('Tournament Ended')
      return
    }

    try {
      setJoining(true)
      await startTournamentEsewaPayment({
        userId: khojUser.uid,
        tournamentId: selectedTournament.id,
        amount: selectedTournament.entryFee ?? 0,
      })
    } catch (joinError) {
      console.error('Failed to start eSewa payment:', joinError)
      toast.error(joinError instanceof Error ? joinError.message : 'Failed to start eSewa payment')
      setJoining(false)
    }
  }

  if (loading) {
    return (
      <div className="container mx-auto px-6 py-12">
        <LoadingSpinner />
      </div>
    )
  }

  if (!tournament) {
    return (
      <div className="container mx-auto px-6 py-12">
        <EmptyState
          icon="◈"
          title={error ? 'Unable to load tournament' : 'Tournament not found'}
          description={error || 'The tournament may have been removed or the link may be invalid.'}
          action={
            <Link href="/tournaments">
              <Button>Back to Tournaments</Button>
            </Link>
          }
        />
      </div>
    )
  }

  const participantCount = tournament.participants.length || tournament.currentPlayers
  const isParticipant = Boolean(khojUser && tournament.participants.includes(khojUser.uid))
  const isFull = participantCount >= tournament.maxPlayers
  const entryFee = tournament.entryFee ?? 0

  return (
    <div className="container mx-auto px-6 py-12 space-y-8">
      <PageHeader
        eyebrow="Tournament Lobby"
        title={tournament.title}
        subtitle="Review the format, rewards, and current participants before joining the competition."
        action={<Badge label={tournament.status} variant={getStatusVariant(tournament.status)} size="md" />}
      />

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <StatCard label="Date" value={formatSafeDate(tournament.startDate)} accent="orange" />
        <StatCard label="Players Joined" value={participantCount + '/' + tournament.maxPlayers} accent="teal" />
        <StatCard label="Prize Pool" value={tournament.prizeMoney ? '₹' + tournament.prizeMoney.toLocaleString() : '+' + tournament.prizeXP + ' XP'} accent="gold" />
        <StatCard label="Entry Fee" value={'Rs ' + entryFee.toLocaleString()} accent="orange" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <h2 className="font-display font-bold text-khoj-text mb-3">About this tournament</h2>
            <p className="text-sm text-khoj-subtle font-body leading-relaxed">
              {tournament.description}
            </p>

            <div className="mt-5 grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
              <div className="rounded-sm border border-khoj-border bg-khoj-bg p-4">
                <p className="text-[10px] uppercase tracking-widest text-khoj-subtle font-body mb-2">Start</p>
                <p className="font-semibold text-khoj-text">{formatSafeDate(tournament.startDate)}</p>
              </div>
              <div className="rounded-sm border border-khoj-border bg-khoj-bg p-4">
                <p className="text-[10px] uppercase tracking-widest text-khoj-subtle font-body mb-2">End</p>
                <p className="font-semibold text-khoj-text">{formatSafeDate(tournament.endDate)}</p>
              </div>
            </div>
          </Card>

          <Card>
            <h2 className="font-display font-bold text-khoj-text mb-3">Rules and format</h2>
            <ul className="space-y-2 text-sm text-khoj-subtle font-body leading-relaxed list-disc pl-5">
              <li>Join before the bracket closes to secure your spot.</li>
              <li>Match pairings and rounds are managed by the platform organizers.</li>
              <li>XP rewards are granted based on participation and performance.</li>
              <li>Respect the event rules and submit results honestly.</li>
            </ul>
          </Card>

          <Card>
            <h2 className="font-display font-bold text-khoj-text mb-3">Participants</h2>
            {tournament.participants.length === 0 ? (
              <p className="text-sm text-khoj-subtle">No participants have joined yet.</p>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {tournament.participants.slice(0, 12).map((uid, index) => (
                  <div key={uid} className="rounded-sm border border-khoj-border bg-khoj-bg px-3 py-2 text-sm text-khoj-subtle">
                    Player {index + 1} • {uid.slice(0, 8)}
                  </div>
                ))}
              </div>
            )}
          </Card>

          <Card>
            <h2 className="font-display font-bold text-khoj-text mb-3">Match activity</h2>
            {matches.length === 0 ? (
              <p className="text-sm text-khoj-subtle">No matches yet. They will appear here once the bracket starts.</p>
            ) : (
              <div className="space-y-2 max-h-96 overflow-y-auto">
                {matches.map((match) => (
                  <div key={match.id} className="rounded-sm border border-khoj-border bg-khoj-bg p-3 text-sm">
                    <div className="flex items-center justify-between gap-3">
                      <span className="font-semibold text-khoj-text">{match.player1Name}</span>
                      <span className="text-khoj-accent font-mono">{match.player1Score}</span>
                    </div>
                    <div className="text-center text-[10px] uppercase tracking-wider text-khoj-subtle my-1">vs</div>
                    <div className="flex items-center justify-between gap-3">
                      <span className="font-semibold text-khoj-text">{match.player2Name}</span>
                      <span className="text-khoj-accent font-mono">{match.player2Score}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </div>

        <div>
          <Card glow>
            <h2 className="font-display font-bold text-khoj-text mb-4">Join this tournament</h2>
            <div className="space-y-5">
              <div className="rounded-sm border border-khoj-border bg-khoj-bg px-4 py-3">
                <p className="text-[10px] uppercase tracking-widest text-khoj-subtle font-body mb-1">Status</p>
                <div className="flex items-center justify-between gap-3">
                  <span className="text-sm text-khoj-text font-semibold">{tournament.status}</span>
                  <Badge label={tournament.status} variant={getStatusVariant(tournament.status)} />
                </div>
              </div>

              {isParticipant ? (
                <div className="rounded-xl border border-emerald-400/30 bg-emerald-500/10 px-4 py-3 text-center text-sm font-bold text-emerald-300 shadow-[0_0_18px_rgba(16,185,129,0.18)]">
                  ✅ Joined
                </div>
              ) : isFull ? (
                <Button disabled className="w-full rounded-xl border-slate-700 bg-slate-900/70 text-slate-300">
                  Tournament Full
                </Button>
              ) : tournament.status === 'completed' ? (
                <Button disabled className="w-full rounded-xl">Tournament Ended</Button>
              ) : (
                <Button
                  onClick={() => handleEsewaPayment(tournament)}
                  loading={joining}
                  className="w-full rounded-xl border-orange-300/30 bg-gradient-to-r from-orange-500 via-amber-500 to-teal-500 text-sm font-black tracking-[0.08em] text-white shadow-[0_0_24px_rgba(249,115,22,0.35)] hover:-translate-y-0.5 hover:shadow-[0_0_30px_rgba(45,212,191,0.35)]"
                >
                  {joining ? 'Redirecting to eSewa...' : 'Pay Rs ' + entryFee.toLocaleString() + ' with eSewa'}
                </Button>
              )}
            </div>
          </Card>
        </div>
      </div>
    </div>
  )
}
