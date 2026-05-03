'use client'

import { useEffect, useState } from 'react'
import { CommunityPost, CommunityReportReason } from '@/lib/types'
import { submitPostReport } from '@/services/communityService'
import { createReport } from '@/services/reportService'
import { Button } from '@/components/ui/Button'
import clsx from 'clsx'
import toast from 'react-hot-toast'

const REPORT_REASONS: CommunityReportReason[] = [
  'Spam',
  'Harassment or abuse',
  'Hate or discrimination',
  'False or misleading content',
  'Inappropriate content',
  'Scams or fraud',
  'Self-promotion spam',
  'Other',
]

interface ReportPostModalProps {
  open: boolean
  post: CommunityPost
  reporterUserId: string | null
  reporterName?: string
  onClose: () => void
}

export function ReportPostModal({
  open,
  post,
  reporterUserId,
  reporterName,
  onClose,
}: ReportPostModalProps) {
  const [reason, setReason] = useState<CommunityReportReason>('Spam')
  const [details, setDetails] = useState('')
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    if (open) {
      setReason('Spam')
      setDetails('')
      setSubmitting(false)
    }
  }, [open, post.id])

  if (!open) return null

  const handleSubmit = async () => {
    if (!reporterUserId) {
      toast.error('Sign in to report posts')
      return
    }

    setSubmitting(true)

    try {
      await submitPostReport({
        post,
        reporterUserId,
        reporterName,
        reason,
        details,
      })

      // Mirror to the global reports collection so admins see all content in one place
      try {
        await createReport({
          targetType:      'post',
          targetId:        post.id,
          targetTitle:     post.content.slice(0, 80),
          targetPreview:   post.content.slice(0, 200),
          targetOwnerId:   post.authorId,
          targetOwnerName: post.authorName,
          reason:          'other',
          details:         `[Community] ${reason}${details ? ' — ' + details : ''}`,
          reportedBy:      reporterUserId,
          reporterName:    reporterName ?? 'Unknown',
        })
      } catch {
        // Non-critical — community report was already saved
      }

      toast.success('Thanks. Your report has been submitted for review.')
      onClose()
    } catch (error) {
      console.error('Failed to submit report:', error)
      toast.error('Could not submit the report right now')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/70 backdrop-blur-sm px-4">
      <div className="w-full max-w-xl rounded-sm border border-khoj-border bg-khoj-card shadow-[0_0_40px_rgba(0,0,0,0.35)]">
        <div className="border-b border-khoj-border px-5 py-4 flex items-start justify-between gap-4">
          <div>
            <p className="text-[10px] uppercase tracking-[0.2em] text-khoj-accent font-body font-semibold">
              Report Post
            </p>
            <h3 className="mt-1 text-lg font-display font-bold text-khoj-text">
              Help keep KHOJ safe
            </h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-khoj-subtle hover:text-khoj-text text-lg"
            aria-label="Close report dialog"
          >
            ×
          </button>
        </div>

        <div className="px-5 py-4 space-y-5">
          <div className="rounded-sm border border-khoj-border bg-khoj-bg/70 p-3">
            <p className="text-[10px] uppercase tracking-widest text-khoj-muted font-body mb-1">
              Reporting post by {post.authorName}
            </p>
            <p className="text-sm text-khoj-text font-body leading-relaxed line-clamp-3 whitespace-pre-line">
              {post.content}
            </p>
          </div>

          <div>
            <label className="block text-xs font-body font-semibold text-khoj-text mb-2">
              Why are you reporting this?
            </label>
            <div className="grid gap-2 sm:grid-cols-2">
              {REPORT_REASONS.map((option) => (
                <button
                  key={option}
                  type="button"
                  onClick={() => setReason(option)}
                  className={clsx(
                    'rounded-sm border px-3 py-2 text-left text-xs font-body transition-all duration-150',
                    reason === option
                      ? 'border-khoj-accent bg-khoj-accent/10 text-khoj-accent'
                      : 'border-khoj-border text-khoj-subtle hover:text-khoj-text hover:border-khoj-border/80'
                  )}
                >
                  {option}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-xs font-body font-semibold text-khoj-text mb-2">
              Extra details (optional)
            </label>
            <textarea
              value={details}
              onChange={(e) => setDetails(e.target.value)}
              rows={4}
              maxLength={500}
              placeholder="Add anything that would help the admin team review this report."
              className="w-full rounded-sm border border-khoj-border bg-khoj-bg px-3 py-2 text-sm text-khoj-text placeholder:text-khoj-muted focus:border-khoj-accent focus:outline-none"
            />
            <p className="mt-1 text-[10px] text-khoj-muted font-body text-right">
              {details.length}/500
            </p>
          </div>
        </div>

        <div className="border-t border-khoj-border px-5 py-4 flex items-center justify-end gap-3">
          <Button variant="secondary" size="sm" onClick={onClose}>
            Cancel
          </Button>
          <Button size="sm" onClick={handleSubmit} loading={submitting}>
            Submit Report
          </Button>
        </div>
      </div>
    </div>
  )
}
