'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/hooks/useAuth'
import { useNotifications } from '@/hooks/useNotifications'
import { resolveNotificationUrl } from '@/services/notificationService'
import { PageHeader } from '@/components/layout/PageHeader'
import { AppShell } from '@/components/layout/AppShell'
import { Button } from '@/components/ui/Button'
import { Notification } from '@/lib/types'
import clsx from 'clsx'

type Filter = 'all' | 'unread'

function NotificationRow({
  notif,
  onRead,
}: {
  notif: Notification
  onRead: (id: string, url: string) => void
}) {
  const url = resolveNotificationUrl(notif.type, notif.actionUrl, notif.metadata)

  // Format relative time
  const elapsed = Date.now() - new Date(notif.createdAt).getTime()
  const minutes = Math.floor(elapsed / 60000)
  const hours   = Math.floor(elapsed / 3600000)
  const days    = Math.floor(elapsed / 86400000)
  const timeAgo =
    days > 0   ? `${days}d ago`   :
    hours > 0  ? `${hours}h ago`  :
    minutes > 0 ? `${minutes}m ago` : 'just now'

  const typeIcon: Record<Notification['type'], string> = {
    announcement:         '📢',
    result:               '🏆',
    win:                  '🥇',
    job_unlock:           '💼',
    tournament_start:     '⚡',
    xp_gained:            '✨',
    rank_change:          '📈',
    post_like:            '❤️',
    post_comment:         '💬',
    new_follower:         '＋',
    connection_request:   '🤝',
    connection_accepted:  '✅',
    message:              '✉️',
    incoming_call:        '📞',
  }

  return (
    <button
      onClick={() => onRead(notif.id, url)}
      className={clsx(
        'w-full text-left flex items-start gap-4 px-5 py-4 border-b border-khoj-border/60 transition-colors',
        'hover:bg-khoj-card/60 focus:outline-none focus-visible:ring-1 focus-visible:ring-inset focus-visible:ring-khoj-accent/50',
        !notif.read && 'bg-khoj-accent/5'
      )}
    >
      {/* Unread dot */}
      <span
        className={clsx(
          'mt-2 w-1.5 h-1.5 rounded-full flex-shrink-0 transition-colors',
          notif.read ? 'bg-transparent' : 'bg-khoj-accent'
        )}
      />

      {/* Icon */}
      <span className="text-xl flex-shrink-0 mt-0.5">{typeIcon[notif.type] ?? '🔔'}</span>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <p className={clsx('text-sm font-semibold font-body truncate', notif.read ? 'text-khoj-subtle' : 'text-khoj-text')}>
          {notif.title}
        </p>
        <p className="text-xs text-khoj-subtle mt-0.5 line-clamp-2">{notif.message}</p>
      </div>

      {/* Time */}
      <span className="text-[10px] text-khoj-muted font-mono flex-shrink-0 mt-1">{timeAgo}</span>
    </button>
  )
}

export default function NotificationsPage() {
  const { khojUser, isAuthenticated, loading } = useAuth()
  const { notifications, unreadCount, markRead, markAllRead, clearAll } = useNotifications(
    khojUser?.uid ?? null
  )
  const [filter, setFilter] = useState<Filter>('all')
  const [confirmClear, setConfirmClear] = useState(false)
  const [clearing, setClearing] = useState(false)
  const router = useRouter()

  const handleRead = async (id: string, url: string) => {
    await markRead(id)
    router.push(url)
  }

  const handleClearAll = async () => {
    setClearing(true)
    await clearAll()
    setClearing(false)
    setConfirmClear(false)
    setFilter('all')
  }

  const visible =
    filter === 'unread' ? notifications.filter((n) => !n.read) : notifications

  if (loading) {
    return (
      <AppShell>
        <div className="flex items-center justify-center py-24">
          <p className="text-khoj-subtle text-sm">Loading…</p>
        </div>
      </AppShell>
    )
  }

  if (!isAuthenticated || !khojUser) {
    return null
  }

  return (
    <AppShell>
      <PageHeader
        eyebrow="Activity"
        title="Notifications"
        subtitle="Your recent activity and alerts"
        action={
          notifications.length > 0 ? (
            <div className="flex items-center gap-2">
              {unreadCount > 0 && (
                <Button variant="secondary" size="sm" onClick={() => markAllRead()}>
                  Mark all read
                </Button>
              )}
              <Button
                variant="secondary"
                size="sm"
                onClick={() => setConfirmClear(true)}
                className="text-red-400 border-red-400/30 hover:border-red-400/60 hover:text-red-300"
              >
                Clear All
              </Button>
            </div>
          ) : undefined
        }
      />

      {/* ── Inline confirmation banner ── */}
      {confirmClear && (
        <div className="mb-6 flex items-center justify-between gap-4 bg-red-500/10 border border-red-500/30 rounded-sm px-5 py-3">
          <p className="text-sm font-body text-khoj-text">
            Clear all <span className="font-semibold">{notifications.length}</span> notification{notifications.length !== 1 ? 's' : ''}?
            {' '}<span className="text-khoj-subtle text-xs">This can be undone by your admin.</span>
          </p>
          <div className="flex items-center gap-2 flex-shrink-0">
            <button
              onClick={() => setConfirmClear(false)}
              className="text-xs font-body font-semibold text-khoj-subtle hover:text-khoj-text transition-colors px-3 py-1.5"
            >
              Cancel
            </button>
            <button
              onClick={handleClearAll}
              disabled={clearing}
              className="text-xs font-body font-semibold text-white bg-red-500 hover:bg-red-600 disabled:opacity-50 disabled:cursor-not-allowed px-4 py-1.5 rounded-sm transition-colors"
            >
              {clearing ? 'Clearing…' : 'Yes, clear all'}
            </button>
          </div>
        </div>
      )}

      {/* Filter tabs */}
      <div className="flex items-center gap-1 mb-6">
        {(['all', 'unread'] as Filter[]).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={clsx(
              'px-4 py-1.5 text-xs font-body font-semibold uppercase tracking-widest rounded-sm transition-colors',
              filter === f
                ? 'bg-khoj-accent text-white'
                : 'text-khoj-subtle hover:text-khoj-text hover:bg-khoj-card'
            )}
          >
            {f === 'all' ? `All (${notifications.length})` : `Unread (${unreadCount})`}
          </button>
        ))}
      </div>

      {/* List */}
      <div className="bg-khoj-card border border-khoj-border rounded-sm overflow-hidden">
        {visible.length === 0 ? (
          <div className="px-6 py-16 text-center">
            <p className="text-3xl mb-3">🔔</p>
            <p className="text-sm font-body font-semibold text-khoj-subtle">
              {filter === 'unread' ? 'No unread notifications' : 'No notifications yet'}
            </p>
            <p className="text-xs text-khoj-muted mt-1">
              {filter === 'unread'
                ? 'You\'re all caught up!'
                : 'Activity will appear here as you participate.'}
            </p>
          </div>
        ) : (
          visible.map((n) => (
            <NotificationRow key={n.id} notif={n} onRead={handleRead} />
          ))
        )}
      </div>
    </AppShell>
  )
}
