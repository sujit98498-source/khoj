// components/calls/IncomingCallBanner.tsx
// Global banner that appears when someone calls the current user.
// Mounted once in ClientLayout so it's always listening regardless of route.
// Uses onSnapshot to listen for ringing calls in Firestore.

'use client'

import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/hooks/useAuth'
import { subscribeToIncomingCalls, updateCallStatus } from '@/services/callService'
import { playIncomingLoop, playEndOnce, stopAllCallSounds } from '@/lib/soundManager'
import type { CallRecord } from '@/lib/types'
import clsx from 'clsx'

export function IncomingCallBanner() {
  const { khojUser } = useAuth()
  const router = useRouter()
  const [incomingCall, setIncomingCall] = useState<CallRecord | null>(null)
  const prevCallRef = useRef<CallRecord | null>(null)

  useEffect(() => {
    if (!khojUser?.uid) return
    const unsub = subscribeToIncomingCalls(khojUser.uid, (calls) => {
      // Show the most recent ringing call; ignore if caller is self (shouldn't happen)
      const call = calls.find((c) => c.callerId !== khojUser.uid) ?? null
      setIncomingCall(call)
    })
    return () => unsub()
  }, [khojUser?.uid])

  // Play ringtone when a new call arrives; play ended tone if caller cancelled
  useEffect(() => {
    if (incomingCall) {
      playIncomingLoop()
    } else if (prevCallRef.current && !incomingCall) {
      // Caller cancelled before we responded
      stopAllCallSounds()
      playEndOnce()
    }
    prevCallRef.current = incomingCall
  }, [incomingCall])

  // 30-second auto-miss: if the call is still ringing after 30 s, mark as missed
  useEffect(() => {
    if (!incomingCall) return
    const timer = setTimeout(() => {
      updateCallStatus(incomingCall.id, 'missed').catch(() => {})
      stopAllCallSounds()
      playEndOnce()
      setIncomingCall(null)
    }, 30_000)
    return () => clearTimeout(timer)
  }, [incomingCall?.id])

  if (!incomingCall) return null

  function accept() {
    if (!incomingCall) return
    stopAllCallSounds() // stop incoming ring before navigating
    updateCallStatus(incomingCall.id, 'active').catch(() => {})
    router.push(
      `/rooms/call/${incomingCall.conversationId}?mode=${incomingCall.type}&callId=${incomingCall.id}`
    )
    setIncomingCall(null)
  }

  function decline() {
    if (!incomingCall) return
    stopAllCallSounds()
    playEndOnce()
    updateCallStatus(incomingCall.id, 'declined').catch(() => {})
    setIncomingCall(null)
  }

  const isVideo = incomingCall.type === 'video'

  return (
    <div className="fixed top-4 left-1/2 -translate-x-1/2 z-[200] w-[calc(100%-2rem)] max-w-sm animate-in slide-in-from-top-4 duration-300">
      <div className="bg-khoj-card border border-khoj-border rounded-2xl shadow-2xl shadow-black/50 overflow-hidden">
        {/* Pulsing accent line */}
        <div className="h-0.5 bg-khoj-accent animate-pulse" />

        <div className="flex items-center gap-4 px-4 py-3.5">
          {/* Avatar + ring animation */}
          <div className="relative flex-shrink-0">
            <div className="absolute inset-0 rounded-full bg-khoj-accent/20 animate-ping" />
            <div className="relative w-11 h-11 rounded-full bg-khoj-accent/20 border border-khoj-accent/40 flex items-center justify-center text-lg font-display font-bold text-khoj-accent">
              {incomingCall.callerName.charAt(0).toUpperCase()}
            </div>
          </div>

          {/* Info */}
          <div className="flex-1 min-w-0">
            <p className="text-[10px] font-body text-khoj-accent uppercase tracking-widest">
              Incoming {isVideo ? 'video' : 'voice'} call
            </p>
            <p className="text-sm font-body font-semibold text-khoj-text truncate">
              {incomingCall.callerName}
            </p>
          </div>

          {/* Decline */}
          <button
            type="button"
            onClick={decline}
            aria-label="Decline call"
            className="flex-shrink-0 w-10 h-10 rounded-full bg-red-500/20 text-red-400 hover:bg-red-500 hover:text-white transition-colors flex items-center justify-center"
          >
            <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M10.68 13.31a16 16 0 0 0 3.41 2.6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7 2 2 0 0 1 1.72 2v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07" />
              <line x1="22" y1="2" x2="2" y2="22" />
            </svg>
          </button>

          {/* Accept */}
          <button
            type="button"
            onClick={accept}
            aria-label="Accept call"
            className={clsx(
              'flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center transition-colors',
              isVideo
                ? 'bg-khoj-accent/20 text-khoj-accent hover:bg-khoj-accent hover:text-white'
                : 'bg-green-500/20 text-green-400 hover:bg-green-500 hover:text-white'
            )}
          >
            {isVideo ? (
              <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="m15 10 4.553-2.069A1 1 0 0 1 21 8.87v6.26a1 1 0 0 1-1.447.894L15 14" />
                <rect x="3" y="8" width="12" height="8" rx="2" />
              </svg>
            ) : (
              <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.69 11.9a19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 3.62 1h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L7.91 8.6a16 16 0 0 0 6.05 6.05l.96-.96a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92z" />
              </svg>
            )}
          </button>
        </div>
      </div>
    </div>
  )
}
