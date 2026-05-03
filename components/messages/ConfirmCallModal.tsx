// components/messages/ConfirmCallModal.tsx
// Confirmation modal before starting a real LiveKit voice or video call.
// On confirm: creates a Firestore call record, sends an incoming-call notification
// to the other user, then navigates the caller to the call room page.

'use client'

import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/hooks/useAuth'
import { startCall } from '@/services/callService'
import type { CallType } from '@/lib/types'

export type { CallType }

interface ConfirmCallModalProps {
  callType: CallType
  otherName: string
  otherUid: string
  conversationId: string
  onClose: () => void
}

export function ConfirmCallModal({
  callType,
  otherName,
  otherUid,
  conversationId,
  onClose,
}: ConfirmCallModalProps) {
  const router = useRouter()
  const { khojUser } = useAuth()
  const isVideo = callType === 'video'
  const overlayRef = useRef<HTMLDivElement>(null)
  const [starting, setStarting] = useState(false)
  const [err, setErr] = useState('')

  // Close on Escape
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape' && !starting) onClose()
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [onClose, starting])

  function handleOverlayClick(e: React.MouseEvent) {
    if (!starting && e.target === overlayRef.current) onClose()
  }

  async function handleConfirm() {
    if (!khojUser) {
      setErr('You must be logged in to start a call.')
      return
    }
    if (!otherUid) {
      setErr('Cannot start call: other user not found.')
      return
    }

    // Defensive fallback — Firestore throws if name is undefined
    const myName =
      khojUser.name ||
      khojUser.email?.split('@')[0] ||
      'User'

    console.log('[KHOJ startCall] params:', {
      conversationId,
      callerId: khojUser.uid,
      callerName: myName,
      receiverId: otherUid,
      callType,
    })

    setStarting(true)
    setErr('')
    try {
      const callId = await startCall(
        conversationId,
        khojUser.uid,
        myName,
        otherUid,
        callType
      )
      onClose()
      router.push(`/rooms/call/${conversationId}?mode=${callType}&callId=${callId}`)
    } catch (err) {
      console.error('[KHOJ startCall] failed:', err)
      const detail = err instanceof Error ? err.message : String(err)
      setErr(`Could not start call: ${detail}`)
      setStarting(false)
    }
  }

  return (
    <div
      ref={overlayRef}
      onClick={handleOverlayClick}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm px-4"
    >
      <div className="w-full max-w-sm bg-khoj-card border border-khoj-border rounded-2xl shadow-2xl p-6 flex flex-col gap-5">
        {/* Icon */}
        <div className="flex items-center justify-center w-14 h-14 rounded-full bg-khoj-accent/10 border border-khoj-accent/20 mx-auto">
          {isVideo ? (
            <svg className="w-7 h-7 text-khoj-accent" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <path d="m15 10 4.553-2.069A1 1 0 0 1 21 8.87v6.26a1 1 0 0 1-1.447.894L15 14" />
              <rect x="3" y="8" width="12" height="8" rx="2" />
            </svg>
          ) : (
            <svg className="w-7 h-7 text-khoj-accent" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.69 11.9a19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 3.62 1h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L7.91 8.6a16 16 0 0 0 6.05 6.05l.96-.96a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92z" />
            </svg>
          )}
        </div>

        {/* Text */}
        <div className="text-center space-y-1.5">
          <h3 className="text-base font-display font-bold text-khoj-text">
            Start {isVideo ? 'video' : 'voice'} call?
          </h3>
          <p className="text-sm font-body text-khoj-muted leading-relaxed">
            {isVideo ? 'Video call' : 'Voice call'} with{' '}
            <span className="text-khoj-text font-semibold">{otherName}</span>
          </p>
          {err && <p className="text-xs text-red-400 font-body">{err}</p>}
        </div>

        {/* Actions */}
        <div className="flex gap-3">
          <button
            type="button"
            onClick={onClose}
            disabled={starting}
            className="flex-1 py-2.5 rounded-xl text-sm font-body font-medium text-khoj-subtle border border-khoj-border hover:bg-khoj-border/30 hover:text-khoj-text transition-colors disabled:opacity-40"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleConfirm}
            disabled={starting}
            className="flex-1 py-2.5 rounded-xl text-sm font-body font-semibold bg-khoj-accent text-white hover:bg-khoj-accent/90 transition-colors disabled:opacity-60 flex items-center justify-center gap-2"
          >
            {starting ? (
              <>
                <svg className="w-4 h-4 animate-spin" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 3v3m0 12v3M3 12h3m12 0h3" />
                </svg>
                Connecting…
              </>
            ) : (
              isVideo ? 'Start video call' : 'Call'
            )}
          </button>
        </div>
      </div>
    </div>
  )
}



