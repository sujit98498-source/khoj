'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { signOut } from 'firebase/auth'
import { auth } from '@/lib/firebase/config'
import { useAuth } from '@/hooks/useAuth'
import { useNotifications } from '@/hooks/useNotifications'
import { useConversations } from '@/hooks/useMessages'
import clsx from 'clsx'
import toast from 'react-hot-toast'
import { XPBar } from '@/components/ui/XPBar'

// ── Nav section definitions ───────────────────────────────────────────────────

const MAIN_NAV = [
  { href: '/dashboard',    label: 'Dashboard',    icon: '⬡' },
  { href: '/arena',        label: 'Arena',        icon: '▶' },
  { href: '/tracks',       label: 'Tracks',       icon: '◫' },
  { href: '/rooms',        label: 'Rooms',        icon: '▣' },
  { href: '/khoj-ai',      label: 'KHOJ AI',      icon: '⚡' },
  { href: '/studio',       label: 'Studio',       icon: '🎬' },
  { href: '/jobs',         label: 'Opportunity Market', icon: '◉' },
  { href: '/tournaments',  label: 'Tournaments',  icon: '◈' },
  { href: '/leaderboard',  label: 'Leaderboard',  icon: '▲' },
  { href: '/messages',     label: 'Messages',     icon: '✉' },
]

const PERSONAL_NAV = [
  { href: '/profile',          label: 'Profile',       icon: '◎' },
  { href: '/notifications',    label: 'Notifications', icon: '◬' },
  { href: '/settings/profile', label: 'Settings',      icon: '✎' },
]

const ADMIN_NAV = [
  { href: '/admin', label: 'Admin Panel', icon: '⬢' },
]

// ── Helpers ───────────────────────────────────────────────────────────────────

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-[9px] uppercase tracking-[0.18em] font-body font-semibold text-khoj-muted px-3 mb-1.5 mt-1">
      {children}
    </p>
  )
}

function NavLink({
  href,
  icon,
  label,
  isActive,
  badge,
}: {
  href: string
  icon: string
  label: string
  isActive: boolean
  badge?: number
}) {
  return (
    <Link
      href={href}
      className={clsx(
        'flex items-center gap-3 px-3 py-2.5 rounded-sm text-sm font-body font-medium transition-all duration-150 border',
        isActive
          ? 'bg-khoj-accent/10 text-khoj-accent border-khoj-accent/20'
          : 'text-khoj-subtle hover:text-khoj-text hover:bg-khoj-muted/20 border-transparent'
      )}
    >
      <span className="text-base w-5 text-center flex-shrink-0">{icon}</span>
      <span className="flex-1 truncate">{label}</span>
      {badge != null && badge > 0 && (
        <span className="ml-auto min-w-[18px] h-[18px] bg-khoj-accent rounded-full flex items-center justify-center text-[9px] font-bold text-white px-1">
          {badge > 99 ? '99+' : badge}
        </span>
      )}
    </Link>
  )
}

export function Sidebar() {
  const pathname = usePathname()
  const router = useRouter()
  const { khojUser } = useAuth()
  const { unreadCount } = useNotifications(khojUser?.uid ?? null)
  const { unreadTotal: unreadMessages } = useConversations(khojUser?.uid ?? null)

  const handleLogout = async () => {
    document.cookie = 'khoj-auth=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT'
    if (auth) {
      await signOut(auth)
    }
    toast.success('Signed out')
    router.push('/auth/login')
  }

  function isActive(href: string) {
    if (href === '/dashboard' || href === '/jobs' || href === '/rooms' ||
        href === '/messages' || href === '/leaderboard' ||
        href === '/admin' ||
        href === '/arena' || href === '/profile' || href === '/notifications' ||
        href === '/khoj-ai') {
      return pathname === href || pathname.startsWith(href + '/')
    }
    return pathname === href || pathname.startsWith(href + '/')
  }

  function badgeFor(href: string): number | undefined {
    if (href === '/messages')        return unreadMessages
    if (href === '/notifications')   return unreadCount
    if (href === '/dashboard')       return unreadCount
    return undefined
  }

  return (
    <aside className="fixed left-0 top-0 h-full w-64 bg-khoj-card border-r border-khoj-border flex flex-col z-40">

      {/* ── Logo ── */}
      <div className="px-6 py-5 border-b border-khoj-border flex-shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-khoj-accent rounded-sm flex items-center justify-center animate-glow">
            <span className="text-white font-display font-bold text-sm">K</span>
          </div>
          <span className="text-xl font-display font-bold text-khoj-text tracking-wider">KHOJ</span>
        </div>
      </div>

      {/* ── User mini-profile ── */}
      {khojUser && (
        <div className="px-6 py-4 border-b border-khoj-border flex-shrink-0">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-9 h-9 rounded-sm bg-khoj-accent/20 border border-khoj-accent/30 flex items-center justify-center flex-shrink-0">
              <span className="text-khoj-accent font-display font-bold text-sm">
                {khojUser.name.charAt(0).toUpperCase()}
              </span>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-body font-semibold text-khoj-text truncate">{khojUser.name}</p>
              <p className="text-[10px] text-khoj-subtle font-mono">Rank #{khojUser.rank || '–'}</p>
            </div>
            {unreadCount > 0 && (
              <span className="w-5 h-5 bg-khoj-accent rounded-full flex items-center justify-center text-[10px] font-bold text-white flex-shrink-0">
                {unreadCount}
              </span>
            )}
          </div>
          <XPBar xp={khojUser.xp} />
        </div>
      )}

      {/* ── Navigation ── */}
      <nav className="flex-1 overflow-y-auto px-4 py-4 space-y-0.5">

        {/* MAIN */}
        <SectionLabel>Main</SectionLabel>
        {MAIN_NAV.map((item) => (
          <NavLink
            key={item.href}
            href={item.href}
            icon={item.icon}
            label={item.label}
            isActive={isActive(item.href)}
            badge={badgeFor(item.href)}
          />
        ))}

        {/* PERSONAL */}
        <div className="pt-4 mt-3 border-t border-khoj-border/50">
          <SectionLabel>Personal</SectionLabel>
          {PERSONAL_NAV.map((item) => (
            <NavLink
              key={item.href}
              href={item.href}
              icon={item.icon}
              label={item.label}
              isActive={isActive(item.href)}
              badge={badgeFor(item.href)}
            />
          ))}
        </div>

        {/* ADMIN — only shown to admin users */}
        {khojUser?.role === 'admin' && (
          <div className="pt-4 mt-3 border-t border-khoj-border/50">
            <SectionLabel>Admin</SectionLabel>
            {ADMIN_NAV.map((item) => (
              <NavLink
                key={item.href}
                href={item.href}
                icon={item.icon}
                label={item.label}
                isActive={isActive(item.href)}
              />
            ))}
          </div>
        )}
      </nav>

      {/* ── Logout ── */}
      <div className="px-4 py-4 border-t border-khoj-border flex-shrink-0">
        <button
          type="button"
          onClick={handleLogout}
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-sm text-sm font-body text-khoj-subtle hover:text-red-400 hover:bg-red-500/5 border border-transparent hover:border-red-500/20 transition-all duration-150"
        >
          <span className="text-base w-5 text-center">→</span>
          Sign Out
        </button>
      </div>
    </aside>
  )
}
