'use client'

import { Notification } from '@/lib/types'
import { markNotificationRead, markAllNotificationsRead } from '@/services/notificationService'
import { Button } from '@/components/ui/Button'
import { format } from 'date-fns'
import clsx from 'clsx'

interface NotificationPanelProps {
  notifications: Notification[]
  userId: string
}

const TYPE_ICONS: Record<Notification['type'], string> = {
  announcement:        '📢',
  result:              '🥇',
  win:                 '🏆',
  job_unlock:          '🎯',
  tournament_start:    '◈',
  xp_gained:           '⚡',
  rank_change:         '▲',
  post_like:           '♥',
  post_comment:        '💬',
  new_follower:        '＋',
  connection_request:  '🤝',
  connection_accepted: '✅',
  message:             '✉',
  incoming_call:       '📞',
}

export function NotificationPanel({ notifications, userId }: NotificationPanelProps) {
  const unread = notifications.filter((n) => !n.read)

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-display font-bold text-khoj-text">
          Notifications {unread.length > 0 && (
            <span className="text-khoj-accent">({unread.length})</span>
          )}
        </h2>
        {unread.length > 0 && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => markAllNotificationsRead(userId)}
          >
            Mark all read
          </Button>
        )}
      </div>

      {notifications.length === 0 ? (
        <p className="text-xs text-khoj-subtle font-body py-4 text-center">
          No notifications yet
        </p>
      ) : (
        <div className="space-y-1.5">
          {notifications.map((notif) => (
            <div
              key={notif.id}
              onClick={() => !notif.read && markNotificationRead(notif.id)}
              className={clsx(
                'flex items-start gap-3 px-4 py-3 rounded-sm border cursor-pointer transition-all duration-150',
                notif.read
                  ? 'bg-khoj-card border-khoj-border opacity-50'
                  : 'bg-khoj-accent/5 border-khoj-accent/20 hover:border-khoj-accent/40'
              )}
            >
              <span className="text-lg flex-shrink-0">{TYPE_ICONS[notif.type]}</span>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-body font-semibold text-khoj-text">{notif.title}</p>
                <p className="text-xs text-khoj-subtle font-body mt-0.5">{notif.message}</p>
                <p className="text-[10px] text-khoj-muted font-body mt-1">
                  {format(new Date(notif.createdAt), 'MMM d · h:mm a')}
                </p>
              </div>
              {!notif.read && (
                <div className="w-2 h-2 bg-khoj-accent rounded-full flex-shrink-0 mt-1.5" />
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
