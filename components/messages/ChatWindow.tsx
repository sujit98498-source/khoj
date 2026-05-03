// components/messages/ChatWindow.tsx
// Premium chat area: Discord + iMessage inspired bubbles, typing indicator,
// online status, day dividers, seen receipts, auto-scroll.

'use client'

import { useEffect, useRef } from 'react'
import type { DirectMessage, Conversation } from '@/lib/types'
import { getOtherParticipant } from '@/services/messageService'
import { format, isToday, isYesterday, isSameDay } from 'date-fns'
import clsx from 'clsx'
import { ChatHeaderActions } from './ChatHeaderActions'

const AVATAR_COLORS = ['#FF4D00', '#FFB800', '#00D4AA', '#6366f1', '#ec4899', '#14b8a6']
function avatarColor(name: string) {
  return AVATAR_COLORS[name.charCodeAt(0) % AVATAR_COLORS.length]
}

function Avatar({
  name,
  avatarUrl,
  size = 'sm',
}: {
  name: string
  avatarUrl?: string
  size?: 'sm' | 'md'
}) {
  const color = avatarColor(name)
  const dim = size === 'md' ? 'w-10 h-10 text-sm' : 'w-8 h-8 text-[11px]'
  return (
    <div
      className={clsx('rounded-full flex-shrink-0 flex items-center justify-center font-display font-bold overflow-hidden', dim)}
      style={{ backgroundColor: avatarUrl ? 'transparent' : `${color}20`, border: avatarUrl ? 'none' : `1.5px solid ${color}50`, color }}
    >
      {avatarUrl ? (
        <img src={avatarUrl} alt={name} className="w-full h-full object-cover" />
      ) : (
        name.charAt(0).toUpperCase()
      )}
    </div>
  )
}

function DayDivider({ date }: { date: Date }) {
  const label = isToday(date) ? 'Today' : isYesterday(date) ? 'Yesterday' : format(date, 'MMMM d, yyyy')
  return (
    <div className="flex items-center gap-3 my-5 select-none">
      <div className="flex-1 h-px bg-khoj-border/40" />
      <span className="text-[10px] uppercase tracking-widest text-khoj-muted/70 font-body px-2 py-0.5 border border-khoj-border/30 rounded-full">
        {label}
      </span>
      <div className="flex-1 h-px bg-khoj-border/40" />
    </div>
  )
}

function TypingBubble({ name, avatarUrl }: { name: string; avatarUrl?: string }) {
  return (
    <div className="flex items-end gap-2 mt-3">
      <Avatar name={name} avatarUrl={avatarUrl} />
      <div className="flex items-center gap-1 px-4 py-3 bg-khoj-card border border-khoj-border rounded-2xl rounded-bl-sm">
        <span className="w-1.5 h-1.5 rounded-full bg-khoj-muted animate-bounce [animation-delay:0ms]" />
        <span className="w-1.5 h-1.5 rounded-full bg-khoj-muted animate-bounce [animation-delay:150ms]" />
        <span className="w-1.5 h-1.5 rounded-full bg-khoj-muted animate-bounce [animation-delay:300ms]" />
      </div>
      <span className="text-[10px] text-khoj-muted font-body pb-1">{name} is typing…</span>
    </div>
  )
}

interface ChatWindowProps {
  conversation: Conversation
  messages: DirectMessage[]
  myUid: string
  isOtherTyping?: boolean
  isOtherOnline?: boolean
  onBack?: () => void
}

export function ChatWindow({
  conversation,
  messages,
  myUid,
  isOtherTyping = false,
  isOtherOnline = false,
  onBack,
}: ChatWindowProps) {
  const bottomRef = useRef<HTMLDivElement>(null)
  const other = getOtherParticipant(conversation, myUid)
  const otherName = other?.name || 'User'
  const otherAvatar = other?.avatarUrl
  const otherUid = other?.uid ?? ''
  const otherUsername = other?.username

  // Auto-scroll to bottom on new messages or when typing indicator appears
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, isOtherTyping])

  return (
    <div className="flex flex-col h-full min-h-0">

      {/* ── Header ─────────────────────────────────────────────────────── */}
      <div className="flex items-center gap-3 px-4 py-3 border-b border-khoj-border bg-khoj-card/80 backdrop-blur-sm flex-shrink-0">
        {onBack && (
          <button
            type="button"
            onClick={onBack}
            className="md:hidden w-8 h-8 flex items-center justify-center rounded-full hover:bg-khoj-border/40 text-khoj-subtle hover:text-khoj-text transition-colors flex-shrink-0"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M19 12H5M12 5l-7 7 7 7" />
            </svg>
          </button>
        )}

        {/* Avatar + online dot */}
        <div className="relative flex-shrink-0">
          <Avatar name={otherName} avatarUrl={otherAvatar} size="md" />
          {isOtherOnline && (
            <span className="absolute bottom-0 right-0 w-3 h-3 rounded-full bg-green-500 border-2 border-khoj-card" />
          )}
        </div>

        {/* Name + status */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <p className="text-sm font-body font-semibold text-khoj-text truncate">{otherName}</p>
            {isOtherOnline && (
              <span className="text-[9px] font-body text-green-400 bg-green-500/10 px-1.5 py-0.5 rounded-full flex-shrink-0">
                online
              </span>
            )}
          </div>
          <p className="text-[10px] text-khoj-muted font-body">
            {isOtherTyping
              ? <span className="text-khoj-accent animate-pulse">typing…</span>
              : otherUsername
                ? <span className="font-mono">@{otherUsername}</span>
                : isOtherOnline ? 'Active now' : 'Tap to view profile'
            }
          </p>
        </div>

        {/* View profile button */}
        <ChatHeaderActions
          otherUid={otherUid}
          otherName={otherName}
          conversationId={conversation.id}
        />
      </div>

      {/* ── Messages ───────────────────────────────────────────────────── */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-0.5 min-h-0">
        {messages.length === 0 && !isOtherTyping ? (
          <div className="flex flex-col items-center justify-center h-full gap-4 text-center py-8">
            <Avatar name={otherName} avatarUrl={otherAvatar} size="md" />
            <div>
              <p className="text-sm font-body font-medium text-khoj-text">
                Start chatting with <span className="text-khoj-accent">{otherName}</span>
              </p>
              {otherUsername && (
                <p className="text-[11px] font-mono text-khoj-muted mt-1">@{otherUsername}</p>
              )}
              <p className="text-xs text-khoj-muted font-body mt-2">Say hello 👋</p>
            </div>
          </div>
        ) : (
          (() => {
            const elements: React.ReactNode[] = []
            let lastDate: Date | null = null

            messages.forEach((msg, idx) => {
              const msgDate = new Date(msg.createdAt)
              const isMe = msg.senderId === myUid
              const prevMsg = messages[idx - 1]
              const nextMsg = messages[idx + 1]
              const isFirstInGroup = !prevMsg || prevMsg.senderId !== msg.senderId
              const isLastInGroup = !nextMsg || nextMsg.senderId !== msg.senderId
              const isRead = msg.readBy.includes(otherUid)

              // Day divider
              if (!lastDate || !isSameDay(msgDate, lastDate)) {
                elements.push(<DayDivider key={`day-${msg.id}`} date={msgDate} />)
                lastDate = msgDate
              }

              elements.push(
                <div
                  key={msg.id}
                  className={clsx(
                    'flex items-end gap-2',
                    isMe ? 'flex-row-reverse' : 'flex-row',
                    isFirstInGroup ? 'mt-4' : 'mt-0.5'
                  )}
                >
                  {/* Other user avatar — only on last message in their group */}
                  <div className="w-8 flex-shrink-0 flex items-end pb-0.5">
                    {!isMe && isLastInGroup && (
                      <Avatar name={otherName} avatarUrl={otherAvatar} />
                    )}
                  </div>

                  {/* Bubble + meta */}
                  <div className={clsx('max-w-[70%] sm:max-w-[60%] flex flex-col', isMe ? 'items-end' : 'items-start')}>
                    {/* Sender name label (first in group, other user only) */}
                    {isFirstInGroup && !isMe && (
                      <span className="text-[10px] font-body text-khoj-muted mb-1 px-1">
                        {otherName}
                        {otherUsername && <span className="font-mono ml-1 text-khoj-muted/60">@{otherUsername}</span>}
                      </span>
                    )}

                    <div
                      className={clsx(
                        'px-4 py-2.5 text-sm font-body leading-relaxed break-words',
                        isMe
                          ? [
                              'bg-khoj-accent text-white',
                              isFirstInGroup ? 'rounded-2xl rounded-tr-sm' : 'rounded-2xl',
                              isLastInGroup && 'rounded-br-sm',
                            ]
                          : [
                              'bg-khoj-card border border-khoj-border/60 text-khoj-text',
                              isFirstInGroup ? 'rounded-2xl rounded-tl-sm' : 'rounded-2xl',
                              isLastInGroup && 'rounded-bl-sm',
                            ]
                      )}
                    >
                      {msg.text}
                    </div>

                    {/* Timestamp + status (last in group only) */}
                    {isLastInGroup && (
                      <div className={clsx('flex items-center gap-1 mt-1 px-1', isMe ? 'flex-row-reverse' : 'flex-row')}>
                        <span className="text-[10px] font-body text-khoj-muted">
                          {format(msgDate, 'h:mm a')}
                        </span>
                        {isMe && (
                          <>
                            {/* ✓✓ orange = Seen (recipient opened chat and readBy includes their uid)
                                ✓  grey  = Sent (only sender is in readBy) */}
                            <span className={clsx('text-[11px]', isRead ? 'text-khoj-accent' : 'text-khoj-muted')}>
                              {isRead ? '✓✓' : '✓'}
                            </span>
                            {isRead && (
                              <span className="text-[9px] text-khoj-accent/80 font-body">Seen</span>
                            )}
                          </>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              )
            })

            return elements
          })()
        )}

        {/* Typing indicator */}
        {isOtherTyping && (
          <TypingBubble name={otherName} avatarUrl={otherAvatar} />
        )}

        <div ref={bottomRef} className="h-1" />
      </div>
    </div>
  )
}
