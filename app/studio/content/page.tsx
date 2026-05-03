// app/studio/content/page.tsx
// KHOJ Studio — Content management page

'use client'

import { useEffect, useState } from 'react'
import { useAuth } from '@/hooks/useAuth'
import Link from 'next/link'
import toast from 'react-hot-toast'
import {
  subscribeStudioContent,
  softDeleteMedia,
  formatNumber,
  StudioMediaItem,
} from '@/services/studioAnalyticsService'
import { timeAgo, formatDuration } from '@/services/mediaService'

type FilterTab = 'all' | 'video' | 'clip' | 'draft'

export default function StudioContentPage() {
  const { firebaseUser } = useAuth()
  const uid = firebaseUser?.uid ?? null

  const [items, setItems]     = useState<StudioMediaItem[]>([])
  const [loading, setLoading] = useState(true)
  const [tab, setTab]         = useState<FilterTab>('all')
  const [deleting, setDeleting] = useState<string | null>(null)

  useEffect(() => {
    if (!uid) return
    const unsub = subscribeStudioContent(uid, (all) => {
      setItems(all)
      setLoading(false)
    })
    return unsub
  }, [uid])

  const filtered = items.filter((item) => {
    if (tab === 'draft')  return item.status === 'draft'
    if (tab === 'video')  return item.type === 'video' && item.status !== 'deleted'
    if (tab === 'clip')   return item.type === 'clip'  && item.status !== 'deleted'
    return item.status !== 'deleted'
  })

  async function handleDelete(id: string, title: string) {
    if (!confirm(`Delete "${title}"? This will hide it from Arena.`)) return
    setDeleting(id)
    try {
      await softDeleteMedia(id)
      toast.success('Content removed')
    } catch {
      toast.error('Delete failed')
    } finally {
      setDeleting(null)
    }
  }

  function copyLink(id: string) {
    const url = `${window.location.origin}/arena/media/${id}`
    navigator.clipboard.writeText(url)
      .then(() => toast.success('Link copied!'))
      .catch(() => toast.error('Could not copy link'))
  }

  const TABS: { id: FilterTab; label: string }[] = [
    { id: 'all',   label: 'All' },
    { id: 'video', label: 'Videos' },
    { id: 'clip',  label: 'Clips' },
    { id: 'draft', label: 'Drafts' },
  ]

  return (
    <div className="p-8 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-white text-2xl font-bold tracking-tight">Content</h1>
          <p className="text-zinc-500 text-sm mt-0.5">Manage your videos, clips, and streams</p>
        </div>
        <Link
          href="/arena"
          className="flex items-center gap-2 px-4 py-2 rounded-xl bg-[#ff5a00] text-white text-sm font-bold hover:bg-[#ff4400] transition-colors"
        >
          <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/>
          </svg>
          Upload
        </Link>
      </div>

      {/* Tab filter */}
      <div className="flex items-center gap-2 border-b border-zinc-800 pb-0">
        {TABS.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`px-4 py-2.5 text-sm font-semibold border-b-2 transition-colors -mb-px ${
              tab === t.id
                ? 'border-[#ff5a00] text-[#ff5a00]'
                : 'border-transparent text-zinc-500 hover:text-zinc-300'
            }`}
          >
            {t.label}
          </button>
        ))}
        <span className="ml-auto text-zinc-600 text-xs">{filtered.length} items</span>
      </div>

      {/* Table */}
      {loading ? (
        <ContentSkeleton />
      ) : filtered.length === 0 ? (
        <EmptyState tab={tab} />
      ) : (
        <div className="bg-[#0d0e14] border border-[#1e1e2e] rounded-2xl overflow-hidden">
          <table className="w-full text-xs">
            <thead>
              <tr className="text-zinc-600 border-b border-zinc-800 bg-zinc-900/30">
                <th className="text-left px-4 py-3 font-semibold">Content</th>
                <th className="text-left px-3 py-3 font-semibold">Type</th>
                <th className="text-left px-3 py-3 font-semibold">Visibility</th>
                <th className="text-right px-3 py-3 font-semibold">Views</th>
                <th className="text-right px-3 py-3 font-semibold">Likes</th>
                <th className="text-left px-3 py-3 font-semibold">Date</th>
                <th className="text-left px-3 py-3 font-semibold">Status</th>
                <th className="text-right px-4 py-3 font-semibold">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-900/80">
              {filtered.map((item) => (
                <tr key={item.id} className="hover:bg-zinc-900/40 transition-colors group">
                  {/* Thumbnail + title */}
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <div className={`relative flex-shrink-0 rounded-lg overflow-hidden bg-zinc-800 ${item.type === 'clip' ? 'w-10 aspect-[9/16]' : 'w-16 aspect-video'}`}>
                        {item.thumbnailUrl ? (
                          <img src={item.thumbnailUrl} alt={item.title} className="w-full h-full object-cover" />
                        ) : (
                          <div className="absolute inset-0 flex items-center justify-center">
                            <svg className="w-3 h-3 text-zinc-600" viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z"/></svg>
                          </div>
                        )}
                        {item.duration > 0 && (
                          <span className="absolute bottom-0.5 right-0.5 bg-black/80 text-white text-[8px] px-1 rounded font-mono">
                            {formatDuration(item.duration)}
                          </span>
                        )}
                      </div>
                      <div className="min-w-0">
                        <Link
                          href={`/arena/media/${item.id}`}
                          className="text-white font-semibold truncate block max-w-[200px] hover:text-[#ff5a00] transition-colors"
                        >
                          {item.title}
                        </Link>
                      </div>
                    </div>
                  </td>

                  {/* Type */}
                  <td className="px-3 py-3">
                    <span className={`capitalize px-2 py-0.5 rounded-md text-[10px] font-bold border ${item.type === 'clip' ? 'text-purple-400 border-purple-500/30 bg-purple-500/10' : 'text-[#ff5a00] border-[#ff5a00]/30 bg-[#ff5a00]/10'}`}>
                      {item.type}
                    </span>
                  </td>

                  {/* Visibility */}
                  <td className="px-3 py-3">
                    <span className={`capitalize text-[11px] font-semibold ${item.visibility === 'public' ? 'text-emerald-400' : 'text-zinc-500'}`}>
                      {item.visibility}
                    </span>
                  </td>

                  {/* Views */}
                  <td className="px-3 py-3 text-right text-zinc-300 font-semibold">{formatNumber(item.views)}</td>

                  {/* Likes */}
                  <td className="px-3 py-3 text-right text-zinc-400">{formatNumber(item.likes)}</td>

                  {/* Date */}
                  <td className="px-3 py-3 text-zinc-500">{timeAgo(item.createdAt)}</td>

                  {/* Status */}
                  <td className="px-3 py-3">
                    <span className={`capitalize text-[10px] font-bold ${item.status === 'published' ? 'text-emerald-400' : item.status === 'draft' ? 'text-yellow-400' : 'text-red-400'}`}>
                      {item.status}
                    </span>
                  </td>

                  {/* Actions */}
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2 justify-end">
                      {/* View */}
                      <Link
                        href={`/arena/media/${item.id}`}
                        className="w-7 h-7 rounded-lg bg-zinc-800 hover:bg-zinc-700 flex items-center justify-center transition-colors"
                        title="View"
                      >
                        <svg className="w-3.5 h-3.5 text-zinc-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/>
                        </svg>
                      </Link>

                      {/* Copy link */}
                      <button
                        onClick={() => copyLink(item.id)}
                        className="w-7 h-7 rounded-lg bg-zinc-800 hover:bg-zinc-700 flex items-center justify-center transition-colors"
                        title="Copy link"
                      >
                        <svg className="w-3.5 h-3.5 text-zinc-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/>
                        </svg>
                      </button>

                      {/* Delete */}
                      <button
                        onClick={() => handleDelete(item.id, item.title)}
                        disabled={deleting === item.id}
                        className="w-7 h-7 rounded-lg bg-zinc-800 hover:bg-red-500/20 hover:border-red-500/30 border border-transparent flex items-center justify-center transition-colors disabled:opacity-40"
                        title="Delete"
                      >
                        {deleting === item.id ? (
                          <div className="w-3 h-3 border border-red-400 border-t-transparent rounded-full animate-spin" />
                        ) : (
                          <svg className="w-3.5 h-3.5 text-zinc-400 hover:text-red-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4h6v2"/>
                          </svg>
                        )}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

function ContentSkeleton() {
  return (
    <div className="bg-[#0d0e14] border border-[#1e1e2e] rounded-2xl overflow-hidden">
      {[...Array(5)].map((_, i) => (
        <div key={i} className="flex items-center gap-4 px-4 py-3 border-b border-zinc-900">
          <div className="w-16 aspect-video bg-zinc-800 rounded-lg animate-pulse" />
          <div className="flex-1 space-y-2">
            <div className="h-3 bg-zinc-800 rounded animate-pulse w-48" />
            <div className="h-2 bg-zinc-900 rounded animate-pulse w-24" />
          </div>
          <div className="h-3 w-12 bg-zinc-800 rounded animate-pulse" />
          <div className="h-3 w-10 bg-zinc-800 rounded animate-pulse" />
        </div>
      ))}
    </div>
  )
}

function EmptyState({ tab }: { tab: FilterTab }) {
  return (
    <div className="bg-[#0d0e14] border border-[#1e1e2e] rounded-2xl flex flex-col items-center justify-center py-20 space-y-4">
      <div className="w-14 h-14 rounded-2xl bg-zinc-900 border border-zinc-800 flex items-center justify-center">
        <svg className="w-7 h-7 text-zinc-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6"><polygon points="23 7 16 12 23 17 23 7"/><rect x="1" y="5" width="15" height="14" rx="2"/></svg>
      </div>
      <div className="text-center">
        <p className="text-white font-bold text-sm">
          {tab === 'draft' ? 'No drafts' : `No ${tab === 'all' ? 'content' : tab + 's'} yet`}
        </p>
        <p className="text-zinc-500 text-xs mt-1">
          {tab === 'draft' ? 'Your saved drafts will appear here.' : 'Upload something to get started.'}
        </p>
      </div>
      <Link href="/arena" className="px-4 py-2 rounded-xl bg-[#ff5a00] text-white text-xs font-bold hover:bg-[#ff4400] transition-colors">
        Upload Now
      </Link>
    </div>
  )
}
