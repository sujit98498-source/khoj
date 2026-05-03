// app/recruiter/interviews/page.tsx
// Recruiter interview dashboard — full list of all interviews they've scheduled.
// Filter by status · complete/cancel from cards · see reschedule requests highlighted.

'use client'

import { useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { AppShell } from '@/components/layout/AppShell'
import { PageLoader } from '@/components/ui/LoadingSpinner'
import { InterviewCard } from '@/components/interviews/InterviewCard'
import { InterviewStatusBadge } from '@/components/interviews/InterviewStatusBadge'
import { useAuth } from '@/hooks/useAuth'
import {
  getInterviewsByRecruiter,
  getRecruiterInterviewCounts,
} from '@/services/interviewService'
import type { InterviewSchedule, InterviewStatus } from '@/lib/types'

// ── Status filter tabs ────────────────────────────────────────────────────────

const FILTER_TABS: { value: InterviewStatus | 'all'; label: string }[] = [
  { value: 'all',                   label: 'All' },
  { value: 'scheduled',             label: 'Scheduled' },
  { value: 'accepted',              label: 'Accepted' },
  { value: 'reschedule_requested',  label: 'Reschedule Req.' },
  { value: 'completed',             label: 'Completed' },
  { value: 'declined',              label: 'Declined' },
  { value: 'cancelled',             label: 'Cancelled' },
]

// ── Stat chip ─────────────────────────────────────────────────────────────────

function StatChip({
  label,
  value,
  accent,
}: {
  label: string
  value: number
  accent?: string
}) {
  return (
    <div className="flex flex-col items-center justify-center bg-khoj-card border border-khoj-border rounded-sm px-4 py-3 min-w-[80px]">
      <span
        className={`text-lg font-display font-bold ${accent ?? 'text-khoj-text'}`}
      >
        {value}
      </span>
      <span className="text-[9px] uppercase tracking-widest font-body text-khoj-muted mt-0.5">
        {label}
      </span>
    </div>
  )
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function RecruiterInterviewsPage() {
  const router = useRouter()
  const { khojUser, loading: authLoading } = useAuth()

  const [interviews, setInterviews] = useState<InterviewSchedule[]>([])
  const [filter, setFilter] = useState<InterviewStatus | 'all'>('all')
  const [counts, setCounts] = useState<Record<InterviewStatus, number>>({
    scheduled: 0,
    accepted: 0,
    declined: 0,
    reschedule_requested: 0,
    completed: 0,
    cancelled: 0,
  })

  const reload = useCallback(() => {
    if (!khojUser) return
    const list = getInterviewsByRecruiter(khojUser.uid)
    setInterviews(list)
    setCounts(getRecruiterInterviewCounts(khojUser.uid))
  }, [khojUser])

  useEffect(() => { reload() }, [reload])

  if (authLoading) return <PageLoader />
  if (!khojUser) { router.replace('/auth/login'); return null }

  const filtered =
    filter === 'all' ? interviews : interviews.filter((i) => i.status === filter)

  // Highlight reschedule_requested first in the sorted list
  const sorted = [...filtered].sort((a, b) => {
    if (a.status === 'reschedule_requested' && b.status !== 'reschedule_requested')
      return -1
    if (b.status === 'reschedule_requested' && a.status !== 'reschedule_requested')
      return 1
    return b.scheduledAt.localeCompare(a.scheduledAt)
  })

  return (
    <AppShell>
      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8">
        {/* ── Page header ─────────────────────────────────────────────────── */}
        <div className="flex items-start justify-between gap-4 mb-6">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <Link
                href="/recruiter"
                className="text-[10px] font-body text-khoj-muted hover:text-khoj-accent transition-colors"
              >
                Recruiter
              </Link>
              <span className="text-khoj-muted text-[10px]">/</span>
              <span className="text-[10px] font-body text-khoj-subtle">Interviews</span>
            </div>
            <h1 className="text-2xl font-display font-bold text-khoj-text">
              Interview Dashboard
            </h1>
            <p className="text-xs font-body text-khoj-muted mt-1">
              Track and manage all scheduled interviews with your candidates.
            </p>
          </div>
          <Link
            href="/recruiter/jobs"
            className="hidden sm:inline-flex items-center gap-1.5 text-xs font-body font-semibold text-khoj-accent border border-khoj-accent/30 px-4 py-2 rounded-sm hover:bg-khoj-accent/10 transition-colors"
          >
            ◈ My Jobs
          </Link>
        </div>

        {/* ── Stats strip ──────────────────────────────────────────────────── */}
        <div className="flex flex-wrap gap-2 mb-6">
          <StatChip label="Total" value={interviews.length} />
          <StatChip label="Scheduled" value={counts.scheduled} accent="text-blue-400" />
          <StatChip label="Accepted" value={counts.accepted} accent="text-khoj-teal" />
          <StatChip
            label="Reschedule"
            value={counts.reschedule_requested}
            accent="text-khoj-gold"
          />
          <StatChip label="Completed" value={counts.completed} accent="text-khoj-accent" />
          <StatChip label="Declined" value={counts.declined} accent="text-red-400" />
        </div>

        {/* ── Reschedule alert ─────────────────────────────────────────────── */}
        {counts.reschedule_requested > 0 && (
          <div
            className="flex items-center gap-3 bg-khoj-gold/5 border border-khoj-gold/30 rounded-sm px-4 py-3 mb-5 cursor-pointer hover:bg-khoj-gold/10 transition-colors"
            onClick={() => setFilter('reschedule_requested')}
          >
            <span className="text-khoj-gold text-sm">⚑</span>
            <p className="text-xs font-body text-khoj-gold">
              <span className="font-semibold">{counts.reschedule_requested}</span>{' '}
              candidate{counts.reschedule_requested > 1 ? 's have' : ' has'} requested a
              reschedule. Click to review.
            </p>
          </div>
        )}

        {/* ── Filter tabs ──────────────────────────────────────────────────── */}
        <div className="flex flex-wrap gap-1.5 mb-5">
          {FILTER_TABS.map(({ value, label }) => {
            const count =
              value === 'all'
                ? interviews.length
                : counts[value as InterviewStatus]
            return (
              <button
                key={value}
                type="button"
                onClick={() => setFilter(value)}
                className={`text-[10px] font-body px-3 py-1.5 rounded-sm border transition-colors ${
                  filter === value
                    ? 'bg-khoj-accent/10 text-khoj-accent border-khoj-accent/40 font-semibold'
                    : 'bg-khoj-card text-khoj-subtle border-khoj-border hover:border-khoj-accent/30 hover:text-khoj-text'
                }`}
              >
                {label}
                {count > 0 && (
                  <span className="ml-1 opacity-60">({count})</span>
                )}
              </button>
            )
          })}
        </div>

        {/* ── Interview grid ────────────────────────────────────────────────── */}
        {sorted.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 gap-4 text-center">
            <span className="text-4xl text-khoj-muted">◷</span>
            <p className="text-sm font-body text-khoj-subtle">
              {filter === 'all'
                ? 'No interviews scheduled yet.'
                : `No interviews in "${FILTER_TABS.find((t) => t.value === filter)?.label}" status.`}
            </p>
            {filter === 'all' && (
              <p className="text-xs font-body text-khoj-muted max-w-sm">
                Open the{' '}
                <Link
                  href="/recruiter/jobs"
                  className="text-khoj-accent hover:underline"
                >
                  applicant pipeline
                </Link>{' '}
                and click "Schedule Interview" on any candidate in the Interview
                stage.
              </p>
            )}
            {filter !== 'all' && (
              <button
                type="button"
                onClick={() => setFilter('all')}
                className="text-xs font-body text-khoj-accent hover:underline"
              >
                Clear filter
              </button>
            )}
          </div>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {sorted.map((interview) => (
              <InterviewCard
                key={interview.id}
                interview={interview}
                viewMode="recruiter"
                onStatusChange={reload}
              />
            ))}
          </div>
        )}
      </div>
    </AppShell>
  )
}
