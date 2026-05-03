'use client'

import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { Tournament } from '@/lib/types'
import { startTournamentEsewaPayment } from '@/services/paymentService'
import { joinTournament } from '@/services/tournamentService'
import { Badge } from '@/components/ui/Badge'
import { Card } from '@/components/ui/Card'
import toast from 'react-hot-toast'
import { format } from 'date-fns'
import clsx from 'clsx'

interface TournamentCardProps {
  tournament: Tournament
  userId: string
  onJoined?: () => void
}

const STATUS_MAP = {
  upcoming: { label: 'Upcoming', variant: 'warning' as const },
  active: { label: 'Live', variant: 'success' as const },
  completed: { label: 'Ended', variant: 'default' as const },
}

const CATEGORY_ICONS: Record<string, string> = {
  'Web Dev': '◈',
  'DSA': '△',
  'Design': '○',
  'DevOps': '⬡',
  'Mobile': '◉',
}

export function TournamentCard({ tournament, userId, onJoined }: TournamentCardProps) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const hasJoined = tournament.participants.includes(userId)
  const isFull = tournament.currentPlayers >= tournament.maxPlayers
  const status = STATUS_MAP[tournament.status]
  const fillPercent = tournament.maxPlayers > 0 ? (tournament.currentPlayers / tournament.maxPlayers) * 100 : 0
  const entryFee = tournament.entryFee ?? 0

  const formatSafeDate = (value: string | undefined) => {
    if (!value) return 'TBD'
    const date = new Date(value)
    return Number.isNaN(date.getTime()) ? 'TBD' : format(date, 'MMM d, yyyy, h:mm a')
  }

  const handleJoinFree = async () => {
    if (!userId) {
      toast.error('Please sign in to continue')
      return
    }
    try {
      setLoading(true)
      const result = await joinTournament(tournament.id, userId)
      if (result.success) {
        toast.success('Joined tournament!')
        onJoined?.()
      } else {
        toast.error(result.message)
      }
    } catch (error) {
      console.error(error)
      toast.error(error instanceof Error ? error.message : 'Failed to join tournament')
    } finally {
      setLoading(false)
    }
  }

  const handleEsewaPayment = async (selectedTournament: Tournament) => {
    if (!userId) {
      toast.error('Please sign in to continue')
      return
    }

    try {
      setLoading(true)
      await startTournamentEsewaPayment({
        userId,
        tournamentId: selectedTournament.id,
        amount: entryFee,
      })
    } catch (error) {
      console.error(error)
      toast.error(error instanceof Error ? error.message : 'Unable to start eSewa payment')
      setLoading(false)
    }
  }

  return (
    <Card hover className="flex flex-col gap-4">
      {/* Header */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-khoj-muted/30 border border-khoj-border rounded-sm flex items-center justify-center text-lg">
            {CATEGORY_ICONS[tournament.category] ?? '◈'}
          </div>
          <div>
            <h3 className="font-display font-bold text-khoj-text text-base leading-tight">
              {tournament.title}
            </h3>
            <p className="text-[10px] uppercase tracking-wider text-khoj-subtle font-body mt-0.5">
              {tournament.category}
            </p>
          </div>
        </div>
        <Badge label={status.label} variant={status.variant} />
      </div>

      {/* Description */}
      <p className="text-sm text-khoj-subtle font-body leading-relaxed line-clamp-2">
        {tournament.description}
      </p>

      {/* Stats row */}
      <div className="grid grid-cols-3 gap-3">
        <div className="text-center">
          <p className="text-lg font-display font-bold text-khoj-text">
            {tournament.currentPlayers}
          </p>
          <p className="text-[9px] uppercase tracking-wider text-khoj-subtle font-body">Players</p>
        </div>
        <div className="text-center border-x border-khoj-border">
          <p className="text-lg font-display font-bold text-khoj-gold">
            +{tournament.prizeXP}
          </p>
          <p className="text-[9px] uppercase tracking-wider text-khoj-subtle font-body">Prize XP</p>
        </div>
        <div className="text-center">
          <p className="text-lg font-display font-bold text-khoj-teal">
            {entryFee === 0 ? 'Free' : `Rs ${entryFee.toLocaleString()}`}
          </p>
          <p className="text-[9px] uppercase tracking-wider text-khoj-subtle font-body">Entry</p>
        </div>
      </div>

      {/* Player fill bar */}
      <div>
        <div className="flex justify-between text-[9px] text-khoj-subtle font-body mb-1">
          <span>{tournament.currentPlayers}/{tournament.maxPlayers} players</span>
          <span>{Math.round(fillPercent)}% full</span>
        </div>
        <div className="w-full h-1 bg-khoj-border rounded-full overflow-hidden">
          <div
            className={clsx(
              'h-full rounded-full transition-all duration-500',
              fillPercent >= 90 ? 'bg-red-500' : fillPercent >= 60 ? 'bg-khoj-gold' : 'bg-khoj-teal'
            )}
            style={{ width: `${fillPercent}%` }}
          />
        </div>
      </div>

      {/* Dates */}
      <div className="flex items-center justify-between gap-3 text-[10px] text-khoj-subtle font-body">
        <span>
          Starts: {formatSafeDate(tournament.startDate)}
        </span>
        <span>
          Ends: {formatSafeDate(tournament.endDate)}
        </span>
      </div>

      <button
        type="button"
        onClick={() => router.push(`/tournaments/${tournament.id}`)}
        className="text-orange-500 cursor-pointer mt-4 text-left hover:text-orange-400 transition-colors"
      >
        View Details →
      </button>

      {/* CTA */}
      {hasJoined ? (
        <div className="mt-4 rounded-xl border border-emerald-400/30 bg-emerald-500/10 px-4 py-3 text-center text-sm font-bold text-emerald-300 shadow-[0_0_18px_rgba(16,185,129,0.18)]">
          ✅ Joined
        </div>
      ) : tournament.status === 'completed' ? (
        <button
          onClick={() => router.push(`/tournaments/${tournament.id}`)}
          className="mt-4 w-full rounded-xl border border-khoj-border bg-khoj-card px-4 py-3 text-sm font-bold uppercase tracking-[0.12em] text-khoj-text hover:border-khoj-accent/50 transition-all"
        >
          View Results
        </button>
      ) : isFull ? (
        <button
          disabled
          className="mt-4 w-full rounded-xl border border-slate-700 bg-slate-900/70 px-4 py-3 text-sm font-bold uppercase tracking-[0.12em] text-slate-300"
        >
          Tournament Full
        </button>
      ) : entryFee === 0 ? (
        <button
          onClick={handleJoinFree}
          disabled={loading}
          className="mt-4 w-full rounded-xl border border-teal-400/30 bg-gradient-to-r from-teal-500 to-khoj-accent px-4 py-3 text-sm font-black tracking-[0.08em] text-white shadow-[0_0_24px_rgba(45,212,191,0.25)] transition-all duration-300 hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {loading ? 'Joining...' : 'Join Free'}
        </button>
      ) : (
        <button
          onClick={() => handleEsewaPayment(tournament)}
          disabled={loading}
          className="mt-4 w-full rounded-xl border border-orange-300/30 bg-gradient-to-r from-orange-500 via-amber-500 to-teal-500 px-4 py-3 text-sm font-black tracking-[0.08em] text-white shadow-[0_0_24px_rgba(249,115,22,0.35)] transition-all duration-300 hover:-translate-y-0.5 hover:shadow-[0_0_30px_rgba(45,212,191,0.35)] disabled:cursor-not-allowed disabled:opacity-50"
        >
          {loading ? 'Redirecting to eSewa...' : `Pay Rs ${entryFee.toLocaleString()} with eSewa`}
        </button>
      )}
    </Card>
  )
}
