// components/layout/ClientLayout.tsx
// Conditional layout: app-shell routes hide the old Navbar/Footer.
// Public/auth routes keep the original Navbar + Footer.
'use client'

import { usePathname } from 'next/navigation'
import { Navbar } from './Navbar'
import { Footer } from './Footer'
import { IncomingCallBanner } from '@/components/calls/IncomingCallBanner'
import { useAuth } from '@/hooks/useAuth'
import { ReactNode } from 'react'

// Routes that use AppShell (sidebar + topbar). Add more as pages are migrated.
const APP_SHELL_PREFIXES = [
  '/dashboard',
  '/khoj-ai',
  '/messages',
  '/community',
  '/rooms',
  '/jobs',
  '/tournaments',
  '/leaderboard',
  '/network',
  '/profile',
  '/matches',
  '/search',
  '/settings',
  '/admin',
  '/recruiter',
  '/talent',
  '/payment-success',
  '/payment-failure',
  '/studio',
]

export function ClientLayout({ children }: { children: ReactNode }) {
  const pathname = usePathname()
  const { khojUser } = useAuth()

  const isAppShellRoute = APP_SHELL_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(prefix + '/')
  )

  if (isAppShellRoute) {
    // No Navbar, no Footer, no top padding — AppShell takes full control
    return (
      <>
        {khojUser && <IncomingCallBanner />}
        {children}
      </>
    )
  }

  // Public / auth pages — keep original Navbar + padded main + Footer
  return (
    <>
      <Navbar />
      <main className="min-h-screen pt-16 pb-12">{children}</main>
      <Footer />
    </>
  )
}
