// components/layout/UserJobsPanel.tsx
// Collapsible "Jobs & Career" quick-access panel rendered inside the Sidebar.
// Shows four links with live badge counts:
//   My Applications, Saved Jobs, Job Alerts, Messages (recruiter unread)
//
// Badge counts are derived from service helpers so they are always in sync
// with the mock localStorage data. Swap the helper imports for Firestore
// query results when connecting the real backend.

'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { getApplicationsByUser } from '@/services/hiringService'
import { getSavedJobCount } from '@/services/savedJobService'
import { getActiveAlertCount } from '@/services/jobAlertService'
import { useConversations } from '@/hooks/useMessages'
import clsx from 'clsx'

// ── Badge chip ─────────────────────────────────────────────────────────────────

function Badge({ count, accent = false }: { count: number; accent?: boolean }) {
  if (count <= 0) return null
  return (
    <span
      className={clsx(
        'ml-auto text-[9px] font-mono font-bold w-4 h-4 rounded-full flex items-center justify-center leading-none',
        accent ? 'bg-khoj-accent text-white' : 'bg-khoj-border text-khoj-subtle'
      )}
    >
      {count > 99 ? '99+' : count}
    </span>
  )
}

// ── Main component ─────────────────────────────────────────────────────────────

interface UserJobsPanelProps {
  userId: string
}

export function UserJobsPanel({ userId }: UserJobsPanelProps) {
  const pathname = usePathname()
  const [open, setOpen] = useState(false)

  // Badge counts
  const [appCount, setAppCount] = useState(0)
  const [savedCount, setSavedCount] = useState(0)
  const [alertCount, setAlertCount] = useState(0)

  // Unread messages from the existing conversations hook
  const { conversations } = useConversations(userId)
  const unreadMessages = conversations.reduce(
    (sum, c) => sum + (c.unreadCount?.[userId] ?? 0),
    0
  )

  // Recompute counts every time panel opens or path changes
  useEffect(() => {
    if (!userId) return
    setAppCount(getApplicationsByUser(userId).length)
    setSavedCount(getSavedJobCount(userId))
    setAlertCount(getActiveAlertCount(userId))
  }, [userId, pathname, open])

  // Auto-open when current route matches any child route
  const childRoutes = [
    '/dashboard/applications',
    '/dashboard/saved-jobs',
    '/dashboard/job-alerts',
    '/messages',
    '/dashboard/interviews',
  ]
  const isChildActive = childRoutes.some(
    (r) => pathname === r || pathname.startsWith(r + '/')
  )

  // Expand the panel when a child route is active (only on first mount)
  useEffect(() => {
    if (isChildActive) setOpen(true)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const totalBadge = appCount + savedCount + unreadMessages

  const links = [
    {
      href: '/dashboard/applications',
      label: 'My Applications',
      icon: '◉',
      count: appCount,
      accent: false,
    },
    {
      href: '/dashboard/saved-jobs',
      label: 'Saved Jobs',
      icon: '☆',
      count: savedCount,
      accent: false,
    },
    {
      href: '/dashboard/job-alerts',
      label: 'Job Alerts',
      icon: '◈',
      count: alertCount,
      accent: false,
    },
    {
      href: '/messages',
      label: 'Recruiter Messages',
      icon: '✉',
      count: unreadMessages,
      accent: true,
    },
    {
      href: '/dashboard/interviews',
      label: 'My Interviews',
      icon: '◷',
      count: 0,
      accent: false,
    },
  ]

  return (
    <div className="border-t border-khoj-border/60">
      {/* Collapse toggle */}
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className={clsx(
          'w-full flex items-center gap-3 px-3 py-2.5 text-sm font-body font-medium transition-all duration-150',
          isChildActive
            ? 'text-khoj-accent'
            : 'text-khoj-subtle hover:text-khoj-text'
        )}
      >
        <span className="text-base w-5 text-center">◇</span>
        <span className="flex-1 text-left">Jobs & Career</span>
        {/* Badge when collapsed */}
        {!open && totalBadge > 0 && <Badge count={totalBadge} accent />}
        <span className={clsx('text-[10px] transition-transform', open && 'rotate-90')}>▶</span>
      </button>

      {/* Links */}
      {open && (
        <div className="pl-4 pr-2 pb-2 space-y-0.5">
          {links.map(({ href, label, icon, count, accent }) => {
            const isActive = pathname === href || pathname.startsWith(href + '/')
            return (
              <Link
                key={href}
                href={href}
                className={clsx(
                  'flex items-center gap-3 px-3 py-2 rounded-sm text-[12px] font-body font-medium transition-all duration-150',
                  isActive
                    ? 'bg-khoj-accent/10 text-khoj-accent border border-khoj-accent/20'
                    : 'text-khoj-muted hover:text-khoj-text hover:bg-khoj-muted/20 border border-transparent'
                )}
              >
                <span className="text-sm w-4 text-center">{icon}</span>
                {label}
                <Badge count={count} accent={accent} />
              </Link>
            )
          })}
        </div>
      )}
    </div>
  )
}
