// components/tracks/ChallengeCard.tsx
// Challenge card with inline submission form and status display.

'use client'

import { useState } from 'react'
import { TrackChallenge, TrackSubmission, submitChallenge } from '@/services/trackService'
import toast from 'react-hot-toast'

interface Props {
  trackId: string
  challenge: TrackChallenge
  userId: string
  userName: string
  userPhoto: string
  existingSubmission?: TrackSubmission | null
  onSubmitted?: () => void
}

const DIFF_STYLE: Record<string, string> = {
  easy:   'text-green-400 bg-green-500/15 border-green-500/25',
  medium: 'text-yellow-400 bg-yellow-500/15 border-yellow-500/25',
  hard:   'text-red-400 bg-red-500/15 border-red-500/25',
}

export function ChallengeCard({
  trackId, challenge, userId, userName, userPhoto, existingSubmission, onSubmitted,
}: Props) {
  const [open,       setOpen]       = useState(false)
  const [content,    setContent]    = useState('')
  const [submitting, setSubmitting] = useState(false)

  async function handleSubmit() {
    if (!content.trim()) { toast.error('Please write your submission first'); return }
    setSubmitting(true)
    try {
      await submitChallenge(
        trackId, userId, userName, userPhoto,
        challenge.id, content,
        '', '', challenge.points
      )
      toast.success(`Submitted! +${challenge.points} XP added to leaderboard`)
      setContent('')
      setOpen(false)
      onSubmitted?.()
    } catch {
      toast.error('Failed to submit')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="bg-[#111118] border border-[#1e1e2e] rounded-2xl p-5 space-y-3 hover:border-zinc-700 transition-colors">
      {/* Header */}
      <div className="flex items-start justify-between gap-3">
        <div className="space-y-1 flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <div className="w-7 h-7 rounded-lg bg-[#ff5a00]/15 flex items-center justify-center flex-shrink-0">
              <svg className="w-4 h-4 text-[#ff5a00]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <polyline points="9 11 12 14 22 4"/>
                <path d="M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11"/>
              </svg>
            </div>
            <h3 className="text-white font-bold text-sm leading-snug">{challenge.title}</h3>
            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${DIFF_STYLE[challenge.difficulty] ?? DIFF_STYLE.medium}`}>
              {challenge.difficulty}
            </span>
          </div>
          <p className="text-zinc-400 text-xs leading-relaxed pl-9">{challenge.description}</p>
        </div>
        {/* XP badge */}
        <div className="flex-shrink-0 text-center bg-[#ff5a00]/10 border border-[#ff5a00]/25 rounded-xl px-3 py-2">
          <span className="text-[#ff5a00] font-extrabold text-xl leading-none">{challenge.points}</span>
          <p className="text-zinc-500 text-[9px] uppercase tracking-wider mt-0.5">XP</p>
        </div>
      </div>

      {/* Instructions */}
      {challenge.instructions && (
        <div className="bg-zinc-900/60 rounded-xl px-4 py-3 border border-zinc-800">
          <p className="text-zinc-400 text-xs leading-relaxed">{challenge.instructions}</p>
        </div>
      )}

      {/* Submission status or form */}
      {existingSubmission ? (
        <div className={`text-xs px-3.5 py-2.5 rounded-xl border ${
          existingSubmission.status === 'approved'
            ? 'bg-green-500/10 border-green-500/25 text-green-400'
            : existingSubmission.status === 'rejected'
            ? 'bg-red-500/10 border-red-500/25 text-red-400'
            : 'bg-zinc-800/60 border-zinc-700 text-zinc-400'
        }`}>
          {existingSubmission.status === 'approved'
            ? `✓ Approved — ${existingSubmission.score} XP earned`
            : existingSubmission.status === 'rejected'
            ? `✗ Needs revision: ${existingSubmission.feedback || 'Check your work'}`
            : '⏳ Submission under review…'}
        </div>
      ) : !open ? (
        <button
          onClick={() => setOpen(true)}
          className="text-xs px-5 py-2.5 rounded-xl bg-[#ff5a00] hover:bg-[#ff4400] text-white font-bold transition-colors"
        >
          Submit Challenge
        </button>
      ) : (
        <div className="space-y-2">
          <textarea
            rows={4}
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder={
              challenge.submissionType === 'link'
                ? 'Paste your project / repository link here…'
                : 'Describe your solution, paste code, or explain your approach…'
            }
            className="w-full bg-zinc-900 border border-zinc-700 rounded-xl px-3.5 py-3 text-sm text-white placeholder-zinc-600 focus:outline-none focus:border-[#ff5a00]/50 resize-none transition-colors"
          />
          <div className="flex gap-2">
            <button
              onClick={handleSubmit}
              disabled={submitting}
              className="flex-1 py-2.5 rounded-xl bg-[#ff5a00] text-white text-xs font-bold hover:bg-[#ff4400] disabled:opacity-50 transition-colors"
            >
              {submitting ? 'Submitting…' : `Submit & Earn +${challenge.points} XP`}
            </button>
            <button
              onClick={() => { setOpen(false); setContent('') }}
              className="px-4 py-2.5 rounded-xl border border-zinc-700 text-zinc-500 text-xs hover:text-zinc-300 hover:border-zinc-600 transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
