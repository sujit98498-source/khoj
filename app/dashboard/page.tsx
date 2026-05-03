'use client'

import { useEffect, useState } from 'react'
import { useAuth } from '@/hooks/useAuth'
import { useNotifications } from '@/hooks/useNotifications'
import { Card, StatCard } from '@/components/ui/Card'
import { DashboardHero } from '@/components/dashboard/DashboardHero'
import { RecentMatches } from '@/components/dashboard/RecentMatches'
import { UpcomingTournaments } from '@/components/dashboard/UpcomingTournaments'
import { HomeFeed } from '@/components/dashboard/HomeFeed'
import { resolveNotificationUrl } from '@/services/notificationService'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/Button'
import clsx from 'clsx'
import { subscribeAllEnrollments, TrackEnrollment } from '@/services/trackService'

// ── Placeholder: People You May Know ─────────────────────────────────────────
// TODO: replace with real Firestore query — users by shared skills/interests
const SUGGESTED_PEOPLE = [
  { id: 'p1', name: 'Arjun Mehta',    role: 'React · Node.js',     rank: 12 },
  { id: 'p2', name: 'Priya Sharma',   role: 'UI/UX · Figma',       rank: 7  },
  { id: 'p3', name: 'Karan Bhatia',   role: 'Python · ML',         rank: 31 },
]

const AVATAR_PALETTE = ['#FF4D00', '#FFB800', '#00D4AA', '#6366f1', '#ec4899']
function avatarColor(n: string) { return AVATAR_PALETTE[n.charCodeAt(0) % AVATAR_PALETTE.length] }

export default function DashboardPage() {
  const { khojUser, isAuthenticated, loading } = useAuth()
  const { notifications, unreadCount, markRead, markAllRead } = useNotifications(khojUser?.uid || null)
  const router = useRouter()
  const [enrollments, setEnrollments] = useState<TrackEnrollment[]>([])

  useEffect(() => {
    if (!khojUser?.uid) return
    return subscribeAllEnrollments(khojUser.uid, setEnrollments)
  }, [khojUser?.uid])

  const activeEnrollments = enrollments.filter((e) => e.status === 'in_progress').slice(0, 3)

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-khoj-subtle">Loading...</div>
      </div>
    )
  }

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

  const winRate = khojUser.matchesPlayed > 0
    ? ((khojUser.wins / khojUser.matchesPlayed) * 100).toFixed(0)
    : '0'

  return (
    <div className="space-y-6">
      {/* ── Hero ──────────────────────────────────────────────────────────── */}
      <DashboardHero user={khojUser} />

      {/* ── Stats Row ─────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <StatCard
          icon="▲"
          label="Rank"
          value={`#${khojUser.rank}`}
          sub="Your global position"
          accent="orange"
        />
        <StatCard
          icon="◆"
          label="Total XP"
          value={khojUser.xp.toLocaleString()}
          sub="Keep competing to earn more"
          accent="gold"
        />
        <StatCard
          icon="◉"
          label="Wins"
          value={khojUser.wins}
          sub={`${winRate}% win rate`}
          accent="teal"
        />
        <StatCard
          icon="▣"
          label="Rooms"
          value={khojUser.matchesPlayed}
          sub="Active collaboration"
          accent="orange"
        />
      </div>

      {/* ── Main 2+1 grid ─────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* ── Center column ───────────────────────────────────────────────── */}
        <div className="lg:col-span-2 space-y-6">
          <HomeFeed userId={khojUser.uid} />
          <RecentMatches userId={khojUser.uid} />
        </div>

        {/* ── Right sidebar ───────────────────────────────────────────────── */}
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
                      onClick={async () => { await markRead(notif.id); router.push(url) }}
                      className={clsx(
                        'w-full text-left text-xs p-2.5 rounded-sm border transition-colors focus:outline-none focus-visible:ring-1 focus-visible:ring-khoj-accent/50',
                        notif.read
                          ? 'bg-khoj-bg border-khoj-border hover:border-khoj-border/80'
                          : 'bg-khoj-accent/5 border-khoj-accent/20 hover:bg-khoj-accent/10'
                      )}
                    >
                      <div className="flex items-start gap-2">
                        {!notif.read && <span className="mt-1 w-1.5 h-1.5 rounded-full bg-khoj-accent flex-shrink-0" />}
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
                <Link href="/notifications" className="text-xs text-khoj-accent hover:text-orange-400 font-body font-semibold transition-colors">
                  View all notifications →
                </Link>
              </div>
            )}
          </Card>

          {/* Continue Learning */}
          <Card>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <span className="text-sm text-khoj-teal" aria-hidden>◫</span>
                <h3 className="font-display font-bold text-sm">Continue Learning</h3>
              </div>
              <Link href="/tracks" className="text-xs text-khoj-accent hover:text-orange-400 font-semibold">
                All tracks →
              </Link>
            </div>
            {activeEnrollments.length === 0 ? (
              <div className="text-center py-4 space-y-2">
                <p className="text-khoj-text text-xs font-bold">No active tracks</p>
                <p className="text-khoj-subtle text-[11px]">Start a track to build proof and get hired faster.</p>
                <Link href="/tracks">
                  <Button size="sm" className="mt-2">Browse Tracks</Button>
                </Link>
              </div>
            ) : (
              <div className="space-y-3">
                {activeEnrollments.map((e) => (
                  <Link
                    key={e.trackId}
                    href={`/tracks/${e.trackId}${e.lastLessonId ? `/learn/${e.lastLessonId}` : ''}`}
                    className="flex items-center gap-3 p-2.5 rounded-sm border border-khoj-border hover:border-khoj-accent/40 transition-colors group"
                  >
                    <div className="w-9 h-9 rounded-sm overflow-hidden bg-zinc-900 flex-shrink-0">
                      {e.thumbnailUrl
                        ? <img src={e.thumbnailUrl} alt="" className="w-full h-full object-cover" />
                        : <div className="w-full h-full flex items-center justify-center text-base">📚</div>
                      }
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-khoj-text text-xs font-semibold truncate group-hover:text-khoj-accent transition-colors">{e.title}</p>
                      <div className="mt-1 w-full bg-zinc-800 rounded-full h-1">
                        <div className="h-1 rounded-full bg-khoj-accent" style={{ width: `${e.progressPercent}%` }} />
                      </div>
                      <p className="text-khoj-subtle text-[10px] mt-0.5">{e.progressPercent}% complete</p>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </Card>

          {/* Upcoming Challenges (reuses UpcomingTournaments data) */}
          <UpcomingTournaments />

          {/* People You May Know — placeholder */}
          <Card>
            <div className="flex items-center gap-2 mb-4">
              <span className="text-sm text-khoj-gold" aria-hidden>◉</span>
              <h3 className="font-display font-bold text-sm">People You May Know</h3>
            </div>
            <div className="space-y-3">
              {SUGGESTED_PEOPLE.map((person) => {
                const color = avatarColor(person.name)
                return (
                  <div key={person.id} className="flex items-center gap-3">
                    <div
                      className="w-8 h-8 rounded-sm flex-shrink-0 flex items-center justify-center text-xs font-display font-bold select-none"
                      style={{ backgroundColor: `${color}18`, border: `1px solid ${color}35`, color }}
                      aria-hidden
                    >
                      {person.name.charAt(0)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-bold text-khoj-text truncate">{person.name}</p>
                      <p className="text-[10px] text-khoj-subtle">{person.role}&nbsp;·&nbsp;Rank #{person.rank}</p>
                    </div>
                    <Link
                      href="/network"
                      className="text-[10px] font-bold text-khoj-accent hover:text-orange-400 flex-shrink-0 transition-colors"
                    >
                      Connect
                    </Link>
                  </div>
                )
              })}
            </div>
            <div className="mt-4 pt-3 border-t border-khoj-border/50">
              <Link href="/network" className="text-xs text-khoj-accent hover:text-orange-400 font-semibold transition-colors">
                Explore network →
              </Link>
            </div>
          </Card>

          {/* Profile actions */}
          <Card>
            <div className="flex items-center gap-2 mb-3">
              <span className="text-sm text-khoj-subtle" aria-hidden>◻</span>
              <h3 className="font-display font-bold text-sm">Your Profile</h3>
            </div>
            <div className="flex flex-col gap-2">
              <Link href="/settings/profile">
                <Button variant="secondary" size="sm" className="w-full justify-center">Edit Profile</Button>
              </Link>
              <Link href={`/profile/${khojUser.uid}`}>
                <Button variant="secondary" size="sm" className="w-full justify-center">View Portfolio</Button>
              </Link>
              <Button
                size="sm"
                className="w-full justify-center"
                onClick={() => {
                  if (typeof window !== 'undefined') {
                    void navigator.clipboard?.writeText(`${window.location.origin}/profile/${khojUser.uid}`)
                  }
                }}
              >
                Share Profile
              </Button>
            </div>
          </Card>

        </div>
      </div>
    </div>
  )
}
