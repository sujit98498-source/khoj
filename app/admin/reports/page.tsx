'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import toast from 'react-hot-toast'
import { useAdminGuard } from '@/hooks/useAdminGuard'
import { PageHeader } from '@/components/layout/PageHeader'
import { Card, StatCard } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Timestamp } from 'firebase/firestore'
import {
  Report,
  ReportStatus,
  ReportTargetType,
  TARGET_TYPE_LABEL,
  dismissReport,
  getTargetRoute,
  markReportReviewed,
  removeReportTarget,
  subscribeReports,
} from '@/services/reportService'

// ── Helpers ───────────────────────────────────────────────────────────────────

function statusVariant(status: ReportStatus): 'default' | 'success' | 'warning' | 'danger' | 'info' {
  switch (status) {
    case 'pending':      return 'warning'
    case 'reviewed':     return 'info'
    case 'dismissed':    return 'default'
    case 'action_taken': return 'danger'
    default:             return 'default'
  }
}

function fmtStatus(status: ReportStatus) {
  return status.replace('_', ' ')
}

function fmtDate(ts: string | Timestamp | null | undefined): string {
  if (!ts) return ''
  if (typeof ts === 'string') return new Date(ts).toLocaleString()
  if (ts instanceof Timestamp) return ts.toDate().toLocaleString()
  return ''
}

const TYPE_VARIANT: Partial<Record<ReportTargetType, 'default' | 'info' | 'warning' | 'danger' | 'success'>> = {
  stream:     'info',
  video:      'info',
  clip:       'info',
  post:       'warning',
  comment:    'warning',
  user:       'danger',
  job:        'default',
  room:       'default',
  tournament: 'default',
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function AdminReportsPage() {
  const { user } = useAdminGuard()
  const [reports, setReports] = useState<Report[]>([])
  const [loading, setLoading]       = useState(true)
  const [busyId, setBusyId]         = useState<string | null>(null)
  const [filter, setFilter]         = useState<ReportStatus | 'all'>('all')

  useEffect(() => {
    const unsub = subscribeReports((items) => {
      setReports(items)
      setLoading(false)
    })
    return () => unsub()
  }, [])

  const counts = useMemo(() => ({
    total:    reports.length,
    pending:  reports.filter((r) => r.status === 'pending').length,
    reviewed: reports.filter((r) => r.status === 'reviewed').length,
    actioned: reports.filter((r) => r.status === 'action_taken').length,
  }), [reports])

  const filtered = useMemo(() =>
    filter === 'all' ? reports : reports.filter((r) => r.status === filter),
  [reports, filter])

  // ── Actions ──────────────────────────────────────────────────────────────

  async function handleMarkReviewed(report: Report) {
    if (!user?.uid) return
    setBusyId(report.id)
    try {
      await markReportReviewed(report.id, user.uid)
      toast.success('Report marked as reviewed')
    } catch {
      toast.error('Could not update report')
    } finally { setBusyId(null) }
  }

  async function handleDismiss(report: Report) {
    if (!user?.uid) return
    setBusyId(report.id)
    try {
      await dismissReport(report.id, user.uid)
      toast.success('Report dismissed')
    } catch {
      toast.error('Could not dismiss report')
    } finally { setBusyId(null) }
  }

  async function handleRemoveTarget(report: Report) {
    if (!user?.uid) return
    if (!window.confirm(
      `Remove this ${TARGET_TYPE_LABEL[report.targetType]?.toLowerCase() ?? 'content'} from the platform? This action will soft-delete it.`
    )) return
    setBusyId(report.id)
    try {
      await removeReportTarget(report.id, report.targetType, report.targetId, user.uid)
      toast.success('Content removed and report marked as action taken')
    } catch {
      toast.error('Could not remove content')
    } finally { setBusyId(null) }
  }

  // ── Render ───────────────────────────────────────────────────────────────

  const FILTER_TABS: { id: ReportStatus | 'all'; label: string }[] = [
    { id: 'all',          label: `All (${counts.total})`       },
    { id: 'pending',      label: `Pending (${counts.pending})`  },
    { id: 'reviewed',     label: `Reviewed (${counts.reviewed})`},
    { id: 'action_taken', label: `Actioned (${counts.actioned})`},
  ]

  return (
    <div className="space-y-8 animate-slide-up">
      <PageHeader
        eyebrow="Admin Moderation"
        title="Reported Content"
        subtitle="Review reports across all content types — streams, videos, posts, jobs, rooms and more."
      />

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 stagger-children">
        <StatCard label="Total Reports"  value={loading ? '–' : counts.total}    accent="gold"   />
        <StatCard label="Pending"        value={loading ? '–' : counts.pending}   accent="orange" />
        <StatCard label="Reviewed"       value={loading ? '–' : counts.reviewed}  accent="teal"   />
        <StatCard label="Action Taken"   value={loading ? '–' : counts.actioned}  accent="orange" />
      </div>

      {/* Filter tabs */}
      <div className="flex items-center gap-1 border-b border-khoj-border">
        {FILTER_TABS.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setFilter(tab.id)}
            className={`px-4 py-2 text-xs font-body font-semibold border-b-2 -mb-px transition-all ${
              filter === tab.id
                ? 'text-khoj-accent border-khoj-accent'
                : 'text-khoj-subtle border-transparent hover:text-khoj-text'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* List */}
      {loading ? (
        <Card>
          <p className="text-sm text-khoj-subtle font-body">Loading reports...</p>
        </Card>
      ) : filtered.length === 0 ? (
        <Card>
          <div className="text-center py-10">
            <p className="text-lg font-display font-bold text-khoj-text mb-2">No reports</p>
            <p className="text-sm text-khoj-subtle font-body">Nothing in this category right now.</p>
          </div>
        </Card>
      ) : (
        <div className="space-y-4">
          {filtered.map((report) => {
            const busy = busyId === report.id
            const typeLabel = TARGET_TYPE_LABEL[report.targetType] ?? report.targetType
            const targetRoute = getTargetRoute(report.targetType, report.targetId)

            return (
              <Card key={report.id} className="border-khoj-border/80">
                <div className="flex flex-col gap-4">
                  {/* Top row */}
                  <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap mb-2">
                        <Badge
                          label={typeLabel}
                          variant={TYPE_VARIANT[report.targetType] ?? 'default'}
                        />
                        <Badge label={report.reason.replace(/_/g, ' ')} variant="danger" />
                        <Badge label={fmtStatus(report.status)} variant={statusVariant(report.status)} />
                      </div>
                      <h3 className="text-base font-display font-bold text-khoj-text truncate">
                        {report.targetTitle || `${typeLabel} by ${report.targetOwnerName}`}
                      </h3>
                      <p className="text-xs text-khoj-subtle font-body mt-1">
                        Reported by <span className="text-khoj-text">{report.reporterName}</span>
                        {' · '}
                        Content owner: <span className="text-khoj-text">{report.targetOwnerName}</span>
                        {' · '}
                        {fmtDate(report.createdAt)}
                      </p>
                    </div>

                    <Link href={targetRoute} target="_blank" rel="noopener noreferrer">
                      <Button variant="secondary" size="sm">
                        View Target ↗
                      </Button>
                    </Link>
                  </div>

                  {/* Content preview */}
                  {report.targetPreview && (
                    <div className="rounded-sm border border-khoj-border bg-khoj-bg/60 p-4">
                      <p className="text-[10px] uppercase tracking-widest text-khoj-muted font-body mb-2">
                        Content Preview
                      </p>
                      <p className="text-sm text-khoj-text font-body whitespace-pre-line leading-relaxed line-clamp-3">
                        {report.targetPreview}
                      </p>
                    </div>
                  )}

                  {/* Reporter details */}
                  {report.details && (
                    <div className="rounded-sm border border-khoj-border bg-khoj-card/70 p-4">
                      <p className="text-[10px] uppercase tracking-widest text-khoj-muted font-body mb-2">
                        Reporter Notes
                      </p>
                      <p className="text-sm text-khoj-subtle font-body whitespace-pre-line leading-relaxed">
                        {report.details}
                      </p>
                    </div>
                  )}

                  {/* Reviewed info */}
                  {report.reviewedBy && (
                    <p className="text-xs text-khoj-muted font-body">
                      Reviewed by {report.reviewedBy}
                      {report.reviewedAt ? ` · ${fmtDate(report.reviewedAt)}` : ''}
                      {report.actionTaken ? ` · Action: ${report.actionTaken.replace(/_/g, ' ')}` : ''}
                    </p>
                  )}

                  {/* Action buttons */}
                  <div className="flex flex-wrap gap-2">
                    {report.status !== 'action_taken' && (
                      <Button
                        size="sm"
                        variant="danger"
                        onClick={() => handleRemoveTarget(report)}
                        loading={busy}
                      >
                        Remove Content
                      </Button>
                    )}

                    {report.status === 'pending' && (
                      <Button
                        size="sm"
                        variant="secondary"
                        onClick={() => handleMarkReviewed(report)}
                        disabled={busy}
                      >
                        Mark Reviewed
                      </Button>
                    )}

                    {report.status !== 'dismissed' && report.status !== 'action_taken' && (
                      <Button
                        size="sm"
                        variant="secondary"
                        onClick={() => handleDismiss(report)}
                        disabled={busy}
                      >
                        Dismiss Report
                      </Button>
                    )}
                  </div>
                </div>
              </Card>
            )
          })}
        </div>
      )}
    </div>
  )
}
