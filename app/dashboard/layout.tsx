// app/dashboard/layout.tsx
// Wraps all /dashboard routes with the new app shell (sidebar + topbar).

import { AppShell } from '@/components/layout/AppShell'
import { ReactNode } from 'react'

export default function DashboardLayout({ children }: { children: ReactNode }) {
  return <AppShell>{children}</AppShell>
}
