// app/recruiter/jobs/new/page.tsx
// Dedicated create-job page — reachable from the Invite to Apply modal empty state,
// from the /recruiter/jobs "New Job Post" button, and directly via URL.

'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { AppShell } from '@/components/layout/AppShell'
import { PageLoader } from '@/components/ui/LoadingSpinner'
import { JobForm } from '@/components/jobs/JobForm'
import { useAuth } from '@/hooks/useAuth'
import { createJobPost } from '@/services/hiringService'
import type { JobPost } from '@/lib/types'
import toast from 'react-hot-toast'

export default function NewJobPostPage() {
  const { khojUser, loading: authLoading } = useAuth()
  const router = useRouter()
  const [saving, setSaving] = useState(false)

  if (authLoading) return <PageLoader />

  if (!khojUser) {
    router.replace('/auth/login')
    return null
  }

  function handleSave(
    data: Omit<JobPost, 'id' | 'createdAt' | 'updatedAt' | 'applicationCount' | 'recruiterId' | 'recruiterName'>
  ) {
    if (!khojUser) return
    setSaving(true)
    try {
      createJobPost({ ...data, recruiterId: khojUser.uid, recruiterName: khojUser.name })
      toast.success('Job post created!')
      router.push('/recruiter/jobs')
    } finally {
      setSaving(false)
    }
  }

  return (
    <AppShell>
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 mb-6">
        <Link
          href="/recruiter"
          className="text-[9px] uppercase tracking-widest font-body text-khoj-muted hover:text-khoj-accent transition-colors"
        >
          Recruiter
        </Link>
        <span className="text-khoj-border">/</span>
        <Link
          href="/recruiter/jobs"
          className="text-[9px] uppercase tracking-widest font-body text-khoj-muted hover:text-khoj-accent transition-colors"
        >
          Jobs
        </Link>
        <span className="text-khoj-border">/</span>
        <span className="text-[9px] uppercase tracking-widest font-body text-khoj-subtle">
          New
        </span>
      </div>

      <h1 className="text-xl font-display font-bold text-khoj-text mb-6">Create New Job Post</h1>

      <div className="bg-khoj-card border border-khoj-accent/30 rounded-sm p-6">
        <JobForm
          onSave={handleSave}
          onCancel={() => router.push('/recruiter/jobs')}
          loading={saving}
        />
      </div>
    </AppShell>
  )
}
