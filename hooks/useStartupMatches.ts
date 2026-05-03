'use client'
// hooks/useStartupMatches.ts
// Fetch public startup profiles and rank them against a room + role.

import { useEffect, useState } from 'react'
import { getPublicStartupProfiles } from '@/lib/collaboration/roomQueries'
import { rankProfiles } from '@/lib/collaboration/matching'
import type { CollabRoom, StartupRole, MatchResult } from '@/types/collaboration'

export function useStartupMatches(
  room: CollabRoom | null | undefined,
  targetRole: StartupRole | null,
  enabled: boolean,
) {
  const [matches, setMatches] = useState<MatchResult[]>([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!room || !enabled) return
    setLoading(true)
    getPublicStartupProfiles(100).then((profiles) => {
      setMatches(rankProfiles(profiles, room, targetRole))
      setLoading(false)
    }).catch(() => setLoading(false))
  }, [room?.id, targetRole?.id, enabled])

  return { matches, loading }
}
