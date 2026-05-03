// components/jobs/HiringJobCard.tsx
// Job card for the /jobs board and /recruiter/jobs pages.
// Supports: inline quick-apply, save/unsave, view details, duplicate-apply guard.
// Refreshes JobsContext after apply or save so sidebar badge counts update instantly.

'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { formatDistanceToNow } from 'date-fns'
import type { JobPost } from '@/lib/types'
import { isJobSaved, toggleSaveJob } from '@/services/savedJobService'
import { hasApplied, applyToJob } from '@/services/hiringService'
import { useAuth } from '@/hooks/useAuth'
import { useJobs } from '@/lib/jobs-context'
import clsx from 'clsx'
import toast from 'react-hot-toast'

const WORK_TYPE_LABELS: Record<string, string> = {
  remote: 'Remote',
  onsite: 'On-Site',
  hybrid: 'Hybrid',
}

const WORK_TYPE_COLORS: Record<string, string> = {
  remote: 'text-khoj-teal border-khoj-teal/30 bg-khoj-teal/8',
  onsite: 'text-blue-400 border-blue-400/30 bg-blue-500/8',
  hybrid: 'text-purple-400 border-purple-400/30 bg-purple-500/8',
}

const EXPERIENCE_LABELS: Record<string, string> = {
  intern: 'Internship',
  entry: 'Entry Level',
  mid: 'Mid Level',
  senior: 'Senior',
  lead: 'Lead',
  executive: 'Executive',
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

interface HiringJobCardProps {
  job: JobPost
  /** Show recruiter management actions instead of apply button */
  recruiterView?: boolean
  /** Is deadline past */
  expired?: boolean
}

export function HiringJobCard({ job, recruiterView = false, expired = false }: HiringJobCardProps) {
  const { khojUser } = useAuth()
  const { refresh } = useJobs()

  const [saved, setSaved] = useState(false)
  const [applied, setApplied] = useState(false)
  const [applying, setApplying] = useState(false)

  // Sync initial saved/applied state from localStorage
  useEffect(() => {
    if (!khojUser) return
    setSaved(isJobSaved(job.id, khojUser.uid))
    setApplied(hasApplied(job.id, khojUser.uid))
  }, [job.id, khojUser])

  // ── Save / Unsave ─────────────────────────────────────────────────────────
  function handleToggleSave(e: React.MouseEvent) {
    e.preventDefault()
    if (!khojUser) { toast.error('Sign in to save jobs'); return }
    const nowSaved = toggleSaveJob(job, khojUser.uid)
    setSaved(nowSaved)
    toast.success(nowSaved ? 'Job saved!' : 'Removed from saved')
    refresh() // update sidebar badge instantly
  }

  // ── Quick Apply ───────────────────────────────────────────────────────────
  async function handleQuickApply(e: React.MouseEvent) {
    e.preventDefault()
    if (!khojUser) { toast.error('Sign in to apply'); return }
    if (applied) { toast('You already applied to this job'); return }
    if (expired) { toast.error('This position is closed'); return }
    setApplying(true)
    try {
      applyToJob({ job, applicantId: khojUser.uid, applicantName: khojUser.name })
      setApplied(true)
      toast.success('Application submitted!')
      refresh() // update sidebar badge instantly
    } catch {
      toast.error('Failed to apply. Please try again.')
    } finally {
      setApplying(false)
    }
  }

  const daysUntilDeadline = Math.ceil(
    (new Date(job.deadline).getTime() - Date.now()) / (1000 * 60 * 60 * 24)
  )
  const isUrgent = daysUntilDeadline <= 7 && daysUntilDeadline > 0
  const salaryDisplay =
    job.salaryMin && job.salaryMax
      ? `${(job.salaryMin / 1000).toFixed(0)}k – ${(job.salaryMax / 1000).toFixed(0)}k ${job.salaryCurrency}`
      : null

  return (
    <div
      className={clsx(
        'group flex flex-col gap-4 bg-khoj-card border rounded-sm p-5 transition-all duration-200',
        'hover:border-khoj-accent/40 hover:shadow-[0_0_28px_rgba(255,77,0,0.07)]',
        expired ? 'border-khoj-border opacity-60' : 'border-khoj-border'
      )}
    >
      {/* ── Header ── */}
      <div className="flex items-start justify-between gap-3">
        {/* Company icon */}
        <div className="flex items-center gap-3 flex-1 min-w-0">
          <div className="w-10 h-10 rounded-sm bg-khoj-bg border border-khoj-border flex items-center justify-center text-lg flex-shrink-0">
            {CATEGORY_ICONS[job.category] ?? '◇'}
          </div>
          <div className="min-w-0">
            <h3 className="text-sm font-display font-bold text-khoj-text truncate group-hover:text-khoj-accent transition-colors">
              {job.title}
            </h3>
            <p className="text-[11px] font-body text-khoj-accent truncate">{job.company}</p>
          </div>
        </div>

        {/* Work type badge */}
        <span
          className={clsx(
            'flex-shrink-0 text-[9px] uppercase tracking-widest font-body px-2 py-1 rounded-sm border',
            WORK_TYPE_COLORS[job.workType]
          )}
        >
          {WORK_TYPE_LABELS[job.workType]}
        </span>
      </div>

      {/* ── Meta row ── */}
      <div className="flex flex-wrap gap-3 text-[10px] text-khoj-subtle font-body">
        <span className="flex items-center gap-1">
          <span className="text-khoj-muted">📍</span> {job.location}
        </span>
        {salaryDisplay && (
          <span className="flex items-center gap-1">
            <span className="text-khoj-muted">💰</span> {salaryDisplay}
          </span>
        )}
        <span className="flex items-center gap-1">
          <span className="text-khoj-muted">◈</span> {EXPERIENCE_LABELS[job.experienceLevel]}
        </span>
        {recruiterView && (
          <span className="flex items-center gap-1 text-khoj-gold">
            <span>◉</span> {job.applicationCount} applicant{job.applicationCount !== 1 ? 's' : ''}
          </span>
        )}
      </div>

      {/* ── Description ── */}
      <p className="text-xs text-khoj-subtle font-body leading-relaxed line-clamp-2">
        {job.description}
      </p>

      {/* ── Skills ── */}
      <div className="flex flex-wrap gap-1.5">
        {job.requiredSkills.slice(0, 5).map((skill) => (
          <span
            key={skill}
            className="text-[9px] font-mono px-2 py-0.5 bg-khoj-bg border border-khoj-border text-khoj-subtle rounded-sm"
          >
            {skill}
          </span>
        ))}
        {job.requiredSkills.length > 5 && (
          <span className="text-[9px] font-mono px-2 py-0.5 text-khoj-muted">
            +{job.requiredSkills.length - 5} more
          </span>
        )}
      </div>

      {/* ── Footer ── */}
      <div className="flex items-center justify-between gap-2 mt-auto pt-1 border-t border-khoj-border/50">
        {/* Deadline / posted */}
        <div className="flex flex-col gap-0.5">
          {expired ? (
            <span className="text-[9px] font-body text-red-400 uppercase tracking-widest">Closed</span>
          ) : isUrgent ? (
            <span className="text-[9px] font-body text-khoj-accent uppercase tracking-widest animate-pulse">
              {daysUntilDeadline}d left
            </span>
          ) : (
            <span className="text-[9px] font-body text-khoj-muted">
              Closes {new Date(job.deadline).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
            </span>
          )}
          <span className="text-[9px] font-body text-khoj-muted">
            Posted {formatDistanceToNow(new Date(job.createdAt), { addSuffix: true })}
          </span>
        </div>

        {/* Action buttons */}
        {recruiterView ? (
          <div className="flex items-center gap-2">
            <Link
              href={`/recruiter/jobs/${job.id}/applicants`}
              className="text-[10px] font-body font-semibold text-khoj-text border border-khoj-border px-3 py-1.5 rounded-sm hover:border-khoj-accent/40 hover:text-khoj-accent transition-colors"
            >
              Applicants →
            </Link>
          </div>
        ) : (
          <div className="flex items-center gap-2">
            {/* Save toggle */}
            {!expired && (
              <button
                type="button"
                onClick={handleToggleSave}
                title={saved ? 'Remove from saved' : 'Save job'}
                className={clsx(
                  'text-sm border px-2.5 py-1.5 rounded-sm transition-colors flex-shrink-0',
                  saved
                    ? 'text-khoj-gold border-khoj-gold/40 bg-khoj-gold/8 hover:bg-khoj-gold/15'
                    : 'text-khoj-muted border-khoj-border hover:text-khoj-gold hover:border-khoj-gold/40'
                )}
              >
                {saved ? '★' : '☆'}
              </button>
            )}

            {/* Apply state */}
            {expired ? (
              <span className="text-[10px] font-body text-khoj-muted border border-khoj-border px-3 py-1.5 rounded-sm">
                Closed
              </span>
            ) : applied ? (
              <Link
                href="/dashboard/applications"
                className="text-[10px] font-body font-semibold text-khoj-teal border border-khoj-teal/30 bg-khoj-teal/8 px-3 py-1.5 rounded-sm hover:bg-khoj-teal/15 transition-colors flex-shrink-0"
              >
                ✓ Applied
              </Link>
            ) : (
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={handleQuickApply}
                  disabled={applying}
                  className={clsx(
                    'text-[10px] font-body font-semibold px-3 py-1.5 rounded-sm transition-colors flex-shrink-0',
                    applying
                      ? 'bg-khoj-accent/50 text-white cursor-not-allowed'
                      : 'bg-khoj-accent text-white hover:bg-khoj-accent/90'
                  )}
                >
                  {applying ? '…' : 'Quick Apply'}
                </button>
                <Link
                  href={`/jobs/${job.id}`}
                  className="text-[10px] font-body text-khoj-subtle border border-khoj-border px-2.5 py-1.5 rounded-sm hover:border-khoj-accent/40 hover:text-khoj-accent transition-colors flex-shrink-0"
                >
                  Details
                </Link>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
