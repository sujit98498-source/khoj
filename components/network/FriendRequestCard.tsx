// components/network/FriendRequestCard.tsx
// Card for displaying an incoming or sent friend request with action buttons.

'use client'

import Link from 'next/link'
import { formatDistanceToNow } from 'date-fns'
import clsx from 'clsx'
import type { FriendRequest } from '@/lib/types'

interface Props {
  request: FriendRequest
  direction: 'incoming' | 'sent'
  onAccept?: (id: string) => void
  onDecline?: (id: string) => void
  onCancel?: (id: string) => void
  busy?: boolean
}

export function FriendRequestCard({
  request,
  direction,
  onAccept,
  onDecline,
  onCancel,
  busy = false,
}: Props) {
  const other =
    direction === 'incoming'
      ? { uid: request.fromUserId, name: request.fromUserName, username: request.fromUserUsername, avatar: request.fromUserAvatar }
      : { uid: request.toUserId, name: request.toUserName, username: request.toUserUsername, avatar: request.toUserAvatar }

  const initials = other.name.charAt(0).toUpperCase()

  return (
    <div className="bg-khoj-card border border-khoj-border rounded-sm p-4 flex items-center gap-4">
      {/* Avatar */}
      <Link href={`/profile/${other.uid}`} className="flex-shrink-0">
        {other.avatar ? (
          <img
            src={other.avatar}
            alt={other.name}
            className="w-10 h-10 rounded-sm object-cover"
          />
        ) : (
          <div className="w-10 h-10 rounded-sm bg-khoj-accent/20 border border-khoj-accent/30 flex items-center justify-center">
            <span className="text-khoj-accent font-display font-bold text-sm">{initials}</span>
          </div>
        )}
      </Link>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <Link
          href={`/profile/${other.uid}`}
          className="text-sm font-display font-semibold text-khoj-text hover:text-khoj-accent transition-colors"
        >
          {other.name}
        </Link>
        {other.username && (
          <p className="text-[10px] font-body text-khoj-muted">@{other.username}</p>
        )}
        <p className="text-[10px] font-body text-khoj-muted mt-0.5">
          {direction === 'incoming' ? 'Wants to connect' : 'Request sent'} ·{' '}
          {formatDistanceToNow(new Date(request.createdAt), { addSuffix: true })}
        </p>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-2 flex-shrink-0">
        {direction === 'incoming' ? (
          <>
            <button
              type="button"
              disabled={busy}
              onClick={() => onAccept?.(request.id)}
              className={clsx(
                'text-[10px] font-body font-semibold px-3 py-1.5 rounded-sm transition-colors',
                'bg-khoj-accent text-white hover:bg-khoj-accent/90',
                busy && 'opacity-50 cursor-not-allowed'
              )}
            >
              Accept
            </button>
            <button
              type="button"
              disabled={busy}
              onClick={() => onDecline?.(request.id)}
              className={clsx(
                'text-[10px] font-body font-semibold px-3 py-1.5 rounded-sm border transition-colors',
                'border-khoj-border text-khoj-subtle hover:text-red-400 hover:border-red-400/30',
                busy && 'opacity-50 cursor-not-allowed'
              )}
            >
              Decline
            </button>
          </>
        ) : (
          <button
            type="button"
            disabled={busy}
            onClick={() => onCancel?.(request.id)}
            className={clsx(
              'text-[10px] font-body font-semibold px-3 py-1.5 rounded-sm border transition-colors',
              'border-khoj-border text-khoj-subtle hover:text-red-400 hover:border-red-400/30',
              busy && 'opacity-50 cursor-not-allowed'
            )}
          >
            Cancel
          </button>
        )}
      </div>
    </div>
  )
}
