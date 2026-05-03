'use client'

import { useState } from 'react'
import { Match } from '@/lib/types'
import { submitMatchResult } from '@/services/matchService'
import { Input } from '@/components/ui/Input'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import toast from 'react-hot-toast'

interface MatchResultFormProps {
  match: Match
  onSubmitted?: () => void
}

export function MatchResultForm({ match, onSubmitted }: MatchResultFormProps) {
  const [p1Score, setP1Score] = useState('')
  const [p2Score, setP2Score] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const s1 = parseInt(p1Score)
    const s2 = parseInt(p2Score)

    if (isNaN(s1) || isNaN(s2) || s1 < 0 || s2 < 0) {
      toast.error('Enter valid non-negative scores')
      return
    }

    setLoading(true)
    const result = await submitMatchResult(match.id, s1, s2)
    if (result.success) {
      toast.success(result.message)
      onSubmitted?.()
    } else {
      toast.error(result.message)
    }
    setLoading(false)
  }

  if (match.status === 'completed') {
    const winnerName =
      match.winnerId === match.player1Id
        ? match.player1Name
        : match.winnerId === match.player2Id
        ? match.player2Name
        : null

    return (
      <Card className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="font-display font-bold text-khoj-text">Match Result</h3>
          <Badge label="Completed" variant="success" />
        </div>
        <div className="flex items-center justify-between py-4">
          <div className="text-center flex-1">
            <p className="text-sm font-body font-semibold text-khoj-text">{match.player1Name}</p>
            <p className="text-4xl font-display font-bold text-khoj-text mt-1">
              {match.player1Score}
            </p>
          </div>
          <div className="text-khoj-subtle font-display text-xl px-4">VS</div>
          <div className="text-center flex-1">
            <p className="text-sm font-body font-semibold text-khoj-text">{match.player2Name}</p>
            <p className="text-4xl font-display font-bold text-khoj-text mt-1">
              {match.player2Score}
            </p>
          </div>
        </div>
        {winnerName ? (
          <div className="text-center py-2 bg-khoj-gold/10 border border-khoj-gold/30 rounded-sm">
            <p className="text-sm font-body font-semibold text-khoj-gold">
              🏆 {winnerName} wins!
            </p>
          </div>
        ) : (
          <div className="text-center py-2 bg-khoj-muted/20 border border-khoj-border rounded-sm">
            <p className="text-sm font-body text-khoj-subtle">Draw</p>
          </div>
        )}
      </Card>
    )
  }

  return (
    <Card className="space-y-5">
      <div className="flex items-center justify-between">
        <h3 className="font-display font-bold text-khoj-text">Submit Result</h3>
        <Badge label="Pending" variant="warning" />
      </div>

      <div className="grid grid-cols-2 gap-4 py-2">
        <div className="text-center">
          <p className="text-xs uppercase tracking-wider text-khoj-subtle font-body mb-1">Player 1</p>
          <p className="font-body font-semibold text-khoj-text text-sm">{match.player1Name}</p>
        </div>
        <div className="text-center">
          <p className="text-xs uppercase tracking-wider text-khoj-subtle font-body mb-1">Player 2</p>
          <p className="font-body font-semibold text-khoj-text text-sm">{match.player2Name}</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <Input
            label={`${match.player1Name}'s score`}
            type="number"
            min="0"
            placeholder="0"
            value={p1Score}
            onChange={(e) => setP1Score(e.target.value)}
          />
          <Input
            label={`${match.player2Name}'s score`}
            type="number"
            min="0"
            placeholder="0"
            value={p2Score}
            onChange={(e) => setP2Score(e.target.value)}
          />
        </div>
        <Button type="submit" loading={loading} className="w-full">
          Submit Result & Award XP
        </Button>
      </form>
    </Card>
  )
}
