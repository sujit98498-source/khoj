// app/dashboard/saved-jobs/page.tsx
// User's saved job bookmarks — view, quick-apply, or remove saved listings.

'use client'

import { useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { AppShell } from '@/components/layout/AppShell'
import { PageLoader } from '@/components/ui/LoadingSpinner'
import { useAuth } from '@/hooks/useAuth'
import { getSavedJobsByUser, unsaveJob } from '@/services/savedJobService'
import { hasApplied, applyToJob, getJobPost } from '@/services/hiringService'
import { useJobs } from '@/lib/jobs-context'
import type { SavedJob } from '@/lib/types'
import { formatDistanceToNow } from 'date-fns'
import toast from 'react-hot-toast'
import clsx from 'clsx'

const WORK_TYPE_LABELS: Record<string, string> = {
  remote: 'Remote',
  onsite: 'On-Site',
  hybrid: 'Hybrid',
}

const WORK_TYPE_COLORS: Record<string, string> = {
  remote: 'text-khoj-teal border-khoj-teal/30',
  onsite: 'text-blue-400 border-blue-400/30',
  hybrid: 'text-purple-400 border-purple-400/30',
}

const CATEGORY_ICONS: Record<string, string> = {
  Coding: '⟨/⟩',
  Design: '◉',
  Esports: '🎮',
  Startups: '⚡',
  Marketing: '◈',
  Data: '▦',
  Product: '▲',
  Other: '◇',
}

export default function SavedJobsPage() {
  const router = useRouter()
  const { khojUser, loading: authLoading } = useAuth()
  const { refresh } = useJobs()

  const [savedJobs, setSavedJobs] = useState<SavedJob[]>([])
  const [appliedMap, setAppliedMap] = useState<Record<string, boolean>>({})

  const reload = useCallback(() => {
    if (!khojUser) return
    const list = getSavedJobsByUser(khojUser.uid)
    setSavedJobs(list)
    const map: Record<string, boolean> = {}
    list.forEach((s) => { map[s.jobId] = hasApplied(s.jobId, khojUser.uid) })
    setAppliedMap(map)
  }, [khojUser])

  useEffect(() => { reload() }, [reload])

  if (authLoading) return <PageLoader />
  if (!khojUser) { router.replace('/auth/login'); return null }

  function handleRemove(saved: SavedJob) {
    unsaveJob(saved.jobId, khojUser!.uid)
    toast.success('Removed from saved')
    reload()
    refresh()
  }

  return (
    <AppShell>
      <div className="max-w-3xl mx-auto px-4 sm:px-6 py-8">
        {/* ── Header ────────────────────────────────────────────────────────── */}
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
              <span className="text-[10px] font-body text-khoj-subtle">Saved Jobs</span>
            </div>
            <h1 className="text-2xl font-display font-bold text-khoj-text">Saved Jobs</h1>
            <p className="text-xs font-body text-khoj-muted mt-1">
              {savedJobs.length} job{savedJobs.length !== 1 ? 's' : ''} saved
            </p>
          </div>
          <Link
            href="/jobs"
            className="hidden sm:inline-flex items-center gap-1.5 text-xs font-body font-semibold text-khoj-accent border border-khoj-accent/30 px-4 py-2 rounded-sm hover:bg-khoj-accent/10 transition-colors"
          >
            ◉ Browse Jobs
          </Link>
        </div>

        {/* ── Empty state ────────────────────────────────────────────────────── */}
        {savedJobs.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 gap-4 text-center">
            <span className="text-5xl text-khoj-muted">☆</span>
            <p className="text-sm font-body font-semibold text-khoj-subtle">No saved jobs yet.</p>
            <p className="text-xs font-body text-khoj-muted max-w-xs">
              Click the ☆ star on any job card or job detail page to save it here for
              quick access later.
            </p>
            <Link
              href="/jobs"
              className="mt-2 text-xs font-body font-semibold bg-khoj-accent text-white px-5 py-2.5 rounded-sm hover:bg-khoj-accent/90 transition-colors"
            >
              Browse Jobs
            </Link>
          </div>
        ) : (
          <div className="space-y-3">
            {savedJobs.map((saved) => {
              const isExpired = new Date(saved.deadline) < new Date()
              const daysLeft = Math.ceil(
                (new Date(saved.deadline).getTime() - Date.now()) / (1000 * 60 * 60 * 24)
              )
              const isUrgent = daysLeft <= 7 && daysLeft > 0
              const alreadyApplied = appliedMap[saved.jobId] ?? false
              // Check if job still exists (might have been deleted by recruiter)
              const jobStillActive = !!getJobPost(saved.jobId)

              return (
                <div
                  key={saved.id}
                  className={clsx(
                    'bg-khoj-card border rounded-sm p-4 sm:p-5 transition-colors hover:border-khoj-accent/30',
                    isExpired ? 'opacity-60 border-khoj-border' : 'border-khoj-border'
                  )}
                >
                  {/* ── Card header ───────────────────────────────────────── */}
                  <div className="flex items-start gap-3 mb-3">
                    <div className="w-9 h-9 rounded-sm bg-khoj-bg border border-khoj-border flex items-center justify-center text-base flex-shrink-0">
                      {CATEGORY_ICONS[saved.category] ?? '◇'}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start gap-2 flex-wrap">
                        <Link
                          href={`/jobs/${saved.jobId}`}
                          className="text-sm font-display font-bold text-khoj-text hover:text-khoj-accent transition-colors truncate"
                        >
                          {saved.jobTitle}
                        </Link>
                        {!jobStillActive && (
                          <span className="text-[8px] font-body border border-red-500/30 text-red-400 px-1.5 py-0.5 rounded-sm flex-shrink-0">
                            Removed
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] font-body text-khoj-accent mt-0.5">
                        {saved.company}
                      </p>
                    </div>
                    {/* Work type badge */}
                    <span
                      className={clsx(
                        'flex-shrink-0 text-[9px] uppercase tracking-widest font-body px-2 py-0.5 rounded-sm border',
                        WORK_TYPE_COLORS[saved.workType]
                      )}
                    >
                      {WORK_TYPE_LABELS[saved.workType]}
                    </span>
                  </div>

                  {/* ── Meta ──────────────────────────────────────────────── */}
                  <div className="flex flex-wrap gap-3 text-[10px] text-khoj-subtle font-body mb-3">
                    <span>📍 {saved.location}</span>
                    {saved.salaryMin && saved.salaryMax && (
                      <span>
                        💰 {(saved.salaryMin / 1000).toFixed(0)}k–
                        {(saved.salaryMax / 1000).toFixed(0)}k {saved.salaryCurrency}
                      </span>
                    )}
                    <span className="text-khoj-muted">
                      Saved {formatDistanceToNow(new Date(saved.savedAt), { addSuffix: true })}
                    </span>
                    <span
                      className={clsx(
                        isExpired
                          ? 'text-red-400'
                          : isUrgent
                          ? 'text-khoj-accent'
                          : 'text-khoj-muted'
                      )}
                    >
                      {isExpired
                        ? 'Closed'
                        : isUrgent
                        ? `${daysLeft}d left!`
                        : `Closes ${new Date(saved.deadline).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`}
                    </span>
                  </div>

                  {/* ── Actions ───────────────────────────────────────────── */}
                  <div className="flex items-center gap-2 pt-3 border-t border-khoj-border/50">
                    {alreadyApplied ? (
                      <span className="text-[10px] font-body text-khoj-teal border border-khoj-teal/30 px-3 py-1.5 rounded-sm">
                        ✓ Applied
                      </span>
                    ) : jobStillActive && !isExpired ? (
                      <button
                        type="button"
                        onClick={() => {
                          const job = getJobPost(saved.jobId)
                          if (!job || !khojUser) return
                          applyToJob({ job, applicantId: khojUser.uid, applicantName: khojUser.name })
                          toast.success('Application submitted!')
                          reload()
                          refresh()
                        }}
                        className="text-[10px] font-body font-semibold bg-khoj-accent text-white px-4 py-1.5 rounded-sm hover:bg-khoj-accent/90 transition-colors"
                      >
                        Quick Apply
                      </button>
                    ) : (
                      <Link
                        href={`/jobs/${saved.jobId}`}
                        className="text-[10px] font-body text-khoj-subtle border border-khoj-border px-4 py-1.5 rounded-sm hover:border-khoj-accent/30 hover:text-khoj-text transition-colors"
                      >
                        View Details
                      </Link>
                    )}
                    <Link
                      href={`/jobs/${saved.jobId}`}
                      className="text-[10px] font-body text-khoj-subtle border border-khoj-border px-3 py-1.5 rounded-sm hover:border-khoj-accent/30 hover:text-khoj-text transition-colors"
                    >
                      Details
                    </Link>
                    <button
                      type="button"
                      onClick={() => handleRemove(saved)}
                      className="ml-auto text-[10px] font-body text-khoj-muted border border-khoj-border px-3 py-1.5 rounded-sm hover:text-red-400 hover:border-red-400/30 transition-colors"
                    >
                      ✕ Remove
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </AppShell>
  )
}
