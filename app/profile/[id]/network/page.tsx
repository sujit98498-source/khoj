'use client'

import { useEffect, useMemo, useState } from 'react'
import { useParams, useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { AppShell } from '@/components/layout/AppShell'
import { PageLoader } from '@/components/ui/LoadingSpinner'
import { NetworkList } from '@/components/network/NetworkList'
import { NetworkTabs } from '@/components/network/NetworkTabs'
import { useAuth } from '@/hooks/useAuth'
import { useNetworkCounts, useNetworkList } from '@/hooks/useNetwork'
import { getNetworkUserSnapshot, type NetworkTab, type NetworkUserSnapshot } from '@/services/networkService'

const VALID_TABS: NetworkTab[] = ['connections', 'followers', 'following']

function normalizeTab(value: string | null): NetworkTab {
  return VALID_TABS.includes(value as NetworkTab) ? (value as NetworkTab) : 'connections'
}

export default function ProfileNetworkPage() {
  const params = useParams()
  const searchParams = useSearchParams()
  const router = useRouter()
  const { loading: authLoading, isAuthenticated } = useAuth()

  const profileId =
    typeof params.id === 'string'
      ? params.id
      : Array.isArray(params.id)
        ? params.id[0]
        : ''

  const [activeTab, setActiveTab] = useState<NetworkTab>(() => normalizeTab(searchParams.get('tab')))
  const [search, setSearch] = useState('')
  const [profile, setProfile] = useState<NetworkUserSnapshot | null>(null)
  const [profileLoading, setProfileLoading] = useState(true)

  const { counts } = useNetworkCounts(profileId)
  const { users, loading: listLoading } = useNetworkList(profileId, activeTab)

  useEffect(() => {
    setActiveTab(normalizeTab(searchParams.get('tab')))
  }, [searchParams])

  useEffect(() => {
    if (!profileId) return
    setProfileLoading(true)
    getNetworkUserSnapshot(profileId)
      .then(setProfile)
      .finally(() => setProfileLoading(false))
  }, [profileId])

  function handleTabChange(tab: NetworkTab) {
    setActiveTab(tab)
    router.replace(`/profile/${profileId}/network?tab=${tab}`)
  }

  const filteredUsers = useMemo(() => {
    const needle = search.trim().toLowerCase()
    if (!needle) return users
    return users.filter((user) => {
      return [
        user.name,
        user.username,
        user.headline,
        user.role,
        user.bio,
      ].filter(Boolean).some((value) => String(value).toLowerCase().includes(needle))
    })
  }, [search, users])

  if (authLoading || profileLoading) return <PageLoader />
  if (!isAuthenticated) return null

  return (
    <AppShell>
      <div className="space-y-6 animate-slide-up">
        <div className="flex flex-col gap-4 rounded-sm border border-khoj-border bg-khoj-card p-6 md:flex-row md:items-start md:justify-between">
          <div>
            <div className="mb-2 flex items-center gap-2 text-[10px] font-body uppercase tracking-[0.18em]">
              <Link href={`/profile/${profileId}`} className="text-khoj-muted transition-colors hover:text-khoj-accent">
                Profile
              </Link>
              <span className="text-khoj-border">/</span>
              <span className="text-khoj-accent">Network</span>
            </div>
            <h1 className="text-2xl font-display font-bold text-khoj-text">Network</h1>
            <p className="mt-1 text-sm text-khoj-subtle">
              {profile?.name ? `${profile.name}'s professional KHOJ graph` : 'KHOJ profile network'}
            </p>
          </div>

          <Link
            href={`/profile/${profileId}`}
            className="rounded-sm border border-khoj-border px-4 py-2 text-xs font-semibold text-khoj-subtle transition-colors hover:border-khoj-accent/40 hover:text-khoj-accent"
          >
            View Profile
          </Link>
        </div>

        <div className="rounded-sm border border-khoj-border bg-khoj-card">
          <div className="border-b border-khoj-border p-4">
            <label className="block">
              <span className="sr-only">Search network</span>
              <input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search by name, headline, role, or bio..."
                className="w-full rounded-sm border border-khoj-border bg-khoj-bg px-4 py-2.5 text-sm text-khoj-text outline-none transition-colors placeholder:text-khoj-muted focus:border-khoj-accent/50"
              />
            </label>
          </div>

          <NetworkTabs activeTab={activeTab} counts={counts} onChange={handleTabChange} />

          <div className="p-4">
            <NetworkList
              users={filteredUsers}
              loading={listLoading}
              tab={activeTab}
              search={search}
            />
          </div>
        </div>
      </div>
    </AppShell>
  )
}
