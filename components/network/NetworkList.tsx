'use client'

import { EmptyNetworkState } from '@/components/network/EmptyNetworkState'
import { NetworkUserCard } from '@/components/network/NetworkUserCard'
import type { NetworkTab, NetworkUserSnapshot } from '@/services/networkService'

interface NetworkListProps {
  users: NetworkUserSnapshot[]
  loading?: boolean
  tab: NetworkTab
  search: string
}

export function NetworkList({ users, loading = false, tab, search }: NetworkListProps) {
  if (loading) {
    return (
      <div className="space-y-3">
        {[1, 2, 3].map((item) => (
          <div key={item} className="h-20 animate-pulse rounded-sm border border-khoj-border bg-khoj-card" />
        ))}
      </div>
    )
  }

  if (users.length === 0) return <EmptyNetworkState tab={tab} search={search} />

  return (
    <div className="space-y-3">
      {users.map((user) => (
        <NetworkUserCard key={user.uid} user={user} />
      ))}
    </div>
  )
}
