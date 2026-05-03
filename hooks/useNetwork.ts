'use client'

import { useEffect, useState } from 'react'
import {
  subscribeFollowStatus,
  subscribeNetworkCounts,
  subscribeNetworkList,
  type NetworkCounts,
  type NetworkTab,
  type NetworkUserSnapshot,
} from '@/services/networkService'

const EMPTY_COUNTS: NetworkCounts = {
  connections: 0,
  followers: 0,
  following: 0,
}

export function useNetworkCounts(userId: string | null | undefined) {
  const [counts, setCounts] = useState<NetworkCounts>(EMPTY_COUNTS)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!userId) {
      setCounts(EMPTY_COUNTS)
      setLoading(false)
      return
    }

    setLoading(true)
    const unsub = subscribeNetworkCounts(userId, (next) => {
      setCounts(next)
      setLoading(false)
    })

    return () => unsub()
  }, [userId])

  return { counts, loading }
}

export function useNetworkList(userId: string | null | undefined, tab: NetworkTab) {
  const [users, setUsers] = useState<NetworkUserSnapshot[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!userId) {
      setUsers([])
      setLoading(false)
      return
    }

    setLoading(true)
    const unsub = subscribeNetworkList(userId, tab, (next) => {
      setUsers(next)
      setLoading(false)
    })

    return () => unsub()
  }, [userId, tab])

  return { users, loading }
}

export function useFollowStatus(currentUserId: string | null | undefined, targetUserId: string | null | undefined) {
  const [following, setFollowing] = useState(false)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!currentUserId || !targetUserId || currentUserId === targetUserId) {
      setFollowing(false)
      setLoading(false)
      return
    }

    setLoading(true)
    const unsub = subscribeFollowStatus(currentUserId, targetUserId, (next) => {
      setFollowing(next)
      setLoading(false)
    })

    return () => unsub()
  }, [currentUserId, targetUserId])

  return { following, loading }
}
