import type { ReactNode } from 'react'
import { AdminGate } from '@/components/admin/AdminGate'

// Admin pages depend on authenticated Firebase state and live platform data.
// Keep this segment out of static prerendering on Vercel.
export const dynamic = 'force-dynamic'

interface AdminLayoutProps {
  children: ReactNode
}

export default function AdminLayout({ children }: AdminLayoutProps) {
  return <AdminGate>{children}</AdminGate>
}
