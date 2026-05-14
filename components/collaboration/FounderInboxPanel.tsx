'use client'
// components/collaboration/FounderInboxPanel.tsx

import React, { useState } from 'react'
import { useRouter } from 'next/navigation'
import toast from 'react-hot-toast'
import type { JoinRequest, StartupInvite, FounderInboxCounts, RoleApplication, AccessRequest } from '@/types/collaboration'
import { reviewJoinRequest, reviewRoleApplication, reviewAccessRequest } from '@/lib/collaboration/roomMutations'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { ListSkeleton } from './EmptyState'

interface Props {
  roomId: string
  roomTitle: string
  currentUserId: string
  requests: JoinRequest[]
  invites: StartupInvite[]
  applications: RoleApplication[]
  accessRequests: AccessRequest[]
  counts: FounderInboxCounts
  loading: boolean
}

type Tab = 'applications' | 'requests' | 'invites' | 'access'

const COMPENSATION_LABELS: Record<string, string> = {
  equity: 'Equity only',
  paid: 'Paid / Salary',
  both: 'Equity + Paid',
  volunteer: 'Volunteer',
}

export function FounderInboxPanel({ roomId, roomTitle, currentUserId, requests, invites, applications, accessRequests, counts, loading }: Props) {
  const router     = useRouter()
  const [tab, setTab]         = useState<Tab>('applications')
  const [processing, setProcessing] = useState<string | null>(null)

  async function handleReview(request: JoinRequest, action: 'accept' | 'decline') {
    setProcessing(request.id)
    try {
      await reviewJoinRequest(roomId, request.id, action, request.userId)
      toast.success(action === 'accept' ? 'Request accepted — member added!' : 'Request declined.')
    } catch (e: any) {
      toast.error(e.message ?? 'Something went wrong.')
    } finally {
      setProcessing(null)
    }
  }

  async function handleApplicationReview(app: RoleApplication, action: 'accept' | 'reject') {
    setProcessing(app.id)
    try {
      await reviewRoleApplication(
        roomId, app.id, app.applicantId, app.roleId,
        app.applicantName, app.applicantPhoto, app.roleTitle,
        action, currentUserId,
        roomTitle,
      )
      if (action === 'accept') {
        toast.success(`${app.applicantName} accepted as co-founder! 🎉`)
      } else {
        toast(`Application from ${app.applicantName} rejected.`, { icon: '👋' })
      }
    } catch (e: any) {
      toast.error(e.message ?? 'Something went wrong.')
    } finally {
      setProcessing(null)
    }
  }

  async function handleAccessReview(req: AccessRequest, action: 'accept' | 'reject') {
    setProcessing(req.id)
    try {
      await reviewAccessRequest(roomId, req.id, req.userId, action, currentUserId)
      if (action === 'accept') {
        toast.success(`Access granted to ${req.userName}`)
      } else {
        toast(`Access request from ${req.userName} rejected.`, { icon: '🚫' })
      }
    } catch (e: any) {
      toast.error(e.message ?? 'Something went wrong.')
    } finally {
      setProcessing(null)
    }
  }

  function handleMessage(applicantId: string) {
    // Navigate to messages — placeholder until DM thread support is wired
    router.push(`/messages?user=${applicantId}`)
  }

  const pendingApps    = applications.filter((a) => a.status === 'pending').length
  const pendingAccess  = accessRequests.filter((r) => r.status === 'pending').length

  if (loading) return <ListSkeleton rows={3} />

  return (
    <div className="space-y-4">
      {/* Tabs — Applications first (most relevant for founders) */}
      <div className="flex gap-1 border-b border-khoj-border pb-3 flex-wrap">
        {(['applications', 'requests', 'invites', 'access'] as Tab[]).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`flex items-center gap-2 px-4 py-1.5 rounded-lg text-sm font-medium transition-colors ${
              tab === t
                ? 'bg-khoj-accent/10 text-khoj-accent'
                : 'text-khoj-subtle hover:text-khoj-text'
            }`}
          >
            <span className="capitalize">
              {t === 'applications' ? 'Role Applications'
               : t === 'access' ? 'Access Requests'
               : t}
            </span>
            {t === 'applications' && pendingApps > 0 && (
              <span className="bg-khoj-accent text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full">
                {pendingApps}
              </span>
            )}
            {t === 'requests' && counts.pendingRequests > 0 && (
              <span className="bg-khoj-gold text-black text-[10px] font-bold px-1.5 py-0.5 rounded-full">
                {counts.pendingRequests}
              </span>
            )}
            {t === 'invites' && counts.pendingInvites > 0 && (
              <span className="bg-khoj-gold text-black text-[10px] font-bold px-1.5 py-0.5 rounded-full">
                {counts.pendingInvites}
              </span>
            )}
            {t === 'access' && pendingAccess > 0 && (
              <span className="bg-khoj-teal text-black text-[10px] font-bold px-1.5 py-0.5 rounded-full">
                {pendingAccess}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* ── Role Applications tab ───────────────────────────────────────────── */}
      {tab === 'applications' && (
        <div className="space-y-4">
          {applications.length === 0 ? (
            <div className="text-center py-10 space-y-2">
              <div className="text-3xl">📬</div>
              <p className="text-khoj-text font-medium text-sm">No applications yet</p>
              <p className="text-khoj-subtle text-xs">Applications from co-founders will appear here.</p>
            </div>
          ) : (
            applications.map((app) => (
              <div key={app.id} className="bg-[#0d0d16] border border-khoj-border rounded-xl overflow-hidden">
                {/* Status strip */}
                <div className={`h-1 w-full ${
                  app.status === 'accepted' ? 'bg-emerald-500'
                  : app.status === 'rejected' ? 'bg-red-500'
                  : 'bg-yellow-500'
                }`} />

                <div className="p-5 space-y-4">
                  {/* Applicant header */}
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-10 h-10 rounded-full bg-khoj-border overflow-hidden flex-shrink-0 ring-2 ring-khoj-border/60">
                        {app.applicantPhoto ? (
                          <img src={app.applicantPhoto} alt={app.applicantName} className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-sm font-semibold text-khoj-subtle">
                            {(app.applicantName ?? 'U')[0].toUpperCase()}
                          </div>
                        )}
                      </div>
                      <div className="min-w-0">
                        <p className="text-khoj-text text-sm font-semibold truncate">{app.applicantName}</p>
                        <p className="text-khoj-subtle text-xs mt-0.5">
                          Applying for{' '}
                          <span className="text-khoj-accent font-medium">{app.roleTitle}</span>
                        </p>
                      </div>
                    </div>
                    <Badge
                      label={app.status === 'accepted' ? 'Accepted' : app.status === 'rejected' ? 'Rejected' : 'Pending'}
                      variant={app.status === 'accepted' ? 'success' : app.status === 'rejected' ? 'danger' : 'warning'}
                    />
                  </div>

                  {/* Quick stats row */}
                  <div className="flex flex-wrap gap-3 text-[11px]">
                    {app.weeklyCommitment != null && (
                      <span className="flex items-center gap-1 text-khoj-subtle bg-khoj-border/40 px-2 py-1 rounded-md">
                        ⏱ {app.weeklyCommitment}h/week
                      </span>
                    )}
                    {app.compensationPreference && (
                      <span className="flex items-center gap-1 text-khoj-subtle bg-khoj-border/40 px-2 py-1 rounded-md">
                        💰 {COMPENSATION_LABELS[app.compensationPreference] ?? app.compensationPreference}
                      </span>
                    )}
                  </div>

                  {/* Message */}
                  {app.message && (
                    <div className="bg-khoj-card border-l-2 border-khoj-accent/60 pl-3 py-1 rounded-sm">
                      <p className="text-khoj-subtle text-xs leading-relaxed line-clamp-6">{app.message}</p>
                    </div>
                  )}

                  {/* Skills */}
                  {app.skills && app.skills.length > 0 && (
                    <div>
                      <p className="text-[10px] text-khoj-subtle uppercase tracking-wide mb-1.5">Skills</p>
                      <div className="flex flex-wrap gap-1">
                        {app.skills.map((s) => (
                          <span key={s} className="text-[10px] px-2 py-0.5 bg-khoj-border/60 text-khoj-subtle rounded-sm">{s}</span>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Links */}
                  <div className="flex flex-wrap gap-3 text-xs">
                    {app.portfolioLink && (
                      <a
                        href={app.portfolioLink}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-khoj-accent hover:underline truncate max-w-[200px]"
                      >
                        🔗 {app.portfolioLink.replace(/^https?:\/\//, '')}
                      </a>
                    )}
                    {app.introVideoLink && (
                      <a
                        href={app.introVideoLink}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-khoj-teal hover:underline"
                      >
                        ▶ Intro Video
                      </a>
                    )}
                  </div>

                  {/* KHOJ Proof Summary placeholder */}
                  <div className="bg-khoj-border/20 border border-dashed border-khoj-border rounded-lg px-4 py-3">
                    <p className="text-[10px] text-khoj-subtle uppercase tracking-wide mb-2">KHOJ Proof Summary</p>
                    <div className="flex gap-4 text-xs text-khoj-subtle/70">
                      <span>⚡ XP — </span>
                      <span>📚 Progress — </span>
                      <span>🗂 Portfolio items — </span>
                    </div>
                    <p className="text-[10px] text-khoj-subtle/40 mt-1 italic">
                      (Live KHOJ proof data will appear here once profile is linked)
                    </p>
                  </div>

                  {/* Action buttons */}
                  {app.status === 'pending' && (
                    <div className="flex flex-wrap gap-2 pt-1 border-t border-khoj-border/60">
                      <Button
                        variant="primary"
                        onClick={() => handleApplicationReview(app, 'accept')}
                        disabled={processing === app.id}
                      >
                        {processing === app.id ? '…' : 'Accept as Co-founder'}
                      </Button>
                      <Button
                        variant="danger"
                        onClick={() => handleApplicationReview(app, 'reject')}
                        disabled={processing === app.id}
                      >
                        {processing === app.id ? '…' : 'Reject'}
                      </Button>
                      <Button
                        variant="ghost"
                        onClick={() => handleMessage(app.applicantId)}
                        disabled={processing === app.id}
                      >
                        💬 Message
                      </Button>
                    </div>
                  )}
                  {app.status !== 'pending' && (
                    <div className="pt-1 border-t border-khoj-border/60">
                      <Button
                        variant="ghost"
                        onClick={() => handleMessage(app.applicantId)}
                      >
                        💬 Message {app.applicantName.split(' ')[0]}
                      </Button>
                    </div>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* ── Join Requests tab ───────────────────────────────────────────────── */}
      {tab === 'requests' && (
        <div className="space-y-3">
          {requests.length === 0 ? (
            <p className="text-khoj-subtle text-sm py-4 text-center">No join requests.</p>
          ) : (
            requests.map((req) => (
              <div key={req.id} className="bg-[#0d0d16] border border-khoj-border rounded-xl p-4 space-y-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-2 min-w-0">
                    <div className="w-8 h-8 rounded-full bg-khoj-border overflow-hidden flex-shrink-0">
                      {req.userSnapshot?.avatarUrl ? (
                        <img src={req.userSnapshot.avatarUrl} alt="" className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-xs text-khoj-subtle">
                          {(req.userSnapshot?.displayName ?? 'U')[0]}
                        </div>
                      )}
                    </div>
                    <div className="min-w-0">
                      <p className="text-khoj-text text-sm font-medium truncate">
                        {req.userSnapshot?.displayName ?? 'User'}
                      </p>
                      <p className="text-khoj-subtle text-xs capitalize">{req.requestType.replace('_', ' ')} request</p>
                    </div>
                  </div>
                  <Badge
                    label={req.status}
                    variant={
                      req.status === 'accepted' ? 'success'
                      : req.status === 'declined' ? 'danger'
                      : req.status === 'pending' ? 'warning'
                      : 'default'
                    }
                  />
                </div>
                {req.message && (
                  <p className="text-khoj-subtle text-xs leading-relaxed line-clamp-4">{req.message}</p>
                )}
                {req.links && req.links.length > 0 && (
                  <div className="flex flex-wrap gap-1.5">
                    {req.links.map((l) => (
                      <a key={l} href={l} target="_blank" rel="noopener noreferrer"
                        className="text-khoj-accent text-xs hover:underline truncate max-w-xs">
                        {l.replace('https://', '')}
                      </a>
                    ))}
                  </div>
                )}
                {req.status === 'pending' && (
                  <div className="flex gap-2">
                    <Button variant="primary" onClick={() => handleReview(req, 'accept')} disabled={processing === req.id}>
                      Accept
                    </Button>
                    <Button variant="danger" onClick={() => handleReview(req, 'decline')} disabled={processing === req.id}>
                      Decline
                    </Button>
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      )}

      {/* ── Invites tab ──────────────────────────────────────────────────────── */}
      {tab === 'invites' && (
        <div className="space-y-3">
          {invites.length === 0 ? (
            <p className="text-khoj-subtle text-sm py-4 text-center">No sent invites.</p>
          ) : (
            invites.map((inv) => (
              <div key={inv.id} className="bg-[#0d0d16] border border-khoj-border rounded-xl p-4">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-khoj-text text-sm font-medium">
                      {inv.roleSnapshot?.title ?? 'General Invite'}
                    </p>
                    <p className="text-khoj-subtle text-xs mt-0.5">To: {inv.targetUserId}</p>
                  </div>
                  <Badge
                    label={inv.status}
                    variant={
                      inv.status === 'accepted' ? 'success'
                      : inv.status === 'declined' ? 'danger'
                      : inv.status === 'pending' ? 'warning'
                      : 'default'
                    }
                  />
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* ── Access Requests tab ──────────────────────────────────────────────── */}
      {tab === 'access' && (
        <div className="space-y-4">
          {accessRequests.length === 0 ? (
            <div className="text-center py-10 space-y-2">
              <div className="text-3xl">🔒</div>
              <p className="text-khoj-text font-medium text-sm">No access requests yet</p>
              <p className="text-khoj-subtle text-xs">Viewers who request access to protected details will appear here.</p>
            </div>
          ) : (
            accessRequests.map((req) => (
              <div key={req.id} className="bg-[#0d0d16] border border-khoj-border rounded-xl overflow-hidden">
                <div className={`h-1 w-full ${
                  req.status === 'accepted' ? 'bg-emerald-500'
                  : req.status === 'rejected' ? 'bg-red-500'
                  : 'bg-khoj-teal'
                }`} />
                <div className="p-4 space-y-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-9 h-9 rounded-full bg-khoj-border overflow-hidden flex-shrink-0">
                        {req.userPhoto ? (
                          <img src={req.userPhoto} alt={req.userName} className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-xs text-khoj-subtle font-semibold">
                            {(req.userName ?? 'U')[0].toUpperCase()}
                          </div>
                        )}
                      </div>
                      <div className="min-w-0">
                        <p className="text-khoj-text text-sm font-semibold truncate">{req.userName}</p>
                        <p className="text-khoj-subtle text-xs">Requesting access to protected details</p>
                      </div>
                    </div>
                    <Badge
                      label={req.status === 'accepted' ? 'Granted' : req.status === 'rejected' ? 'Rejected' : 'Pending'}
                      variant={req.status === 'accepted' ? 'success' : req.status === 'rejected' ? 'danger' : 'warning'}
                    />
                  </div>
                  {req.reason && (
                    <div className="bg-khoj-card border-l-2 border-khoj-teal/60 pl-3 py-1 rounded-sm">
                      <p className="text-khoj-subtle text-xs leading-relaxed line-clamp-4">{req.reason}</p>
                    </div>
                  )}
                  {req.status === 'pending' && (
                    <div className="flex gap-2 pt-1 border-t border-khoj-border/60">
                      <Button
                        variant="primary"
                        onClick={() => handleAccessReview(req, 'accept')}
                        disabled={processing === req.id}
                      >
                        {processing === req.id ? '…' : 'Grant Access'}
                      </Button>
                      <Button
                        variant="danger"
                        onClick={() => handleAccessReview(req, 'reject')}
                        disabled={processing === req.id}
                      >
                        {processing === req.id ? '…' : 'Reject'}
                      </Button>
                    </div>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  )
}
