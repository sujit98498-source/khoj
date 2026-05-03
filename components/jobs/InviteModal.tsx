// components/jobs/InviteModal.tsx
// Recruiter sends a direct job invite to a specific user.
// Shows a list of the recruiter's active job posts; recruiter picks one + adds note.

'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import type { PortfolioUser, JobPost } from '@/lib/types'
import {
  getJobPostsByRecruiter,
  sendInvite,
  inviteExists,
} from '@/services/hiringService'
import { useAuth } from '@/hooks/useAuth'
import toast from 'react-hot-toast'
import clsx from 'clsx'

interface InviteModalProps {
  /** The talent being invited */
  recipient: Pick<PortfolioUser, 'uid' | 'name' | 'username' | 'avatarUrl'>
  onClose: () => void
}

export function InviteModal({ recipient, onClose }: InviteModalProps) {
  const { khojUser } = useAuth()
  const router = useRouter()
  const [jobs, setJobs] = useState<JobPost[]>([])
  const [selectedJobId, setSelectedJobId] = useState<string | null>(null)
  const [message, setMessage] = useState('')
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!khojUser) return
    const myJobs = getJobPostsByRecruiter(khojUser.uid).filter((j) => j.active)
    setJobs(myJobs)
    if (myJobs.length === 1) setSelectedJobId(myJobs[0].id)
  }, [khojUser])

  // Keyboard: Escape to close
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  function handleSend() {
    if (!khojUser) { toast.error('Not signed in'); return }
    if (!selectedJobId) { toast.error('Select a job to invite for'); return }

    const job = jobs.find((j) => j.id === selectedJobId)
    if (!job) return

    if (inviteExists(job.id, recipient.uid)) {
      toast('Invite already sent for this role', { icon: '◈' })
      onClose()
      return
    }

    setLoading(true)
    try {
      sendInvite({
        jobId: job.id,
        jobTitle: job.title,
        company: job.company,
        recruiterId: khojUser.uid,
        recruiterName: khojUser.name,
        recipientId: recipient.uid,
        recipientName: recipient.name,
        message: message.trim() || undefined,
      })
      toast.success(`Invite sent to ${recipient.name}!`)
      onClose()
    } finally {
      setLoading(false)
    }
  }

  return (
    /* Backdrop */
    <div
      className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4"
      onClick={(e) => { if (e.target === e.currentTarget) onClose() }}
    >
      <div className="w-full max-w-md bg-khoj-card border border-khoj-border rounded-sm shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-khoj-border">
          <div>
            <h2 className="text-sm font-display font-bold text-khoj-text">Invite to Apply</h2>
            <p className="text-[10px] font-body text-khoj-muted mt-0.5">
              Inviting <span className="text-khoj-accent">{recipient.name}</span>
              {recipient.username ? ` (@${recipient.username})` : ''}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-khoj-muted hover:text-khoj-text transition-colors text-lg leading-none"
          >
            ×
          </button>
        </div>

        <div className="px-5 py-4 space-y-4">
          {/* Job selector */}
          <div>
            <p className="text-[9px] uppercase tracking-widest font-body text-khoj-subtle mb-2">
              Select Job Post
            </p>

            {jobs.length === 0 ? (
              <div className="text-center py-6 border border-dashed border-khoj-border rounded-sm">
                <p className="text-xs text-khoj-muted font-body">No active job posts yet.</p>
                <button
                  type="button"
                  className="text-xs text-khoj-accent hover:text-orange-400 mt-1 inline-block cursor-pointer transition-colors focus:outline-none focus-visible:underline"
                  onClick={() => { onClose(); router.push('/recruiter/jobs/new') }}
                >
                  Create a job post →
                </button>
              </div>
            ) : (
              <div className="space-y-2 max-h-48 overflow-y-auto">
                {jobs.map((job) => {
                  const alreadyInvited = inviteExists(job.id, recipient.uid)
                  return (
                    <button
                      key={job.id}
                      type="button"
                      disabled={alreadyInvited}
                      onClick={() => setSelectedJobId(job.id)}
                      className={clsx(
                        'w-full text-left p-3 rounded-sm border transition-all duration-150',
                        selectedJobId === job.id
                          ? 'border-khoj-accent/50 bg-khoj-accent/5'
                          : 'border-khoj-border bg-khoj-bg hover:border-khoj-accent/30',
                        alreadyInvited && 'opacity-50 cursor-not-allowed'
                      )}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <p className="text-xs font-body font-semibold text-khoj-text">
                            {job.title}
                          </p>
                          <p className="text-[10px] font-body text-khoj-muted">{job.company}</p>
                        </div>
                        {alreadyInvited && (
                          <span className="text-[9px] text-khoj-gold border border-khoj-gold/20 px-1.5 py-0.5 rounded-sm flex-shrink-0">
                            Invited
                          </span>
                        )}
                        {selectedJobId === job.id && !alreadyInvited && (
                          <span className="text-[9px] text-khoj-accent flex-shrink-0">✓</span>
                        )}
                      </div>
                    </button>
                  )
                })}
              </div>
            )}
          </div>

          {/* Personal message */}
          <div>
            <p className="text-[9px] uppercase tracking-widest font-body text-khoj-subtle mb-2">
              Personal Message (optional)
            </p>
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              rows={3}
              maxLength={300}
              placeholder={`Hi ${recipient.name}, your KHOJ profile caught my attention…`}
              className="w-full bg-khoj-bg border border-khoj-border rounded-sm px-3 py-2 text-sm font-body text-khoj-text placeholder:text-khoj-muted focus:outline-none focus:border-khoj-accent/60 transition-colors resize-none"
            />
            <p className="text-[9px] text-khoj-muted mt-0.5 text-right">{message.length}/300</p>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center gap-2 px-5 py-4 border-t border-khoj-border">
          <button
            type="button"
            onClick={handleSend}
            disabled={loading || !selectedJobId || jobs.length === 0}
            className="flex-1 py-2.5 bg-khoj-accent text-white text-xs font-body font-semibold rounded-sm hover:bg-khoj-accent/90 transition-colors disabled:opacity-50"
          >
            {loading ? 'Sending…' : 'Send Invite'}
          </button>
          <button
            type="button"
            onClick={onClose}
            className="py-2.5 px-4 text-xs font-body text-khoj-subtle border border-khoj-border rounded-sm hover:text-khoj-text hover:border-khoj-accent/30 transition-colors"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  )
}
