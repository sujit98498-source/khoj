// app/recruiter/jobs/[jobId]/applicants/page.tsx
// Kanban applicant pipeline for a single job post.
// Recruiter can move applicants between stages, add notes, view profiles.

'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { AppShell } from '@/components/layout/AppShell'
import { PageLoader } from '@/components/ui/LoadingSpinner'
import { ApplicantTable } from '@/components/recruiter/ApplicantTable'
import { useAuth } from '@/hooks/useAuth'
import {
  getJobPost,
  getApplicationsForJob,
  getStageCounts,
} from '@/services/hiringService'
import type { JobPost, JobApplication, ApplicationStage } from '@/lib/types'
import { ApplicationStatusBadge } from '@/components/jobs/ApplicationStatusBadge'

const STAGE_SUMMARY_ORDER: ApplicationStage[] = [
  'applied', 'shortlisted', 'interview', 'offered', 'hired', 'rejected',
]

export default function ApplicantsPage() {
  const params = useParams()
  const router = useRouter()
  const { khojUser, loading: authLoading } = useAuth()

  const jobId =
    typeof params.jobId === 'string'
      ? params.jobId
      : Array.isArray(params.jobId)
      ? params.jobId[0]
      : ''

  const [job, setJob] = useState<JobPost | null>(null)
  const [applications, setApplications] = useState<JobApplication[]>([])
  const [notFound, setNotFound] = useState(false)

  useEffect(() => {
    const found = getJobPost(jobId)
    if (!found) { setNotFound(true); return }
    setJob(found)
    setApplications(getApplicationsForJob(jobId))
  }, [jobId])

  if (authLoading) return <PageLoader />
  if (!khojUser) { router.replace('/auth/login'); return null }

  if (notFound || !job) {
    return (
      <AppShell>
        <div className="flex flex-col items-center justify-center py-32 gap-4">
          <span className="text-4xl text-khoj-muted">◈</span>
          <p className="text-sm font-body text-khoj-subtle">Job post not found.</p>
          <Link href="/recruiter/jobs" className="text-xs font-body text-khoj-accent hover:underline">
            ← Back to My Jobs
          </Link>
        </div>
      </AppShell>
    )
  }

  const stageCounts = getStageCounts(jobId)

  return (
    <AppShell>
      {/* ── Header ── */}
      <div className="mb-6">
        {/* Breadcrumb */}
        <div className="flex items-center gap-2 mb-2 text-[9px] uppercase tracking-widest font-body text-khoj-muted">
          <Link href="/recruiter" className="hover:text-khoj-accent transition-colors">Recruiter</Link>
          <span className="text-khoj-border">/</span>
          <Link href="/recruiter/jobs" className="hover:text-khoj-accent transition-colors">Jobs</Link>
          <span className="text-khoj-border">/</span>
          <span className="text-khoj-subtle truncate max-w-[200px]">{job.title}</span>
          <span className="text-khoj-border">/</span>
          <span className="text-khoj-subtle">Applicants</span>
        </div>

        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-xl font-display font-bold text-khoj-text">{job.title}</h1>
            <p className="text-sm font-body text-khoj-accent">{job.company}</p>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-body font-semibold text-khoj-subtle border border-khoj-border px-2.5 py-1.5 rounded-sm">
              {applications.length} applicant{applications.length !== 1 ? 's' : ''}
            </span>
            <Link
              href={`/jobs/${job.id}`}
              className="text-[10px] font-body text-khoj-subtle border border-khoj-border px-2.5 py-1.5 rounded-sm hover:text-khoj-accent hover:border-khoj-accent/30 transition-colors"
            >
              View Posting →
            </Link>
          </div>
        </div>

        {/* Stage counts strip */}
        <div className="flex flex-wrap gap-2 mt-4">
          {STAGE_SUMMARY_ORDER.map((stage) => (
            stageCounts[stage] > 0 ? (
              <div key={stage} className="flex items-center gap-1.5">
                <ApplicationStatusBadge stage={stage} size="xs" />
                <span className="text-[10px] font-mono text-khoj-muted">{stageCounts[stage]}</span>
              </div>
            ) : null
          ))}
        </div>
      </div>

      {/* ── Kanban ── */}
      <ApplicantTable
        initialApplications={applications}
        jobId={job.id}
        jobTitle={job.title}
        recruiterId={khojUser.uid}
        recruiterName={khojUser.name}
      />
    </AppShell>
  )
}
