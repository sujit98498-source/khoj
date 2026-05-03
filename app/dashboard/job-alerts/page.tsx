// app/dashboard/job-alerts/page.tsx
// User's job alert management — create, edit, pause, delete alerts.

'use client'

import { useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { AppShell } from '@/components/layout/AppShell'
import { PageLoader } from '@/components/ui/LoadingSpinner'
import { useAuth } from '@/hooks/useAuth'
import { useJobs } from '@/lib/jobs-context'
import {
  getAlertsByUser,
  createAlert,
  updateAlert,
  toggleAlert,
  deleteAlert,
  type CreateAlertParams,
} from '@/services/jobAlertService'
import type { JobAlert, AlertFrequency, JobCategory, WorkType } from '@/lib/types'
import toast from 'react-hot-toast'
import clsx from 'clsx'

// ── Options ───────────────────────────────────────────────────────────────────

const CATEGORIES: JobCategory[] = [
  'Coding', 'Design', 'Esports', 'Startups', 'Marketing', 'Data', 'Product', 'Other',
]

const WORK_TYPES: { value: WorkType; label: string }[] = [
  { value: 'remote', label: 'Remote' },
  { value: 'onsite', label: 'On-Site' },
  { value: 'hybrid', label: 'Hybrid' },
]

const FREQUENCIES: { value: AlertFrequency; label: string; desc: string }[] = [
  { value: 'instant', label: 'Instant', desc: 'As jobs are posted' },
  { value: 'daily',   label: 'Daily',   desc: 'Once per day digest' },
  { value: 'weekly',  label: 'Weekly',  desc: 'Weekly summary' },
]

// ── Empty alert form state ─────────────────────────────────────────────────────

function emptyForm(): Omit<CreateAlertParams, 'userId'> {
  return {
    label: '',
    keyword: '',
    category: undefined,
    location: '',
    workType: undefined,
    salaryMin: undefined,
    salaryMax: undefined,
    frequency: 'daily',
  }
}

// ── Alert card ────────────────────────────────────────────────────────────────

interface AlertCardProps {
  alert: JobAlert
  onToggle: (id: string) => void
  onDelete: (id: string) => void
  onEdit: (alert: JobAlert) => void
}

function AlertCard({ alert, onToggle, onDelete, onEdit }: AlertCardProps) {
  const chips: string[] = []
  if (alert.keyword) chips.push(`"${alert.keyword}"`)
  if (alert.category) chips.push(alert.category)
  if (alert.location) chips.push(`📍 ${alert.location}`)
  if (alert.workType) chips.push(alert.workType)
  if (alert.salaryMin && alert.salaryMax)
    chips.push(`$${(alert.salaryMin / 1000).toFixed(0)}k–$${(alert.salaryMax / 1000).toFixed(0)}k`)

  return (
    <div
      className={clsx(
        'bg-khoj-card border rounded-sm p-4 transition-colors',
        alert.active
          ? 'border-khoj-border hover:border-khoj-accent/30'
          : 'border-khoj-border opacity-60'
      )}
    >
      <div className="flex items-start justify-between gap-3 mb-2">
        <div className="flex-1 min-w-0">
          <p className="text-sm font-display font-bold text-khoj-text truncate">
            {alert.label}
          </p>
          <p className="text-[9px] font-body text-khoj-muted uppercase tracking-widest mt-0.5">
            {FREQUENCIES.find((f) => f.value === alert.frequency)?.label} alert
            {alert.active ? '' : ' · Paused'}
          </p>
        </div>
        {/* Active toggle */}
        <button
          type="button"
          onClick={() => onToggle(alert.id)}
          className={clsx(
            'relative w-9 h-5 rounded-full transition-colors flex-shrink-0 mt-0.5',
            alert.active ? 'bg-khoj-accent' : 'bg-khoj-border'
          )}
          title={alert.active ? 'Pause alert' : 'Resume alert'}
        >
          <span
            className={clsx(
              'absolute top-0.5 w-4 h-4 rounded-full bg-white transition-transform',
              alert.active ? 'translate-x-4' : 'translate-x-0.5'
            )}
          />
        </button>
      </div>

      {/* Filter chips */}
      {chips.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mb-3">
          {chips.map((c) => (
            <span
              key={c}
              className="text-[9px] font-mono px-2 py-0.5 bg-khoj-bg border border-khoj-border text-khoj-subtle rounded-sm"
            >
              {c}
            </span>
          ))}
        </div>
      )}

      {/* Actions */}
      <div className="flex items-center gap-2 pt-3 border-t border-khoj-border/50">
        <button
          type="button"
          onClick={() => onEdit(alert)}
          className="text-[10px] font-body text-khoj-subtle border border-khoj-border px-3 py-1.5 rounded-sm hover:text-khoj-text hover:border-khoj-accent/30 transition-colors"
        >
          ✎ Edit
        </button>
        <button
          type="button"
          onClick={() => onDelete(alert.id)}
          className="ml-auto text-[10px] font-body text-khoj-muted border border-khoj-border px-3 py-1.5 rounded-sm hover:text-red-400 hover:border-red-400/30 transition-colors"
        >
          ✕ Delete
        </button>
      </div>
    </div>
  )
}

// ── Alert form modal ──────────────────────────────────────────────────────────

interface AlertFormProps {
  editAlert?: JobAlert
  userId: string
  onSave: (alert: JobAlert) => void
  onClose: () => void
}

function AlertFormModal({ editAlert, userId, onSave, onClose }: AlertFormProps) {
  const [form, setForm] = useState<Omit<CreateAlertParams, 'userId'>>(() =>
    editAlert
      ? {
          label: editAlert.label,
          keyword: editAlert.keyword ?? '',
          category: editAlert.category,
          location: editAlert.location ?? '',
          workType: editAlert.workType,
          salaryMin: editAlert.salaryMin,
          salaryMax: editAlert.salaryMax,
          frequency: editAlert.frequency,
        }
      : emptyForm()
  )
  const [error, setError] = useState('')

  function set<K extends keyof typeof form>(k: K, v: (typeof form)[K]) {
    setForm((p) => ({ ...p, [k]: v }))
  }

  function handleSave(e: React.FormEvent) {
    e.preventDefault()
    if (!form.label.trim()) { setError('Alert name is required'); return }
    if (!form.keyword && !form.category && !form.location) {
      setError('Add at least one filter: keyword, category, or location')
      return
    }
    setError('')

    if (editAlert) {
      const updated = updateAlert(editAlert.id, {
        label: form.label.trim(),
        keyword: form.keyword?.trim() || undefined,
        category: form.category,
        location: form.location?.trim() || undefined,
        workType: form.workType,
        salaryMin: form.salaryMin,
        salaryMax: form.salaryMax,
        frequency: form.frequency,
      })
      if (updated) { onSave(updated); toast.success('Alert updated') }
    } else {
      const created = createAlert({
        ...form,
        userId,
        keyword: form.keyword?.trim() || undefined,
        location: form.location?.trim() || undefined,
        label: form.label.trim(),
      })
      onSave(created)
      toast.success('Alert created!')
    }
  }

  const fieldCls =
    'w-full text-xs font-body bg-khoj-bg border border-khoj-border rounded-sm px-3 py-2.5 text-khoj-text placeholder:text-khoj-muted focus:outline-none focus:border-khoj-accent/60 transition-colors'

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
      onClick={(e) => { if (e.target === e.currentTarget) onClose() }}
    >
      <div className="w-full max-w-md bg-khoj-card border border-khoj-border rounded-sm shadow-2xl">
        <div className="flex items-center justify-between px-5 py-4 border-b border-khoj-border">
          <h2 className="text-sm font-display font-bold text-khoj-text">
            {editAlert ? 'Edit Alert' : 'Create Job Alert'}
          </h2>
          <button type="button" onClick={onClose} className="text-khoj-muted hover:text-khoj-text text-lg leading-none">✕</button>
        </div>

        <form onSubmit={handleSave} className="p-5 space-y-4 max-h-[80vh] overflow-y-auto">
          {/* Label */}
          <div>
            <label className="block text-[10px] uppercase tracking-widest font-body text-khoj-subtle mb-1.5">
              Alert Name <span className="text-khoj-accent">*</span>
            </label>
            <input
              type="text"
              value={form.label}
              onChange={(e) => set('label', e.target.value)}
              maxLength={80}
              placeholder='e.g. "React Jobs in Kathmandu"'
              className={fieldCls}
            />
          </div>

          {/* Keyword */}
          <div>
            <label className="block text-[10px] uppercase tracking-widest font-body text-khoj-subtle mb-1.5">
              Keyword
            </label>
            <input
              type="text"
              value={form.keyword ?? ''}
              onChange={(e) => set('keyword', e.target.value)}
              placeholder="React, Figma, Marketing…"
              className={fieldCls}
            />
          </div>

          {/* Category */}
          <div>
            <label className="block text-[10px] uppercase tracking-widest font-body text-khoj-subtle mb-1.5">
              Category
            </label>
            <select
              value={form.category ?? ''}
              onChange={(e) => set('category', (e.target.value as JobCategory) || undefined)}
              className={clsx(fieldCls, 'cursor-pointer')}
            >
              <option value="">Any category</option>
              {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>

          {/* Location */}
          <div>
            <label className="block text-[10px] uppercase tracking-widest font-body text-khoj-subtle mb-1.5">
              Location
            </label>
            <input
              type="text"
              value={form.location ?? ''}
              onChange={(e) => set('location', e.target.value)}
              placeholder="Kathmandu, Remote…"
              className={fieldCls}
            />
          </div>

          {/* Work type */}
          <div>
            <label className="block text-[10px] uppercase tracking-widest font-body text-khoj-subtle mb-1.5">
              Work Type
            </label>
            <div className="flex gap-2">
              {WORK_TYPES.map(({ value, label }) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => set('workType', form.workType === value ? undefined : value)}
                  className={clsx(
                    'flex-1 py-2 text-[10px] font-body rounded-sm border transition-colors',
                    form.workType === value
                      ? 'bg-khoj-accent/10 text-khoj-accent border-khoj-accent/40 font-semibold'
                      : 'bg-khoj-bg border-khoj-border text-khoj-subtle hover:border-khoj-accent/30'
                  )}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          {/* Salary range */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[10px] uppercase tracking-widest font-body text-khoj-subtle mb-1.5">
                Min Salary (USD)
              </label>
              <input
                type="number"
                min={0}
                value={form.salaryMin ?? ''}
                onChange={(e) => set('salaryMin', e.target.value ? Number(e.target.value) : undefined)}
                placeholder="30000"
                className={fieldCls}
              />
            </div>
            <div>
              <label className="block text-[10px] uppercase tracking-widest font-body text-khoj-subtle mb-1.5">
                Max Salary (USD)
              </label>
              <input
                type="number"
                min={0}
                value={form.salaryMax ?? ''}
                onChange={(e) => set('salaryMax', e.target.value ? Number(e.target.value) : undefined)}
                placeholder="80000"
                className={fieldCls}
              />
            </div>
          </div>

          {/* Frequency */}
          <div>
            <label className="block text-[10px] uppercase tracking-widest font-body text-khoj-subtle mb-1.5">
              Frequency
            </label>
            <div className="grid grid-cols-3 gap-2">
              {FREQUENCIES.map(({ value, label, desc }) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => set('frequency', value)}
                  className={clsx(
                    'flex flex-col items-center p-2.5 rounded-sm border text-center transition-colors',
                    form.frequency === value
                      ? 'bg-khoj-accent/10 text-khoj-accent border-khoj-accent/40'
                      : 'bg-khoj-bg border-khoj-border text-khoj-subtle hover:border-khoj-accent/30'
                  )}
                >
                  <span className="text-[10px] font-body font-semibold">{label}</span>
                  <span className="text-[8px] font-body text-khoj-muted mt-0.5">{desc}</span>
                </button>
              ))}
            </div>
          </div>

          {error && <p className="text-[10px] text-red-400 font-body">{error}</p>}

          <div className="flex gap-3 pt-1">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2.5 text-xs font-body text-khoj-subtle border border-khoj-border rounded-sm hover:text-khoj-text transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="flex-1 py-2.5 text-xs font-body font-semibold bg-khoj-accent text-white rounded-sm hover:bg-khoj-accent/90 transition-colors"
            >
              {editAlert ? 'Save Changes' : 'Create Alert'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function JobAlertsPage() {
  const router = useRouter()
  const { khojUser, loading: authLoading } = useAuth()
  const { refresh } = useJobs()

  const [alerts, setAlerts] = useState<JobAlert[]>([])
  const [showForm, setShowForm] = useState(false)
  const [editTarget, setEditTarget] = useState<JobAlert | undefined>(undefined)

  const reload = useCallback(() => {
    if (!khojUser) return
    setAlerts(getAlertsByUser(khojUser.uid))
  }, [khojUser])

  useEffect(() => { reload() }, [reload])

  if (authLoading) return <PageLoader />
  if (!khojUser) { router.replace('/auth/login'); return null }

  function handleToggle(id: string) {
    const isNowActive = toggleAlert(id)
    setAlerts((prev) =>
      prev.map((a) => (a.id === id ? { ...a, active: isNowActive, updatedAt: new Date().toISOString() } : a))
    )
    toast.success(isNowActive ? 'Alert resumed' : 'Alert paused')
    refresh()
  }

  function handleDelete(id: string) {
    deleteAlert(id)
    setAlerts((prev) => prev.filter((a) => a.id !== id))
    toast.success('Alert deleted')
    refresh()
  }

  function handleEdit(alert: JobAlert) {
    setEditTarget(alert)
    setShowForm(true)
  }

  function handleFormSave(saved: JobAlert) {
    reload()
    refresh()
    setShowForm(false)
    setEditTarget(undefined)
  }

  const activeCount = alerts.filter((a) => a.active).length

  return (
    <AppShell>
      <div className="max-w-3xl mx-auto px-4 sm:px-6 py-8">
        {/* ── Header ────────────────────────────────────────────────────────── */}
        <div className="flex items-start justify-between gap-4 mb-6">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <Link href="/dashboard" className="text-[10px] font-body text-khoj-muted hover:text-khoj-accent transition-colors">
                Dashboard
              </Link>
              <span className="text-khoj-muted text-[10px]">/</span>
              <span className="text-[10px] font-body text-khoj-subtle">Job Alerts</span>
            </div>
            <h1 className="text-2xl font-display font-bold text-khoj-text">Job Alerts</h1>
            <p className="text-xs font-body text-khoj-muted mt-1">
              {activeCount} active alert{activeCount !== 1 ? 's' : ''}
              {alerts.length > activeCount ? ` · ${alerts.length - activeCount} paused` : ''}
            </p>
          </div>
          <button
            type="button"
            onClick={() => { setEditTarget(undefined); setShowForm(true) }}
            className="inline-flex items-center gap-1.5 text-xs font-body font-semibold bg-khoj-accent text-white px-4 py-2 rounded-sm hover:bg-khoj-accent/90 transition-colors"
          >
            + New Alert
          </button>
        </div>

        {/* ── How it works strip (shown when empty) ─────────────────────────── */}
        {alerts.length === 0 && (
          <div className="bg-khoj-card border border-khoj-border rounded-sm p-5 mb-6">
            <p className="text-xs font-body font-semibold text-khoj-text mb-3">How Job Alerts work</p>
            <ol className="space-y-2">
              {[
                'Create an alert with a keyword, category, or location.',
                'When recruiters post matching jobs, you\'ll be notified.',
                'Choose Instant, Daily, or Weekly digest frequency.',
                'Pause or delete alerts any time.',
              ].map((step, i) => (
                <li key={i} className="flex items-start gap-2">
                  <span className="text-[9px] font-mono text-khoj-accent border border-khoj-accent/30 w-4 h-4 flex items-center justify-center rounded-sm flex-shrink-0 mt-0.5">
                    {i + 1}
                  </span>
                  <p className="text-[11px] font-body text-khoj-subtle">{step}</p>
                </li>
              ))}
            </ol>
          </div>
        )}

        {/* ── Alert list ────────────────────────────────────────────────────── */}
        {alerts.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 gap-4 text-center">
            <span className="text-4xl text-khoj-muted">◈</span>
            <p className="text-sm font-body text-khoj-subtle">No alerts yet.</p>
            <button
              type="button"
              onClick={() => { setEditTarget(undefined); setShowForm(true) }}
              className="text-xs font-body font-semibold bg-khoj-accent text-white px-5 py-2.5 rounded-sm hover:bg-khoj-accent/90 transition-colors"
            >
              Create Your First Alert
            </button>
          </div>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2">
            {alerts.map((alert) => (
              <AlertCard
                key={alert.id}
                alert={alert}
                onToggle={handleToggle}
                onDelete={handleDelete}
                onEdit={handleEdit}
              />
            ))}
          </div>
        )}
      </div>

      {/* ── Form modal ────────────────────────────────────────────────────────── */}
      {showForm && (
        <AlertFormModal
          editAlert={editTarget}
          userId={khojUser.uid}
          onSave={handleFormSave}
          onClose={() => { setShowForm(false); setEditTarget(undefined) }}
        />
      )}
    </AppShell>
  )
}
