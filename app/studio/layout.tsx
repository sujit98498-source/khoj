// app/studio/layout.tsx
// KHOJ Studio — dedicated creator dashboard layout with its own sidebar.

'use client'

import { useEffect } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import Link from 'next/link'
import { useAuth } from '@/hooks/useAuth'
import clsx from 'clsx'

const STUDIO_NAV = [
  { href: '/studio',              label: 'Overview',      icon: <OverviewIcon /> },
  { href: '/studio/content',      label: 'Content',       icon: <ContentIcon /> },
  { href: '/studio/analytics',    label: 'Analytics',     icon: <AnalyticsIcon /> },
  { href: '/studio/audience',     label: 'Audience',      icon: <AudienceIcon /> },
  { href: '/studio/comments',     label: 'Comments',      icon: <CommentsIcon /> },
  { href: '/studio/tracks',       label: 'Tracks',        icon: <TracksIcon /> },
  { href: '/studio/settings',     label: 'Settings',      icon: <SettingsIcon /> },
]

export default function StudioLayout({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, loading, khojUser } = useAuth()
  const router = useRouter()

  useEffect(() => {
    if (!loading && !isAuthenticated) router.push('/auth/login')
  }, [loading, isAuthenticated, router])

  if (loading || !isAuthenticated) return null

  return (
    <div className="flex min-h-screen bg-[#0a0b0f]">
      {/* Studio sidebar */}
      <aside className="fixed left-0 top-0 h-full w-56 bg-[#0d0e14] border-r border-[#1e1e2e] flex flex-col z-40">
        {/* Logo + back link */}
        <div className="px-5 py-5 border-b border-[#1e1e2e]">
          <Link href="/arena" className="flex items-center gap-2 text-zinc-500 hover:text-zinc-300 text-xs mb-4 transition-colors">
            <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
              <path d="M15 18l-6-6 6-6"/>
            </svg>
            Back to KHOJ
          </Link>
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 bg-[#ff5a00] rounded-md flex items-center justify-center">
              <svg className="w-4 h-4 text-white" viewBox="0 0 24 24" fill="currentColor">
                <path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-7 14l-5-5 1.41-1.41L12 14.17l7.59-7.59L21 8l-9 9z"/>
              </svg>
            </div>
            <div>
              <p className="text-white text-xs font-bold tracking-wider">KHOJ STUDIO</p>
              <p className="text-[#ff5a00] text-[10px] font-semibold truncate max-w-[100px]">{khojUser?.name}</p>
            </div>
          </div>
        </div>

        {/* Nav */}
        <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto">
          {STUDIO_NAV.map((item) => (
            <StudioNavLink key={item.href} {...item} />
          ))}
        </nav>

        {/* Upload button */}
        <div className="px-3 pb-5">
          <Link
            href="/arena"
            className="flex items-center justify-center gap-2 w-full px-3 py-2.5 rounded-lg bg-[#ff5a00] text-white text-xs font-bold hover:bg-[#ff4400] transition-colors"
          >
            <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/>
            </svg>
            Upload Now
          </Link>
        </div>
      </aside>

      {/* Main content */}
      <div className="flex-1 ml-56 min-h-screen overflow-y-auto">
        {children}
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
function TracksIcon() {
  return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4"><path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/></svg>
}
function EarningsIcon() { return null }
function SettingsIcon() {
  return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>
}
