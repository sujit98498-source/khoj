// app/dashboard/interviews/page.tsx
// Candidate-facing interview dashboard.
// Shows all interview invitations: accept, decline, or request a reschedule.

'use client'

import { useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { AppShell } from '@/components/layout/AppShell'
import { PageLoader } from '@/components/ui/LoadingSpinner'
import { InterviewCard } from '@/components/interviews/InterviewCard'
import { useAuth } from '@/hooks/useAuth'
import {
  getInterviewsByCandidate,
  getPendingInterviewCount,
} from '@/services/interviewService'
import type { InterviewSchedule, InterviewStatus } from '@/lib/types'

// ── Filter tabs ───────────────────────────────────────────────────────────────

const FILTER_TABS: { value: InterviewStatus | 'all'; label: string }[] = [
  { value: 'all',                   label: 'All' },
  { value: 'scheduled',             label: 'Pending' },
  { value: 'accepted',              label: 'Accepted' },
  { value: 'reschedule_requested',  label: 'Reschedule Req.' },
  { value: 'completed',             label: 'Completed' },
  { value: 'declined',              label: 'Declined' },
]

// ── Stat chip ─────────────────────────────────────────────────────────────────

function StatChip({
  label,
  value,
  accent,
  highlight,
}: {
  label: string
  value: number
  accent?: string
  highlight?: boolean
}) {
  return (
    <div
      className={`flex flex-col items-center justify-center border rounded-sm px-4 py-3 min-w-[80px] ${
        highlight
          ? 'bg-khoj-accent/5 border-khoj-accent/30'
          : 'bg-khoj-card border-khoj-border'
      }`}
    >
      <span className={`text-lg font-display font-bold ${accent ?? 'text-khoj-text'}`}>
        {value}
      </span>
      <span className="text-[9px] uppercase tracking-widest font-body text-khoj-muted mt-0.5">
        {label}
      </span>
    </div>
  )
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function DashboardInterviewsPage() {
  const router = useRouter()
  const { khojUser, loading: authLoading } = useAuth()

  const [interviews, setInterviews] = useState<InterviewSchedule[]>([])
  const [filter, setFilter] = useState<InterviewStatus | 'all'>('all')

  const reload = useCallback(() => {
    if (!khojUser) return
    setInterviews(getInterviewsByCandidate(khojUser.uid))
  }, [khojUser])

  useEffect(() => { reload() }, [reload])

  if (authLoading) return <PageLoader />
  if (!khojUser) { router.replace('/auth/login'); return null }

  // ── Derived counts ──────────────────────────────────────────────────────────
  const pending  = interviews.filter((i) => i.status === 'scheduled').length
  const accepted = interviews.filter((i) => i.status === 'accepted').length
  const completed = interviews.filter((i) => i.status === 'completed').length

  const filtered =
    filter === 'all' ? interviews : interviews.filter((i) => i.status === filter)

  // Sort: pending first, then by date
  const sorted = [...filtered].sort((a, b) => {
    if (a.status === 'scheduled' && b.status !== 'scheduled') return -1
    if (b.status === 'scheduled' && a.status !== 'scheduled') return 1
    // By interview date ascending for future, descending for past
    return a.date.localeCompare(b.date)
  })

  return (
    <AppShell>
      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8">
        {/* ── Page header ─────────────────────────────────────────────────── */}
        <div className="flex items-start justify-between gap-4 mb-6">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <Link
                href="/dashboard"
                className="text-[10px] font-body text-khoj-muted hover:text-khoj-accent transition-colors"
              >
                Dashboard
              </Link>
              <span className="text-khoj-muted text-[10px]">/</span>
              <span className="text-[10px] font-body text-khoj-subtle">Interviews</span>
            </div>
            <h1 className="text-2xl font-display font-bold text-khoj-text">
              My Interviews
            </h1>
            <p className="text-xs font-body text-khoj-muted mt-1">
              Review and respond to interview invitations from recruiters.
            </p>
          </div>
          <Link
            href="/dashboard/applications"
            className="hidden sm:inline-flex items-center gap-1.5 text-xs font-body text-khoj-subtle border border-khoj-border px-3 py-2 rounded-sm hover:border-khoj-accent/30 hover:text-khoj-text transition-colors"
          >
            ← Applications
          </Link>
        </div>

        {/* ── Pending alert ────────────────────────────────────────────────── */}
        {pending > 0 && (
          <div
            className="flex items-center gap-3 bg-khoj-accent/5 border border-khoj-accent/30 rounded-sm px-4 py-3 mb-5 cursor-pointer hover:bg-khoj-accent/10 transition-colors"
            onClick={() => setFilter('scheduled')}
          >
            <span className="text-khoj-accent text-sm">◆</span>
            <p className="text-xs font-body text-khoj-text">
              You have{' '}
              <span className="font-semibold text-khoj-accent">
                {pending} pending interview{pending > 1 ? 's' : ''}
              </span>{' '}
              waiting for your response.
            </p>
          </div>
        )}

        {/* ── Stats strip ──────────────────────────────────────────────────── */}
        <div className="flex flex-wrap gap-2 mb-6">
          <StatChip label="Total" value={interviews.length} />
          <StatChip
            label="Pending"
            value={pending}
            accent="text-khoj-accent"
            highlight={pending > 0}
          />
          <StatChip label="Accepted" value={accepted} accent="text-khoj-teal" />
          <StatChip label="Completed" value={completed} accent="text-blue-400" />
        </div>

        {/* ── Filter tabs ──────────────────────────────────────────────────── */}
        <div className="flex flex-wrap gap-1.5 mb-5">
          {FILTER_TABS.map(({ value, label }) => {
            const count =
              value === 'all'
                ? interviews.length
                : interviews.filter((i) => i.status === value).length
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

        {/* ── Interview list ────────────────────────────────────────────────── */}
        {sorted.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 gap-4 text-center">
            <span className="text-4xl text-khoj-muted">◷</span>
            <p className="text-sm font-body text-khoj-subtle">
              {filter === 'all'
                ? 'No interviews yet.'
                : `No interviews in "${FILTER_TABS.find((t) => t.value === filter)?.label}" status.`}
            </p>
            {filter === 'all' && (
              <p className="text-xs font-body text-khoj-muted max-w-xs">
                Apply to jobs and get shortlisted — recruiters will schedule
                interviews from the{' '}
                <Link href="/jobs" className="text-khoj-accent hover:underline">
                  Jobs board
                </Link>
                .
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
          <div className="grid gap-3 sm:grid-cols-2">
            {sorted.map((interview) => (
              <InterviewCard
                key={interview.id}
                interview={interview}
                viewMode="candidate"
                onStatusChange={reload}
              />
            ))}
          </div>
        )}
      </div>
    </AppShell>
  )
}
