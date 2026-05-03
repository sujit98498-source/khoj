// app/dashboard/applications/page.tsx
// User's application tracker + invite inbox.
// Shows: applications sent (with live stage), pending invites (accept/decline).

'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { AppShell } from '@/components/layout/AppShell'
import { PageLoader } from '@/components/ui/LoadingSpinner'
import { ApplicationStatusBadge } from '@/components/jobs/ApplicationStatusBadge'
import { useAuth } from '@/hooks/useAuth'
import {
  getApplicationsByUser,
  getInvitesByRecipient,
  respondToInvite,
  applyToJob,
  getJobPost,
  getPendingInviteCount,
} from '@/services/hiringService'
import { useJobs } from '@/lib/jobs-context'
import type { JobApplication, JobInvite } from '@/lib/types'
import { formatDistanceToNow } from 'date-fns'
import toast from 'react-hot-toast'
import clsx from 'clsx'

type Tab = 'applications' | 'invites'

export default function ApplicationsPage() {
  const { khojUser, loading: authLoading } = useAuth()
  const router = useRouter()
  const { refresh } = useJobs()

  const [activeTab, setActiveTab] = useState<Tab>('applications')
  const [applications, setApplications] = useState<JobApplication[]>([])
  const [invites, setInvites] = useState<JobInvite[]>([])
  const [pendingInviteCount, setPendingInviteCount] = useState(0)

  useEffect(() => {
    if (!khojUser) return
    setApplications(getApplicationsByUser(khojUser.uid))
    setInvites(getInvitesByRecipient(khojUser.uid))
    setPendingInviteCount(getPendingInviteCount(khojUser.uid))
  }, [khojUser])

  if (authLoading) return <PageLoader />
  if (!khojUser) { router.replace('/auth/login'); return null }

  function handleAcceptInvite(invite: JobInvite) {
    const job = getJobPost(invite.jobId)
    if (!job) { toast.error('Job no longer available'); return }

    applyToJob({
      job,
      applicantId: khojUser!.uid,
      applicantName: khojUser!.name,
      inviteId: invite.id,
    })
    respondToInvite(invite.id, 'accepted')
    toast.success(`Applied to ${invite.jobTitle}!`)

    // Refresh local state and global badge counts
    setApplications(getApplicationsByUser(khojUser!.uid))
    setInvites(getInvitesByRecipient(khojUser!.uid))
    setPendingInviteCount(getPendingInviteCount(khojUser!.uid))
    setActiveTab('applications')
    refresh()
  }

  function handleDeclineInvite(invite: JobInvite) {
    respondToInvite(invite.id, 'declined')
    toast('Invite declined')
    setInvites(getInvitesByRecipient(khojUser!.uid))
    setPendingInviteCount(getPendingInviteCount(khojUser!.uid))
  }

  const pendingInvites = invites.filter((i) => i.status === 'pending')
  const respondedInvites = invites.filter((i) => i.status !== 'pending')

  return (
    <AppShell>
      {/* ── Header ── */}
      <div className="mb-6">
        <h1 className="text-xl font-display font-bold text-khoj-text tracking-tight">
          My Applications
        </h1>
        <p className="text-xs font-body text-khoj-subtle mt-1">
          Track your job applications and recruiter invites
        </p>
      </div>

      {/* ── Stats strip ── */}
      <div className="grid grid-cols-3 gap-3 mb-6">
        {[
          { label: 'Applied', value: applications.length, color: 'text-blue-400' },
          {
            label: 'In Progress',
            value: applications.filter((a) =>
              ['shortlisted', 'interview', 'offered'].includes(a.stage)
            ).length,
            color: 'text-khoj-gold',
          },
          { label: 'Invites', value: pendingInviteCount, color: 'text-khoj-accent' },
        ].map(({ label, value, color }) => (
          <div
            key={label}
            className="bg-khoj-card border border-khoj-border rounded-sm p-4 text-center"
          >
            <p className={clsx('text-2xl font-display font-bold', color)}>{value}</p>
            <p className="text-[9px] uppercase tracking-widest font-body text-khoj-muted mt-0.5">
              {label}
            </p>
          </div>
        ))}
      </div>

      {/* ── Tabs ── */}
      <div className="flex gap-1 mb-5 border-b border-khoj-border">
        {([
          { key: 'applications', label: 'Applications', count: applications.length },
          { key: 'invites', label: 'Invites', count: pendingInviteCount },
        ] as { key: Tab; label: string; count: number }[]).map((tab) => (
          <button
            key={tab.key}
            type="button"
            onClick={() => setActiveTab(tab.key)}
            className={clsx(
              'flex items-center gap-2 text-xs font-body px-4 py-2.5 border-b-2 -mb-px transition-colors',
              activeTab === tab.key
                ? 'border-khoj-accent text-khoj-accent'
                : 'border-transparent text-khoj-subtle hover:text-khoj-text'
            )}
          >
            {tab.label}
            {tab.count > 0 && (
              <span
                className={clsx(
                  'text-[9px] font-mono px-1.5 py-0.5 rounded-sm',
                  activeTab === tab.key
                    ? 'bg-khoj-accent/15 text-khoj-accent'
                    : 'bg-khoj-bg text-khoj-muted border border-khoj-border'
                )}
              >
                {tab.count}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* ── Applications tab ── */}
      {activeTab === 'applications' && (
        <div>
          {applications.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 gap-4 text-center">
              <span className="text-4xl text-khoj-muted">◈</span>
              <p className="text-sm font-body text-khoj-subtle">No applications yet.</p>
              <Link
                href="/jobs"
                className="text-xs font-body text-khoj-accent border border-khoj-accent/30 px-4 py-2 rounded-sm hover:bg-khoj-accent/10 transition-colors"
              >
                Browse Job Board →
              </Link>
            </div>
          ) : (
            <div className="space-y-3">
              {applications.map((app) => {
                const jobClosed = getJobPost(app.jobId)?.deleted === true
                return (
                <div
                  key={app.id}
                  className="bg-khoj-card border border-khoj-border rounded-sm p-4 hover:border-khoj-accent/20 transition-colors"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <Link
                          href={`/jobs/${app.jobId}`}
                          className="text-sm font-display font-bold text-khoj-text hover:text-khoj-accent transition-colors"
                        >
                          {app.jobTitle}
                        </Link>
                        {jobClosed && (
                          <span className="text-[9px] font-body uppercase tracking-widest text-red-400 border border-red-400/30 px-1.5 py-0.5 rounded-sm flex-shrink-0">
                            Position Closed
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] font-body text-khoj-accent mt-0.5">{app.company}</p>
                    </div>
                    <ApplicationStatusBadge stage={app.stage} />
                  </div>

                  <div className="flex items-center gap-4 mt-3 text-[9px] font-body text-khoj-muted">
                    <span>Applied {formatDistanceToNow(new Date(app.appliedAt), { addSuffix: true })}</span>
                    <span>Updated {formatDistanceToNow(new Date(app.updatedAt), { addSuffix: true })}</span>
                    {app.inviteId && (
                      <span className="text-khoj-gold">★ Via Invite</span>
                    )}
                  </div>

                  {/* Stage progress mini-bar */}
                  <div className="flex items-center gap-1 mt-3">
                    {(['applied', 'shortlisted', 'interview', 'offered', 'hired'] as const).map(
                      (s, idx) => {
                        const stages = ['applied', 'shortlisted', 'interview', 'offered', 'hired']
                        const currentIdx = stages.indexOf(app.stage)
                        const isActive = s === app.stage
                        const isPast = currentIdx > idx
                        return (
                          <div key={s} className="flex items-center gap-1 flex-1">
                            <div
                              className={clsx(
                                'h-1 rounded-full flex-1 transition-colors',
                                isActive
                                  ? 'bg-khoj-accent'
                                  : isPast
                                  ? 'bg-khoj-accent/40'
                                  : 'bg-khoj-border'
                              )}
                            />
                          </div>
                        )
                      }
                    )}
                    {app.stage === 'rejected' && (
                      <span className="text-[9px] font-body text-red-400">Not progressed</span>
                    )}
                  </div>

                  {app.message && (
                    <p className="text-[10px] font-body text-khoj-muted mt-2 italic border-l-2 border-khoj-border pl-2 line-clamp-1">
                      "{app.message}"
                    </p>
                  )}
                </div>
                )
              })}
            </div>
          )}
        </div>
      )}

      {/* ── Invites tab ── */}
      {activeTab === 'invites' && (
        <div className="space-y-6">
          {/* Pending */}
          {pendingInvites.length > 0 && (
            <section>
              <h2 className="text-[9px] uppercase tracking-widest font-body text-khoj-muted mb-3">
                Pending ({pendingInvites.length})
              </h2>
              <div className="space-y-3">
                {pendingInvites.map((invite) => (
                  <div
                    key={invite.id}
                    className="bg-khoj-card border border-khoj-gold/25 rounded-sm p-4"
                  >
                    <div className="flex items-start justify-between gap-3 mb-2">
                      <div>
                        <p className="text-sm font-display font-bold text-khoj-text">
                          {invite.jobTitle}
                        </p>
                        <p className="text-[11px] font-body text-khoj-accent">{invite.company}</p>
                        <p className="text-[10px] font-body text-khoj-muted mt-0.5">
                          From {invite.recruiterName} ·{' '}
                          {formatDistanceToNow(new Date(invite.sentAt), { addSuffix: true })}
                        </p>
                      </div>
                      <span className="text-[9px] font-body text-khoj-gold border border-khoj-gold/30 px-2 py-0.5 rounded-sm flex-shrink-0">
                        ★ Invite
                      </span>
                    </div>

                    {invite.message && (
                      <p className="text-xs font-body text-khoj-subtle italic border-l-2 border-khoj-gold/30 pl-2 mb-3">
                        "{invite.message}"
                      </p>
                    )}

                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => handleAcceptInvite(invite)}
                        className="flex-1 py-2 bg-khoj-accent text-white text-xs font-body font-semibold rounded-sm hover:bg-khoj-accent/90 transition-colors"
                      >
                        Accept & Apply
                      </button>
                      <Link
                        href={`/jobs/${invite.jobId}`}
                        className="py-2 px-3 text-xs font-body text-khoj-subtle border border-khoj-border rounded-sm hover:text-khoj-text hover:border-khoj-accent/30 transition-colors"
                      >
                        View Job
                      </Link>
                      <button
                        type="button"
                        onClick={() => handleDeclineInvite(invite)}
                        className="py-2 px-3 text-xs font-body text-khoj-subtle border border-khoj-border rounded-sm hover:text-red-400 hover:border-red-400/30 transition-colors"
                      >
                        Decline
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* Responded */}
          {respondedInvites.length > 0 && (
            <section>
              <h2 className="text-[9px] uppercase tracking-widest font-body text-khoj-muted mb-3">
                Responded
              </h2>
              <div className="space-y-2">
                {respondedInvites.map((invite) => (
                  <div
                    key={invite.id}
                    className="bg-khoj-card border border-khoj-border rounded-sm p-4 opacity-70"
                  >
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <p className="text-xs font-body font-semibold text-khoj-text">{invite.jobTitle}</p>
                        <p className="text-[10px] font-body text-khoj-muted">{invite.company}</p>
                      </div>
                      <span
                        className={clsx(
                          'text-[9px] font-body border px-2 py-0.5 rounded-sm',
                          invite.status === 'accepted'
                            ? 'text-khoj-teal border-khoj-teal/30'
                            : 'text-khoj-muted border-khoj-border'
                        )}
                      >
                        {invite.status === 'accepted' ? 'Accepted' : 'Declined'}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )}

          {invites.length === 0 && (
            <div className="flex flex-col items-center justify-center py-16 gap-4 text-center">
              <span className="text-4xl text-khoj-muted">✉</span>
              <p className="text-sm font-body text-khoj-subtle">No invites yet.</p>
              <p className="text-xs font-body text-khoj-muted max-w-xs">
                Complete your KHOJ profile to get discovered by recruiters.
              </p>
              <Link
                href="/settings/profile"
                className="text-xs font-body text-khoj-accent border border-khoj-accent/30 px-4 py-2 rounded-sm hover:bg-khoj-accent/10 transition-colors"
              >
                Complete Profile →
              </Link>
            </div>
          )}
        </div>
      )}
    </AppShell>
  )
}
