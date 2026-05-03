'use client'
// hooks/useStartupRooms.ts
// Browse + filter startup rooms from Firestore.

import { useEffect, useState } from 'react'
import { subscribeStartupRooms } from '@/lib/collaboration/roomQueries'
import type { CollabRoom } from '@/types/collaboration'

export interface StartupRoomsFilters {
  stage?: string
  commitment?: string
  locationMode?: string
  isRecruiting?: boolean
  limitCount?: number
}

export function useStartupRooms(filters: StartupRoomsFilters = {}) {
  const [rooms, setRooms] = useState<CollabRoom[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    setLoading(true)
    const unsub = subscribeStartupRooms(filters, (data) => {
      setRooms(data)
      setLoading(false)
      setError(null)
    })
    return unsub
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    filters.stage,
    filters.commitment,
    filters.locationMode,
    filters.isRecruiting,
    filters.limitCount,
  ])

  return { rooms, loading, error }
}
