'use client'

import { useState } from 'react'
import { createMatch } from '@/services/matchService'
import { Tournament, KhojUser } from '@/lib/types'
import { Input } from '@/components/ui/Input'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { Select } from '@/components/ui/Input'
import toast from 'react-hot-toast'

interface CreateMatchFormProps {
  tournaments: Tournament[]
  currentUser: KhojUser
  onCreated?: () => void
}

export function CreateMatchForm({ tournaments, currentUser, onCreated }: CreateMatchFormProps) {
  const [tournamentId, setTournamentId] = useState('')
  const [opponentName, setOpponentName] = useState('')
  const [opponentId, setOpponentId] = useState('')
  const [loading, setLoading] = useState(false)

  const tournamentOptions = [
    { value: '', label: '— Select Tournament —' },
    ...tournaments
      .filter((t) => t.participants.includes(currentUser.uid) && t.status === 'active')
      .map((t) => ({ value: t.id, label: t.name || t.title })),
  ]

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!tournamentId) { toast.error('Select a tournament'); return }
    if (!opponentName.trim()) { toast.error('Enter opponent name'); return }
    if (!opponentId.trim()) { toast.error('Enter opponent user ID'); return }
    if (opponentId === currentUser.uid) { toast.error('You cannot match yourself'); return }

    setLoading(true)
    const now = new Date().toISOString()
    try {
      await createMatch({
        tournamentId,
        player1Id: currentUser.uid,
        player2Id: opponentId,
        player1Name: currentUser.name,
        player2Name: opponentName.trim(),
        player1Score: 0,
        player2Score: 0,
        winnerId: null,
        status: 'pending',
        createdAt: now,
      })
      toast.success('Match created!')
      setOpponentName('')
      setOpponentId('')
      setTournamentId('')
      onCreated?.()
    } catch {
      toast.error('Failed to create match')
    }
    setLoading(false)
  }

  return (
    <Card className="space-y-5">
      <h3 className="font-display font-bold text-khoj-text">Create Match</h3>
      <form onSubmit={handleSubmit} className="space-y-4">
        <Select
          label="Tournament"
          value={tournamentId}
          onChange={(e) => setTournamentId(e.target.value)}
          options={tournamentOptions}
        />
        <Input
          label="Opponent Name"
          placeholder="e.g. Jane Smith"
          value={opponentName}
          onChange={(e) => setOpponentName(e.target.value)}
        />
        <Input
          label="Opponent User ID"
          placeholder="Their KHOJ user ID"
          value={opponentId}
          onChange={(e) => setOpponentId(e.target.value)}
        />
        <p className="text-[10px] text-khoj-subtle font-body">
          💡 Share your User ID from your Profile page so opponents can create matches with you.
        </p>
        <Button type="submit" loading={loading} className="w-full">
          Create Match
        </Button>
      </form>
    </Card>
  )
}
