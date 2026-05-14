'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { signOut } from 'firebase/auth'
import { auth } from '@/lib/firebase/config'
import { KhojUser } from '@/lib/types'
import toast from 'react-hot-toast'
import clsx from 'clsx'

interface AdminSidebarProps {
  adminUser: KhojUser
}

const ADMIN_NAV = [
  {
    href: '/admin',
    label: 'Overview',
    icon: '⬢',
    description: 'Admin home',
    adminOnly: true,
  },
  {
    href: '/admin/growth-studio',
    label: 'Growth Studio',
    icon: '✦',
    description: 'Marketing agent',
  },
  {
    href: '/admin/tournaments',
    label: 'Tournaments',
    icon: '◈',
    description: 'Create & manage',
    adminOnly: true,
  },
  {
    href: '/admin/announcements',
    label: 'Announcements',
    icon: '◉',
    description: 'Broadcast to users',
    adminOnly: true,
  },
  {
    href: '/admin/results',
    label: 'Results',
    icon: '▲',
    description: 'Publish & award XP',
    adminOnly: true,
  },
  {
    href: '/admin/reports',
    label: 'Reported Posts',
    icon: '⚑',
    description: 'Community moderation',
    adminOnly: true,
  },
  {
    href: '/admin/verification',
    label: 'Payments & Payouts',
    icon: '₹',
    description: 'Finance dashboard',
    adminOnly: true,
  },
]

export function AdminSidebar({ adminUser }: AdminSidebarProps) {
  const pathname = usePathname()
  const router = useRouter()
  const isFullAdmin = adminUser.role === 'admin'
  const navItems = ADMIN_NAV.filter((item) => !item.adminOnly || isFullAdmin)

  const handleLogout = async () => {
    document.cookie = 'khoj-auth=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT'
    if (auth) {
      await signOut(auth)
    }
    toast.success('Signed out')
    router.push('/auth/login')
  }

  return (
    <aside className="fixed left-0 top-0 h-full w-60 bg-khoj-card border-r border-khoj-border flex flex-col z-40">
      <div className="px-6 py-7 border-b border-khoj-border">
        <Link href="/dashboard" className="flex items-center gap-3 group">
          <div className="w-8 h-8 bg-khoj-accent rounded-sm flex items-center justify-center">
            <span className="text-white font-display font-bold text-sm">K</span>
          </div>
          <div>
            <span className="text-xl font-display font-bold text-khoj-text tracking-wider">KHOJ</span>
            <p className="text-[9px] uppercase tracking-[0.2em] text-khoj-accent font-body font-semibold">
              Admin Panel
            </p>
          </div>
        </Link>
      </div>

      <div className="px-6 py-4 border-b border-khoj-border">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-sm bg-khoj-accent/20 border border-khoj-accent/40 flex items-center justify-center">
            <span className="text-khoj-accent font-display font-bold text-sm">
              {adminUser.name.charAt(0).toUpperCase()}
            </span>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-body font-semibold text-khoj-text truncate">{adminUser.name}</p>
            <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-khoj-accent/10 border border-khoj-accent/20">
              <span className="text-[9px] uppercase tracking-widest text-khoj-accent font-body font-bold">
                {(adminUser.role ?? 'admin').toUpperCase()}
              </span>
            </span>
          </div>
        </div>
      </div>

      <nav className="flex-1 px-4 py-6 space-y-1 overflow-y-auto">
        <p className="text-[9px] uppercase tracking-[0.15em] text-khoj-muted font-body px-3 mb-3">
          Management
        </p>
        {navItems.map((item) => {
          const isActive = pathname === item.href || pathname.startsWith(item.href + '/')
          return (
            <Link
              key={item.href}
              href={item.href}
              className={clsx(
                'flex items-center gap-3 px-3 py-3 rounded-sm text-sm font-body font-medium transition-all duration-150',
                isActive
                  ? 'bg-khoj-accent/10 text-khoj-accent border border-khoj-accent/20'
                  : 'text-khoj-subtle hover:text-khoj-text hover:bg-white/5 border border-transparent'
              )}
            >
              <span className="text-base w-5 text-center">{item.icon}</span>
              <div>
                <p className="leading-none">{item.label}</p>
                <p className="text-[10px] text-khoj-muted mt-0.5 font-normal">{item.description}</p>
              </div>
            </Link>
          )
        })}
      </nav>

      <div className="px-4 py-4 border-t border-khoj-border space-y-1">
        <Link
          href="/dashboard"
          className="flex items-center gap-3 px-3 py-2.5 rounded-sm text-sm font-body text-khoj-subtle hover:text-khoj-text hover:bg-white/5 border border-transparent transition-all duration-150"
        >
          <span className="text-base">←</span>
          Back to App
        </Link>
        <button
          onClick={handleLogout}
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-sm text-sm font-body text-khoj-subtle hover:text-red-400 hover:bg-red-500/5 border border-transparent hover:border-red-500/20 transition-all duration-150"
        >
          <span>→</span>
          Sign Out
        </button>
      </div>
    </aside>
  )
}
