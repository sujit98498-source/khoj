// components/messages/ChatHeaderActions.tsx
// Voice call, video call, and more-menu action buttons for the chat header.
// Clicking phone/video instantly starts a call — no confirmation modal.

'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import clsx from 'clsx'
import toast from 'react-hot-toast'
import { useAuth } from '@/hooks/useAuth'
import { startCall } from '@/services/callService'
import { playRingbackLoop, stopAllCallSounds } from '@/lib/soundManager'
import { MoreMenu } from './MoreMenu'
import type { CallType } from '@/lib/types'

interface ChatHeaderActionsProps {
  otherUid: string
  otherName: string
  conversationId: string
}

const iconBtnClass =
  'flex-shrink-0 w-8 h-8 flex items-center justify-center rounded-full text-khoj-subtle ' +
  'hover:text-khoj-text hover:bg-khoj-border/40 transition-colors duration-150'

export function ChatHeaderActions({
  otherUid,
  otherName,
  conversationId,
}: ChatHeaderActionsProps) {
  const router = useRouter()
  const { khojUser } = useAuth()
  const [calling, setCalling] = useState<CallType | null>(null)
  const [moreOpen, setMoreOpen] = useState(false)

  async function handleCall(type: CallType) {
    if (calling) return // prevent double-click
    if (!khojUser) {
      toast.error('You must be logged in to make calls.')
      return
    }
    if (!otherUid) {
      toast.error('Cannot start call: other user not found.')
      return
    }

    const myName =
      khojUser.name ||
      khojUser.email?.split('@')[0] ||
      'User'

    console.log('[KHOJ call] starting', type, { conversationId, caller: khojUser.uid, receiver: otherUid })

    setCalling(type)
    try {
      const callId = await startCall(
        conversationId,
        khojUser.uid,
        myName,
        otherUid,
        type
      )
      // Start ringback before navigating — caller hears ring while waiting
      playRingbackLoop()
      router.push(`/rooms/call/${conversationId}?mode=${type}&callId=${callId}`)
    } catch (err) {
      stopAllCallSounds()
      console.error('[KHOJ call] startCall failed:', err)
      const detail = err instanceof Error ? err.message : String(err)
      toast.error(`Could not start call: ${detail}`, {
        style: {
          background: '#1a1a1a',
          color: '#e5e5e5',
          border: '1px solid #2a2a2a',
          fontFamily: 'var(--font-body)',
          fontSize: '13px',
        },
      })
    } finally {
      setCalling(null)
    }
  }

  return (
    <>
      <div className="flex items-center gap-1 flex-shrink-0">

        {/* Voice call */}
        <button
          type="button"
          title="Voice call"
          aria-label="Start voice call"
          disabled={!!calling}
          onClick={() => handleCall('voice')}
          className={clsx(iconBtnClass, calling === 'voice' && 'text-khoj-accent')}
        >
          {calling === 'voice' ? (
            <svg className="w-4 h-4 animate-spin" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" d="M12 3v3m0 12v3M3 12h3m12 0h3" />
            </svg>
          ) : (
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
              <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.69 11.9a19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 3.62 1h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L7.91 8.6a16 16 0 0 0 6.05 6.05l.96-.96a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92z" />
            </svg>
          )}
        </button>

        {/* Video call */}
        <button
          type="button"
          title="Video call"
          aria-label="Start video call"
          disabled={!!calling}
          onClick={() => handleCall('video')}
          className={clsx(iconBtnClass, calling === 'video' && 'text-khoj-accent')}
        >
          {calling === 'video' ? (
            <svg className="w-4 h-4 animate-spin" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" d="M12 3v3m0 12v3M3 12h3m12 0h3" />
            </svg>
          ) : (
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
              <path d="m15 10 4.553-2.069A1 1 0 0 1 21 8.87v6.26a1 1 0 0 1-1.447.894L15 14" />
              <rect x="3" y="8" width="12" height="8" rx="2" />
            </svg>
          )}
        </button>

        {/* Profile link */}
        <Link
          href={`/profile/${otherUid}`}
          title="View profile"
          className={clsx(iconBtnClass, 'hidden sm:flex')}
        >
          <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="8" r="4" />
            <path d="M4 20c0-4 3.6-7 8-7s8 3 8 7" />
          </svg>
        </Link>

        {/* More / three-dot */}
        <div className="relative">
          <button
            type="button"
            title="More options"
            aria-label="More options"
            aria-expanded={moreOpen}
            onClick={() => setMoreOpen((v) => !v)}
            className={clsx(iconBtnClass, moreOpen && 'bg-khoj-border/40 text-khoj-text')}
          >
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
              <circle cx="5" cy="12" r="1.5" />
              <circle cx="12" cy="12" r="1.5" />
              <circle cx="19" cy="12" r="1.5" />
            </svg>
          </button>

          {moreOpen && (
            <MoreMenu
              otherUid={otherUid}
              otherName={otherName}
              onClose={() => setMoreOpen(false)}
            />
          )}
        </div>
      </div>
    </>
  )
}

