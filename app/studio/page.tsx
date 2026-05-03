// app/studio/page.tsx
// KHOJ Studio — Overview / Dashboard

'use client'

import { useEffect, useState, useCallback } from 'react'
import { useAuth } from '@/hooks/useAuth'
import Link from 'next/link'
import {
  subscribeCreatorStats,
  subscribeOpportunityInsights,
  getTopContent,
  getViewsByDay,
  formatNumber,
  formatWatchTime,
  formatHours,
  CreatorStats,
  OpportunityInsight,
  StudioMediaItem,
  DayCount,
} from '@/services/studioAnalyticsService'
import { timeAgo } from '@/services/mediaService'

type ChartPeriod = '7' | '28' | '90' | 'lifetime'

export default function StudioOverviewPage() {
  const { firebaseUser } = useAuth()
  const uid = firebaseUser?.uid ?? null

  const [stats, setStats]           = useState<CreatorStats | null>(null)
  const [topContent, setTopContent] = useState<StudioMediaItem[]>([])
  const [opportunities, setOpportunities] = useState<OpportunityInsight[]>([])
  const [viewData, setViewData]     = useState<DayCount[]>([])
  const [watchData, setWatchData]   = useState<DayCount[]>([])
  const [viewPeriod, setViewPeriod] = useState<ChartPeriod>('7')
  const [watchPeriod, setWatchPeriod] = useState<ChartPeriod>('7')
  const [loadingCharts, setLoadingCharts] = useState(false)

  // Subscribe to real-time stats
  useEffect(() => {
    if (!uid) return
    const unsub = subscribeCreatorStats(uid, setStats)
    return unsub
  }, [uid])

  // Subscribe to opportunity insights
  useEffect(() => {
    if (!uid) return
    const unsub = subscribeOpportunityInsights(uid, setOpportunities)
    return unsub
  }, [uid])

  // Load top content once
  useEffect(() => {
    if (!uid) return
    getTopContent(uid, 5).then(setTopContent).catch(console.warn)
  }, [uid])

  // Load chart data when period changes
  const loadCharts = useCallback(async (vp: ChartPeriod, wp: ChartPeriod) => {
    if (!uid) return
    setLoadingCharts(true)
    const vDays = vp === 'lifetime' ? 365 : parseInt(vp)
    const wDays = wp === 'lifetime' ? 365 : parseInt(wp)
    const [vd, wd] = await Promise.all([
      getViewsByDay(uid, vDays),
      getViewsByDay(uid, wDays),
    ])
    setViewData(vd)
    setWatchData(wd)
    setLoadingCharts(false)
  }, [uid])

  useEffect(() => { loadCharts(viewPeriod, watchPeriod) }, [loadCharts, viewPeriod, watchPeriod])

  if (!uid) return null

  const liveHoursFormatted = stats ? `${stats.liveHours.toFixed(1)} hrs` : '0 hrs'
  const watchTimeFormatted = stats ? formatWatchTime(stats.totalWatchTimeSeconds) : '0m'

  return (
    <div className="p-8 space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-white text-2xl font-bold tracking-tight">Studio Dashboard</h1>
          <p className="text-zinc-500 text-sm mt-0.5">Track your growth and performance</p>
        </div>
        <Link
          href="/arena"
          className="flex items-center gap-2 px-4 py-2 rounded-xl bg-[#ff5a00] text-white text-sm font-bold hover:bg-[#ff4400] transition-colors"
        >
          <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/>
          </svg>
          Upload Now
        </Link>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
        <StatCard label="Total Views"    value={stats ? formatNumber(stats.totalViews) : '–'}    delta="+18.6%" icon="👁" />
        <StatCard label="Watch Time"     value={watchTimeFormatted}                               delta="+22.4%" icon="⏱" />
        <StatCard label="Total Likes"    value={stats ? formatNumber(stats.totalLikes) : '–'}    delta="+12.8%" icon="♥" />
        <StatCard label="Total Uploads"  value={stats ? String(stats.totalUploads) : '–'}        delta={`+${stats?.totalClips ?? 0} clips`} icon="▶" />
        <StatCard label="Live Hours"     value={liveHoursFormatted}                               delta="+8.4%" icon="🔴" />
        <StatCard label="Followers"      value={stats ? formatNumber(stats.totalFollowers) : '–'} delta="+15.3%" icon="👥" />
      </div>

      {/* Charts row */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        <ChartCard
          title="Views"
          data={viewData}
          period={viewPeriod}
          onPeriodChange={setViewPeriod}
          valueKey="views"
          loading={loadingCharts}
          color="#ff5a00"
        />
        <ChartCard
          title="Watch Time"
          data={watchData}
          period={watchPeriod}
          onPeriodChange={setWatchPeriod}
          valueKey="watchTime"
          loading={loadingCharts}
          color="#a855f7"
          format={(v) => formatWatchTime(v)}
        />
      </div>

      {/* Top content + audience overview */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        {/* Top content */}
        <div className="xl:col-span-2 bg-[#0d0e14] border border-[#1e1e2e] rounded-2xl p-5 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-white text-sm font-bold">Top Content</h2>
            <Link href="/studio/content" className="text-[#ff5a00] text-xs font-semibold hover:text-orange-400 transition-colors">View all</Link>
          </div>
          {topContent.length === 0 ? (
            <div className="py-10 text-center">
              <p className="text-zinc-600 text-sm">No published content yet.</p>
              <Link href="/arena" className="text-[#ff5a00] text-xs font-semibold mt-2 inline-block hover:underline">Upload your first video →</Link>
            </div>
          ) : (
            <div className="space-y-3">
              {topContent.map((item) => (
                <TopContentRow key={item.id} item={item} />
              ))}
            </div>
          )}
        </div>

        {/* Audience overview placeholder */}
        <div className="bg-[#0d0e14] border border-[#1e1e2e] rounded-2xl p-5 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-white text-sm font-bold">Audience Overview</h2>
          </div>
          <AudiencePlaceholder />
        </div>
      </div>

      {/* Opportunity highlights */}
      <div className="bg-[#0d0e14] border border-[#1e1e2e] rounded-2xl p-5 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-white text-sm font-bold">Opportunity Highlights</h2>
          <button className="text-[#ff5a00] text-xs font-semibold hover:text-orange-400 transition-colors">View all</button>
        </div>
        {opportunities.length === 0 ? (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <OpportunityPlaceholder type="recruiter_view"    label="Recruiter views your profile"  time="Coming soon" />
            <OpportunityPlaceholder type="company_watch"     label="Company watches your video"     time="Coming soon" />
            <OpportunityPlaceholder type="scout_view"        label="Tournament scout watches clip"  time="Coming soon" />
            <OpportunityPlaceholder type="message_request"   label="Message from opportunity"       time="Coming soon" />
          </div>
        ) : (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {opportunities.map((o) => (
              <OpportunityCard key={o.id} insight={o} />
            ))}
          </div>
        )}
      </div>

      {/* Recent content table */}
      <RecentContentSection uid={uid} />
    </div>
  )
}

// ── Stat card ─────────────────────────────────────────────────────────────────

function StatCard({ label, value, delta, icon }: { label: string; value: string; delta: string; icon: string }) {
  return (
    <div className="bg-[#0d0e14] border border-[#1e1e2e] rounded-2xl p-4 space-y-2">
      <div className="flex items-center justify-between">
        <span className="text-zinc-500 text-xs font-semibold">{label}</span>
        <span className="text-base">{icon}</span>
      </div>
      <p className="text-white text-xl font-bold tracking-tight">{value}</p>
      <p className="text-emerald-400 text-[11px] font-semibold">{delta}</p>
      {/* Sparkline placeholder */}
      <div className="h-8 flex items-end gap-px opacity-40">
        {[3,5,4,7,6,9,8,10,7,9,12,10].map((h, i) => (
          <div key={i} className="flex-1 bg-[#ff5a00] rounded-sm" style={{ height: `${h * 5}%` }} />
        ))}
      </div>
    </div>
  )
}

// ── Chart card ────────────────────────────────────────────────────────────────

function ChartCard({
  title, data, period, onPeriodChange, valueKey, loading, color, format,
}: {
  title: string
  data: DayCount[]
  period: ChartPeriod
  onPeriodChange: (p: ChartPeriod) => void
  valueKey: 'views' | 'watchTime'
  loading: boolean
  color: string
  format?: (v: number) => string
}) {
  const values = data.map((d) => d[valueKey])
  const max = Math.max(...values, 1)
  const periods: ChartPeriod[] = ['7', '28', '90', 'lifetime']

  return (
    <div className="bg-[#0d0e14] border border-[#1e1e2e] rounded-2xl p-5 space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-white text-sm font-bold">{title}</h2>
        <div className="flex items-center gap-1">
          {periods.map((p) => (
            <button
              key={p}
              onClick={() => onPeriodChange(p)}
              className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold transition-colors ${
                period === p
                  ? 'bg-[#ff5a00] text-white'
                  : 'text-zinc-500 hover:text-zinc-300'
              }`}
            >
              {p === 'lifetime' ? 'Lifetime' : `${p} Days`}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="h-40 flex items-center justify-center">
          <div className="w-5 h-5 border-2 border-[#ff5a00] border-t-transparent rounded-full animate-spin" />
        </div>
      ) : (
        <div className="h-40 flex items-end gap-1">
          {data.map((d, i) => {
            const val = d[valueKey]
            const heightPct = max > 0 ? (val / max) * 100 : 0
            return (
              <div key={i} className="flex-1 group relative flex items-end">
                <div
                  className="w-full rounded-sm transition-opacity group-hover:opacity-100"
                  style={{
                    height: `${Math.max(heightPct, 2)}%`,
                    backgroundColor: color,
                    opacity: 0.7,
                  }}
                />
                {val > 0 && (
                  <div className="absolute -top-6 left-1/2 -translate-x-1/2 bg-zinc-900 text-white text-[10px] px-1.5 py-0.5 rounded whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10">
                    {format ? format(val) : val} <br />
                    <span className="text-zinc-500">{d.label}</span>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}

      {/* X-axis labels — show every Nth label */}
      <div className="flex justify-between text-zinc-600 text-[10px]">
        {data.length > 0 && (
          <>
            <span>{data[0]?.label}</span>
            <span>{data[Math.floor(data.length / 2)]?.label}</span>
            <span>{data[data.length - 1]?.label}</span>
          </>
        )}
      </div>
    </div>
  )
}

// ── Top content row ───────────────────────────────────────────────────────────

function TopContentRow({ item }: { item: StudioMediaItem }) {
  return (
    <Link href={`/arena/media/${item.id}`} className="flex items-center gap-3 hover:bg-zinc-900/50 rounded-xl p-2 transition-colors">
      <div className={`relative flex-shrink-0 rounded-lg overflow-hidden bg-zinc-900 ${item.type === 'clip' ? 'w-10 aspect-[9/14]' : 'w-16 aspect-video'}`}>
        {item.thumbnailUrl ? (
          <img src={item.thumbnailUrl} alt={item.title} className="w-full h-full object-cover" />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center">
            <svg className="w-4 h-4 text-zinc-700" viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z"/></svg>
          </div>
        )}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-white text-xs font-semibold truncate">{item.title}</p>
        <p className="text-zinc-500 text-[11px]">
          <span className="text-[#ff5a00] capitalize">{item.type}</span>
          {' · '}{item.status}
        </p>
      </div>
      <div className="text-right flex-shrink-0">
        <p className="text-white text-xs font-bold">{formatNumber(item.views)}</p>
        <p className="text-zinc-600 text-[10px]">views</p>
      </div>
      <div className="text-right flex-shrink-0">
        <p className="text-zinc-300 text-xs font-semibold">{formatNumber(item.likes)}</p>
        <p className="text-zinc-600 text-[10px]">likes</p>
      </div>
    </Link>
  )
}

// ── Audience placeholder ──────────────────────────────────────────────────────

function AudiencePlaceholder() {
  return (
    <div className="space-y-4">
      {/* Donut placeholder */}
      <div className="flex items-center justify-center">
        <div className="w-28 h-28 rounded-full border-[12px] border-[#ff5a00]/30 relative flex items-center justify-center">
          <div className="absolute inset-0 rounded-full border-[12px] border-transparent border-t-[#ff5a00] rotate-45" />
          <p className="text-zinc-500 text-[10px] text-center">No data<br/>yet</p>
        </div>
      </div>
      <div className="space-y-2 pt-2 border-t border-zinc-800">
        <div className="flex justify-between text-xs">
          <span className="text-zinc-500">Returning Viewers</span>
          <span className="text-zinc-400">–</span>
        </div>
        <div className="flex justify-between text-xs">
          <span className="text-zinc-500">New Viewers</span>
          <span className="text-zinc-400">–</span>
        </div>
        <div className="flex justify-between text-xs">
          <span className="text-zinc-500">Followers Gained</span>
          <span className="text-emerald-400 font-semibold">–</span>
        </div>
        <div className="flex justify-between text-xs">
          <span className="text-zinc-500">Profile Visits</span>
          <span className="text-emerald-400 font-semibold">–</span>
        </div>
      </div>
    </div>
  )
}

// ── Opportunity card ──────────────────────────────────────────────────────────

const OPPORTUNITY_ICONS: Record<string, string> = {
  recruiter_view:  '🏢',
  company_watch:   '🎬',
  scout_view:      '🏆',
  message_request: '💬',
}

function OpportunityCard({ insight }: { insight: OpportunityInsight }) {
  return (
    <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-3 space-y-1">
      <div className="flex items-center gap-2">
        <span className="text-lg">{OPPORTUNITY_ICONS[insight.type] ?? '📌'}</span>
        <p className="text-white text-xs font-semibold truncate">{insight.sourceName}</p>
        {!insight.isRead && <span className="ml-auto w-1.5 h-1.5 rounded-full bg-[#ff5a00] flex-shrink-0" />}
      </div>
      <p className="text-zinc-400 text-[11px]">{insight.title}</p>
      <p className="text-zinc-600 text-[10px]">{timeAgo(insight.createdAt)}</p>
    </div>
  )
}

function OpportunityPlaceholder({ type, label, time }: { type: string; label: string; time: string }) {
  return (
    <div className="bg-zinc-900/30 border border-dashed border-zinc-800 rounded-xl p-3 space-y-1">
      <div className="flex items-center gap-2">
        <span className="text-lg opacity-40">{OPPORTUNITY_ICONS[type] ?? '📌'}</span>
        <p className="text-zinc-600 text-xs font-semibold">{label}</p>
      </div>
      <p className="text-zinc-700 text-[10px]">{time}</p>
    </div>
  )
}

// ── Recent content section ────────────────────────────────────────────────────

function RecentContentSection({ uid }: { uid: string }) {
  const [items, setItems] = useState<StudioMediaItem[]>([])

  useEffect(() => {
    const { subscribeStudioContent } = require('@/services/studioAnalyticsService')
    const unsub = subscribeStudioContent(uid, (all: StudioMediaItem[]) => {
      setItems(all.slice(0, 5))
    })
    return unsub
  }, [uid])

  if (items.length === 0) return null

  return (
    <div className="bg-[#0d0e14] border border-[#1e1e2e] rounded-2xl p-5 space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-white text-sm font-bold">Recent Content</h2>
        <Link href="/studio/content" className="text-[#ff5a00] text-xs font-semibold hover:text-orange-400 transition-colors">View all</Link>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-xs">
          <thead>
            <tr className="text-zinc-600 border-b border-zinc-800">
              <th className="text-left pb-2 font-semibold">Content</th>
              <th className="text-left pb-2 font-semibold">Type</th>
              <th className="text-right pb-2 font-semibold">Views</th>
              <th className="text-right pb-2 font-semibold">Likes</th>
              <th className="text-left pb-2 font-semibold pl-4">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-900">
            {items.map((item) => (
              <tr key={item.id} className="hover:bg-zinc-900/40 transition-colors">
                <td className="py-2.5">
                  <Link href={`/arena/media/${item.id}`} className="flex items-center gap-2 hover:text-[#ff5a00] transition-colors">
                    <div className="w-12 aspect-video flex-shrink-0 rounded overflow-hidden bg-zinc-900">
                      {item.thumbnailUrl ? (
                        <img src={item.thumbnailUrl} alt={item.title} className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <svg className="w-3 h-3 text-zinc-700" viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z"/></svg>
                        </div>
                      )}
                    </div>
                    <span className="text-white font-semibold truncate max-w-[180px]">{item.title}</span>
                  </Link>
                </td>
                <td className="py-2.5">
                  <span className={`capitalize px-2 py-0.5 rounded-md text-[10px] font-bold border ${item.type === 'clip' ? 'text-purple-400 border-purple-500/30 bg-purple-500/10' : 'text-[#ff5a00] border-[#ff5a00]/30 bg-[#ff5a00]/10'}`}>
                    {item.type}
                  </span>
                </td>
                <td className="py-2.5 text-right text-zinc-300 font-semibold">{formatNumber(item.views)}</td>
                <td className="py-2.5 text-right text-zinc-400">{formatNumber(item.likes)}</td>
                <td className="py-2.5 pl-4">
                  <span className={`capitalize text-[10px] font-bold ${item.status === 'published' ? 'text-emerald-400' : item.status === 'draft' ? 'text-yellow-400' : 'text-zinc-500'}`}>
                    {item.status}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
