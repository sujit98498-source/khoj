'use client'

import { useEffect, ReactNode } from 'react'
import { useRouter } from 'next/navigation'
import { useAdminGuard } from '@/hooks/useAdminGuard'
import { AdminSidebar } from '@/components/admin/AdminSidebar'

interface AdminLayoutProps {
  children: ReactNode
}

function AdminAccessSpinner({ label }: { label: string }) {
  return (
    <div className="min-h-screen bg-khoj-bg flex items-center justify-center">
      <div className="flex flex-col items-center gap-4">
        <div className="w-8 h-8 rounded-sm bg-khoj-accent/20 border border-khoj-accent/30 flex items-center justify-center animate-pulse">
          <span className="text-khoj-accent font-display font-bold text-sm">K</span>
        </div>
        <p className="text-xs uppercase tracking-widest text-khoj-subtle font-body animate-pulse">
          {label}
        </p>
      </div>
    </div>
  )
}

export default function AdminLayout({ children }: AdminLayoutProps) {
  const { status, user } = useAdminGuard()
  const router = useRouter()

  useEffect(() => {
    if (status === 'unauthorized') {
      router.replace('/dashboard')
    }
  }, [status, router])

  if (status === 'loading') {
    return <AdminAccessSpinner label="Verifying access..." />
  }

  if (status !== 'authorized' || !user) {
    return null
  }

  return (
    <div className="flex min-h-screen bg-khoj-bg">
      <AdminSidebar adminUser={user} />
      <main className="flex-1 ml-60 min-h-screen">
        <div className="max-w-7xl mx-auto px-8 py-10">{children}</div>
      </main>
    </div>
  )
}
