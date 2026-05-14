'use client'

import { createContext, useContext, type ReactNode } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useAdminGuard } from '@/hooks/useAdminGuard'
import { AdminSidebar } from '@/components/admin/AdminSidebar'
import { type KhojUser } from '@/lib/types'
import { type AdminAllowedRole } from '@/lib/admin/roles'

interface AdminGateProps {
  children: ReactNode
}

const AdminUserContext = createContext<KhojUser | null>(null)

export function useAdminUser(): KhojUser | null {
  return useContext(AdminUserContext)
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

const ADMIN_ONLY_ROLES: AdminAllowedRole[] = ['admin']
const GROWTH_STUDIO_ROLES: AdminAllowedRole[] = ['admin', 'founder', 'ceo']

function AdminAccessDenied({ message }: { message: string }) {
  return (
    <div className="min-h-screen bg-khoj-bg flex items-center justify-center px-6">
      <div className="max-w-md rounded-sm border border-khoj-border bg-khoj-card p-6 text-center">
        <div className="mx-auto mb-4 flex h-10 w-10 items-center justify-center rounded-sm border border-khoj-accent/30 bg-khoj-accent/10">
          <span className="font-display text-sm font-bold text-khoj-accent">K</span>
        </div>
        <p className="font-display text-lg font-bold text-khoj-text">{message}</p>
        <p className="mt-2 text-sm leading-6 text-khoj-subtle">
          Use an admin, founder, or CEO account, or return to the main app.
        </p>
        <Link
          href="/dashboard"
          className="mt-5 inline-flex rounded-sm border border-khoj-border px-4 py-2 text-sm font-semibold text-khoj-subtle transition-colors hover:border-khoj-accent hover:text-khoj-accent"
        >
          Back to Dashboard
        </Link>
      </div>
    </div>
  )
}

export function AdminGate({ children }: AdminGateProps) {
  const pathname = usePathname()
  const isGrowthStudioRoute = pathname.startsWith('/admin/growth-studio')
  const allowedRoles = isGrowthStudioRoute ? GROWTH_STUDIO_ROLES : ADMIN_ONLY_ROLES
  const { status, user } = useAdminGuard(allowedRoles)

  if (status === 'loading') {
    return <AdminAccessSpinner label="Verifying access..." />
  }

  if (status !== 'authorized' || !user) {
    return (
      <AdminAccessDenied
        message={
          isGrowthStudioRoute
            ? 'Your account does not have admin/founder/ceo permission.'
            : 'You do not have permission to access this admin area.'
        }
      />
    )
  }

  return (
    <AdminUserContext.Provider value={user}>
      <div className="flex min-h-screen bg-khoj-bg">
        <AdminSidebar adminUser={user} />
        <main className="flex-1 ml-60 min-h-screen">
          <div className="max-w-7xl mx-auto px-8 py-10">{children}</div>
        </main>
      </div>
    </AdminUserContext.Provider>
  )
}
