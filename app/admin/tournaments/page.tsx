'use client'

import { useEffect, useState, useCallback, useMemo } from 'react'
import { format } from 'date-fns'
import { useAdminGuard } from '@/hooks/useAdminGuard'
import {
  getAllTournaments,
  createTournament,
  updateTournament,
  deleteTournament,
  publishTournamentResult,
  CreateTournamentInput,
} from '@/services/tournamentService'
import { Tournament, TournamentPlacement, TournamentResults } from '@/lib/types'
import { PageHeader } from '@/components/layout/PageHeader'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { EmptyState } from '@/components/ui/EmptyState'
import { LoadingSpinner } from '@/components/ui/LoadingSpinner'
import toast from 'react-hot-toast'

const EMPTY_FORM: Omit<CreateTournamentInput, 'createdBy'> = {
  title: '',
  description: '',
  category: 'Web Dev',
  maxPlayers: 32,
  entryFee: 0,
  prizeXP: 200,
  prizeMoney: 0,
  startDate: '',
  endDate: '',
  status: 'upcoming',
}

const EMPTY_RESULTS: TournamentResults = {
  first: '',
  second: '',
  third: '',
}

const CATEGORIES = ['Web Dev', 'DSA', 'Design', 'DevOps', 'Mobile', 'AI/ML', 'Other']
const STATUS_OPTIONS: Tournament['status'][] = ['upcoming', 'active', 'completed']
const PLACEMENT_ORDER: TournamentPlacement[] = ['first', 'second', 'third']

const PLACEMENT_LABELS: Record<TournamentPlacement, string> = {
  first: '1st Place',
  second: '2nd Place',
  third: '3rd Place',
}

type ResultSelectionMap = Record<string, TournamentResults>
type PublishStateMap = Record<string, boolean>

function getRequiredPlacements(participantCount: number): TournamentPlacement[] {
  return PLACEMENT_ORDER.slice(0, Math.min(participantCount, PLACEMENT_ORDER.length)) as TournamentPlacement[]
}

interface TournamentFormProps {
  initial: Omit<CreateTournamentInput, 'createdBy'>
  onSubmit: (data: Omit<CreateTournamentInput, 'createdBy'>) => Promise<void>
  onClose: () => void
  mode: 'create' | 'edit'
  loading: boolean
}

function toDateTimeLocalValue(value: string) {
  if (!value) return ''

  const date = new Date(value)

  if (Number.isNaN(date.getTime())) {
    return value.slice(0, 16)
  }

  return format(date, "yyyy-MM-dd'T'HH:mm")
}

function TournamentForm({ initial, onSubmit, onClose, mode, loading }: TournamentFormProps) {
  const [form, setForm] = useState({
    ...initial,
    startDate: toDateTimeLocalValue(initial.startDate),
    endDate: toDateTimeLocalValue(initial.endDate),
  })

  useEffect(() => {
    setForm({
      ...initial,
      startDate: toDateTimeLocalValue(initial.startDate),
      endDate: toDateTimeLocalValue(initial.endDate),
    })
  }, [initial])

  const set = (field: string, value: string | number) =>
    setForm((prev) => ({ ...prev, [field]: value }))

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.title.trim()) {
      toast.error('Title is required')
      return
    }
    if (!form.startDate) {
      toast.error('Start date required')
      return
    }
    if (!form.endDate) {
      toast.error('End date required')
      return
    }
    await onSubmit(form)
  }

  const inputClass =
    'w-full px-4 py-2.5 bg-khoj-bg border border-khoj-border rounded-sm text-sm text-khoj-text placeholder-khoj-subtle font-body focus:outline-none focus:border-khoj-accent transition-colors'
  const labelClass = 'block text-[10px] uppercase tracking-wider text-khoj-subtle font-body mb-1.5'

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
      <div className="w-full max-w-2xl bg-khoj-card border border-khoj-border rounded-sm shadow-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between px-6 py-5 border-b border-khoj-border">
          <div>
            <p className="text-[10px] uppercase tracking-widest text-khoj-subtle font-body">Admin</p>
            <h2 className="font-display font-bold text-khoj-text mt-0.5">
              {mode === 'create' ? 'Create Tournament' : 'Edit Tournament'}
            </h2>
          </div>
          <button onClick={onClose} className="text-khoj-subtle hover:text-khoj-text text-lg transition">✕</button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <label className={labelClass}>Title *</label>
              <input
                type="text"
                className={inputClass}
                placeholder="e.g., Web Dev Championship S1"
                value={form.title}
                onChange={(e) => set('title', e.target.value)}
              />
            </div>
            <div>
              <label className={labelClass}>Category</label>
              <select
                className={inputClass}
                value={form.category}
                onChange={(e) => set('category', e.target.value)}
              >
                {CATEGORIES.map((c) => <option key={c}>{c}</option>)}
              </select>
            </div>
            <div>
              <label className={labelClass}>Status</label>
              <select
                className={inputClass}
                value={form.status}
                onChange={(e) => set('status', e.target.value)}
              >
                {STATUS_OPTIONS.map((s) => (
                  <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className={labelClass}>Description</label>
            <textarea
              rows={3}
              className={`${inputClass} resize-none`}
              placeholder="What this tournament is about..."
              value={form.description}
              onChange={(e) => set('description', e.target.value)}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={labelClass}>Start Date & Time *</label>
              <input
                type="datetime-local"
                className={inputClass}
                value={form.startDate}
                onChange={(e) => set('startDate', e.target.value)}
              />
            </div>
            <div>
              <label className={labelClass}>End Date & Time *</label>
              <input
                type="datetime-local"
                className={inputClass}
                value={form.endDate}
                onChange={(e) => set('endDate', e.target.value)}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <label className={labelClass}>Max Players</label>
              <input
                type="number"
                min={2}
                max={1000}
                className={inputClass}
                value={form.maxPlayers}
                onChange={(e) => set('maxPlayers', Number(e.target.value))}
              />
            </div>
            <div>
              <label className={labelClass}>Entry Fee (Rs)</label>
              <input
                type="number"
                min={0}
                className={inputClass}
                value={form.entryFee ?? 0}
                onChange={(e) => set('entryFee', Number(e.target.value))}
              />
            </div>
            <div>
              <label className={labelClass}>Prize XP</label>
              <input
                type="number"
                min={0}
                className={inputClass}
                value={form.prizeXP}
                onChange={(e) => set('prizeXP', Number(e.target.value))}
              />
            </div>
            <div>
              <label className={labelClass}>Prize Money (₹)</label>
              <input
                type="number"
                min={0}
                className={inputClass}
                value={form.prizeMoney}
                onChange={(e) => set('prizeMoney', Number(e.target.value))}
              />
            </div>
          </div>

          <div className="flex items-center gap-3 pt-2 border-t border-khoj-border">
            <Button type="submit" loading={loading} className="flex-1">
              {mode === 'create' ? 'Create Tournament' : 'Save Changes'}
            </Button>
            <Button type="button" variant="ghost" onClick={onClose} className="flex-1">
              Cancel
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
}

function ConfirmDelete({
  tournament,
  onConfirm,
  onClose,
  loading,
}: {
  tournament: Tournament
  onConfirm: () => void
  onClose: () => void
  loading: boolean
}) {
  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
      <div className="w-full max-w-sm bg-khoj-card border border-khoj-border rounded-sm p-6">
        <p className="text-[10px] uppercase tracking-widest text-red-400 font-body mb-2">Danger Zone</p>
        <h3 className="font-display font-bold text-khoj-text mb-2">Delete Tournament?</h3>
        <p className="text-xs text-khoj-subtle font-body mb-6">
          <strong className="text-khoj-text">&quot;{tournament.title}&quot;</strong> will be permanently deleted.
          This cannot be undone.
        </p>
        <div className="flex gap-3">
          <Button variant="danger" onClick={onConfirm} loading={loading} className="flex-1">
            Delete
          </Button>
          <Button variant="ghost" onClick={onClose} className="flex-1">Cancel</Button>
        </div>
      </div>
    </div>
  )
}

export default function AdminTournamentsPage() {
  const { user: adminUser } = useAdminGuard()
  const [tournaments, setTournaments] = useState<Tournament[]>([])
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [selectedResults, setSelectedResults] = useState<ResultSelectionMap>({})
  const [publishingResult, setPublishingResult] = useState<PublishStateMap>({})
  const [publishedResult, setPublishedResult] = useState<PublishStateMap>({})

  const [showCreate, setShowCreate] = useState(false)
  const [editTarget, setEditTarget] = useState<Tournament | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<Tournament | null>(null)
  const [filterStatus, setFilterStatus] = useState<'all' | Tournament['status']>('all')

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const data = await getAllTournaments()
      setTournaments(data)
    } catch (err) {
      console.error(err)
      toast.error('Failed to load tournaments')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  const handleCreate = async (form: Omit<CreateTournamentInput, 'createdBy'>) => {
    if (!adminUser) return
    setSubmitting(true)
    try {
      await createTournament({ ...form, createdBy: adminUser.uid })
      toast.success('✓ Tournament created!')
      setShowCreate(false)
      await load()
    } catch (err) {
      console.error(err)
      toast.error('Failed to create tournament')
    } finally {
      setSubmitting(false)
    }
  }

  const handleEdit = async (form: Omit<CreateTournamentInput, 'createdBy'>) => {
    if (!editTarget) return
    setSubmitting(true)
    try {
      await updateTournament(editTarget.id, form)
      toast.success('✓ Tournament updated!')
      setEditTarget(null)
      await load()
    } catch (err) {
      console.error(err)
      toast.error('Failed to update tournament')
    } finally {
      setSubmitting(false)
    }
  }

  const handleDelete = async () => {
    if (!deleteTarget) return
    setSubmitting(true)
    try {
      await deleteTournament(deleteTarget.id)
      toast.success('Tournament deleted')
      setDeleteTarget(null)
      await load()
    } catch (err) {
      console.error(err)
      toast.error('Failed to delete tournament')
    } finally {
      setSubmitting(false)
    }
  }

  const handlePlacementChange = useCallback((
    tournamentId: string,
    placement: TournamentPlacement,
    value: string
  ) => {
    setSelectedResults((prev) => {
      const current = prev[tournamentId] ?? EMPTY_RESULTS

      if (current[placement] === value) {
        return prev
      }

      return {
        ...prev,
        [tournamentId]: {
          ...current,
          [placement]: value,
        },
      }
    })
  }, [])

  const handlePublishResult = useCallback(async (tournament: Tournament) => {
    if (tournament.status === 'completed' || publishedResult[tournament.id]) {
      return
    }

    const results = {
      ...EMPTY_RESULTS,
      ...(tournament.results ?? EMPTY_RESULTS),
      ...(selectedResults[tournament.id] ?? EMPTY_RESULTS),
    }

    const requiredPlacements = getRequiredPlacements(tournament.participants.length)

    for (const placement of requiredPlacements) {
      if (!results[placement]) {
        window.alert(`Please select ${PLACEMENT_LABELS[placement]} before publishing the result.`)
        return
      }
    }

    const selectedIds = PLACEMENT_ORDER.map((placement) => results[placement]).filter(Boolean)

    if (new Set(selectedIds).size !== selectedIds.length) {
      window.alert('Duplicate players are not allowed across 1st, 2nd, and 3rd place.')
      return
    }

    setPublishingResult((prev) => ({ ...prev, [tournament.id]: true }))

    try {
      await publishTournamentResult(tournament.id, results)

      setPublishedResult((prev) => ({ ...prev, [tournament.id]: true }))
      setSelectedResults((prev) => ({ ...prev, [tournament.id]: results }))
      setTournaments((prev) =>
        prev.map((item) =>
          item.id === tournament.id
            ? { ...item, status: 'completed', results }
            : item
        )
      )

      toast.success('Top 3 results published ✅')
    } catch (err) {
      console.error(err)
      toast.error(err instanceof Error ? err.message : 'Failed to publish results')
    } finally {
      setPublishingResult((prev) => ({ ...prev, [tournament.id]: false }))
    }
  }, [publishedResult, selectedResults])

  const filtered = useMemo(
    () => (filterStatus === 'all'
      ? tournaments
      : tournaments.filter((tournament) => tournament.status === filterStatus)),
    [filterStatus, tournaments]
  )

  const counts = useMemo(() => ({
    all: tournaments.length,
    upcoming: tournaments.filter((tournament) => tournament.status === 'upcoming').length,
    active: tournaments.filter((tournament) => tournament.status === 'active').length,
    completed: tournaments.filter((tournament) => tournament.status === 'completed').length,
  }), [tournaments])

  return (
    <>
      {showCreate && (
        <TournamentForm
          initial={EMPTY_FORM}
          onSubmit={handleCreate}
          onClose={() => setShowCreate(false)}
          mode="create"
          loading={submitting}
        />
      )}
      {editTarget && (
        <TournamentForm
          initial={{
            title: editTarget.title,
            description: editTarget.description,
            category: editTarget.category,
            maxPlayers: editTarget.maxPlayers,
            prizeXP: editTarget.prizeXP,
            prizeMoney: editTarget.prizeMoney ?? 0,
            startDate: editTarget.startDate,
            endDate: editTarget.endDate,
            status: editTarget.status,
          }}
          onSubmit={handleEdit}
          onClose={() => setEditTarget(null)}
          mode="edit"
          loading={submitting}
        />
      )}
      {deleteTarget && (
        <ConfirmDelete
          tournament={deleteTarget}
          onConfirm={handleDelete}
          onClose={() => setDeleteTarget(null)}
          loading={submitting}
        />
      )}

      <div className="animate-slide-up">
        <PageHeader
          eyebrow="Admin · Tournaments"
          title="Manage Tournaments"
          subtitle="Create, edit, and publish top 3 tournament results without breaking the admin workflow."
          action={<Button onClick={() => setShowCreate(true)}>+ New Tournament</Button>}
        />

        <div className="flex gap-1 mb-6 bg-khoj-card border border-khoj-border rounded-sm p-1 w-fit">
          {(['all', 'upcoming', 'active', 'completed'] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setFilterStatus(tab)}
              className={`px-4 py-2 text-xs uppercase tracking-wider font-body font-semibold rounded-sm transition-all duration-150 ${
                filterStatus === tab ? 'bg-khoj-accent text-white' : 'text-khoj-subtle hover:text-khoj-text'
              }`}
            >
              {tab} ({counts[tab]})
            </button>
          ))}
        </div>

        {loading ? (
          <LoadingSpinner />
        ) : filtered.length === 0 ? (
          <EmptyState
            icon="◈"
            title="No tournaments"
            description="Create your first tournament to get started."
            action={<Button onClick={() => setShowCreate(true)}>Create Tournament</Button>}
          />
        ) : (
          <div className="space-y-4">
            {filtered.map((tournament) => {
              const isCompleted = tournament.status === 'completed' || !!publishedResult[tournament.id]
              const isPublishing = !!publishingResult[tournament.id]
              const currentResults = {
                ...EMPTY_RESULTS,
                ...(tournament.results ?? EMPTY_RESULTS),
                ...(selectedResults[tournament.id] ?? EMPTY_RESULTS),
              }

              return (
                <Card key={tournament.id} className="group">
                  <div className="flex items-start gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1.5">
                        <h3 className="font-display font-bold text-khoj-text truncate">{tournament.title}</h3>
                        <Badge
                          label={tournament.status}
                          variant={
                            tournament.status === 'active'
                              ? 'success'
                              : tournament.status === 'upcoming'
                                ? 'warning'
                                : 'default'
                          }
                        />
                      </div>

                      <p className="text-xs text-khoj-subtle font-body line-clamp-1 mb-3">
                        {tournament.description}
                      </p>

                      <div className="flex flex-wrap gap-x-4 gap-y-1 text-[11px] text-khoj-subtle font-body">
                        <span>📁 {tournament.category}</span>
                        <span>👥 {tournament.currentPlayers}/{tournament.maxPlayers}</span>
                        <span>⭐ {tournament.prizeXP} XP</span>
                        {(tournament.prizeMoney ?? 0) > 0 && (
                          <span>💰 ₹{(tournament.prizeMoney ?? 0).toLocaleString()}</span>
                        )}
                        <span>📅 {tournament.startDate} → {tournament.endDate}</span>
                      </div>

                      <div className="mt-4 rounded-sm border border-khoj-border bg-khoj-bg/40 p-4 space-y-4">
                        <div>
                          <p className="text-[10px] uppercase tracking-widest text-khoj-subtle font-body mb-2">
                            Participants
                          </p>

                          {tournament.participants.length === 0 ? (
                            <p className="text-xs text-khoj-subtle font-body">No participants joined yet.</p>
                          ) : (
                            <div className="flex flex-wrap gap-2">
                              {tournament.participants.map((participantId) => (
                                <span
                                  key={participantId}
                                  className="px-2.5 py-1 rounded-sm bg-khoj-card border border-khoj-border text-[11px] text-khoj-text font-body"
                                >
                                  {participantId}
                                </span>
                              ))}
                            </div>
                          )}
                        </div>

                        {isCompleted && (currentResults.first || currentResults.second || currentResults.third) && (
                          <div className="grid gap-2 md:grid-cols-3">
                            <div className="rounded-sm border border-amber-400/30 bg-amber-400/10 px-3 py-2 text-xs text-khoj-text font-body">
                              🥇 {currentResults.first || '—'}
                            </div>
                            <div className="rounded-sm border border-slate-400/30 bg-slate-400/10 px-3 py-2 text-xs text-khoj-text font-body">
                              🥈 {currentResults.second || '—'}
                            </div>
                            <div className="rounded-sm border border-orange-400/30 bg-orange-400/10 px-3 py-2 text-xs text-khoj-text font-body">
                              🥉 {currentResults.third || '—'}
                            </div>
                          </div>
                        )}

                        <div className="grid gap-3 md:grid-cols-3">
                          {PLACEMENT_ORDER.map((placement, index) => {
                            const unavailable = tournament.participants.length <= index

                            return (
                              <div key={`${tournament.id}-${placement}`}>
                                <label className="block text-[10px] uppercase tracking-wider text-khoj-subtle font-body mb-1.5">
                                  {PLACEMENT_LABELS[placement]}
                                </label>
                                <select
                                  value={currentResults[placement]}
                                  disabled={isCompleted || isPublishing || unavailable || tournament.participants.length === 0}
                                  onChange={(e) => handlePlacementChange(tournament.id, placement, e.target.value)}
                                  className="w-full px-4 py-2.5 bg-khoj-bg border border-khoj-border rounded-sm text-sm text-khoj-text font-body focus:outline-none focus:border-khoj-accent transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                  <option value="">
                                    {unavailable ? 'Not available' : `Select ${PLACEMENT_LABELS[placement]}`}
                                  </option>
                                  {tournament.participants.map((participantId) => (
                                    <option key={`${placement}-${participantId}`} value={participantId}>
                                      {participantId}
                                    </option>
                                  ))}
                                </select>
                              </div>
                            )
                          })}
                        </div>

                        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                          <div className="space-y-1">
                            <p className="text-xs text-khoj-subtle font-body">
                              All participants get +10 XP · 1st +100 XP · 2nd +50 XP · 3rd +25 XP
                            </p>
                            <p className={`text-xs font-body ${isCompleted ? 'text-emerald-400' : 'text-khoj-subtle'}`}>
                              {isCompleted
                                ? 'Result Published ✅'
                                : tournament.participants.length === 0
                                  ? 'Add participants before publishing.'
                                  : 'Select top placements with no duplicate players.'}
                            </p>
                          </div>

                          <Button
                            size="sm"
                            variant="secondary"
                            loading={isPublishing}
                            disabled={isCompleted || isPublishing || tournament.participants.length === 0}
                            onClick={() => void handlePublishResult(tournament)}
                            className="w-full lg:w-auto bg-emerald-600 border-emerald-600 text-white hover:bg-emerald-500 hover:border-emerald-500 disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            {isCompleted ? 'Results Published' : 'Publish Top 3'}
                          </Button>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      <Button size="sm" variant="secondary" onClick={() => setEditTarget(tournament)}>
                        Edit
                      </Button>
                      <Button size="sm" variant="danger" onClick={() => setDeleteTarget(tournament)}>
                        Delete
                      </Button>
                    </div>
                  </div>
                </Card>
              )
            })}
          </div>
        )}
      </div>
    </>
  )
}
