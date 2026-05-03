// components/messages/ConversationList.tsx
// Left sidebar: conversation threads with avatar, username, last message, time, unread badge.

'use client'

import Link from 'next/link'
import type { Conversation } from '@/lib/types'
import { getOtherParticipant } from '@/services/messageService'
import { formatDistanceToNow, format, isToday, isYesterday } from 'date-fns'
import clsx from 'clsx'

const AVATAR_COLORS = ['#FF4D00', '#FFB800', '#00D4AA', '#6366f1', '#ec4899', '#14b8a6']
function avatarColor(name: string) {
  return AVATAR_COLORS[name.charCodeAt(0) % AVATAR_COLORS.length]
}

function timeLabel(iso: string): string {
  const d = new Date(iso)
  if (isToday(d)) return format(d, 'h:mm a')
  if (isYesterday(d)) return 'Yesterday'
  return formatDistanceToNow(d, { addSuffix: false })
}

function ConvoSkeleton() {
  return (
    <div className="flex items-center gap-3 px-4 py-3 animate-pulse">
      <div className="w-11 h-11 rounded-full bg-khoj-border/40 flex-shrink-0" />
      <div className="flex-1 space-y-2">
        <div className="h-2.5 w-28 rounded-full bg-khoj-border/40" />
        <div className="h-2 w-40 rounded-full bg-khoj-border/30" />
      </div>
    </div>
  )
}

interface ConversationListProps {
  conversations: Conversation[]
  myUid: string
  activeConversationId?: string
  loading?: boolean
  onlineUids?: Set<string>
  onSelect?: (id: string) => void
}

export function ConversationList({
  conversations,
  myUid,
  activeConversationId,
  loading = false,
  onlineUids,
  onSelect,
}: ConversationListProps) {
  if (loading) {
    return (
      <div className="flex flex-col">
        {[1, 2, 3, 4].map((i) => <ConvoSkeleton key={i} />)}
      </div>
    )
  }

  if (conversations.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-3 px-6 py-16 text-center">
        <div className="w-14 h-14 rounded-full bg-khoj-card border border-khoj-border flex items-center justify-center text-2xl text-khoj-muted">
          ✉
        </div>
        <p className="text-sm font-body font-medium text-khoj-subtle">No conversations yet</p>
        <p className="text-xs text-khoj-muted font-body leading-relaxed max-w-[180px]">
          Visit a profile or recruiter page to start a conversation.
        </p>
      </div>
    )
  }

  return (
    <div className="flex flex-col overflow-y-auto">
      {conversations.map((convo) => {
        const other = getOtherParticipant(convo, myUid)
        const otherName = other?.name || 'User'
        const otherUsername = other?.username
        const otherAvatar = other?.avatarUrl
        const otherUid = other?.uid ?? ''
        const unread = convo.unreadCount[myUid] ?? 0
        const isActive = convo.id === activeConversationId
        const isOnline = onlineUids?.has(otherUid) ?? false
        const color = avatarColor(otherName)

        return (
          <Link
            key={convo.id}
            href={`/messages/${convo.id}`}
            onClick={() => onSelect?.(convo.id)}
            className={clsx(
              'flex items-center gap-3 px-4 py-3 transition-all duration-150 relative group',
              isActive
                ? 'bg-khoj-accent/10 border-l-2 border-khoj-accent'
                : 'hover:bg-white/[0.03] border-l-2 border-transparent'
            )}
          >
            {/* Avatar + online ring */}
            <div className="relative flex-shrink-0">
              <div
                className={clsx(
                  'w-11 h-11 rounded-full flex items-center justify-center text-sm font-display font-bold overflow-hidden',
                  isOnline && 'ring-2 ring-green-500/60 ring-offset-1 ring-offset-khoj-bg'
                )}
                style={{
                  backgroundColor: otherAvatar ? 'transparent' : `${color}20`,
                  border: otherAvatar ? 'none' : `1.5px solid ${color}50`,
                  color,
                }}
              >
                {otherAvatar ? (
                  <img src={otherAvatar} alt={otherName} className="w-full h-full object-cover" />
                ) : (
                  otherName.charAt(0).toUpperCase()
                )}
              </div>
              {/* Online dot */}
              {isOnline && (
                <span className="absolute bottom-0 right-0 w-3 h-3 rounded-full bg-green-500 border-2 border-khoj-bg" />
              )}
            </div>

            {/* Text */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between gap-1 mb-0.5">
                <span
                  className={clsx(
                    'text-sm font-body truncate',
                    unread > 0 ? 'font-semibold text-khoj-text' : 'font-medium text-khoj-text'
                  )}
                >
                  {otherName}
                </span>
                <div className="flex items-center gap-1.5 flex-shrink-0">
                  {convo.lastMessageAt && (
                    <span className="text-[10px] text-khoj-muted font-body">
                      {timeLabel(convo.lastMessageAt)}
                    </span>
                  )}
                  {unread > 0 && (
                    <span className="min-w-[18px] h-[18px] rounded-full bg-khoj-accent text-white text-[9px] font-bold flex items-center justify-center px-1 leading-none">
                      {unread > 99 ? '99+' : unread}
                    </span>
                  )}
                </div>
              </div>

              {/* @username */}
              {otherUsername && (
                <p className="text-[10px] text-khoj-muted font-mono truncate mb-0.5">
                  @{otherUsername}
                </p>
              )}

              {/* Last message preview */}
              <p
                className={clsx(
                  'text-xs font-body truncate',
                  unread > 0 ? 'text-khoj-subtle' : 'text-khoj-muted'
                )}
              >
                {convo.lastMessage ? (
                  <>
                    {convo.lastMessageSenderId === myUid && (
                      <span className="text-khoj-muted">You: </span>
                    )}
                    {convo.lastMessage}
                  </>
                ) : (
                  <span className="italic">Start the conversation</span>
                )}
              </p>
            </div>
          </Link>
        )
      })}
    </div>
  )
}
