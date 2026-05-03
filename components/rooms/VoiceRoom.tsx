'use client'

import { useEffect, useMemo, useState } from 'react'
import {
  ControlBar,
  LiveKitRoom,
  RoomAudioRenderer,
} from '@livekit/components-react'
import '@livekit/components-styles'
import ParticipantsPanel from '@/components/rooms/ParticipantsPanel'

interface VoiceRoomProps {
  roomName: string
  userName: string
  userIdentityBase?: string
}

function buildSessionIdentity(roomName: string, identityBase: string) {
  const storageKey = `khoj-livekit-identity:${roomName}`

  if (typeof window === 'undefined') {
    return `${identityBase}-server`
  }

  const existing = window.sessionStorage.getItem(storageKey)
  if (existing) return existing

  const uniqueIdentity = `${identityBase}-${crypto.randomUUID().slice(0, 8)}`
  window.sessionStorage.setItem(storageKey, uniqueIdentity)
  return uniqueIdentity
}

export default function VoiceRoom({ roomName, userName, userIdentityBase }: VoiceRoomProps) {
  const [token, setToken] = useState<string | null>(null)
  const [serverUrl, setServerUrl] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const identityBase = useMemo(() => {
    const normalized = (userIdentityBase || userName || 'guest')
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')

    return normalized || 'guest'
  }, [userIdentityBase, userName])

  useEffect(() => {
    const fetchToken = async () => {
      try {
        setLoading(true)
        setError(null)

        const userIdentity = buildSessionIdentity(roomName, identityBase)

        const response = await fetch('/api/livekit/token', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ roomName, userName, userIdentity }),
        })

        const data = await response.json()

        if (!response.ok) {
          throw new Error(data?.error || 'Failed to fetch LiveKit token')
        }

        setToken(data.token)
        setServerUrl(data.url)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unable to connect to voice room')
      } finally {
        setLoading(false)
      }
    }

    if (roomName && userName) {
      fetchToken()
    } else {
      setError('roomName and userName are required')
      setLoading(false)
    }
  }, [identityBase, roomName, userName])

  if (loading) {
    return (
      <div className="rounded-sm border border-khoj-border bg-khoj-card p-6 shadow-[0_0_30px_rgba(255,77,0,0.05)]">
        <p className="text-[10px] uppercase tracking-[0.2em] text-khoj-accent font-body font-semibold">
          Voice Room
        </p>
        <h3 className="mt-2 text-lg font-display font-bold text-khoj-text">Connecting to {roomName}</h3>
        <p className="mt-2 text-sm text-khoj-subtle font-body">Preparing secure voice access...</p>
      </div>
    )
  }

  if (error || !token || !serverUrl) {
    return (
      <div className="rounded-sm border border-red-500/20 bg-khoj-card p-6">
        <p className="text-[10px] uppercase tracking-[0.2em] text-red-400 font-body font-semibold">
          Voice Room Error
        </p>
        <p className="mt-2 text-sm text-khoj-subtle font-body">
          {error || 'LiveKit connection details are missing.'}
        </p>
      </div>
    )
  }

  return (
    <div className="rounded-sm border border-khoj-border bg-khoj-card p-3 shadow-[0_0_30px_rgba(255,77,0,0.06)] overflow-hidden">
      <div className="mb-3 px-3 pt-3">
        <p className="text-[10px] uppercase tracking-[0.2em] text-khoj-accent font-body font-semibold">
          Live Voice
        </p>
        <h3 className="mt-1 text-lg font-display font-bold text-khoj-text">{roomName}</h3>
        <p className="text-sm text-khoj-subtle font-body">Joined as {userName}</p>
      </div>

      <div className="rounded-sm overflow-hidden border border-khoj-border bg-khoj-bg">
        <LiveKitRoom
          token={token}
          serverUrl={serverUrl}
          connect={true}
          audio={true}
          video={false}
          data-lk-theme="default"
          className="bg-khoj-bg text-khoj-text"
        >
          <RoomAudioRenderer />

          <div className="grid grid-cols-1 xl:grid-cols-3">
            <div className="xl:col-span-2 border-b xl:border-b-0 xl:border-r border-khoj-border">
              <div className="p-4 space-y-4">
                <div className="rounded-sm border border-khoj-border bg-khoj-card/50 p-4">
                  <p className="text-[10px] uppercase tracking-[0.18em] text-khoj-accent font-body font-semibold">
                    Voice Status
                  </p>
                  <h4 className="mt-2 text-base font-display font-bold text-khoj-text">
                    Room audio is live
                  </h4>
                  <p className="mt-1 text-sm text-khoj-subtle font-body leading-6">
                    Stay synced with your team, circle, or tournament group in real time. Your join, leave, and mute controls remain active below.
                  </p>
                </div>

                <div className="rounded-sm border border-khoj-border bg-khoj-bg/70 p-3">
                  <ControlBar variation="minimal" />
                </div>
              </div>
            </div>

            <div className="xl:col-span-1 bg-khoj-card/30">
              <ParticipantsPanel />
            </div>
          </div>
        </LiveKitRoom>
      </div>
    </div>
  )
}
