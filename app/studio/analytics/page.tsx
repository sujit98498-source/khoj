// app/studio/analytics/page.tsx
// KHOJ Studio — Detailed analytics

'use client'

import { useEffect, useState, useCallback } from 'react'
import { useAuth } from '@/hooks/useAuth'
import {
  subscribeCreatorStats,
  getViewsByDay,
  getTopContent,
  formatNumber,
  formatWatchTime,
  CreatorStats,
  StudioMediaItem,
  DayCount,
} from '@/services/studioAnalyticsService'
import Link from 'next/link'

type Period = '7' | '28' | '90'

export default function StudioAnalyticsPage() {
  const { firebaseUser } = useAuth()
  const uid = firebaseUser?.uid ?? null

  const [stats, setStats]           = useState<CreatorStats | null>(null)
  const [period, setPeriod]         = useState<Period>('28')
  const [viewData, setViewData]     = useState<DayCount[]>([])
  const [watchData, setWatchData]   = useState<DayCount[]>([])
  const [topContent, setTopContent] = useState<StudioMediaItem[]>([])
  const [loading, setLoading]       = useState(true)

  useEffect(() => {
    if (!uid) return
    const unsub = subscribeCreatorStats(uid, setStats)
    return unsub
  }, [uid])

  useEffect(() => {
    if (!uid) return
    getTopContent(uid, 10).then(setTopContent).catch(console.warn)
  }, [uid])

  const loadData = useCallback(async (p: Period) => {
    if (!uid) return
    setLoading(true)
    const days = parseInt(p)
    const [vd, wd] = await Promise.all([
      getViewsByDay(uid, days),
      getViewsByDay(uid, days),
    ])
    setViewData(vd)
    setWatchData(wd)
    setLoading(false)
  }, [uid])

  useEffect(() => { loadData(period) }, [loadData, period])

  if (!uid) return null

  const totalViews     = stats?.totalViews ?? 0
  const totalLikes     = stats?.totalLikes ?? 0
  const totalWatch     = stats?.totalWatchTimeSeconds ?? 0
  const avgEngagement  = totalViews > 0 ? ((totalLikes / totalViews) * 100).toFixed(1) : '0.0'

  return (
    <div className="p-8 space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-white text-2xl font-bold tracking-tight">Analytics</h1>
          <p className="text-zinc-500 text-sm mt-0.5">Detailed performance metrics</p>
        </div>
        <div className="flex items-center gap-1 bg-zinc-900 border border-zinc-800 rounded-xl p-1">
          {(['7', '28', '90'] as Period[]).map((p) => (
            <button
              key={p}
              onClick={() => setPeriod(p)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                period === p ? 'bg-[#ff5a00] text-white' : 'text-zinc-500 hover:text-zinc-300'
              }`}
            >
              {p} days
            </button>
          ))}
        </div>
      </div>

      {/* Summary metrics */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard label="Total Views"        value={formatNumber(totalViews)}     sub="All time" />
        <MetricCard label="Watch Time"         value={formatWatchTime(totalWatch)}  sub="All time" />
        <MetricCard label="Total Likes"        value={formatNumber(totalLikes)}     sub="All time" />
        <MetricCard label="Engagement Rate"    value={`${avgEngagement}%`}          sub="Likes / Views" />
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        <AnalyticsChart
          title="Views Over Time"
          data={viewData}
          valueKey="views"
          loading={loading}
          color="#ff5a00"
          format={(v) => formatNumber(v)}
        />
        <AnalyticsChart
          title="Watch Time"
          data={watchData}
          valueKey="watchTime"
          loading={loading}
          color="#a855f7"
          format={(v) => formatWatchTime(v)}
        />
      </div>

      {/* Top content */}
      <div className="bg-[#0d0e14] border border-[#1e1e2e] rounded-2xl p-5 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-white text-sm font-bold">Top Performing Content</h2>
          <Link href="/studio/content" className="text-[#ff5a00] text-xs font-semibold hover:text-orange-400 transition-colors">Manage →</Link>
        </div>
        {topContent.length === 0 ? (
          <p className="text-zinc-600 text-sm py-8 text-center">No content yet. Upload videos or clips to see analytics.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="text-zinc-600 border-b border-zinc-800">
                  <th className="text-left pb-2 font-semibold w-6">#</th>
                  <th className="text-left pb-2 font-semibold">Title</th>
                  <th className="text-right pb-2 font-semibold">Views</th>
                  <th className="text-right pb-2 font-semibold">Likes</th>
                  <th className="text-right pb-2 font-semibold">Comments</th>
                  <th className="text-right pb-2 font-semibold">Engagement</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-900">
                {topContent.map((item, i) => {
                  const eng = item.views > 0 ? ((item.likes / item.views) * 100).toFixed(1) : '0.0'
                  return (
                    <tr key={item.id} className="hover:bg-zinc-900/40 transition-colors">
                      <td className="py-2.5 text-zinc-600">{i + 1}</td>
                      <td className="py-2.5">
                        <Link href={`/arena/media/${item.id}`} className="flex items-center gap-2 hover:text-[#ff5a00] transition-colors">
                          <div className="w-12 aspect-video flex-shrink-0 rounded overflow-hidden bg-zinc-900">
                            {item.thumbnailUrl
                              ? <img src={item.thumbnailUrl} alt={item.title} className="w-full h-full object-cover" />
                              : <div className="w-full h-full flex items-center justify-center"><svg className="w-3 h-3 text-zinc-700" viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z"/></svg></div>
                            }
                          </div>
                          <span className="text-white font-semibold truncate max-w-[180px]">{item.title}</span>
                        </Link>
                      </td>
                      <td className="py-2.5 text-right text-zinc-300 font-semibold">{formatNumber(item.views)}</td>
                      <td className="py-2.5 text-right text-zinc-400">{formatNumber(item.likes)}</td>
                      <td className="py-2.5 text-right text-zinc-400">{formatNumber(item.commentCount)}</td>
                      <td className="py-2.5 text-right">
                        <span className={`font-semibold ${parseFloat(eng) > 5 ? 'text-emerald-400' : 'text-zinc-400'}`}>{eng}%</span>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Placeholders for metrics without data */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <PlaceholderSection title="Traffic Sources" icon="🔗"
          items={['Direct / Arena Browse', 'Search', 'Profile Page', 'Shared Links']} />
        <PlaceholderSection title="Device Breakdown" icon="📱"
          items={['Desktop', 'Mobile', 'Tablet']} />
        <PlaceholderSection title="Top Countries" icon="🌍"
          items={['Coming with geo-tracking', 'Enable in Settings']} note />
      </div>
    </div>
  )
}

function MetricCard({ label, value, sub }: { label: string; value: string; sub: string }) {
  return (
    <div className="bg-[#0d0e14] border border-[#1e1e2e] rounded-2xl p-5 space-y-1">
      <p className="text-zinc-500 text-xs font-semibold">{label}</p>
      <p className="text-white text-2xl font-bold tracking-tight">{value}</p>
      <p className="text-zinc-600 text-[11px]">{sub}</p>
    </div>
  )
}

function AnalyticsChart({
  title, data, valueKey, loading, color, format,
}: {
  title: string
  data: DayCount[]
  valueKey: 'views' | 'watchTime'
  loading: boolean
  color: string
  format?: (v: number) => string
}) {
  const values = data.map((d) => d[valueKey])
  const max = Math.max(...values, 1)
  const total = values.reduce((a, b) => a + b, 0)

  return (
    <div className="bg-[#0d0e14] border border-[#1e1e2e] rounded-2xl p-5 space-y-3">
      <div className="flex items-center justify-between">
        <h2 className="text-white text-sm font-bold">{title}</h2>
        <span className="text-white font-bold text-sm">{format ? format(total) : formatNumber(total)}</span>
      </div>

      {loading ? (
        <div className="h-36 flex items-center justify-center">
          <div className="w-5 h-5 border-2 border-[#ff5a00] border-t-transparent rounded-full animate-spin" />
        </div>
      ) : (
        <div className="h-36 flex items-end gap-0.5">
          {data.map((d, i) => {
            const val = d[valueKey]
            const heightPct = (val / max) * 100
            return (
              <div key={i} className="flex-1 group relative flex items-end">
                <div
                  className="w-full rounded-sm"
                  style={{ height: `${Math.max(heightPct, 2)}%`, backgroundColor: color, opacity: 0.7 }}
                />
                {val > 0 && (
                  <div className="absolute -top-7 left-1/2 -translate-x-1/2 bg-zinc-900 border border-zinc-700 text-white text-[10px] px-1.5 py-0.5 rounded whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10">
                    {format ? format(val) : formatNumber(val)}
                    <div className="text-zinc-500">{d.label}</div>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}

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

function PlaceholderSection({ title, icon, items, note }: { title: string; icon: string; items: string[]; note?: boolean }) {
  return (
    <div className="bg-[#0d0e14] border border-[#1e1e2e] rounded-2xl p-5 space-y-3">
      <div className="flex items-center gap-2">
        <span>{icon}</span>
        <h2 className="text-white text-sm font-bold">{title}</h2>
      </div>
      <div className="space-y-2">
        {items.map((item, i) => (
          <div key={i} className={`flex items-center justify-between ${note ? 'opacity-50' : ''}`}>
            <span className="text-zinc-500 text-xs">{item}</span>
            {!note && <span className="text-zinc-600 text-xs">–</span>}
          </div>
        ))}
      </div>
    </div>
  )
}
