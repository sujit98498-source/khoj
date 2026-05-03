// components/recruiter/ApplicantTable.tsx
// Kanban-style applicant pipeline for a single job post.
// Columns: Applied → Shortlisted → Interview → Offered → Hired | Rejected
// Each card shows applicant info; drag-handle buttons move between stages.

'use client'

import { useState } from 'react'
import Link from 'next/link'
import type { JobApplication, ApplicationStage, InterviewSchedule } from '@/lib/types'
import { updateApplicationStage, updateApplicationNotes } from '@/services/hiringService'
import { ApplicationStatusBadge, STAGE_ORDER } from '@/components/jobs/ApplicationStatusBadge'
import { InterviewForm, type InterviewFormContext } from '@/components/interviews/InterviewForm'
import { formatDistanceToNow } from 'date-fns'
import clsx from 'clsx'
import toast from 'react-hot-toast'

// ── Column definitions ────────────────────────────────────────────────────────

const COLUMNS: { stage: ApplicationStage; label: string; accent: string }[] = [
  { stage: 'applied', label: 'Applied', accent: 'border-blue-500/30' },
  { stage: 'shortlisted', label: 'Shortlisted', accent: 'border-khoj-gold/30' },
  { stage: 'interview', label: 'Interview', accent: 'border-purple-500/30' },
  { stage: 'offered', label: 'Offered', accent: 'border-khoj-teal/30' },
  { stage: 'hired', label: 'Hired', accent: 'border-khoj-accent/30' },
  { stage: 'rejected', label: 'Rejected', accent: 'border-red-500/30' },
]

// ── Applicant card ────────────────────────────────────────────────────────────

const AVATAR_COLORS = ['#FF4D00', '#FFB800', '#00D4AA', '#6366f1', '#ec4899']
function avatarColor(name: string) {
  return AVATAR_COLORS[name.charCodeAt(0) % AVATAR_COLORS.length]
}

interface ApplicantCardProps {
  app: JobApplication
  onStageChange: (appId: string, newStage: ApplicationStage) => void
  onScheduleInterview: (app: JobApplication) => void
}

function ApplicantCard({ app, onStageChange, onScheduleInterview }: ApplicantCardProps) {
  const [showNotes, setShowNotes] = useState(false)
  const [notes, setNotes] = useState(app.recruiterNotes ?? '')
  const color = avatarColor(app.applicantName)

  const currentIdx = STAGE_ORDER.indexOf(app.stage)
  const prevStage = currentIdx > 0 ? STAGE_ORDER[currentIdx - 1] : null
  const nextStage = currentIdx < STAGE_ORDER.length - 1 ? STAGE_ORDER[currentIdx + 1] : null

  function saveNotes() {
    updateApplicationNotes(app.id, notes)
    toast.success('Notes saved')
    setShowNotes(false)
  }

  return (
    <div className="bg-khoj-bg border border-khoj-border rounded-sm p-3 hover:border-khoj-accent/30 transition-colors group">
      {/* Applicant header */}
      <div className="flex items-center gap-2 mb-2">
        <div
          className="w-7 h-7 rounded-sm flex items-center justify-center text-[10px] font-display font-bold flex-shrink-0"
          style={{ backgroundColor: `${color}18`, color, border: `1px solid ${color}40` }}
        >
          {app.applicantAvatarUrl ? (
            <img
              src={app.applicantAvatarUrl}
              alt={app.applicantName}
              className="w-full h-full object-cover rounded-sm"
            />
          ) : (
            app.applicantName.charAt(0).toUpperCase()
          )}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-xs font-body font-semibold text-khoj-text truncate">
            {app.applicantName}
          </p>
          {app.applicantUsername && (
            <p className="text-[9px] font-mono text-khoj-muted">@{app.applicantUsername}</p>
          )}
        </div>
        {app.inviteId && (
          <span className="text-[8px] font-body border border-khoj-gold/30 text-khoj-gold px-1.5 py-0.5 rounded-sm flex-shrink-0">
            Invited
          </span>
        )}
      </div>

      {/* Applied time */}
      <p className="text-[9px] text-khoj-muted font-body mb-2">
        Applied {formatDistanceToNow(new Date(app.appliedAt), { addSuffix: true })}
      </p>

      {/* Message preview */}
      {app.message && (
        <p className="text-[10px] text-khoj-subtle font-body italic border-l-2 border-khoj-border pl-2 mb-2 line-clamp-2">
          "{app.message}"
        </p>
      )}

      {/* Stage badge */}
      <div className="mb-3">
        <ApplicationStatusBadge stage={app.stage} size="xs" />
      </div>

      {/* Stage controls */}
      <div className="flex items-center gap-1.5">
        {prevStage && (
          <button
            type="button"
            onClick={() => onStageChange(app.id, prevStage)}
            className="text-[9px] font-body text-khoj-muted border border-khoj-border px-2 py-1 rounded-sm hover:text-khoj-text hover:border-khoj-accent/30 transition-colors flex-1"
          >
            ← Back
          </button>
        )}
        {nextStage && (
          <button
            type="button"
            onClick={() => onStageChange(app.id, nextStage)}
            className="text-[9px] font-body font-semibold text-khoj-accent border border-khoj-accent/30 px-2 py-1 rounded-sm hover:bg-khoj-accent/10 transition-colors flex-1"
          >
            Advance →
          </button>
        )}
        <Link
          href={`/profile/${app.applicantId}`}
          className="text-[9px] font-body text-khoj-subtle border border-khoj-border px-2 py-1 rounded-sm hover:text-khoj-accent hover:border-khoj-accent/30 transition-colors"
        >
          Profile
        </Link>
      </div>

      {/* Schedule interview — only shown on interview stage */}
      {app.stage === 'interview' && (
        <button
          type="button"
          onClick={() => onScheduleInterview(app)}
          className="mt-2 w-full text-[9px] font-body font-semibold text-purple-400 border border-purple-500/30 px-2 py-1.5 rounded-sm hover:bg-purple-500/10 transition-colors flex items-center justify-center gap-1"
        >
          <span>◷</span> Schedule Interview
        </button>
      )}

      {/* Notes toggle */}
      <button
        type="button"
        onClick={() => setShowNotes((s) => !s)}
        className="text-[9px] font-body text-khoj-muted hover:text-khoj-subtle mt-2 w-full text-left transition-colors"
      >
        {showNotes ? '▲ Hide notes' : '▼ ' + (app.recruiterNotes ? 'Edit notes' : 'Add notes')}
      </button>

      {showNotes && (
        <div className="mt-2 space-y-1.5">
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={2}
            placeholder="Private recruiter notes…"
            className="w-full text-[10px] font-body bg-khoj-card border border-khoj-border rounded-sm px-2 py-1.5 text-khoj-text placeholder:text-khoj-muted focus:outline-none focus:border-khoj-accent/60 resize-none"
          />
          <button
            type="button"
            onClick={saveNotes}
            className="text-[9px] font-body text-khoj-accent border border-khoj-accent/30 px-2 py-1 rounded-sm hover:bg-khoj-accent/10 transition-colors"
          >
            Save
          </button>
        </div>
      )}
    </div>
  )
}

// ── Main table ────────────────────────────────────────────────────────────────

interface ApplicantTableProps {
  initialApplications: JobApplication[]
  jobId?: string
  jobTitle?: string
  recruiterId?: string
  recruiterName?: string
}

export function ApplicantTable({
  initialApplications,
  jobId = '',
  jobTitle = '',
  recruiterId = '',
  recruiterName = '',
}: ApplicantTableProps) {
  const [apps, setApps] = useState<JobApplication[]>(initialApplications)
  const [interviewCtx, setInterviewCtx] = useState<InterviewFormContext | null>(null)

  function handleStageChange(appId: string, newStage: ApplicationStage) {
    const updated = updateApplicationStage(appId, newStage)
    if (!updated) return
    setApps((prev) => prev.map((a) => (a.id === appId ? updated : a)))
    toast.success(`Moved to ${newStage}`)
  }

  function handleScheduleInterview(app: JobApplication) {
    setInterviewCtx({
      jobId,
      jobTitle,
      applicationId: app.id,
      recruiterId,
      recruiterName,
      candidateId: app.applicantId,
      candidateName: app.applicantName,
      candidateUsername: app.applicantUsername,
      candidateAvatarUrl: app.applicantAvatarUrl,
    })
  }

  function handleInterviewSaved(_interview: InterviewSchedule) {
    setInterviewCtx(null)
    toast.success('Interview scheduled and candidate notified!')
  }

  if (interviewCtx) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
        <div className="w-full max-w-lg bg-khoj-card border border-khoj-border rounded-sm shadow-2xl">
          {/* Modal header */}
          <div className="flex items-center justify-between px-5 py-4 border-b border-khoj-border">
            <div>
              <h2 className="text-sm font-display font-bold text-khoj-text">Schedule Interview</h2>
              <p className="text-[10px] font-body text-khoj-muted mt-0.5">
                Candidate: {interviewCtx.candidateName}
              </p>
            </div>
            <button
              type="button"
              onClick={() => setInterviewCtx(null)}
              className="text-khoj-muted hover:text-khoj-text transition-colors text-lg leading-none"
            >
              ✕
            </button>
          </div>
          {/* Form */}
          <div className="p-5 max-h-[80vh] overflow-y-auto">
            <InterviewForm
              context={interviewCtx}
              onSave={handleInterviewSaved}
              onCancel={() => setInterviewCtx(null)}
            />
          </div>
        </div>
      </div>
    )
  }

  if (apps.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center gap-4">
        <span className="text-4xl text-khoj-muted">◈</span>
        <p className="text-sm font-body text-khoj-subtle">No applications yet.</p>
        <p className="text-xs font-body text-khoj-muted max-w-xs">
          Share your job post or invite talent from the{' '}
          <a href="/recruiter" className="text-khoj-accent hover:underline">Recruiter Dashboard</a>.
        </p>
      </div>
    )
  }

  return (
    <div className="overflow-x-auto pb-4">
      <div className="flex gap-4 min-w-max">
        {COLUMNS.map(({ stage, label, accent }) => {
          const columnApps = apps.filter((a) => a.stage === stage)
          return (
            <div key={stage} className="w-64 flex-shrink-0">
              {/* Column header */}
              <div
                className={clsx(
                  'flex items-center justify-between px-3 py-2 border-b-2 mb-3',
                  accent
                )}
              >
                <span className="text-[10px] uppercase tracking-widest font-body font-semibold text-khoj-subtle">
                  {label}
                </span>
                <span className="text-[10px] font-mono text-khoj-muted bg-khoj-bg border border-khoj-border px-1.5 py-0.5 rounded-sm">
                  {columnApps.length}
                </span>
              </div>

              {/* Cards */}
              <div className="space-y-2">
                {columnApps.map((app) => (
                  <ApplicantCard
                    key={app.id}
                    app={app}
                    onStageChange={handleStageChange}
                    onScheduleInterview={handleScheduleInterview}
                  />
                ))}
                {columnApps.length === 0 && (
                  <div className="text-center py-8 border border-dashed border-khoj-border/50 rounded-sm">
                    <p className="text-[9px] text-khoj-muted font-body">Empty</p>
                  </div>
                )}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
