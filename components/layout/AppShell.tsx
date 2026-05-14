// components/layout/AppShell.tsx
// Wraps all authenticated pages with sidebar + topbar + main content area

'use client'

import { useEffect, useRef, useState } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { useAuth } from '@/hooks/useAuth'
import { useNotifications } from '@/hooks/useNotifications'
import { useConversations } from '@/hooks/useMessages'
import { resolveNotificationUrl } from '@/services/notificationService'
import { Sidebar } from './Sidebar'
import { TopNav } from './TopNav'
import { PeopleSearchBox } from './PeopleSearchBox'
import { PageLoader } from '@/components/ui/LoadingSpinner'
import Link from 'next/link'
import { ReactNode } from 'react'
import clsx from 'clsx'

interface AppShellProps {
  children: ReactNode
  /** When true, renders children at full height without the max-width content wrapper.
   *  Used by immersive pages like the stream room. */
  fullWidth?: boolean
}

// ── Notification dropdown ─────────────────────────────────────────────────────

function NotificationDropdown({
  open,
  onClose,
}: {
  open: boolean
  onClose: () => void
}) {
  const { khojUser } = useAuth()
  const { notifications, unreadCount, markRead, markAllRead } = useNotifications(
    khojUser?.uid ?? null
  )
  const router = useRouter()
  const ref = useRef<HTMLDivElement>(null)

  // Close on outside click
  useEffect(() => {
    if (!open) return
    function handleClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        onClose()
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [open, onClose])

  // Close on Escape
  useEffect(() => {
    if (!open) return
    function handleKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', handleKey)
    return () => document.removeEventListener('keydown', handleKey)
  }, [open, onClose])

  if (!open) return null

  const handleItemClick = async (notifId: string, url: string) => {
    onClose()
    await markRead(notifId)
    router.push(url)
  }

  return (
    <div
      ref={ref}
      role="dialog"
      aria-label="Notifications"
      className="absolute top-full right-0 mt-2 w-80 bg-khoj-card border border-khoj-border rounded-sm shadow-xl z-50 overflow-hidden"
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-khoj-border">
        <span className="text-sm font-display font-bold text-khoj-text">
          Notifications
          {unreadCount > 0 && (
            <span className="ml-2 text-[10px] bg-khoj-accent text-white px-1.5 py-0.5 rounded-full font-body">
              {unreadCount} new
            </span>
          )}
        </span>
        {unreadCount > 0 && (
          <button
            onClick={() => markAllRead()}
            className="text-[10px] uppercase tracking-widest text-khoj-accent hover:text-orange-400 font-body font-semibold transition-colors"
          >
            Mark all read
          </button>
        )}
      </div>

      {/* List */}
      <div className="max-h-72 overflow-y-auto divide-y divide-khoj-border/50">
        {notifications.length === 0 ? (
          <div className="px-4 py-8 text-center">
            <p className="text-sm text-khoj-subtle">No notifications yet</p>
          </div>
        ) : (
          notifications.slice(0, 8).map((n) => {
            const url = resolveNotificationUrl(n.type, n.actionUrl, n.metadata)
            return (
              <button
                key={n.id}
                onClick={() => handleItemClick(n.id, url)}
                className={clsx(
                  'w-full text-left px-4 py-3 hover:bg-khoj-bg/60 transition-colors focus:outline-none focus-visible:ring-1 focus-visible:ring-khoj-accent/50',
                  !n.read && 'bg-khoj-accent/5'
                )}
              >
                <div className="flex items-start gap-2">
                  {!n.read && (
                    <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-khoj-accent flex-shrink-0" />
                  )}
                  {n.read && <span className="mt-1.5 w-1.5 h-1.5 flex-shrink-0" />}
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-semibold text-khoj-text truncate">{n.title}</p>
                    <p className="text-[11px] text-khoj-subtle mt-0.5 line-clamp-2">{n.message}</p>
                  </div>
                </div>
              </button>
            )
          })
        )}
      </div>

      {/* Footer */}
      <div className="px-4 py-2.5 border-t border-khoj-border">
        <Link
          href="/notifications"
          onClick={onClose}
          className="text-xs text-khoj-accent hover:text-orange-400 font-body font-semibold transition-colors"
        >
          View all notifications →
        </Link>
      </div>
    </div>
  )
}

// ── Profile dropdown ─────────────────────────────────────────────────────────

function ProfileDropdown({
  open,
  onClose,
}: {
  open: boolean
  onClose: () => void
}) {
  const { khojUser, firebaseUser } = useAuth()
  const router = useRouter()
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    function handle(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose()
    }
    document.addEventListener('mousedown', handle)
    return () => document.removeEventListener('mousedown', handle)
  }, [open, onClose])

  useEffect(() => {
    if (!open) return
    function handleKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', handleKey)
    return () => document.removeEventListener('keydown', handleKey)
  }, [open, onClose])

  if (!open) return null

  async function handleSignOut() {
    onClose()
    const { signOut } = await import('firebase/auth')
    const { auth } = await import('@/lib/firebase/config')
    if (auth) {
      await signOut(auth)
    }
    router.push('/auth/login')
  }

  const uid = firebaseUser?.uid
  const initial = khojUser?.name?.charAt(0).toUpperCase() ?? '?'

  return (
    <div
      ref={ref}
      role="dialog"
      aria-label="Profile menu"
      className="absolute top-full right-0 mt-2 w-56 bg-khoj-card border border-khoj-border rounded-sm shadow-xl z-50 overflow-hidden"
    >
      {/* User info */}
      <div className="px-4 py-3 border-b border-khoj-border">
        <p className="text-sm font-bold text-khoj-text truncate">{khojUser?.name ?? 'User'}</p>
        <p className="text-[11px] text-khoj-subtle truncate">{firebaseUser?.email ?? ''}</p>
      </div>

      {/* Menu items */}
      <div className="py-1">
        <Link
          href={uid ? `/profile/${uid}` : '/profile'}
          onClick={onClose}
          className="flex items-center gap-3 px-4 py-2.5 text-sm text-khoj-subtle hover:text-khoj-text hover:bg-khoj-bg/60 transition-colors"
        >
          <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/>
          </svg>
          View Profile
        </Link>

        <Link
          href="/settings"
          onClick={onClose}
          className="flex items-center gap-3 px-4 py-2.5 text-sm text-khoj-subtle hover:text-khoj-text hover:bg-khoj-bg/60 transition-colors"
        >
          <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/>
          </svg>
          Settings
        </Link>
      </div>

      {/* Sign out */}
      <div className="border-t border-khoj-border py-1">
        <button
          onClick={handleSignOut}
          className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-red-400 hover:text-red-300 hover:bg-red-500/10 transition-colors"
        >
          <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/>
          </svg>
          Sign Out
        </button>
      </div>
    </div>
  )
}

// ── TopBar ────────────────────────────────────────────────────────────────────

function TopBar() {
  const { khojUser, firebaseUser } = useAuth()
  const { unreadCount } = useNotifications(khojUser?.uid ?? null)
  const { unreadTotal: unreadMessages } = useConversations(khojUser?.uid ?? null)
  const [notifOpen, setNotifOpen] = useState(false)
  const [profileOpen, setProfileOpen] = useState(false)

  const initial = khojUser?.name?.charAt(0).toUpperCase() ?? '?'
  const photoUrl = (firebaseUser as any)?.photoURL as string | null

  return (
    <header className="fixed top-0 left-0 md:left-64 right-0 h-14 bg-khoj-bg border-b border-khoj-border z-30 flex items-center px-4 lg:px-6 gap-3">
      <TopNav className="flex-1" />

      <PeopleSearchBox className="w-40 sm:w-48 xl:w-60" />

      <div className="flex items-center gap-1 ml-auto">
        {/* Messages icon */}
        <Link
          href="/messages"
          className="relative w-9 h-9 flex items-center justify-center rounded-sm hover:bg-khoj-card transition-colors text-khoj-subtle hover:text-khoj-text"
          title="Messages"
        >
          <span className="text-base">✉</span>
          {unreadMessages > 0 && (
            <span className="absolute top-1 right-1 min-w-[14px] h-[14px] bg-khoj-accent rounded-full flex items-center justify-center text-[9px] font-bold text-white px-0.5">
              {unreadMessages > 99 ? '99+' : unreadMessages}
            </span>
          )}
        </Link>

        {/* Notifications bell — opens dropdown */}
        <div className="relative">
          <button
            type="button"
            aria-label={`Notifications${unreadCount > 0 ? ` (${unreadCount} unread)` : ''}`}
            aria-expanded={notifOpen}
            onClick={() => { setNotifOpen((v) => !v); setProfileOpen(false) }}
            className={clsx(
              'relative w-9 h-9 flex items-center justify-center rounded-sm transition-colors text-khoj-subtle',
              notifOpen
                ? 'bg-khoj-card text-khoj-text'
                : 'hover:bg-khoj-card hover:text-khoj-text'
            )}
          >
            <span className="text-base">🔔</span>
            {unreadCount > 0 && (
              <span className="absolute top-1 right-1 min-w-[14px] h-[14px] bg-red-500 rounded-full flex items-center justify-center text-[9px] font-bold text-white px-0.5">
                {unreadCount > 99 ? '99+' : unreadCount}
              </span>
            )}
          </button>
          <NotificationDropdown
            open={notifOpen}
            onClose={() => setNotifOpen(false)}
          />
        </div>

        {/* Profile avatar — opens dropdown */}
        <div className="relative ml-1">
          <button
            type="button"
            aria-label="Profile menu"
            aria-expanded={profileOpen}
            onClick={() => { setProfileOpen((v) => !v); setNotifOpen(false) }}
            className={clsx(
              'w-9 h-9 rounded-sm flex items-center justify-center border transition-colors flex-shrink-0 overflow-hidden',
              profileOpen
                ? 'border-khoj-accent bg-khoj-accent/20'
                : 'border-khoj-accent/30 bg-khoj-accent/10 hover:border-khoj-accent/60'
            )}
          >
            {photoUrl ? (
              <img src={photoUrl} alt={khojUser?.name ?? 'profile'} className="w-full h-full object-cover" />
            ) : (
              <span className="text-khoj-accent font-display font-bold text-sm">{initial}</span>
            )}
          </button>
          <ProfileDropdown
            open={profileOpen}
            onClose={() => setProfileOpen(false)}
          />
        </div>
      </div>
    </header>
  )
}

// ── Mobile bottom navigation (web — shown only on small screens) ───────────────
const MOBILE_NAV_ITEMS = [
  { href: '/dashboard',    label: 'Home',     icon: '⬡' },
  { href: '/community',    label: 'Feed',     icon: '◎' },
  { href: '/tournaments',  label: 'Events',   icon: '◈' },
  { href: '/messages',     label: 'Messages', icon: '✉' },
  { href: '/profile',      label: 'Profile',  icon: '◎' },
] as const

function MobileBottomNav() {
  const pathname = usePathname()
  const { khojUser } = useAuth()
  const { unreadTotal: unreadMessages } = useConversations(khojUser?.uid ?? null)

  return (
    <nav
      aria-label="Mobile navigation"
      className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-khoj-card border-t border-khoj-border flex items-center justify-around px-1 py-2"
    >
      {MOBILE_NAV_ITEMS.map(({ href, label, icon }) => {
        const dest = href === '/profile' && khojUser?.uid ? `/profile/${khojUser.uid}` : href
        const active = pathname === href || (href !== '/dashboard' && pathname.startsWith(href + '/'))
        const badge = href === '/messages' ? unreadMessages : 0
        return (
          <Link
            key={href}
            href={dest}
            className={clsx(
              'relative flex flex-col items-center gap-0.5 min-w-[52px] py-1 px-2 rounded-sm transition-colors',
              active ? 'text-khoj-accent' : 'text-khoj-subtle',
            )}
          >
            <span className="text-xl leading-none">{icon}</span>
            <span className="text-[9px] font-body font-semibold">{label}</span>
            {badge > 0 && (
              <span className="absolute -top-0.5 right-0 min-w-[15px] h-[15px] bg-khoj-accent rounded-full flex items-center justify-center text-[8px] font-bold text-white px-0.5">
                {badge > 99 ? '99+' : badge}
              </span>
            )}
          </Link>
        )
      })}
    </nav>
  )
}

// ── AppShell ──────────────────────────────────────────────────────────────────

export function AppShell({ children, fullWidth = false }: AppShellProps) {
  const { isAuthenticated, loading } = useAuth()
  const router = useRouter()

  useEffect(() => {
    if (!loading && !isAuthenticated) {
      router.push('/auth/login')
    }
  }, [loading, isAuthenticated, router])

  if (loading) return <PageLoader />
  if (!isAuthenticated) return null

  return (
    <div className="flex min-h-screen bg-khoj-bg">
      {/* Fixed left sidebar — hidden on mobile */}
      <Sidebar />

      {/* Right side: topbar + scrollable content */}
      <div className="flex-1 md:ml-64 flex flex-col min-h-screen">
        <TopBar />
        {fullWidth ? (
          <main className="flex-1 mt-14 overflow-hidden pb-16 md:pb-0" style={{ height: 'calc(100vh - 3.5rem)' }}>
            {children}
          </main>
        ) : (
          <main className="flex-1 mt-14 overflow-y-auto pb-20 md:pb-8">
            <div className="max-w-7xl px-4 md:px-8 py-6 md:py-8">{children}</div>
          </main>
        )}
      </div>

      {/* Mobile bottom navigation — hidden on md+ */}
      <MobileBottomNav />
    </div>
  )
}
