// components/reports/ReportModal.tsx
// Universal reusable report modal for all content types.
// Writes to Firestore `reports/{id}` via reportService.
// Prevents duplicate reports, validates auth, shows success toast.

'use client'

import { useState } from 'react'
import toast from 'react-hot-toast'
import { createReport, ReportTargetType } from '@/services/reportService'

// ── Props ─────────────────────────────────────────────────────────────────────

export interface ReportModalProps {
  /** What is being reported */
  targetType: ReportTargetType
  targetId: string
  /** Short human-readable title shown in the modal header */
  targetTitle: string
  /** 1-2 line preview of the content */
  targetPreview?: string
  /** UID of the content creator/owner */
  targetOwnerId: string
  /** Display name of the creator */
  targetOwnerName: string
  /** UID of the user making the report */
  reportedBy: string
  /** Display name of the user making the report */
  reporterName: string
  onClose: () => void
}

// ── Reason definitions ────────────────────────────────────────────────────────

const REPORT_REASONS: { value: string; label: string; desc: string }[] = [
  { value: 'spam',            label: 'Spam',            desc: 'Repetitive, promotional or bot-generated content'      },
  { value: 'harassment',      label: 'Harassment',      desc: 'Targeted bullying, threats or personal attacks'        },
  { value: 'hate_speech',     label: 'Hate Speech',     desc: 'Content targeting race, religion, gender, sexuality'   },
  { value: 'scam',            label: 'Scam or Fraud',   desc: 'Fake giveaways, phishing, financial deception'         },
  { value: 'fake_content',    label: 'Fake Content',    desc: 'Misleading, impersonation or misinformation'           },
  { value: 'sexual_content',  label: 'Sexual Content',  desc: 'Explicit or inappropriate sexual material'             },
  { value: 'violence',        label: 'Violence',        desc: 'Graphic violence, harm or dangerous activities'        },
  { value: 'copyright',       label: 'Copyright',       desc: 'Unauthorised use of copyrighted material'              },
  { value: 'other',           label: 'Other',           desc: 'Something else not covered above'                      },
]

// ── Component ─────────────────────────────────────────────────────────────────

export function ReportModal({
  targetType,
  targetId,
  targetTitle,
  targetPreview = '',
  targetOwnerId,
  targetOwnerName,
  reportedBy,
  reporterName,
  onClose,
}: ReportModalProps) {
  const [reason, setReason]         = useState<string | null>(null)
  const [details, setDetails]       = useState('')
  const [submitting, setSubmitting] = useState(false)

  async function handleSubmit() {
    if (!reason) { toast.error('Please select a reason'); return }

    setSubmitting(true)
    try {
      await createReport({
        targetType,
        targetId,
        targetTitle,
        targetPreview,
        targetOwnerId,
        targetOwnerName,
        reason,
        details: details.trim(),
        reportedBy,
        reporterName,
      })
      toast.success('Report submitted. Our team will review it shortly.', {
        duration: 4000,
        style: { background: '#13151d', color: '#fff', border: '1px solid #272a35' },
      })
      onClose()
    } catch (err: unknown) {
      if (err instanceof Error && err.message === 'DUPLICATE_REPORT') {
        toast.error("You've already reported this content.", {
          style: { background: '#13151d', color: '#fff', border: '1px solid #272a35' },
        })
        onClose()
      } else {
        toast.error('Failed to submit report. Please try again.')
      }
      setSubmitting(false)
    }
  }

  const typeLabel =
    targetType === 'stream'     ? 'live stream' :
    targetType === 'video'      ? 'video' :
    targetType === 'clip'       ? 'clip' :
    targetType === 'post'       ? 'post' :
    targetType === 'comment'    ? 'comment' :
    targetType === 'user'       ? 'profile' :
    targetType === 'job'        ? 'job listing' :
    targetType === 'room'       ? 'room' :
    targetType === 'tournament' ? 'tournament' : 'content'

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.78)', backdropFilter: 'blur(6px)' }}
      onClick={onClose}
    >
      <div
        className="w-full max-w-md bg-[#0d0e14] border border-zinc-800 rounded-2xl shadow-2xl shadow-black/60 overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-zinc-800">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-red-500/10 border border-red-500/20 flex items-center justify-center flex-shrink-0">
              <svg className="w-4 h-4 text-red-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z" />
                <line x1="4" y1="22" x2="4" y2="15" />
              </svg>
            </div>
            <div className="min-w-0">
              <p className="text-white font-bold text-sm">Report {typeLabel}</p>
              <p className="text-zinc-500 text-xs truncate max-w-[260px]">
                {targetTitle ? `"${targetTitle}"` : `by ${targetOwnerName}`}
              </p>
            </div>
          </div>
          <button onClick={onClose} className="text-zinc-500 hover:text-white transition-colors flex-shrink-0 ml-2">
            <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M18 6 6 18M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Body */}
        <div className="px-5 py-4 space-y-3 max-h-[58vh] overflow-y-auto">
          <p className="text-zinc-400 text-xs leading-relaxed">
            Help keep KHOJ safe. Select the reason that best describes the issue.
            Reports are confidential and reviewed by our moderation team.
          </p>

          {/* Reason radios */}
          <div className="space-y-1.5">
            {REPORT_REASONS.map((r) => (
              <button
                key={r.value}
                onClick={() => setReason(r.value)}
                className={`w-full flex items-start gap-3 p-3 rounded-xl border text-left transition-all ${
                  reason === r.value
                    ? 'border-[#ff5a00]/60 bg-[#ff5a00]/5'
                    : 'border-zinc-800 bg-[#101218] hover:border-zinc-600'
                }`}
              >
                <div className={`mt-0.5 w-4 h-4 rounded-full border-2 flex-shrink-0 flex items-center justify-center transition-colors ${
                  reason === r.value ? 'border-[#ff5a00]' : 'border-zinc-600'
                }`}>
                  {reason === r.value && <div className="w-2 h-2 rounded-full bg-[#ff5a00]" />}
                </div>
                <div>
                  <p className={`text-xs font-semibold ${reason === r.value ? 'text-[#ff5a00]' : 'text-white'}`}>
                    {r.label}
                  </p>
                  <p className="text-zinc-500 text-[11px] mt-0.5">{r.desc}</p>
                </div>
              </button>
            ))}
          </div>

          {/* Details */}
          <div>
            <label className="block text-zinc-400 text-xs font-medium mb-1.5">
              Additional details{' '}
              <span className="text-zinc-600 font-normal">(optional)</span>
            </label>
            <textarea
              value={details}
              onChange={(e) => setDetails(e.target.value)}
              placeholder="Describe the issue in more detail..."
              maxLength={500}
              rows={3}
              className="w-full bg-[#101218] border border-zinc-800 text-white text-xs placeholder-zinc-600 rounded-xl px-3 py-2.5 outline-none focus:border-[#ff5a00]/50 focus:ring-1 focus:ring-[#ff5a00]/20 resize-none transition-all"
            />
            <p className="text-zinc-700 text-[10px] mt-1 text-right">{details.length}/500</p>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 px-5 py-4 border-t border-zinc-800">
          <button
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold text-zinc-400 hover:text-white bg-zinc-800/50 hover:bg-zinc-700/60 rounded-xl transition-all"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={!reason || submitting}
            className="flex items-center gap-2 px-4 py-2 text-xs font-bold text-white bg-red-600 hover:bg-red-500 disabled:opacity-40 disabled:cursor-not-allowed rounded-xl transition-all"
          >
            {submitting && (
              <div className="w-3.5 h-3.5 border-2 border-white/40 border-t-white rounded-full animate-spin" />
            )}
            Submit Report
          </button>
        </div>
      </div>
    </div>
  )
}
