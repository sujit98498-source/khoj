// components/streams/LivePlayer.tsx
// LiveKit video player for KHOJ streams.
//
// Host layout  — shows own camera/screen + KHOJ-styled controls (mic, cam, screen share)
// Viewer layout — shows host's active track (screen share takes priority over camera)
//
// Token is fetched from /api/streams/token — LIVEKIT_API_SECRET is never exposed to client.

'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import {
  LiveKitRoom,
  RoomAudioRenderer,
  useTracks,
  VideoTrack,
  useLocalParticipant,
  isTrackReference,
} from '@livekit/components-react'
import '@livekit/components-styles'
import { Track } from 'livekit-client'
import { fetchStreamToken, isLiveKitConfigured } from '@/lib/livekit'
import { updateStreamThumbnail } from '@/services/streamService'
import clsx from 'clsx'

// ── Types ─────────────────────────────────────────────────────────────────────

interface LivePlayerProps {
  streamId: string
  userId: string
  userName: string
  role: 'host' | 'guest' | 'viewer'
  allowedParticipantIds?: string[]
  /** When true the camera/screen feed is hidden but the controls bar remains visible.
   *  The LiveKit room stays connected — use this when you want audio-only participation
   *  or when a custom stage component handles the visual layout. */
  hideVideo?: boolean
  onError?: (msg: string) => void
}

// ── Main component ────────────────────────────────────────────────────────────

export function LivePlayer({
  streamId,
  userId,
  userName,
  role,
  allowedParticipantIds = [],
  hideVideo = false,
  onError,
}: LivePlayerProps) {
  const [token, setToken] = useState<string | null>(null)
  const [livekitUrl, setLivekitUrl] = useState<string | null>(null)
  const [connectError, setConnectError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  // If LiveKit is not configured, show placeholder (or a minimal bar when controls-only mode)
  if (!isLiveKitConfigured()) {
    if (hideVideo && (role === 'host' || role === 'guest')) {
      return <NoopControlBar />
    }
    return (
      <LiveKitPlaceholder
        role={role}
        reason="LiveKit is not configured. Set NEXT_PUBLIC_LIVEKIT_URL in .env.local to enable video."
      />
    )
  }

  // eslint-disable-next-line react-hooks/rules-of-hooks
  const getToken = useCallback(async () => {
    setLoading(true)
    setConnectError(null)
    try {
      const data = await fetchStreamToken({ streamId, userId, userName, role })
      setToken(data.token)
      setLivekitUrl(data.url)
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Could not connect to stream'
      setConnectError(msg)
      onError?.(msg)
    } finally {
      setLoading(false)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [streamId, userId, userName, role])

  // eslint-disable-next-line react-hooks/rules-of-hooks
  useEffect(() => { getToken() }, [getToken])

  if (loading) {
    // In controls-only mode don't show a full video placeholder while connecting
    if (hideVideo && (role === 'host' || role === 'guest')) {
      return <NoopControlBar loading />
    }
    return (
      <div className="w-full aspect-video bg-khoj-bg flex items-center justify-center rounded-sm">
        <div className="flex flex-col items-center gap-3">
          <div className="w-6 h-6 border-2 border-khoj-accent border-t-transparent rounded-full animate-spin" />
          <p className="text-khoj-subtle text-sm font-body">Connecting to stream...</p>
        </div>
      </div>
    )
  }

  if (connectError) {
    return (
      <div className={hideVideo ? 'w-full' : 'w-full aspect-video bg-khoj-bg flex items-center justify-center rounded-sm'}>
        <div className={hideVideo
          ? 'flex flex-wrap items-center gap-3 px-4 py-3 bg-zinc-950/90 border border-zinc-800 rounded-xl'
          : 'text-center space-y-3 px-6 max-w-sm'
        }>
          <p className="text-red-400 text-sm font-body leading-relaxed flex-1">
            ⚠ {connectError}
          </p>
          <button
            onClick={getToken}
            className="text-xs text-khoj-accent hover:text-orange-400 font-body border border-khoj-accent/40 px-3 py-1.5 rounded-sm transition-colors"
          >
            Retry
          </button>
        </div>
      </div>
    )
  }

  if (!token || !livekitUrl) return null

  // When hideVideo=true, the LiveKitRoom renders without a fixed size.
  // HostLayout will hide its camera feed and only emit the controls bar.
  return (
    <div className={hideVideo ? 'w-full' : 'w-full h-full bg-black rounded-sm overflow-hidden'}>
      <LiveKitRoom
        token={token}
        serverUrl={livekitUrl}
        connect={true}
        video={role === 'host' || role === 'guest'}
        audio={role === 'host' || role === 'guest'}
        onError={(err) => {
          const raw = err.message ?? ''
          const msg =
            raw.toLowerCase().includes('permission') || raw.toLowerCase().includes('notallowed')
              ? 'Camera/microphone permission denied. Please allow access in your browser settings.'
              : raw || 'LiveKit connection error'
          setConnectError(msg)
          onError?.(msg)
        }}
        style={hideVideo ? { background: 'transparent' } : { height: '100%', width: '100%', background: 'transparent' }}
      >
        <RoomAudioRenderer />
        {(role === 'host' || role === 'guest') ? (
          <HostLayout streamId={streamId} hideVideo={hideVideo} allowedParticipantIds={allowedParticipantIds} />
        ) : (
          <ViewerLayout allowedParticipantIds={allowedParticipantIds} />
        )}
      </LiveKitRoom>
    </div>
  )
}

// ── Host layout ───────────────────────────────────────────────────────────────
// Shows own camera (or screen share) + KHOJ-styled controls.
// When hideVideo=true the camera feed is suppressed; only the controls bar renders.

function HostLayout({
  streamId,
  hideVideo = false,
  allowedParticipantIds = [],
}: {
  streamId: string
  hideVideo?: boolean
  allowedParticipantIds?: string[]
}) {
  const { localParticipant } = useLocalParticipant()
  const [micOn, setMicOn] = useState(true)
  const [camOn, setCamOn] = useState(true)
  const [screenOn, setScreenOn] = useState(false)
  const [screenErr, setScreenErr] = useState<string | null>(null)

  // Ref to the video container — used for thumbnail frame capture
  const containerRef = useRef<HTMLDivElement>(null)

  // Periodically capture a video frame and push it to Firestore as thumbnailUrl.
  // Only runs when camera or screen share is active, skipped in controls-only mode.
  useEffect(() => {
    if (!streamId || hideVideo || (!camOn && !screenOn)) return
    let cancelled = false

    async function captureFrame() {
      if (cancelled) return
      const videoEl = containerRef.current?.querySelector<HTMLVideoElement>('video')
      if (!videoEl || videoEl.readyState < 2 || !videoEl.videoWidth) return
      try {
        const W = Math.min(videoEl.videoWidth, 1280)
        const H = Math.min(videoEl.videoHeight, 720)
        const canvas = document.createElement('canvas')
        canvas.width = W
        canvas.height = H
        const ctx = canvas.getContext('2d')
        if (!ctx) return
        ctx.drawImage(videoEl, 0, 0, W, H)
        const blob = await new Promise<Blob | null>((resolve) =>
          canvas.toBlob(resolve, 'image/jpeg', 0.75)
        )
        if (!blob || cancelled) return
        const { ref, uploadBytes, getDownloadURL } = await import('firebase/storage')
        const { requireFirebaseStorage } = await import('@/lib/firebase/config')
        const storageRef = ref(requireFirebaseStorage(), `stream-thumbnails/${streamId}.jpg`)
        await uploadBytes(storageRef, blob, { contentType: 'image/jpeg' })
        const url = await getDownloadURL(storageRef)
        if (!cancelled) await updateStreamThumbnail(streamId, url)
      } catch (e) {
        console.warn('[StreamThumbnail] capture failed:', e)
      }
    }

    // First capture after 4 s (let video element render and stabilise)
    const firstTimer = setTimeout(captureFrame, 4000)
    // Subsequent captures every 15 s
    const interval = setInterval(captureFrame, 15000)

    return () => {
      cancelled = true
      clearTimeout(firstTimer)
      clearInterval(interval)
    }
  }, [streamId, hideVideo, camOn, screenOn])

  async function toggleMic() {
    await localParticipant.setMicrophoneEnabled(!micOn)
    setMicOn((v) => !v)
  }

  async function toggleCam() {
    await localParticipant.setCameraEnabled(!camOn)
    setCamOn((v) => !v)
  }

  async function toggleScreen() {
    try {
      await localParticipant.setScreenShareEnabled(!screenOn)
      setScreenOn((v) => !v)
      setScreenErr(null)
    } catch {
      setScreenErr('Screen share permission denied or not supported in this browser.')
    }
  }

  const ctrlBase =
    'flex flex-col items-center gap-1 px-3 py-2 rounded-sm transition-all text-[11px] font-body font-medium select-none'

  return (
    <div ref={containerRef} className={hideVideo ? 'w-full' : 'w-full h-full flex flex-col bg-black'}>

      {/* Video area — suppressed when hideVideo=true.
          LiveKitStage renders all participants with real VideoTrack components. */}
      {!hideVideo && (
        <div className="flex-1 relative overflow-hidden">
          <LiveKitStage showLiveBadge allowedParticipantIds={allowedParticipantIds} />
        </div>
      )}

      {/* Controls bar — always rendered regardless of hideVideo */}
      <div className={clsx(
        'flex flex-wrap items-center justify-center gap-2 px-4 py-3',
        hideVideo
          ? 'bg-zinc-950/90 border border-zinc-800 rounded-xl'
          : 'bg-black/95 border-t border-khoj-border flex-shrink-0'
      )}>
        {/* Screen share active indicator when video is hidden */}
        {hideVideo && screenOn && (
          <span className="text-[10px] font-body font-bold uppercase tracking-widest bg-khoj-accent/20 text-khoj-accent border border-khoj-accent/30 px-2 py-1 rounded-sm mr-1">
            ◈ Sharing Screen
          </span>
        )}

        {/* Mic */}
        <button
          type="button"
          onClick={toggleMic}
          className={clsx(ctrlBase, micOn ? 'bg-khoj-border/40 text-khoj-subtle hover:text-khoj-text' : 'bg-red-500/20 text-red-400')}
          title={micOn ? 'Mute microphone' : 'Unmute microphone'}
        >
          <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            {!micOn ? (
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
          <span>{micOn ? 'Mute' : 'Unmute'}</span>
        </button>

        {/* Camera */}
        <button
          type="button"
          onClick={toggleCam}
          className={clsx(ctrlBase, camOn ? 'bg-khoj-border/40 text-khoj-subtle hover:text-khoj-text' : 'bg-red-500/20 text-red-400')}
          title={camOn ? 'Turn camera off' : 'Turn camera on'}
        >
          <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            {!camOn ? (
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
          <span>{camOn ? 'Camera off' : 'Camera on'}</span>
        </button>

        {/* Screen share */}
        <button
          type="button"
          onClick={toggleScreen}
          className={clsx(ctrlBase, screenOn ? 'bg-khoj-accent/20 text-khoj-accent' : 'bg-khoj-border/40 text-khoj-subtle hover:text-khoj-text')}
          title={screenOn ? 'Stop sharing screen' : 'Share screen'}
        >
          <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <rect x="2" y="3" width="20" height="14" rx="2" />
            <line x1="8" y1="21" x2="16" y2="21" />
            <line x1="12" y1="17" x2="12" y2="21" />
          </svg>
          <span>{screenOn ? 'Stop share' : 'Share screen'}</span>
        </button>

        {/* Status pills */}
        <div className="flex items-center gap-1.5 ml-auto">
          <span className={clsx('text-[10px] font-mono px-2 py-0.5 rounded-sm', micOn ? 'text-green-400 bg-green-400/10' : 'text-red-400 bg-red-400/10')}>
            {micOn ? 'MIC' : 'MUTED'}
          </span>
          <span className={clsx('text-[10px] font-mono px-2 py-0.5 rounded-sm', camOn ? 'text-green-400 bg-green-400/10' : 'text-red-400 bg-red-400/10')}>
            {camOn ? 'CAM' : 'OFF'}
          </span>
        </div>
      </div>

      {screenErr && (
        <div className="px-4 py-2 bg-red-500/10 border-t border-red-500/20 text-red-400 text-xs font-body flex items-center justify-between">
          <span>⚠ {screenErr}</span>
          <button onClick={() => setScreenErr(null)} className="ml-2 opacity-60 hover:opacity-100">✕</button>
        </div>
      )}
    </div>
  )
}

// ── Viewer layout ─────────────────────────────────────────────────────────────
// Shows all participants' tracks in a grid.
// Local viewer tile is excluded — viewers publish nothing, no self-tile needed.

function ViewerLayout({ allowedParticipantIds = [] }: { allowedParticipantIds?: string[] }) {
  return (
    <div className="w-full h-full bg-black">
      <LiveKitStage excludeLocalParticipant allowedParticipantIds={allowedParticipantIds} />
    </div>
  )
}

// ── LiveKit participant stage ──────────────────────────────────────────────────
// Multi-participant grid rendered inside <LiveKitRoom> context.
// useTracks() returns all camera + screen-share track refs in the room.
// Per participant: screen share takes priority over camera in the slot.
// Falls back to avatar + name initial when no video track is active.

type TrackRef = ReturnType<typeof useTracks>[0]

function LiveKitStage({
  showLiveBadge = false,
  excludeLocalParticipant = false,
  allowedParticipantIds = [],
}: {
  showLiveBadge?: boolean
  excludeLocalParticipant?: boolean
  allowedParticipantIds?: string[]
}) {
  const tracks = useTracks(
    [
      { source: Track.Source.Camera, withPlaceholder: true },
      { source: Track.Source.ScreenShare, withPlaceholder: false },
    ],
    { onlySubscribed: false }
  )
  const allowedIds = new Set(allowedParticipantIds)

  // One slot per participant — screen share beats camera
  const slotMap = new Map<string, TrackRef>()
  for (const t of tracks) {
    if (excludeLocalParticipant && t.participant.isLocal) continue
    if (allowedIds.size > 0 && !allowedIds.has(t.participant.identity)) continue
    const id = t.participant.identity
    const existing = slotMap.get(id)
    if (!existing || t.source === Track.Source.ScreenShare) {
      slotMap.set(id, t)
    }
  }
  const slots = Array.from(slotMap.values())
  const count = slots.length

  if (count === 0) {
    return (
      <div className="w-full h-full flex items-center justify-center bg-khoj-bg">
        <div className="text-center space-y-3">
          <span className="text-5xl opacity-20">◈</span>
          <p className="text-khoj-subtle text-sm font-body">
            {excludeLocalParticipant ? 'Waiting for host to go live…' : 'Connecting to stream…'}
          </p>
        </div>
      </div>
    )
  }

  const gridCls = count === 1 ? 'grid-cols-1' : 'grid-cols-2'

  return (
    <div className={`grid ${gridCls} gap-[3px] h-full`}>
      {slots.map((slot) => {
        const isScreen = slot.source === Track.Source.ScreenShare
        const name = slot.participant.name ?? slot.participant.identity
        const isLocal = slot.participant.isLocal
        const initial = name.charAt(0).toUpperCase()

        return (
          <div
            key={slot.participant.identity}
            className="relative bg-zinc-950 overflow-hidden min-h-[240px] flex items-center justify-center"
          >
            {isTrackReference(slot) && slot.publication.track ? (
              <VideoTrack
                trackRef={slot}
                style={{
                  position: 'absolute',
                  inset: 0,
                  width: '100%',
                  height: '100%',
                  objectFit: isScreen ? 'contain' : 'cover',
                }}
              />
            ) : (
              <div className="flex flex-col items-center gap-3 z-10">
                <div className="w-20 h-20 rounded-full bg-khoj-bg border-2 border-khoj-accent/30 flex items-center justify-center">
                  <span className="text-khoj-accent font-display font-bold text-3xl">{initial}</span>
                </div>
                <p className="text-white/50 text-xs font-body">
                  {isLocal ? 'Camera is off' : `${name}'s camera is off`}
                </p>
              </div>
            )}

            {/* Name bar */}
            <div className="absolute bottom-0 left-0 right-0 px-3 py-2.5 bg-gradient-to-t from-black/80 via-black/40 to-transparent flex items-center gap-2 z-20">
              <p className="text-white text-sm font-body font-semibold truncate flex-1">
                {name}
                {isLocal && (
                  <span className="text-white/50 font-normal text-[11px] ml-1">(You)</span>
                )}
              </p>
            </div>

            {/* LIVE badge on local (host/guest) tile */}
            {isLocal && showLiveBadge && (
              <div className="absolute top-2.5 left-2.5 flex items-center gap-1 bg-red-600/90 text-white text-[9px] font-body font-bold px-1.5 py-0.5 rounded-sm uppercase tracking-widest z-20">
                <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
                LIVE
              </div>
            )}

            {/* Screen-share badge */}
            {isScreen && (
              <div className="absolute top-2.5 right-2.5 bg-khoj-accent/90 text-white text-[9px] font-body font-bold px-1.5 py-0.5 rounded-sm uppercase tracking-widest z-20">
                Screen
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}

// ── Unconfigured placeholder ──────────────────────────────────────────────────

function LiveKitPlaceholder({ role, reason }: { role: 'host' | 'guest' | 'viewer'; reason: string }) {
  return (
    <div className="w-full aspect-video bg-khoj-bg border border-khoj-border rounded-sm flex items-center justify-center">
      <div className="text-center space-y-3 px-6 max-w-md">
        <div className="w-12 h-12 mx-auto rounded-sm bg-khoj-card border border-khoj-border flex items-center justify-center">
          <svg className="w-6 h-6 text-khoj-subtle" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
            <path d="m15 10 4.553-2.069A1 1 0 0 1 21 8.87v6.26a1 1 0 0 1-1.447.894L15 14" />
            <rect x="3" y="8" width="12" height="8" rx="2" />
            <line x1="3" y1="3" x2="21" y2="21" />
          </svg>
        </div>
        <p className="text-khoj-subtle text-xs font-body leading-relaxed">{reason}</p>
        {(role === 'host' || role === 'guest') && (
          <p className="text-khoj-muted text-[10px] font-mono">
            Chat, viewer count, and stream metadata still work without LiveKit.
          </p>
        )}
      </div>
    </div>
  )
}

// ── Noop control bar ──────────────────────────────────────────────────────────
// Shown when LiveKit is not configured but the user is host/guest in
// controls-only mode. Buttons are visible but non-functional until LiveKit
// credentials are added to .env.local.

function NoopControlBar({ loading = false }: { loading?: boolean }) {
  const ctrlBase =
    'flex flex-col items-center gap-1 px-3 py-2 rounded-sm transition-all text-[11px] font-body font-medium select-none opacity-40 cursor-not-allowed'

  if (loading) {
    return (
      <div className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-zinc-950/90 border border-zinc-800 rounded-xl">
        <div className="w-4 h-4 border-2 border-khoj-accent border-t-transparent rounded-full animate-spin" />
        <span className="text-khoj-subtle text-xs font-body">Connecting…</span>
      </div>
    )
  }

  return (
    <div className="w-full flex flex-wrap items-center gap-2 px-4 py-3 bg-zinc-950/90 border border-zinc-800 rounded-xl">
      <span className="text-[10px] font-body text-khoj-subtle mr-2">
        LiveKit not configured — controls inactive
      </span>
      {[
        { label: 'Mute', icon: '🎤' },
        { label: 'Camera off', icon: '📷' },
        { label: 'Share screen', icon: '🖥' },
      ].map(({ label, icon }) => (
        <button key={label} disabled className={ctrlBase} title="Set NEXT_PUBLIC_LIVEKIT_URL to enable">
          <span className="text-base">{icon}</span>
          <span>{label}</span>
        </button>
      ))}
    </div>
  )
}
