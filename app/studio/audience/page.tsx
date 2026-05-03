// app/studio/audience/page.tsx
// KHOJ Studio — Audience insights

'use client'

import { useEffect, useState } from 'react'
import { useAuth } from '@/hooks/useAuth'
import {
  subscribeCreatorStats,
  formatNumber,
  CreatorStats,
} from '@/services/studioAnalyticsService'

export default function StudioAudiencePage() {
  const { firebaseUser } = useAuth()
  const uid = firebaseUser?.uid ?? null
  const [stats, setStats] = useState<CreatorStats | null>(null)

  useEffect(() => {
    if (!uid) return
    const unsub = subscribeCreatorStats(uid, setStats)
    return unsub
  }, [uid])

  if (!uid) return null

  const followers    = stats?.totalFollowers ?? 0
  const profileViews = stats?.profileViews ?? 0
  const liveHours    = stats?.liveHours ?? 0

  return (
    <div className="p-8 space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-white text-2xl font-bold tracking-tight">Audience</h1>
        <p className="text-zinc-500 text-sm mt-0.5">Understand who watches your content</p>
      </div>

      {/* Key audience metrics */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <AudienceCard
          icon="👥"
          label="Total Followers"
          value={formatNumber(followers)}
          delta="+0"
          deltaLabel="this week"
        />
        <AudienceCard
          icon="👁"
          label="Profile Visits"
          value={formatNumber(profileViews)}
          delta="+0"
          deltaLabel="this week"
        />
        <AudienceCard
          icon="🔁"
          label="Returning Viewers"
          value="–"
          delta="Coming soon"
          deltaLabel=""
        />
        <AudienceCard
          icon="⭐"
          label="Avg. Watch %"
          value="–"
          delta="Coming soon"
          deltaLabel=""
        />
      </div>

      {/* Followers trend placeholder */}
      <div className="bg-[#0d0e14] border border-[#1e1e2e] rounded-2xl p-5 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-white text-sm font-bold">Followers Over Time</h2>
          <span className="text-zinc-600 text-xs">Last 28 days</span>
        </div>
        <div className="h-32 flex items-end gap-1 opacity-30">
          {[2,4,3,5,4,6,5,7,6,8,7,9,8,10,9,11,10,12,11,13,12,14,13,15,14,16,15,17].map((h, i) => (
            <div key={i} className="flex-1 bg-[#ff5a00] rounded-sm" style={{ height: `${h * 5}%` }} />
          ))}
        </div>
        <p className="text-zinc-600 text-xs text-center">
          Follower tracking will populate as your audience grows.
        </p>
      </div>

      {/* Demographics (placeholders) */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Top countries */}
        <div className="bg-[#0d0e14] border border-[#1e1e2e] rounded-2xl p-5 space-y-3">
          <h2 className="text-white text-sm font-bold">🌍 Top Countries</h2>
          <p className="text-zinc-600 text-xs">Geographic data coming with geo-tracking.</p>
          <div className="space-y-2 opacity-40">
            {['—', '—', '—', '—', '—'].map((_, i) => (
              <div key={i} className="flex items-center justify-between">
                <div className="h-2.5 bg-zinc-800 rounded w-24 animate-pulse" />
                <div className="h-2.5 bg-zinc-800 rounded w-8 animate-pulse" />
              </div>
            ))}
          </div>
        </div>

        {/* Age groups */}
        <div className="bg-[#0d0e14] border border-[#1e1e2e] rounded-2xl p-5 space-y-3">
          <h2 className="text-white text-sm font-bold">🎂 Age Groups</h2>
          <p className="text-zinc-600 text-xs">Age demographics coming soon.</p>
          <div className="space-y-2 opacity-40">
            {[['18–24', '35%'], ['25–34', '30%'], ['35–44', '20%'], ['45+', '15%']].map(([age, pct]) => (
              <div key={age} className="space-y-0.5">
                <div className="flex justify-between text-[11px]">
                  <span className="text-zinc-500">{age}</span>
                  <span className="text-zinc-500">{pct}</span>
                </div>
                <div className="h-1.5 bg-zinc-800 rounded-full">
                  <div className="h-full bg-[#ff5a00] rounded-full" style={{ width: pct }} />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Device breakdown */}
        <div className="bg-[#0d0e14] border border-[#1e1e2e] rounded-2xl p-5 space-y-3">
          <h2 className="text-white text-sm font-bold">📱 Device Breakdown</h2>
          <p className="text-zinc-600 text-xs">Device data coming soon.</p>
          <div className="space-y-2 opacity-40">
            {[['Desktop', '52%'], ['Mobile', '38%'], ['Tablet', '10%']].map(([device, pct]) => (
              <div key={device} className="space-y-0.5">
                <div className="flex justify-between text-[11px]">
                  <span className="text-zinc-500">{device}</span>
                  <span className="text-zinc-500">{pct}</span>
                </div>
                <div className="h-1.5 bg-zinc-800 rounded-full">
                  <div className="h-full bg-purple-500 rounded-full" style={{ width: pct }} />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Live activity */}
      <div className="bg-[#0d0e14] border border-[#1e1e2e] rounded-2xl p-5 space-y-3">
        <h2 className="text-white text-sm font-bold">🔴 Live Activity</h2>
        <div className="grid grid-cols-3 gap-4">
          <div className="text-center space-y-1">
            <p className="text-white text-xl font-bold">{liveHours.toFixed(1)}</p>
            <p className="text-zinc-500 text-xs">Total Live Hours</p>
          </div>
          <div className="text-center space-y-1 opacity-50">
            <p className="text-white text-xl font-bold">–</p>
            <p className="text-zinc-500 text-xs">Peak Concurrent</p>
          </div>
          <div className="text-center space-y-1 opacity-50">
            <p className="text-white text-xl font-bold">–</p>
            <p className="text-zinc-500 text-xs">Avg. Stream Viewers</p>
          </div>
        </div>
      </div>
    </div>
  )
}

function AudienceCard({
  icon, label, value, delta, deltaLabel,
}: {
  icon: string; label: string; value: string; delta: string; deltaLabel: string
}) {
  return (
    <div className="bg-[#0d0e14] border border-[#1e1e2e] rounded-2xl p-5 space-y-2">
      <div className="flex items-center justify-between">
        <span className="text-zinc-500 text-xs font-semibold">{label}</span>
        <span className="text-base">{icon}</span>
      </div>
      <p className="text-white text-2xl font-bold tracking-tight">{value}</p>
      <p className="text-zinc-600 text-[11px]">
        <span className="text-emerald-400 font-semibold">{delta}</span>
        {deltaLabel && ` ${deltaLabel}`}
      </p>
    </div>
  )
}
