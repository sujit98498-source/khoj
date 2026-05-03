// components/interviews/InterviewForm.tsx
// Fully-controlled form for scheduling an interview.
// Pre-fills candidate + job context from the linked application.
// Renders inside a modal overlay in the ApplicantTable flow.

'use client'

import { useState } from 'react'
import type { InterviewSchedule, MeetingType } from '@/lib/types'
import { scheduleInterview, type CreateInterviewParams } from '@/services/interviewService'
import clsx from 'clsx'
import toast from 'react-hot-toast'

// ── Timezone options ──────────────────────────────────────────────────────────

const TIMEZONES = [
  'UTC',
  'Asia/Kathmandu',
  'Asia/Kolkata',
  'Asia/Singapore',
  'Asia/Tokyo',
  'Asia/Dubai',
  'Asia/Bangkok',
  'Europe/London',
  'Europe/Paris',
  'Europe/Berlin',
  'America/New_York',
  'America/Chicago',
  'America/Los_Angeles',
  'America/Sao_Paulo',
  'Australia/Sydney',
  'Pacific/Auckland',
]

// ── Meeting type options ──────────────────────────────────────────────────────

const MEETING_TYPES: { value: MeetingType; label: string; icon: string }[] = [
  { value: 'online', label: 'Online', icon: '◈' },
  { value: 'phone', label: 'Phone', icon: '◷' },
  { value: 'onsite', label: 'On-site', icon: '◉' },
]

// ── Props ──────────────────────────────────────────────────────────────────────

export interface InterviewFormContext {
  jobId: string
  jobTitle: string
  applicationId: string
  recruiterId: string
  recruiterName: string
  candidateId: string
  candidateName: string
  candidateUsername?: string
  candidateAvatarUrl?: string
}

interface InterviewFormProps {
  context: InterviewFormContext
  onSave: (interview: InterviewSchedule) => void
  onCancel: () => void
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function todayString() {
  return new Date().toISOString().slice(0, 10)
}

// ── Component ─────────────────────────────────────────────────────────────────

export function InterviewForm({ context, onSave, onCancel }: InterviewFormProps) {
  const [title, setTitle] = useState(
    `Interview — ${context.candidateName} for ${context.jobTitle}`
  )
  const [date, setDate] = useState('')
  const [time, setTime] = useState('10:00')
  const [timezone, setTimezone] = useState('Asia/Kathmandu')
  const [meetingType, setMeetingType] = useState<MeetingType>('online')
  const [meetingLink, setMeetingLink] = useState('')
  const [location, setLocation] = useState('')
  const [notes, setNotes] = useState('')
  const [loading, setLoading] = useState(false)
  const [errors, setErrors] = useState<Record<string, string>>({})

  function validate(): boolean {
    const e: Record<string, string> = {}
    if (!title.trim()) e.title = 'Title is required'
    if (!date) e.date = 'Date is required'
    else if (date < todayString()) e.date = 'Date must be today or in the future'
    if (!time) e.time = 'Time is required'
    if (meetingType === 'online' && meetingLink && !/^https?:\/\//.test(meetingLink)) {
      e.meetingLink = 'Link must start with http:// or https://'
    }
    setErrors(e)
    return Object.keys(e).length === 0
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!validate()) return

    setLoading(true)
    try {
      const params: CreateInterviewParams = {
        ...context,
        title: title.trim(),
        date,
        time,
        timezone,
        meetingType,
        meetingLink: meetingType !== 'onsite' ? meetingLink.trim() : undefined,
        location: meetingType === 'onsite' ? location.trim() : undefined,
        notes: notes.trim() || undefined,
      }
      const created = scheduleInterview(params)
      toast.success('Interview scheduled!')
      onSave(created)
    } catch {
      toast.error('Failed to schedule interview')
    } finally {
      setLoading(false)
    }
  }

  const fieldClass = (err?: string) =>
    clsx(
      'w-full text-xs font-body bg-khoj-bg border rounded-sm px-3 py-2.5 text-khoj-text placeholder:text-khoj-muted focus:outline-none focus:border-khoj-accent/60 transition-colors',
      err ? 'border-red-500/60' : 'border-khoj-border'
    )

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {/* Context strip */}
      <div className="flex flex-wrap gap-2 p-3 bg-khoj-bg border border-khoj-border rounded-sm">
        <div className="flex flex-col">
          <span className="text-[9px] uppercase tracking-widest font-body text-khoj-muted">
            Candidate
          </span>
          <span className="text-xs font-body font-semibold text-khoj-text">
            {context.candidateName}
            {context.candidateUsername && (
              <span className="text-khoj-muted font-mono ml-1 text-[10px]">
                @{context.candidateUsername}
              </span>
            )}
          </span>
        </div>
        <div className="w-px bg-khoj-border hidden sm:block" />
        <div className="flex flex-col">
          <span className="text-[9px] uppercase tracking-widest font-body text-khoj-muted">
            Job
          </span>
          <span className="text-xs font-body font-semibold text-khoj-text">
            {context.jobTitle}
          </span>
        </div>
      </div>

      {/* Title */}
      <div>
        <label className="block text-[10px] uppercase tracking-widest font-body text-khoj-subtle mb-1.5">
          Interview Title <span className="text-khoj-accent">*</span>
        </label>
        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          maxLength={120}
          placeholder="e.g. Technical Interview Round 1"
          className={fieldClass(errors.title)}
        />
        {errors.title && (
          <p className="text-[10px] text-red-400 font-body mt-1">{errors.title}</p>
        )}
      </div>

      {/* Date + Time row */}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-[10px] uppercase tracking-widest font-body text-khoj-subtle mb-1.5">
            Date <span className="text-khoj-accent">*</span>
          </label>
          <input
            type="date"
            value={date}
            min={todayString()}
            onChange={(e) => setDate(e.target.value)}
            className={clsx(fieldClass(errors.date), 'dark:[color-scheme:dark]')}
          />
          {errors.date && (
            <p className="text-[10px] text-red-400 font-body mt-1">{errors.date}</p>
          )}
        </div>
        <div>
          <label className="block text-[10px] uppercase tracking-widest font-body text-khoj-subtle mb-1.5">
            Time <span className="text-khoj-accent">*</span>
          </label>
          <input
            type="time"
            value={time}
            onChange={(e) => setTime(e.target.value)}
            className={clsx(fieldClass(errors.time), 'dark:[color-scheme:dark]')}
          />
          {errors.time && (
            <p className="text-[10px] text-red-400 font-body mt-1">{errors.time}</p>
          )}
        </div>
      </div>

      {/* Timezone */}
      <div>
        <label className="block text-[10px] uppercase tracking-widest font-body text-khoj-subtle mb-1.5">
          Timezone
        </label>
        <select
          value={timezone}
          onChange={(e) => setTimezone(e.target.value)}
          className={clsx(fieldClass(), 'cursor-pointer')}
        >
          {TIMEZONES.map((tz) => (
            <option key={tz} value={tz}>
              {tz}
            </option>
          ))}
        </select>
      </div>

      {/* Meeting type */}
      <div>
        <label className="block text-[10px] uppercase tracking-widest font-body text-khoj-subtle mb-1.5">
          Meeting Type <span className="text-khoj-accent">*</span>
        </label>
        <div className="flex gap-2">
          {MEETING_TYPES.map(({ value, label, icon }) => (
            <button
              key={value}
              type="button"
              onClick={() => setMeetingType(value)}
              className={clsx(
                'flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-sm text-[11px] font-body border transition-colors',
                meetingType === value
                  ? 'bg-khoj-accent/10 text-khoj-accent border-khoj-accent/40 font-semibold'
                  : 'bg-khoj-bg border-khoj-border text-khoj-subtle hover:border-khoj-accent/30 hover:text-khoj-text'
              )}
            >
              <span>{icon}</span>
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Meeting link (online / phone) */}
      {meetingType !== 'onsite' && (
        <div>
          <label className="block text-[10px] uppercase tracking-widest font-body text-khoj-subtle mb-1.5">
            {meetingType === 'phone' ? 'Phone / Call Link' : 'Meeting Link'}
          </label>
          <input
            type="url"
            value={meetingLink}
            onChange={(e) => setMeetingLink(e.target.value)}
            placeholder={
              meetingType === 'phone'
                ? 'https://meet.google.com/...'
                : 'https://zoom.us/j/...'
            }
            className={fieldClass(errors.meetingLink)}
          />
          {errors.meetingLink && (
            <p className="text-[10px] text-red-400 font-body mt-1">{errors.meetingLink}</p>
          )}
        </div>
      )}

      {/* Location (onsite) */}
      {meetingType === 'onsite' && (
        <div>
          <label className="block text-[10px] uppercase tracking-widest font-body text-khoj-subtle mb-1.5">
            Location / Address
          </label>
          <input
            type="text"
            value={location}
            onChange={(e) => setLocation(e.target.value)}
            placeholder="e.g. Kathmandu Office, 3rd Floor, Durbarmarg"
            className={fieldClass()}
          />
        </div>
      )}

      {/* Notes */}
      <div>
        <label className="block text-[10px] uppercase tracking-widest font-body text-khoj-subtle mb-1.5">
          Notes / Instructions for Candidate
        </label>
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          rows={3}
          maxLength={800}
          placeholder="Agenda, dress code, documents to bring, topics to prepare…"
          className={clsx(fieldClass(), 'resize-none')}
        />
        <p className="text-[9px] font-body text-khoj-muted mt-0.5 text-right">
          {notes.length}/800
        </p>
      </div>

      {/* Buttons */}
      <div className="flex gap-3 pt-2">
        <button
          type="button"
          onClick={onCancel}
          disabled={loading}
          className="flex-1 py-2.5 text-xs font-body text-khoj-subtle border border-khoj-border rounded-sm hover:text-khoj-text hover:border-khoj-accent/30 transition-colors disabled:opacity-50"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={loading}
          className="flex-1 py-2.5 text-xs font-body font-semibold bg-khoj-accent text-white rounded-sm hover:bg-khoj-accent/90 transition-colors disabled:opacity-60"
        >
          {loading ? 'Scheduling…' : 'Schedule Interview'}
        </button>
      </div>
    </form>
  )
}
