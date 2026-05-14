// app/studio/layout.tsx
// KHOJ Studio — dedicated creator dashboard layout with its own sidebar.

'use client'

import { useEffect } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import Link from 'next/link'
import { useAuth } from '@/hooks/useAuth'
import { PeopleSearchBox } from '@/components/layout/PeopleSearchBox'
import { TopNav } from '@/components/layout/TopNav'
import clsx from 'clsx'

const STUDIO_NAV = [
  { href: '/studio',              label: 'Overview',      icon: <OverviewIcon /> },
  { href: '/studio/content',      label: 'Content',       icon: <ContentIcon /> },
  { href: '/studio/analytics',    label: 'Analytics',     icon: <AnalyticsIcon /> },
  { href: '/studio/audience',     label: 'Audience',      icon: <AudienceIcon /> },
  { href: '/studio/comments',     label: 'Comments',      icon: <CommentsIcon /> },
  { href: '/studio/settings',     label: 'Settings',      icon: <SettingsIcon /> },
]

export default function StudioLayout({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, loading, khojUser, firebaseUser } = useAuth()
  const router = useRouter()
  const displayName = khojUser?.name || firebaseUser?.displayName || 'KHOJ Creator'
  const avatarUrl = khojUser?.avatarUrl || firebaseUser?.photoURL
  const profileMeta = khojUser?.username
    ? `@${khojUser.username}`
    : khojUser?.role
      ? `${khojUser.role === 'admin' ? 'Admin' : 'Member'} · Creator Studio`
      : 'Creator Studio'
  const initial = displayName.trim().charAt(0).toUpperCase() || 'K'

  useEffect(() => {
    if (!loading && !isAuthenticated) router.push('/auth/login')
  }, [loading, isAuthenticated, router])

  if (loading || !isAuthenticated) return null

  return (
    <div className="flex min-h-screen bg-[#0a0b0f]">
      {/* Studio sidebar */}
      <aside className="fixed left-0 top-0 z-40 flex h-full w-60 flex-col border-r border-[#1e1e2e] bg-[#0d0e14]">
        {/* Brand */}
        <div className="flex-shrink-0 border-b border-[#1e1e2e] px-4 pb-4 pt-5">
          <Link href="/studio" className="flex min-h-12 items-center gap-3 rounded-xl px-1 transition-colors hover:bg-white/[0.03]">
            <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg bg-[#ff5a00] shadow-[0_0_28px_rgba(255,90,0,0.22)]">
              <span className="text-sm font-black tracking-tight text-white">K</span>
            </div>
            <div className="min-w-0">
              <p className="truncate text-sm font-black tracking-[0.18em] text-white">KHOJ</p>
              <p className="truncate text-[10px] font-semibold uppercase tracking-[0.16em] text-[#ff5a00]">Studio</p>
            </div>
          </Link>
        </div>

        {/* User mini-profile */}
        <div className="flex-shrink-0 border-b border-[#1e1e2e] px-4 py-4">
          <div className="flex min-h-[72px] items-center gap-3 overflow-hidden rounded-xl border border-white/[0.06] bg-white/[0.035] px-3 py-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]">
            <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center overflow-hidden rounded-lg border border-[#ff5a00]/25 bg-[#ff5a00]/10 text-sm font-bold text-[#ff5a00]">
              {avatarUrl ? (
                <img src={avatarUrl} alt={displayName} className="h-full w-full object-cover" />
              ) : (
                initial
              )}
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-bold text-white">{displayName}</p>
              <p className="mt-0.5 truncate text-[11px] font-medium text-zinc-500">{profileMeta}</p>
            </div>
          </div>
        </div>

        {/* Nav */}
        <nav className="min-h-0 flex-1 space-y-1 overflow-y-auto px-3 py-4">
          {STUDIO_NAV.map((item) => (
            <StudioNavLink key={item.href} {...item} />
          ))}
        </nav>

        {/* Footer actions */}
        <div className="flex-shrink-0 space-y-3 border-t border-[#1e1e2e] px-4 py-4">
          <Link href="/arena" className="flex items-center gap-2 rounded-lg px-2 py-2 text-xs font-semibold text-zinc-500 transition-colors hover:bg-white/[0.04] hover:text-zinc-300">
            <svg className="h-3.5 w-3.5 flex-shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
              <path d="M15 18l-6-6 6-6"/>
            </svg>
            <span>Back to KHOJ</span>
          </Link>
          <Link
            href="/arena"
            className="flex w-full items-center justify-center gap-2 rounded-lg bg-[#ff5a00] px-3 py-2.5 text-xs font-bold text-white transition-colors hover:bg-[#ff4400]"
          >
            <svg className="h-3.5 w-3.5 flex-shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/>
            </svg>
            Upload Now
          </Link>
        </div>
      </aside>

      {/* Main content */}
      <div className="ml-60 min-h-screen flex-1 overflow-y-auto">
        <header className="fixed left-60 right-0 top-0 z-30 flex h-14 items-center gap-3 border-b border-[#1e1e2e] bg-[#0a0b0f] px-4 lg:px-6">
          <TopNav className="flex-1" />
          <PeopleSearchBox className="w-40 sm:w-48 xl:w-60" />
        </header>
        <main className="pt-14">
          {children}
        </main>
      </div>
    </div>
  )
}

function StudioNavLink({
  href,
  label,
  icon,
}: {
  href: string
  label: string
  icon: React.ReactNode
}) {
  const pathname = usePathname()
  const isActive = href === '/studio' ? pathname === '/studio' : pathname.startsWith(href)

  return (
    <Link
      href={href}
      className={clsx(
        'flex items-center gap-3 px-3 py-2.5 rounded-lg text-xs font-semibold transition-all',
        isActive
          ? 'bg-[#ff5a00]/10 text-[#ff5a00] border border-[#ff5a00]/20'
          : 'text-zinc-400 hover:text-white hover:bg-white/5 border border-transparent',
      )}
    >
      <span className="w-4 h-4 flex-shrink-0">{icon}</span>
      <span className="flex-1">{label}</span>
    </Link>
  )
}

// ── SVG Icons ─────────────────────────────────────────────────────────────────

function OverviewIcon() {
  return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/></svg>
}
function ContentIcon() {
  return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4"><polygon points="23 7 16 12 23 17 23 7"/><rect x="1" y="5" width="15" height="14" rx="2" ry="2"/></svg>
}
function AnalyticsIcon() {
  return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></svg>
}
function AudienceIcon() {
  return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
}
function CommentsIcon() {
  return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
}
function EarningsIcon() { return null }
function SettingsIcon() {
  return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>
}
