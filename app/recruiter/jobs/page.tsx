// app/recruiter/jobs/page.tsx
// Recruiter job management — view, create, toggle active/inactive job posts.

'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { AppShell } from '@/components/layout/AppShell'
import { PageLoader } from '@/components/ui/LoadingSpinner'
import { HiringJobCard } from '@/components/jobs/HiringJobCard'
import { JobForm } from '@/components/jobs/JobForm'
import { DeleteConfirmModal } from '@/components/ui/DeleteConfirmModal'
import { useAuth } from '@/hooks/useAuth'
import {
  getJobPostsByRecruiter,
  createJobPost,
  updateJobPost,
  archiveJob,
  restoreJob,
} from '@/services/hiringService'
import type { JobPost } from '@/lib/types'
import toast from 'react-hot-toast'
import clsx from 'clsx'

type ViewMode = 'list' | 'create' | 'edit'

export default function RecruiterJobsPage() {
  const { khojUser, loading: authLoading } = useAuth()
  const router = useRouter()

  const [jobs, setJobs] = useState<JobPost[]>([])
  const [view, setView] = useState<ViewMode>('list')
  const [editingJob, setEditingJob] = useState<JobPost | null>(null)
  const [saving, setSaving] = useState(false)

  // Delete modal state
  const [jobToDelete, setJobToDelete] = useState<JobPost | null>(null)
  const [deleting, setDeleting] = useState(false)

  useEffect(() => {
    if (!khojUser) return
    setJobs(getJobPostsByRecruiter(khojUser.uid))
  }, [khojUser])

  if (authLoading) return <PageLoader />

  if (!khojUser) {
    router.replace('/auth/login')
    return null
  }

  function refresh() {
    if (!khojUser) return
    setJobs(getJobPostsByRecruiter(khojUser.uid))
  }

  function handleCreate(
    data: Omit<JobPost, 'id' | 'createdAt' | 'updatedAt' | 'applicationCount' | 'recruiterId' | 'recruiterName'>
  ) {
    if (!khojUser) return
    setSaving(true)
    try {
      createJobPost({ ...data, recruiterId: khojUser.uid, recruiterName: khojUser.name })
      toast.success('Job post created!')
      refresh()
      setView('list')
    } finally {
      setSaving(false)
    }
  }

  function handleEdit(
    data: Omit<JobPost, 'id' | 'createdAt' | 'updatedAt' | 'applicationCount' | 'recruiterId' | 'recruiterName'>
  ) {
    if (!editingJob) return
    setSaving(true)
    try {
      updateJobPost(editingJob.id, data)
      toast.success('Job updated!')
      refresh()
      setView('list')
      setEditingJob(null)
    } finally {
      setSaving(false)
    }
  }

  function handleToggleActive(job: JobPost) {
    updateJobPost(job.id, { active: !job.active })
    toast.success(job.active ? 'Job paused' : 'Job activated')
    refresh()
  }

  /** Opens the confirmation modal — does NOT delete immediately */
  function requestDelete(job: JobPost) {
    setJobToDelete(job)
  }

  /** Called when recruiter confirms deletion in the modal */
  function confirmDelete() {
    if (!jobToDelete || deleting) return
    setDeleting(true)
    try {
      archiveJob(jobToDelete.id)
      // Optimistic UI: remove from visible list immediately
      setJobs((prev) => prev.map((j) =>
        j.id === jobToDelete.id ? { ...j, deleted: true, active: false } : j
      ))
      toast.success(`"${jobToDelete.title}" archived`)
      setJobToDelete(null)
    } finally {
      setDeleting(false)
    }
  }

  function handleRestore(job: JobPost) {
    restoreJob(job.id)
    toast.success(`"${job.title}" restored — activate it to re-publish`)
    refresh()
  }

  const activeJobs  = jobs.filter((j) => j.active && !j.deleted)
  const pausedJobs  = jobs.filter((j) => !j.active && !j.deleted)
  const archivedJobs = jobs.filter((j) => j.deleted)
  const visibleCount = activeJobs.length + pausedJobs.length

  return (
    <AppShell>
      {/* ── Delete confirmation modal ── */}
      <DeleteConfirmModal
        isOpen={!!jobToDelete}
        itemName={jobToDelete?.title}
        loading={deleting}
        onConfirm={confirmDelete}
        onCancel={() => { if (!deleting) setJobToDelete(null) }}
      />

      {/* ── Header ── */}
      <div className="flex items-start justify-between gap-4 mb-6">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Link
              href="/recruiter"
              className="text-[9px] uppercase tracking-widest font-body text-khoj-muted hover:text-khoj-accent transition-colors"
            >
              Recruiter
            </Link>
            <span className="text-khoj-border">/</span>
            <span className="text-[9px] uppercase tracking-widest font-body text-khoj-subtle">
              Jobs
            </span>
          </div>
          <h1 className="text-xl font-display font-bold text-khoj-text">My Job Posts</h1>
          <p className="text-xs font-body text-khoj-subtle mt-1">
            {activeJobs.length} active · {pausedJobs.length} paused
            {archivedJobs.length > 0 && ` · ${archivedJobs.length} archived`}
          </p>
        </div>

        <button
          type="button"
          onClick={() => { setView('create'); setEditingJob(null) }}
          className={clsx(
            'flex items-center gap-2 text-xs font-body font-semibold px-4 py-2.5 rounded-sm transition-colors',
            view === 'create'
              ? 'bg-khoj-bg border border-khoj-border text-khoj-subtle'
              : 'bg-khoj-accent text-white hover:bg-khoj-accent/90'
          )}
        >
          + New Job Post
        </button>
      </div>

      {/* ── Create / Edit form ── */}
      {(view === 'create' || view === 'edit') && (
        <div className="bg-khoj-card border border-khoj-accent/30 rounded-sm p-6 mb-6">
          <h2 className="text-sm font-display font-semibold text-khoj-text mb-5">
            {view === 'edit' ? `Edit: ${editingJob?.title}` : 'Create New Job Post'}
          </h2>
          <JobForm
            initialData={editingJob ?? undefined}
            onSave={view === 'edit' ? handleEdit : handleCreate}
            onCancel={() => { setView('list'); setEditingJob(null) }}
            loading={saving}
          />
        </div>
      )}

      {/* ── Job list ── */}
      {visibleCount === 0 && archivedJobs.length === 0 && view === 'list' ? (
        <div className="flex flex-col items-center justify-center py-20 text-center gap-4">
          <span className="text-4xl text-khoj-muted">◈</span>
          <p className="text-sm font-body text-khoj-subtle">No job posts yet.</p>
          <button
            type="button"
            onClick={() => setView('create')}
            className="text-xs font-body text-khoj-accent border border-khoj-accent/30 px-4 py-2 rounded-sm hover:bg-khoj-accent/10 transition-colors"
          >
            Post your first job →
          </button>
        </div>
      ) : (
        <div className="space-y-8">
          {/* ── Active ── */}
          {activeJobs.length > 0 && (
            <section>
              <h2 className="text-[9px] uppercase tracking-widest font-body text-khoj-muted mb-3">
                Active ({activeJobs.length})
              </h2>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {activeJobs.map((job) => (
                  <div key={job.id} className="relative group">
                    <HiringJobCard job={job} recruiterView />
                    <div className="flex gap-1.5 mt-1.5">
                      <button
                        type="button"
                        onClick={() => { setEditingJob(job); setView('edit') }}
                        className="text-[9px] font-body text-khoj-subtle border border-khoj-border px-2.5 py-1 rounded-sm hover:text-khoj-text hover:border-khoj-accent/30 transition-colors"
                      >
                        ✎ Edit
                      </button>
                      <button
                        type="button"
                        onClick={() => handleToggleActive(job)}
                        className="text-[9px] font-body text-khoj-subtle border border-khoj-border px-2.5 py-1 rounded-sm hover:text-khoj-gold hover:border-khoj-gold/30 transition-colors"
                      >
                        ⏸ Pause
                      </button>
                      <button
                        type="button"
                        onClick={() => requestDelete(job)}
                        className="text-[9px] font-body text-khoj-subtle border border-khoj-border px-2.5 py-1 rounded-sm hover:text-red-400 hover:border-red-400/30 transition-colors"
                      >
                        ✕ Delete
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* ── Paused ── */}
          {pausedJobs.length > 0 && (
            <section>
              <h2 className="text-[9px] uppercase tracking-widest font-body text-khoj-muted mb-3">
                Paused ({pausedJobs.length})
              </h2>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 opacity-60">
                {pausedJobs.map((job) => (
                  <div key={job.id} className="relative">
                    <HiringJobCard job={job} recruiterView />
                    <div className="flex gap-1.5 mt-1.5">
                      <button
                        type="button"
                        onClick={() => handleToggleActive(job)}
                        className="text-[9px] font-body text-khoj-subtle border border-khoj-border px-2.5 py-1 rounded-sm hover:text-khoj-teal hover:border-khoj-teal/30 transition-colors"
                      >
                        ▶ Activate
                      </button>
                      <button
                        type="button"
                        onClick={() => requestDelete(job)}
                        className="text-[9px] font-body text-khoj-subtle border border-khoj-border px-2.5 py-1 rounded-sm hover:text-red-400 hover:border-red-400/30 transition-colors"
                      >
                        ✕ Delete
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* ── Archived ── */}
          {archivedJobs.length > 0 && (
            <section>
              <h2 className="text-[9px] uppercase tracking-widest font-body text-khoj-muted mb-3">
                Archived ({archivedJobs.length})
              </h2>
              <div className="space-y-2">
                {archivedJobs.map((job) => (
                  <div
                    key={job.id}
                    className="flex items-center justify-between gap-4 bg-khoj-card border border-khoj-border rounded-sm px-4 py-3 opacity-50"
                  >
                    <div className="min-w-0">
                      <p className="text-sm font-display font-semibold text-khoj-text truncate">
                        {job.title}
                      </p>
                      <p className="text-[10px] font-body text-khoj-muted mt-0.5">
                        {job.company} · {job.applicationCount} applicant{job.applicationCount !== 1 ? 's' : ''}
                        {job.deletedAt && (
                          <> · archived {new Date(job.deletedAt).toLocaleDateString()}</>
                        )}
                      </p>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <Link
                        href={`/recruiter/jobs/${job.id}/applicants`}
                        className="text-[9px] font-body text-khoj-subtle border border-khoj-border px-2.5 py-1 rounded-sm hover:text-khoj-accent hover:border-khoj-accent/30 transition-colors"
                      >
                        View Applicants
                      </Link>
                      <button
                        type="button"
                        onClick={() => handleRestore(job)}
                        className="text-[9px] font-body text-khoj-subtle border border-khoj-border px-2.5 py-1 rounded-sm hover:text-khoj-teal hover:border-khoj-teal/30 transition-colors"
                      >
                        ↺ Restore
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )}
        </div>
      )}
    </AppShell>
  )
}
