// components/interviews/InterviewCard.tsx
// Displays a single interview with context-sensitive action buttons.
// viewMode='recruiter' → shows candidate info + Complete / Cancel actions
// viewMode='candidate' → shows recruiter info + Accept / Decline / Reschedule actions

'use client'

import { useState } from 'react'
import Link from 'next/link'
import type { InterviewSchedule, InterviewStatus } from '@/lib/types'
import { InterviewStatusBadge } from './InterviewStatusBadge'
import { RescheduleModal } from './RescheduleModal'
import { updateInterviewStatus } from '@/services/interviewService'
import { format, parseISO } from 'date-fns'
import clsx from 'clsx'
import toast from 'react-hot-toast'

// ── Meeting type icon + label ──────────────────────────────────────────────────

const MEETING_META: Record<
  InterviewSchedule['meetingType'],
  { icon: string; label: string }
> = {
  online: { icon: '◈', label: 'Online' },
  phone:  { icon: '◷', label: 'Phone' },
  onsite: { icon: '◉', label: 'On-site' },
}

// ── Avatar helper ─────────────────────────────────────────────────────────────

const AVATAR_COLORS = ['#FF4D00', '#FFB800', '#00D4AA', '#6366f1', '#ec4899']
function avatarColor(name: string) {
  return AVATAR_COLORS[name.charCodeAt(0) % AVATAR_COLORS.length]
}

// ── Props ──────────────────────────────────────────────────────────────────────

interface InterviewCardProps {
  interview: InterviewSchedule
  viewMode: 'recruiter' | 'candidate'
  onStatusChange?: (updated: InterviewSchedule) => void
}

// ── Component ─────────────────────────────────────────────────────────────────

export function InterviewCard({
  interview,
  viewMode,
  onStatusChange,
}: InterviewCardProps) {
  const [current, setCurrent] = useState(interview)
  const [showReschedule, setShowReschedule] = useState(false)

  const otherName =
    viewMode === 'recruiter' ? current.candidateName : current.recruiterName
  const otherColor = avatarColor(otherName)

  function handleStatus(status: InterviewStatus, note?: string) {
    const updated = updateInterviewStatus(current.id, status, note)
    if (!updated) return
    setCurrent(updated)
    onStatusChange?.(updated)
    const labels: Record<InterviewStatus, string> = {
      accepted: 'Interview accepted',
      declined: 'Interview declined',
      reschedule_requested: 'Reschedule requested',
      completed: 'Marked as completed',
      cancelled: 'Interview cancelled',
      scheduled: 'Interview rescheduled',
    }
    toast.success(labels[status])
  }

  // Format display date
  let displayDate = current.date
  try {
    displayDate = format(parseISO(current.date), 'EEE, MMM d, yyyy')
  } catch {
    // keep raw
  }

  // Convert HH:MM to 12-hour display
  function format12h(time: string) {
    const [h, m] = time.split(':').map(Number)
    const ampm = h >= 12 ? 'PM' : 'AM'
    const hour = h % 12 || 12
    return `${hour}:${m.toString().padStart(2, '0')} ${ampm}`
  }

  const meetMeta = MEETING_META[current.meetingType]
  const isActionable = current.status !== 'completed' && current.status !== 'cancelled'

  return (
    <>
      <div
        className={clsx(
          'bg-khoj-card border rounded-sm p-4 transition-colors hover:border-khoj-accent/30',
          current.status === 'cancelled' || current.status === 'declined'
            ? 'border-khoj-border opacity-60'
            : 'border-khoj-border'
        )}
      >
        {/* ── Header row ────────────────────────────────────────────────────── */}
        <div className="flex items-start justify-between gap-3 mb-3">
          <div className="flex-1 min-w-0">
            <p className="text-sm font-display font-bold text-khoj-text truncate">
              {current.title}
            </p>
            <p className="text-[11px] font-body text-khoj-muted mt-0.5 truncate">
              {current.jobTitle}
            </p>
          </div>
          <InterviewStatusBadge status={current.status} size="xs" />
        </div>

        {/* ── Person row ────────────────────────────────────────────────────── */}
        <div className="flex items-center gap-2 mb-3">
          {viewMode === 'recruiter' && current.candidateAvatarUrl ? (
            <img
              src={current.candidateAvatarUrl}
              alt={current.candidateName}
              className="w-7 h-7 rounded-sm object-cover flex-shrink-0"
            />
          ) : (
            <div
              className="w-7 h-7 rounded-sm flex items-center justify-center text-[10px] font-display font-bold flex-shrink-0"
              style={{
                backgroundColor: `${otherColor}18`,
                color: otherColor,
                border: `1px solid ${otherColor}40`,
              }}
            >
              {otherName.charAt(0).toUpperCase()}
            </div>
          )}
          <div>
            <p className="text-xs font-body font-semibold text-khoj-text">{otherName}</p>
            {viewMode === 'recruiter' && current.candidateUsername && (
              <p className="text-[9px] font-mono text-khoj-muted">
                @{current.candidateUsername}
              </p>
            )}
          </div>
          {viewMode === 'recruiter' && (
            <Link
              href={`/profile/${current.candidateId}`}
              className="ml-auto text-[9px] font-body text-khoj-subtle border border-khoj-border px-2 py-0.5 rounded-sm hover:text-khoj-accent hover:border-khoj-accent/30 transition-colors flex-shrink-0"
            >
              Profile →
            </Link>
          )}
        </div>

        {/* ── Date / time / timezone ────────────────────────────────────────── */}
        <div className="flex flex-wrap gap-x-4 gap-y-1 mb-3">
          <span className="text-[11px] font-body text-khoj-subtle flex items-center gap-1">
            <span className="text-khoj-accent">◆</span>
            {displayDate}
          </span>
          <span className="text-[11px] font-body text-khoj-subtle flex items-center gap-1">
            <span className="text-khoj-teal">◷</span>
            {format12h(current.time)} · {current.timezone}
          </span>
        </div>

        {/* ── Meeting type + link ───────────────────────────────────────────── */}
        <div className="flex items-center gap-3 mb-3">
          <span className="text-[11px] font-body text-khoj-subtle flex items-center gap-1">
            <span className="text-khoj-gold">{meetMeta.icon}</span>
            {meetMeta.label}
          </span>
          {current.meetingType !== 'onsite' && current.meetingLink && (
            <a
              href={current.meetingLink}
              target="_blank"
              rel="noopener noreferrer"
              className="text-[11px] font-body text-khoj-accent hover:underline truncate max-w-[200px]"
            >
              {current.meetingLink}
            </a>
          )}
          {current.meetingType === 'onsite' && current.location && (
            <span className="text-[11px] font-body text-khoj-subtle truncate max-w-[200px]">
              {current.location}
            </span>
          )}
        </div>

        {/* ── Notes ────────────────────────────────────────────────────────── */}
        {current.notes && (
          <div className="border-l-2 border-khoj-border pl-3 mb-3">
            <p className="text-[10px] font-body text-khoj-subtle italic line-clamp-2">
              {current.notes}
            </p>
          </div>
        )}

        {/* ── Reschedule note from candidate ───────────────────────────────── */}
        {current.status === 'reschedule_requested' && current.rescheduleNote && (
          <div className="bg-khoj-gold/5 border border-khoj-gold/20 rounded-sm px-3 py-2 mb-3">
            <p className="text-[9px] uppercase tracking-widest font-body text-khoj-gold mb-1">
              Reschedule Note
            </p>
            <p className="text-[11px] font-body text-khoj-subtle">
              {current.rescheduleNote}
            </p>
          </div>
        )}

        {/* ── Action buttons ────────────────────────────────────────────────── */}
        {isActionable && (
          <div className="flex flex-wrap gap-2 mt-1 pt-3 border-t border-khoj-border/50">
            {viewMode === 'candidate' && current.status === 'scheduled' && (
              <>
                <button
                  type="button"
                  onClick={() => handleStatus('accepted')}
                  className="text-[10px] font-body font-semibold text-khoj-teal border border-khoj-teal/30 px-3 py-1.5 rounded-sm hover:bg-khoj-teal/10 transition-colors"
                >
                  ✓ Accept
                </button>
                <button
                  type="button"
                  onClick={() => handleStatus('declined')}
                  className="text-[10px] font-body text-red-400 border border-red-400/30 px-3 py-1.5 rounded-sm hover:bg-red-400/10 transition-colors"
                >
                  ✕ Decline
                </button>
                <button
                  type="button"
                  onClick={() => setShowReschedule(true)}
                  className="text-[10px] font-body text-khoj-gold border border-khoj-gold/30 px-3 py-1.5 rounded-sm hover:bg-khoj-gold/10 transition-colors"
                >
                  ↺ Request Reschedule
                </button>
              </>
            )}
            {viewMode === 'candidate' && current.status === 'accepted' && (
              <button
                type="button"
                onClick={() => setShowReschedule(true)}
                className="text-[10px] font-body text-khoj-gold border border-khoj-gold/30 px-3 py-1.5 rounded-sm hover:bg-khoj-gold/10 transition-colors"
              >
                ↺ Request Reschedule
              </button>
            )}
            {viewMode === 'recruiter' && (
              <>
                {current.status !== 'completed' && (
                  <button
                    type="button"
                    onClick={() => handleStatus('completed')}
                    className="text-[10px] font-body font-semibold text-khoj-accent border border-khoj-accent/30 px-3 py-1.5 rounded-sm hover:bg-khoj-accent/10 transition-colors"
                  >
                    ✓ Mark Complete
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => handleStatus('cancelled')}
                  className="text-[10px] font-body text-khoj-muted border border-khoj-border px-3 py-1.5 rounded-sm hover:text-khoj-text hover:border-khoj-accent/30 transition-colors"
                >
                  ✕ Cancel
                </button>
              </>
            )}
          </div>
        )}
      </div>

      {/* Reschedule modal */}
      {showReschedule && (
        <RescheduleModal
          interviewTitle={current.title}
          onSubmit={(note) => {
            handleStatus('reschedule_requested', note)
            setShowReschedule(false)
          }}
          onClose={() => setShowReschedule(false)}
        />
      )}
    </>
  )
}
