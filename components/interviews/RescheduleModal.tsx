// components/interviews/RescheduleModal.tsx
// Candidate submits a note explaining why they need a reschedule.
// Simple overlay modal — no routing needed.

'use client'

import { useState } from 'react'

interface RescheduleModalProps {
  interviewTitle: string
  onSubmit: (note: string) => void
  onClose: () => void
}

export function RescheduleModal({
  interviewTitle,
  onSubmit,
  onClose,
}: RescheduleModalProps) {
  const [note, setNote] = useState('')
  const [error, setError] = useState('')

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!note.trim()) {
      setError('Please explain why you need a reschedule.')
      return
    }
    onSubmit(note.trim())
  }

  return (
    /* Backdrop */
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
      onClick={(e) => { if (e.target === e.currentTarget) onClose() }}
    >
      <div className="w-full max-w-md bg-khoj-card border border-khoj-border rounded-sm shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-khoj-border">
          <div>
            <h2 className="text-sm font-display font-bold text-khoj-text">
              Request Reschedule
            </h2>
            <p className="text-[10px] font-body text-khoj-muted mt-0.5 truncate max-w-[300px]">
              {interviewTitle}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-khoj-muted hover:text-khoj-text transition-colors text-lg leading-none"
          >
            ✕
          </button>
        </div>

        {/* Body */}
        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          <p className="text-[11px] font-body text-khoj-subtle">
            Let the recruiter know why you need a different time. Be brief and
            professional — they'll reach back out with new options.
          </p>

          <div>
            <label className="block text-[10px] uppercase tracking-widest font-body text-khoj-subtle mb-1.5">
              Your Reason <span className="text-khoj-accent">*</span>
            </label>
            <textarea
              value={note}
              onChange={(e) => { setNote(e.target.value); setError('') }}
              rows={4}
              maxLength={400}
              autoFocus
              placeholder="e.g. I have a prior commitment at that time. Could we reschedule to the following week?"
              className="w-full text-xs font-body bg-khoj-bg border border-khoj-border rounded-sm px-3 py-2.5 text-khoj-text placeholder:text-khoj-muted focus:outline-none focus:border-khoj-accent/60 transition-colors resize-none"
            />
            <div className="flex items-center justify-between mt-0.5">
              {error ? (
                <p className="text-[10px] text-red-400 font-body">{error}</p>
              ) : (
                <span />
              )}
              <p className="text-[9px] font-body text-khoj-muted">{note.length}/400</p>
            </div>
          </div>

          <div className="flex gap-3">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2.5 text-xs font-body text-khoj-subtle border border-khoj-border rounded-sm hover:text-khoj-text hover:border-khoj-accent/30 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="flex-1 py-2.5 text-xs font-body font-semibold bg-khoj-gold/10 text-khoj-gold border border-khoj-gold/30 rounded-sm hover:bg-khoj-gold/20 transition-colors"
            >
              Send Request
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
