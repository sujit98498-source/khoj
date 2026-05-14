'use client'

// ─────────────────────────────────────────────────────────────────────────────
// KHOJ Gaming Home — V1
// Mobile-first gaming dashboard: quick actions, stats, tournaments, feed.
// ─────────────────────────────────────────────────────────────────────────────

import { useAuth } from '@/hooks/useAuth'
import { useNotifications } from '@/hooks/useNotifications'
import { Card, StatCard } from '@/components/ui/Card'
import { DashboardHero } from '@/components/dashboard/DashboardHero'
import { RecentMatches } from '@/components/dashboard/RecentMatches'
import { UpcomingTournaments } from '@/components/dashboard/UpcomingTournaments'
import { resolveNotificationUrl } from '@/services/notificationService'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/Button'
import clsx from 'clsx'

// ── Quick action tiles ────────────────────────────────────────────────────────
const QUICK_ACTIONS = [
  { href: '/community',   icon: '🎬', label: 'Share Clip',      color: '#7C3AED' },
  { href: '/rooms',       icon: '🎮', label: 'Find Players',    color: '#06B6D4' },
  { href: '/tournaments', icon: '🏆', label: 'Join Tournament', color: '#F59E0B' },
  { href: '/messages',    icon: '💬', label: 'Messages',        color: '#10B981' },
] as const

export default function DashboardPage() {
  const { khojUser, isAuthenticated, loading } = useAuth()
  const { notifications, unreadCount, markRead, markAllRead } = useNotifications(
    khojUser?.uid ?? null,
  )
  const router = useRouter()

  // ── Loading ────────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-khoj-subtle animate-pulse">Loading…</div>
      </div>
    )
  }

  // ── Unauthenticated ────────────────────────────────────────────────────────
  if (!isAuthenticated || !khojUser) {
    return (
      <div className="container mx-auto px-6 py-12 text-center">
        <p className="text-khoj-subtle mb-6">Please login to view your dashboard.</p>
        <Link href="/auth/login">
          <Button>Login</Button>
        </Link>
      </div>
    )
  }

  const winRate =
    khojUser.matchesPlayed > 0
      ? ((khojUser.wins / khojUser.matchesPlayed) * 100).toFixed(0)
      : '0'

  return (
    <div className="space-y-6">

      {/* ── Gamer hero card ─────────────────────────────────────────────────── */}
      <DashboardHero user={khojUser} />

      {/* ── Quick actions ───────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {QUICK_ACTIONS.map(({ href, icon, label, color }) => (
          <Link key={href} href={href}>
            <div
              className="flex flex-col items-center gap-2 p-4 rounded-sm border border-khoj-border bg-khoj-card hover:opacity-80 transition-all active:scale-95 cursor-pointer"
              style={{ borderColor: `${color}40` }}
            >
              <span className="text-2xl">{icon}</span>
              <span className="text-[11px] font-body font-bold text-khoj-text text-center leading-tight">
                {label}
              </span>
            </div>
          </Link>
        ))}
      </div>

      {/* ── Gaming stats ────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <StatCard icon="▲" label="Rank"    value={`#${khojUser.rank}`}            sub="Global position"        accent="orange" />
        <StatCard icon="◆" label="XP"      value={khojUser.xp.toLocaleString()}   sub="Keep competing"         accent="gold"   />
        <StatCard icon="◉" label="Wins"    value={khojUser.wins}                  sub={`${winRate}% win rate`} accent="teal"   />
        <StatCard icon="▣" label="Matches" value={khojUser.matchesPlayed}         sub="Total played"           accent="orange" />
      </div>

      {/* ── Main 2-column grid ──────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* Center — recent matches */}
        <div className="lg:col-span-2 space-y-6">
          <RecentMatches userId={khojUser.uid} />
        </div>

        {/* Right — notifications + tournaments + profile */}
        <div className="space-y-5">

          {/* Notifications */}
          <Card glow>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <span className="text-sm text-khoj-accent" aria-hidden>◎</span>
                <h3 className="font-display font-bold text-sm">Notifications</h3>
              </div>
              <div className="flex items-center gap-2">
                {unreadCount > 0 && (
                  <span className="bg-khoj-accent text-white text-[10px] px-2 py-0.5 rounded-full font-bold">
                    {unreadCount}
                  </span>
                )}
                {unreadCount > 0 && (
                  <button
                    onClick={() => markAllRead()}
                    className="text-[10px] uppercase tracking-widest text-khoj-accent hover:text-orange-400 font-body font-semibold transition-colors"
                  >
                    All read
                  </button>
                )}
              </div>
            </div>
            <div className="space-y-1 max-h-56 overflow-y-auto">
              {notifications.length === 0 ? (
                <p className="text-xs text-khoj-subtle py-3 text-center">No notifications yet</p>
              ) : (
                notifications.slice(0, 5).map((notif) => {
                  const url = resolveNotificationUrl(notif.type, notif.actionUrl, notif.metadata)
                  return (
                    <button
                      key={notif.id}
                      onClick={async () => {
                        await markRead(notif.id)
                        router.push(url)
                      }}
                      className={clsx(
                        'w-full text-left text-xs p-2.5 rounded-sm border transition-colors focus:outline-none focus-visible:ring-1 focus-visible:ring-khoj-accent/50',
                        notif.read
                          ? 'bg-khoj-bg border-khoj-border hover:border-khoj-border/80'
                          : 'bg-khoj-accent/5 border-khoj-accent/20 hover:bg-khoj-accent/10',
                      )}
                    >
                      <div className="flex items-start gap-2">
                        {!notif.read && (
                          <span className="mt-1 w-1.5 h-1.5 rounded-full bg-khoj-accent flex-shrink-0" />
                        )}
                        <div className="flex-1 min-w-0">
                          <p className="font-semibold text-khoj-text truncate">{notif.title}</p>
                          <p className="text-khoj-subtle mt-0.5 line-clamp-2">{notif.message}</p>
                        </div>
                      </div>
                    </button>
                  )
                })
              )}
            </div>
            {notifications.length > 0 && (
              <div className="mt-3 pt-3 border-t border-khoj-border/50">
                <Link
                  href="/notifications"
                  className="text-xs text-khoj-accent hover:text-orange-400 font-body font-semibold transition-colors"
                >
                  View all notifications →
                </Link>
              </div>
            )}
          </Card>

          {/* Upcoming Tournaments */}
          <UpcomingTournaments />

          {/* Gamer Profile quick-actions */}
          <Card>
            <div className="flex items-center gap-2 mb-3">
              <span className="text-sm text-khoj-accent" aria-hidden>◉</span>
              <h3 className="font-display font-bold text-sm">Gamer Profile</h3>
            </div>
            <div className="flex flex-col gap-2">
              <Link href="/settings/profile">
                <Button variant="secondary" size="sm" className="w-full justify-center">
                  Edit Gamer Profile
                </Button>
              </Link>
              <Link href={`/profile/${khojUser.uid}`}>
                <Button variant="secondary" size="sm" className="w-full justify-center">
                  View Public Profile
                </Button>
              </Link>
              <Button
                size="sm"
                className="w-full justify-center"
                onClick={() => {
                  if (typeof window !== 'undefined') {
                    void navigator.clipboard?.writeText(
                      `${window.location.origin}/profile/${khojUser.uid}`,
                    )
                  }
                }}
              >
                Share Gamer Profile
              </Button>
            </div>
          </Card>

        </div>
      </div>
    </div>
  )
}
