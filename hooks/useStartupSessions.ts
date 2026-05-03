'use client'
// hooks/useStartupSessions.ts
// Live sessions subscription + LiveKit token fetch.

import { useEffect, useState } from 'react'
import { subscribeRoomSessions } from '@/lib/collaboration/roomQueries'
import type { StartupSession } from '@/types/collaboration'

export function useStartupSessions(roomId: string, enabled: boolean) {
  const [sessions, setSessions] = useState<StartupSession[]>([])
  const [loading,  setLoading]  = useState(true)
  const [tokenMap, setTokenMap] = useState<Record<string, string>>({})
  const [tokenLoading, setTokenLoading] = useState<string | null>(null)

  useEffect(() => {
    if (!roomId || !enabled) return
    const unsub = subscribeRoomSessions(roomId, (s) => { setSessions(s); setLoading(false) })
    return unsub
  }, [roomId, enabled])

  async function fetchSessionToken(
    sessionId: string,
    liveKitRoomName: string,
    userId: string,
    userName: string,
  ): Promise<string | null> {
    if (tokenMap[sessionId]) return tokenMap[sessionId]
    setTokenLoading(sessionId)
    try {
      const res = await fetch('/api/livekit/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          roomName: liveKitRoomName,
          userName,
          userIdentity: userId,
        }),
      })
      if (!res.ok) return null
      const data = await res.json() as { token: string }
      setTokenMap((prev) => ({ ...prev, [sessionId]: data.token }))
      return data.token
    } catch {
      return null
    } finally {
      setTokenLoading(null)
    }
  }

  const liveSession = sessions.find((s) => s.status === 'live') ?? null

  return { sessions, loading, liveSession, fetchSessionToken, tokenMap, tokenLoading }
}
