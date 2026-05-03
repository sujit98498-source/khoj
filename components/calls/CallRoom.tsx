// components/calls/CallRoom.tsx
// Full LiveKit voice/video call UI for KHOJ private 1:1 calls.
// Fetches a token from /api/livekit/token (server-side, secret never exposed).
//
// Render this component on /rooms/call/[conversationId]?mode=voice|video
// The roomName always equals conversationId — one room per conversation pair.

'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
import {
  LiveKitRoom,
  VideoConference,
  RoomAudioRenderer,
  useLocalParticipant,
  useRemoteParticipants,
  useTracks,
} from '@livekit/components-react'
import { Track } from 'livekit-client'
import '@livekit/components-styles'
import type { CallType } from '@/lib/types'
import { updateCallStatus } from '@/services/callService'
import { subscribeToCallRecord } from '@/services/callService'
import { stopAllCallSounds, playConnectedOnce, playEndOnce } from '@/lib/soundManager'
import clsx from 'clsx'

// ── Control bar ──────────────────────────────────────────────────────────────

function CallControls({
  callType,
  callId,
  onHangUp,
}: {
  callType: CallType
  callId: string | null
  onHangUp: () => void
}) {
  const { localParticipant } = useLocalParticipant()
  const [micMuted, setMicMuted] = useState(false)
  const [camOff, setCamOff] = useState(callType === 'voice')

  async function toggleMic() {
    await localParticipant.setMicrophoneEnabled(micMuted)
    setMicMuted(!micMuted)
  }

  async function toggleCam() {
    await localParticipant.setCameraEnabled(camOff)
    setCamOff(!camOff)
  }

  async function hangUp() {
    stopAllCallSounds()
    playEndOnce()
    if (callId) await updateCallStatus(callId, 'ended')
    onHangUp()
  }

  const btnBase =
    'flex flex-col items-center gap-1.5 px-3 py-2.5 rounded-xl transition-colors text-xs font-body font-medium select-none'

  return (
    <div className="flex items-center justify-center gap-4 px-6 py-4 bg-khoj-card border-t border-khoj-border flex-shrink-0">
      {/* Mic */}
      <button
        type="button"
        onClick={toggleMic}
        className={clsx(btnBase, micMuted ? 'bg-red-500/20 text-red-400' : 'bg-khoj-border/40 text-khoj-subtle hover:text-khoj-text')}
        title={micMuted ? 'Unmute microphone' : 'Mute microphone'}
      >
        <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
          {micMuted ? (
            <>
              <line x1="2" y1="2" x2="22" y2="22" />
              <path d="M18.89 13.23A7.12 7.12 0 0 0 19 12v-2" />
              <path d="M5 10v2a7 7 0 0 0 12 5" />
              <path d="M15 9.34V5a3 3 0 0 0-5.68-1.33" />
              <path d="M9 9v3a3 3 0 0 0 5.12 2.12" />
              <line x1="12" y1="19" x2="12" y2="22" />
            </>
          ) : (
            <>
              <path d="M12 2a3 3 0 0 1 3 3v7a3 3 0 0 1-6 0V5a3 3 0 0 1 3-3z" />
              <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
              <line x1="12" y1="19" x2="12" y2="22" />
            </>
          )}
        </svg>
        <span>{micMuted ? 'Unmute' : 'Mute'}</span>
      </button>

      {/* Camera — only shown in video mode */}
      {callType === 'video' && (
        <button
          type="button"
          onClick={toggleCam}
          className={clsx(btnBase, camOff ? 'bg-red-500/20 text-red-400' : 'bg-khoj-border/40 text-khoj-subtle hover:text-khoj-text')}
          title={camOff ? 'Turn camera on' : 'Turn camera off'}
        >
          <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            {camOff ? (
              <>
                <line x1="2" y1="2" x2="22" y2="22" />
                <path d="M10.66 6H14a2 2 0 0 1 2 2v2.5l5.248-3.062A.5.5 0 0 1 22 7.87v8.26" />
                <path d="M16 16a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h2" />
              </>
            ) : (
              <>
                <path d="m15 10 4.553-2.069A1 1 0 0 1 21 8.87v6.26a1 1 0 0 1-1.447.894L15 14" />
                <rect x="3" y="8" width="12" height="8" rx="2" />
              </>
            )}
          </svg>
          <span>{camOff ? 'Camera on' : 'Camera off'}</span>
        </button>
      )}

      {/* End call */}
      <button
        type="button"
        onClick={hangUp}
        className={clsx(btnBase, 'bg-red-500 text-white hover:bg-red-600 px-6')}
        title="End call"
      >
        <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M10.68 13.31a16 16 0 0 0 3.41 2.6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7 2 2 0 0 1 1.72 2v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.42 19.42 0 0 1 4.26 9.8a19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 3.11 1h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L7.41 8.6" />
          <line x1="22" y1="2" x2="2" y2="22" />
        </svg>
        <span>End call</span>
      </button>
    </div>
  )
}

// ── Participant tiles ─────────────────────────────────────────────────────────

function ParticipantTile({ name, isLocal }: { name: string; isLocal?: boolean }) {
  const initial = name.charAt(0).toUpperCase()
  return (
    <div className="flex flex-col items-center justify-center gap-3 bg-khoj-card border border-khoj-border rounded-2xl aspect-video min-h-[160px] relative overflow-hidden">
      <div className="w-16 h-16 rounded-full bg-khoj-accent/20 border border-khoj-accent/30 flex items-center justify-center text-2xl font-display font-bold text-khoj-accent">
        {initial}
      </div>
      <span className="text-xs font-body text-khoj-muted">{name}</span>
      {isLocal && (
        <span className="absolute top-2 right-2 text-[9px] font-body bg-khoj-accent/20 text-khoj-accent px-2 py-0.5 rounded-full">
          You
        </span>
      )}
    </div>
  )
}

// ── Video track tiles (video mode) ────────────────────────────────────────────

function VideoTiles({ localName, otherName }: { localName: string; otherName: string }) {
  const tracks = useTracks(
    [{ source: Track.Source.Camera, withPlaceholder: true }],
    { onlySubscribed: false }
  )
  const { localParticipant } = useLocalParticipant()

  if (tracks.length === 0) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-4 flex-1">
        <ParticipantTile name={localName} isLocal />
        <ParticipantTile name={otherName} />
      </div>
    )
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-4 flex-1">
      {tracks.map((trackRef) => {
        const isLocal = trackRef.participant?.sid === localParticipant.sid
        const name = isLocal ? localName : otherName
        if (trackRef.publication?.isMuted || !trackRef.publication?.isSubscribed) {
          return <ParticipantTile key={name} name={name} isLocal={isLocal} />
        }
        return (
          <div key={name} className="relative bg-khoj-card border border-khoj-border rounded-2xl overflow-hidden aspect-video flex items-center justify-center">
            <video
              ref={(el) => {
                if (el && trackRef.publication?.track) {
                  trackRef.publication.track.attach(el)
                }
              }}
              autoPlay
              playsInline
              muted={isLocal}
              className="w-full h-full object-cover"
            />
            <span className="absolute bottom-2 left-3 text-[10px] font-body text-white bg-black/40 px-2 py-0.5 rounded-full">
              {name}{isLocal ? ' (You)' : ''}
            </span>
          </div>
        )
      })}
    </div>
  )
}

// ── Connected listener — plays chime + stops ringback when remote joins ────────

function ConnectedListener() {
  const remoteParticipants = useRemoteParticipants()
  const playedRef = useRef(false)
  useEffect(() => {
    if (remoteParticipants.length > 0 && !playedRef.current) {
      playedRef.current = true
      stopAllCallSounds()
      playConnectedOnce()
    }
  }, [remoteParticipants.length])
  return null
}

// ── Voice mode layout ─────────────────────────────────────────────────────────

function VoiceLayout({ localName, otherName }: { localName: string; otherName: string }) {
  const remoteParticipants = useRemoteParticipants()
  const otherConnected = remoteParticipants.length > 0

  return (
    <div className="flex flex-col items-center justify-center flex-1 gap-6 px-6">
      {/* Other participant */}
      <div className="flex flex-col items-center gap-4">
        <div className="w-24 h-24 rounded-full bg-khoj-accent/20 border-2 border-khoj-accent/40 flex items-center justify-center text-4xl font-display font-bold text-khoj-accent">
          {otherName.charAt(0).toUpperCase()}
        </div>
        <p className="text-lg font-display font-bold text-khoj-text">{otherName}</p>
        <p className={clsx('text-sm font-body', otherConnected ? 'text-green-400' : 'text-khoj-muted animate-pulse')}>
          {otherConnected ? 'Connected' : 'Calling…'}
        </p>
      </div>
      {/* Self indicator */}
      <div className="flex items-center gap-2 text-xs font-body text-khoj-muted bg-khoj-card border border-khoj-border px-4 py-2 rounded-full">
        <span className="w-2 h-2 rounded-full bg-green-500" />
        {localName} (you)
      </div>
    </div>
  )
}

// ── Main CallRoom ─────────────────────────────────────────────────────────────

interface CallRoomProps {
  conversationId: string
  callType: CallType
  callId: string | null
  myUid: string
  myName: string
  otherName: string
  onHangUp: () => void
}

function CallRoomInner({
  callType,
  callId,
  myName,
  otherName,
  onHangUp,
}: Omit<CallRoomProps, 'conversationId' | 'myUid'>) {
  // Stop any lingering sounds if this component unmounts (e.g. browser back)
  useEffect(() => () => stopAllCallSounds(), [])

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center gap-3 px-4 py-3 border-b border-khoj-border bg-khoj-card/80 flex-shrink-0">
        <div className={clsx('w-2 h-2 rounded-full', callType === 'video' ? 'bg-khoj-accent' : 'bg-green-500')} />
        <span className="text-sm font-body font-semibold text-khoj-text">
          {callType === 'video' ? 'Video call' : 'Voice call'} with {otherName}
        </span>
      </div>

      {/* Content */}
      {callType === 'video' ? (
        <VideoTiles localName={myName} otherName={otherName} />
      ) : (
        <VoiceLayout localName={myName} otherName={otherName} />
      )}

      {/* Audio rendering (required for voice) */}
      <RoomAudioRenderer />

      {/* Detects when remote participant joins → stops ringback, plays chime */}
      <ConnectedListener />

      {/* Controls */}
      <CallControls callType={callType} callId={callId} onHangUp={onHangUp} />
    </div>
  )
}

export function CallRoom({
  conversationId,
  callType,
  callId,
  myUid,
  myName,
  otherName,
  onHangUp,
}: CallRoomProps) {
  const [token, setToken] = useState<string | null>(null)
  const [serverUrl, setServerUrl] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const fetchToken = useCallback(async () => {
    try {
      console.log('[CallRoom] fetching token →', { roomName: conversationId, userName: myName, userIdentity: myUid })
      const res = await fetch('/api/livekit/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          roomName: conversationId,
          userName: myName,
          userIdentity: myUid,
        }),
      })
      const data = await res.json()
      console.log('[CallRoom] token API response:', res.status, res.ok ? 'OK' : data?.error)
      if (!res.ok) throw new Error(data?.error ?? `Token API returned ${res.status}`)
      setToken(data.token)
      setServerUrl(data.url)
    } catch (err) {
      console.error('[CallRoom] fetchToken failed:', err)
      setError(err instanceof Error ? err.message : 'Could not connect to call')
    }
  }, [conversationId, myName, myUid])

  useEffect(() => { fetchToken() }, [fetchToken])

  // Subscribe to call-record changes so the caller is automatically sent back
  // when the receiver declines or the call is marked missed/ended externally.
  const [callStatus, setCallStatus] = useState<string | null>(null)
  useEffect(() => {
    if (!callId) return
    return subscribeToCallRecord(callId, (rec) => {
      if (!rec) return
      setCallStatus(rec.status)
    })
  }, [callId])

  useEffect(() => {
    if (
      callStatus === 'declined' ||
      callStatus === 'missed' ||
      callStatus === 'ended'
    ) {
      stopAllCallSounds()
      playEndOnce()
      const t = setTimeout(() => onHangUp(), 1200)
      return () => clearTimeout(t)
    }
  }, [callStatus, onHangUp])

  // 30-second timeout: if no one has connected yet, treat as missed
  useEffect(() => {
    if (!callId) return
    const t = setTimeout(async () => {
      // Only escalate to missed if still ringing
      if (callStatus === 'ringing' || callStatus === null) {
        await updateCallStatus(callId, 'missed').catch(() => {})
      }
    }, 30_000)
    return () => clearTimeout(t)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [callId]) // run once per call, intentionally exclude callStatus

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-4 px-8 text-center">
        <div className="w-14 h-14 rounded-full bg-red-500/10 border border-red-500/20 flex items-center justify-center text-2xl">📞</div>
        <p className="text-sm font-body text-khoj-subtle">{error}</p>
        <button
          type="button"
          onClick={fetchToken}
          className="text-xs font-body text-khoj-accent underline hover:no-underline"
        >
          Retry
        </button>
        <button
          type="button"
          onClick={onHangUp}
          className="text-xs font-body text-khoj-muted underline hover:no-underline"
        >
          Back to messages
        </button>
      </div>
    )
  }

  if (!token || !serverUrl) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-4 px-8">
        <div className="flex gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full bg-khoj-accent animate-bounce [animation-delay:0ms]" />
          <span className="w-2.5 h-2.5 rounded-full bg-khoj-accent animate-bounce [animation-delay:150ms]" />
          <span className="w-2.5 h-2.5 rounded-full bg-khoj-accent animate-bounce [animation-delay:300ms]" />
        </div>
        <p className="text-sm font-body text-khoj-muted">Connecting to call…</p>
      </div>
    )
  }

  return (
    <LiveKitRoom
      token={token}
      serverUrl={serverUrl}
      connect={true}
      audio={true}
      video={callType === 'video'}
      onDisconnected={onHangUp}
      className="h-full"
    >
      <CallRoomInner
        callType={callType}
        callId={callId}
        myName={myName}
        otherName={otherName}
        onHangUp={onHangUp}
      />
    </LiveKitRoom>
  )
}
