'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import clsx from 'clsx'

const TOP_NAV_ITEMS = [
  { href: '/khoj-ai', label: 'KHOJ AI' },
  { href: '/dashboard', label: 'Dashboard' },
  { href: '/arena', label: 'Arena' },
  { href: '/community', label: 'Community' },
  { href: '/tournaments', label: 'Tournaments' },
  { href: '/leaderboard', label: 'Leaderboard' },
  { href: '/jobs', label: 'Jobs' },
  { href: '/rooms', label: 'Rooms' },
  { href: '/studio', label: 'Studio' },
] as const

function isActivePath(pathname: string, href: string): boolean {
  return pathname === href || pathname.startsWith(`${href}/`)
}

export function TopNav({ className }: { className?: string }) {
  const pathname = usePathname()

  return (
    <nav
      aria-label="Primary"
      className={clsx('min-w-0 overflow-x-auto scrollbar-none', className)}
    >
      <div className="flex w-max min-w-full items-center gap-1">
        {TOP_NAV_ITEMS.map((item) => {
          const active = isActivePath(pathname, item.href)

          return (
            <Link
              key={item.href}
              href={item.href}
              className={clsx(
                'flex-shrink-0 rounded-sm border px-3 py-1.5 text-xs font-semibold transition-colors',
                'focus:outline-none focus-visible:ring-1 focus-visible:ring-khoj-accent/60',
                active
                  ? 'border-khoj-accent/40 bg-khoj-accent/10 text-khoj-accent'
                  : 'border-transparent text-khoj-subtle hover:border-khoj-border hover:bg-khoj-card hover:text-khoj-text',
              )}
            >
              {item.label}
            </Link>
          )
        })}
      </div>
    </nav>
  )
}
