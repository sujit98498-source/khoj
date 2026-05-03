// app/jobs/[jobId]/page.tsx
// Job detail page — full description, requirements, and apply form.
// Users can apply using their KHOJ profile as a resume + optional cover message.

'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { AppShell } from '@/components/layout/AppShell'
import { PageLoader } from '@/components/ui/LoadingSpinner'
import { ApplicationStatusBadge } from '@/components/jobs/ApplicationStatusBadge'
import { useAuth } from '@/hooks/useAuth'
import {
  getJobPost,
  applyToJob,
  hasApplied,
  getInvitesByRecipient,
} from '@/services/hiringService'
import { isJobSaved, toggleSaveJob } from '@/services/savedJobService'
import { getFullPortfolioData } from '@/services/portfolioService'
import { useJobs } from '@/lib/jobs-context'
import type { JobPost, JobApplication, JobInvite } from '@/lib/types'
import { formatDistanceToNow } from 'date-fns'
import toast from 'react-hot-toast'
import clsx from 'clsx'

const EXPERIENCE_LABELS: Record<string, string> = {
  intern: 'Internship',
  entry: 'Entry Level',
  mid: 'Mid Level',
  senior: 'Senior',
  lead: 'Lead / Staff',
  executive: 'Director / Executive',
}

const WORK_TYPE_LABELS: Record<string, string> = {
  remote: 'Remote',
  onsite: 'On-Site',
  hybrid: 'Hybrid',
}

export default function JobDetailPage() {
  const params = useParams()
  const router = useRouter()
  const { khojUser, loading: authLoading } = useAuth()
  const { refresh } = useJobs()

  const jobId =
    typeof params.jobId === 'string'
      ? params.jobId
      : Array.isArray(params.jobId)
      ? params.jobId[0]
      : ''

  const [job, setJob] = useState<JobPost | null>(null)
  const [notFound, setNotFound] = useState(false)
  const [applied, setApplied] = useState(false)
  const [application, setApplication] = useState<JobApplication | null>(null)
  const [invite, setInvite] = useState<JobInvite | null>(null)
  const [message, setMessage] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [showApplyForm, setShowApplyForm] = useState(false)
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    const found = getJobPost(jobId)
    if (!found) { setNotFound(true); return }
    setJob(found)
  }, [jobId])

  useEffect(() => {
    if (!khojUser || !jobId) return
    const alreadyApplied = hasApplied(jobId, khojUser.uid)
    setApplied(alreadyApplied)
    setSaved(isJobSaved(jobId, khojUser.uid))
    // Check for invite
    const myInvites = getInvitesByRecipient(khojUser.uid)
    const matchingInvite = myInvites.find((i) => i.jobId === jobId)
    if (matchingInvite) setInvite(matchingInvite)
  }, [khojUser, jobId])

  function handleToggleSave() {
    if (!khojUser || !job) return
    const nowSaved = toggleSaveJob(job, khojUser.uid)
    setSaved(nowSaved)
    toast.success(nowSaved ? 'Job saved to your list!' : 'Removed from saved')
    refresh()
  }

  async function handleApply() {
    if (!khojUser || !job) return
    setSubmitting(true)
    try {
      // Load portfolio data for richer applicant info
      const portfolio = await getFullPortfolioData(khojUser.uid).catch(() => null)
      const newApp = applyToJob({
        job,
        applicantId: khojUser.uid,
        applicantName: khojUser.name,
        applicantUsername: portfolio?.user.username,
        applicantAvatarUrl: portfolio?.user.avatarUrl,
        message: message.trim() || undefined,
        inviteId: invite?.id,
      })
      setApplication(newApp)
      setApplied(true)
      setShowApplyForm(false)
      toast.success('Application submitted!')
      refresh()
    } finally {
      setSubmitting(false)
    }
  }

  if (authLoading || (!job && !notFound)) return <PageLoader />

  if (notFound || !job) {
    return (
      <AppShell>
        <div className="flex flex-col items-center justify-center py-32 gap-4">
          <span className="text-4xl text-khoj-muted">◈</span>
          <p className="text-sm font-body text-khoj-subtle">Job not found or has been removed.</p>
          <Link href="/jobs" className="text-xs font-body text-khoj-accent hover:underline">
            ← Back to Job Board
          </Link>
        </div>
      </AppShell>
    )
  }

  // Soft-deleted job — show a clean "no longer available" banner
  if (job.deleted) {
    return (
      <AppShell>
        <div className="max-w-lg mx-auto flex flex-col items-center justify-center py-32 gap-5 text-center">
          <div className="w-12 h-12 rounded-sm bg-red-500/10 border border-red-500/20 flex items-center justify-center">
            <span className="text-red-400 text-xl">✕</span>
          </div>
          <div>
            <h1 className="text-lg font-display font-bold text-khoj-text">{job.title}</h1>
            <p className="text-sm font-body text-khoj-accent mt-0.5">{job.company}</p>
          </div>
          <p className="text-sm font-body text-khoj-subtle leading-relaxed">
            This position is no longer accepting applications. It may have been
            filled or removed by the recruiter.
          </p>
          <Link
            href="/jobs"
            className="text-xs font-body text-khoj-accent border border-khoj-accent/30 px-4 py-2 rounded-sm hover:bg-khoj-accent/10 transition-colors"
          >
            Browse Open Positions →
          </Link>
        </div>
      </AppShell>
    )
  }

  const isExpired = new Date(job.deadline) < new Date()
  const daysLeft = Math.ceil((new Date(job.deadline).getTime() - Date.now()) / (1000 * 60 * 60 * 24))
  const salaryDisplay =
    job.salaryMin && job.salaryMax
      ? `${(job.salaryMin / 1000).toFixed(0)}k – ${(job.salaryMax / 1000).toFixed(0)}k ${job.salaryCurrency}`
      : null

  return (
    <AppShell>
      <div className="max-w-4xl mx-auto">
        {/* ── Breadcrumb ── */}
        <Link
          href="/jobs"
          className="text-[10px] uppercase tracking-widest font-body text-khoj-muted hover:text-khoj-accent transition-colors mb-6 flex items-center gap-1"
        >
          ← Job Board
        </Link>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* ── Main content ── */}
          <div className="lg:col-span-2 space-y-6">
            {/* Header */}
            <div className="bg-khoj-card border border-khoj-border rounded-sm p-6">
              <div className="flex items-start justify-between gap-4 mb-4">
                <div>
                  <h1 className="text-xl font-display font-bold text-khoj-text">{job.title}</h1>
                  <p className="text-sm font-body text-khoj-accent mt-1">{job.company}</p>
                </div>
                {isExpired ? (
                  <span className="text-[9px] font-body text-red-400 border border-red-400/30 px-2 py-1 rounded-sm uppercase tracking-widest">
                    Closed
                  </span>
                ) : (
                  <span className="text-[9px] font-body text-khoj-teal border border-khoj-teal/30 px-2 py-1 rounded-sm uppercase tracking-widest">
                    Open
                  </span>
                )}
              </div>

              {/* Invite banner */}
              {invite && (
                <div className="mb-4 p-3 bg-khoj-gold/8 border border-khoj-gold/25 rounded-sm flex items-start gap-2">
                  <span className="text-khoj-gold text-sm">★</span>
                  <div>
                    <p className="text-[10px] font-body font-semibold text-khoj-gold uppercase tracking-widest">
                      You've been invited by {invite.recruiterName}
                    </p>
                    {invite.message && (
                      <p className="text-xs font-body text-khoj-subtle mt-1 italic">
                        "{invite.message}"
                      </p>
                    )}
                  </div>
                </div>
              )}

              {/* Quick meta */}
              <div className="flex flex-wrap gap-3 text-[10px] font-body text-khoj-subtle">
                <span className="flex items-center gap-1">📍 {job.location}</span>
                <span className="flex items-center gap-1">◈ {WORK_TYPE_LABELS[job.workType]}</span>
                <span className="flex items-center gap-1">▲ {EXPERIENCE_LABELS[job.experienceLevel]}</span>
                {salaryDisplay && <span className="flex items-center gap-1">💰 {salaryDisplay}</span>}
                <span className="flex items-center gap-1">
                  ⬡ {job.applicationCount} applicant{job.applicationCount !== 1 ? 's' : ''}
                </span>
              </div>
            </div>

            {/* Description */}
            <div className="bg-khoj-card border border-khoj-border rounded-sm p-6">
              <h2 className="text-[10px] uppercase tracking-widest font-body text-khoj-subtle mb-4">
                About the Role
              </h2>
              <p className="text-sm font-body text-khoj-text leading-relaxed whitespace-pre-line">
                {job.description}
              </p>
            </div>

            {/* Skills */}
            <div className="bg-khoj-card border border-khoj-border rounded-sm p-6">
              <h2 className="text-[10px] uppercase tracking-widest font-body text-khoj-subtle mb-4">
                Required Skills
              </h2>
              <div className="flex flex-wrap gap-2">
                {job.requiredSkills.map((skill) => (
                  <span
                    key={skill}
                    className="text-xs font-mono px-2.5 py-1 bg-khoj-bg border border-khoj-border text-khoj-subtle rounded-sm"
                  >
                    {skill}
                  </span>
                ))}
              </div>
            </div>

            {/* Apply form */}
            {showApplyForm && !applied && !isExpired && (
              <div className="bg-khoj-card border border-khoj-accent/30 rounded-sm p-6">
                <h2 className="text-[10px] uppercase tracking-widest font-body text-khoj-subtle mb-4">
                  Your Application
                </h2>
                <p className="text-xs font-body text-khoj-subtle mb-4">
                  Your KHOJ profile will be shared as your resume. Add a cover message below.
                </p>
                <textarea
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  rows={4}
                  maxLength={500}
                  placeholder={`Tell ${job.company} why you're a great fit…`}
                  className="w-full bg-khoj-bg border border-khoj-border rounded-sm px-3 py-2.5 text-sm font-body text-khoj-text placeholder:text-khoj-muted focus:outline-none focus:border-khoj-accent/60 focus:ring-1 focus:ring-khoj-accent/20 resize-none transition-colors"
                />
                <p className="text-[9px] text-khoj-muted mt-1 text-right mb-4">
                  {message.length}/500
                </p>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={handleApply}
                    disabled={submitting}
                    className="flex-1 py-2.5 bg-khoj-accent text-white text-xs font-body font-semibold rounded-sm hover:bg-khoj-accent/90 transition-colors disabled:opacity-50"
                  >
                    {submitting ? 'Submitting…' : 'Submit Application'}
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowApplyForm(false)}
                    className="py-2.5 px-4 text-xs font-body text-khoj-subtle border border-khoj-border rounded-sm hover:text-khoj-text hover:border-khoj-accent/30 transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* ── Sidebar ── */}
          <div className="space-y-4">
            {/* Apply CTA */}
            <div className="bg-khoj-card border border-khoj-border rounded-sm p-5">
              {applied ? (
                <div className="flex flex-col gap-3">
                  <ApplicationStatusBadge stage="applied" size="md" />
                  <p className="text-xs font-body text-khoj-subtle">
                    Application submitted. Check your status in{' '}
                    <Link href="/dashboard/applications" className="text-khoj-accent hover:underline">
                      My Applications
                    </Link>
                    .
                  </p>
                </div>
              ) : isExpired ? (
                <p className="text-xs font-body text-khoj-muted text-center">
                  This job posting has closed.
                </p>
              ) : !khojUser ? (
                <div className="space-y-3">
                  <p className="text-xs font-body text-khoj-subtle text-center">
                    Sign in to apply with your KHOJ profile.
                  </p>
                  <Link
                    href="/auth/login"
                    className="block w-full text-center py-2.5 bg-khoj-accent text-white text-xs font-body font-semibold rounded-sm hover:bg-khoj-accent/90 transition-colors"
                  >
                    Sign In to Apply
                  </Link>
                </div>
              ) : (
                <div className="space-y-3">
                  {invite && (
                    <p className="text-[9px] font-body text-khoj-gold text-center uppercase tracking-widest">
                      ★ Invited
                    </p>
                  )}
                  <button
                    type="button"
                    onClick={() => setShowApplyForm(true)}
                    className={clsx(
                      'w-full py-2.5 text-xs font-body font-semibold rounded-sm transition-colors',
                      showApplyForm
                        ? 'bg-khoj-bg border border-khoj-border text-khoj-subtle'
                        : 'bg-khoj-accent text-white hover:bg-khoj-accent/90'
                    )}
                  >
                    {showApplyForm ? 'Application open ↓' : 'Apply with KHOJ Profile'}
                  </button>
                  <p className="text-[9px] font-body text-khoj-muted text-center">
                    Your profile is shared as your resume
                  </p>
                </div>
              )}
            </div>

            {/* Save job button (non-expired, logged-in users only) */}
            {khojUser && !isExpired && (
              <button
                type="button"
                onClick={handleToggleSave}
                className={clsx(
                  'w-full py-2.5 text-xs font-body border rounded-sm transition-colors flex items-center justify-center gap-2',
                  saved
                    ? 'text-khoj-gold border-khoj-gold/40 bg-khoj-gold/5 hover:bg-khoj-gold/10'
                    : 'text-khoj-subtle border-khoj-border hover:text-khoj-gold hover:border-khoj-gold/40'
                )}
              >
                <span>{saved ? '★' : '☆'}</span>
                {saved ? 'Saved — click to remove' : 'Save for later'}
              </button>
            )}

            {/* Job meta card */}
            <div className="bg-khoj-card border border-khoj-border rounded-sm p-5 space-y-3">
              <h3 className="text-[9px] uppercase tracking-widest font-body text-khoj-muted">
                Details
              </h3>
              {[
                { label: 'Category', value: job.category },
                { label: 'Experience', value: EXPERIENCE_LABELS[job.experienceLevel] },
                { label: 'Work Type', value: WORK_TYPE_LABELS[job.workType] },
                { label: 'Location', value: job.location },
                ...(salaryDisplay ? [{ label: 'Salary', value: salaryDisplay }] : []),
                {
                  label: 'Deadline',
                  value: isExpired
                    ? 'Closed'
                    : daysLeft <= 7
                    ? `${daysLeft} day${daysLeft !== 1 ? 's' : ''} left`
                    : new Date(job.deadline).toLocaleDateString('en-US', {
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric',
                      }),
                },
                {
                  label: 'Posted',
                  value: formatDistanceToNow(new Date(job.createdAt), { addSuffix: true }),
                },
              ].map(({ label, value }) => (
                <div key={label} className="flex items-center justify-between gap-2">
                  <span className="text-[9px] font-body text-khoj-muted uppercase tracking-wider">
                    {label}
                  </span>
                  <span
                    className={clsx(
                      'text-[10px] font-body font-medium',
                      label === 'Deadline' && isExpired
                        ? 'text-red-400'
                        : label === 'Deadline' && daysLeft <= 7
                        ? 'text-khoj-accent'
                        : 'text-khoj-text'
                    )}
                  >
                    {value}
                  </span>
                </div>
              ))}
            </div>

            {/* Posted by */}
            <div className="bg-khoj-card border border-khoj-border rounded-sm p-5">
              <p className="text-[9px] uppercase tracking-widest font-body text-khoj-muted mb-2">
                Posted By
              </p>
              <p className="text-xs font-body font-semibold text-khoj-text">{job.recruiterName}</p>
              <p className="text-[10px] font-body text-khoj-accent">{job.company}</p>
            </div>
          </div>
        </div>
      </div>
    </AppShell>
  )
}
