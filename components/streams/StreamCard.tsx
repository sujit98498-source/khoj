// components/streams/StreamCard.tsx
// Displays a single live stream in the streams listing grid.
// Thumbnail priority: captured thumbnailUrl > blurred hostPhoto > category gradient

'use client'

import Link from 'next/link'
import { Stream } from '@/lib/types'

// Per-category gradient for the fallback background
const CATEGORY_GRADIENT: Record<string, string> = {
  Coding:      'from-blue-900/60 via-zinc-900 to-zinc-950',
  Gaming:      'from-orange-900/60 via-zinc-900 to-zinc-950',
  Startup:     'from-amber-900/50 via-zinc-900 to-zinc-950',
  Fitness:     'from-green-900/60 via-zinc-900 to-zinc-950',
  Design:      'from-pink-900/50 via-zinc-900 to-zinc-950',
  Education:   'from-indigo-900/60 via-zinc-900 to-zinc-950',
  Tournaments: 'from-red-900/50 via-zinc-900 to-zinc-950',
  Other:       'from-zinc-800 via-zinc-900 to-zinc-950',
}

// Per-category pill style for the info row
const CATEGORY_PILL: Record<string, string> = {
  Coding:      'text-blue-400 border-blue-400/25 bg-blue-400/5',
  Gaming:      'text-orange-400 border-orange-400/25 bg-orange-400/5',
  Startup:     'text-amber-400 border-amber-400/25 bg-amber-400/5',
  Fitness:     'text-green-400 border-green-400/25 bg-green-400/5',
  Design:      'text-pink-400 border-pink-400/25 bg-pink-400/5',
  Education:   'text-blue-300 border-blue-300/25 bg-blue-300/5',
  Tournaments: 'text-[#ff5a00] border-[#ff5a00]/25 bg-[#ff5a00]/5',
  Other:       'text-zinc-500 border-zinc-700 bg-zinc-800/30',
}

interface StreamCardProps {
  stream: Stream
}

export function StreamCard({ stream }: StreamCardProps) {
  const hasThumb = Boolean(stream.thumbnailUrl)
  const hasHostPhoto = Boolean(stream.hostPhoto)
  const gradientCls = CATEGORY_GRADIENT[stream.category] ?? CATEGORY_GRADIENT.Other
  const pillCls = CATEGORY_PILL[stream.category] ?? CATEGORY_PILL.Other
  const initial = stream.hostName.charAt(0).toUpperCase()

  return (
    <div className="bg-[#101218] border border-zinc-800 rounded-xl overflow-hidden hover:border-[#ff5a00]/40 transition-all duration-200 group hover:shadow-lg hover:shadow-black/40">

      {/* ── Thumbnail area ── */}
      <Link href={`/streams/${stream.id}`} className="block relative aspect-video overflow-hidden bg-zinc-950">

        {hasThumb ? (
          /* Priority 1 — real captured screenshot */
          <img
            src={stream.thumbnailUrl}
            alt={stream.title}
            className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
          />
        ) : hasHostPhoto ? (
          /* Priority 2 — blurred host photo as atmospheric background */
          <>
            <img
              src={stream.hostPhoto}
              alt=""
              aria-hidden
              className="absolute inset-0 w-full h-full object-cover scale-110 blur-xl opacity-20 pointer-events-none"
            />
            <div className="absolute inset-0 bg-gradient-to-b from-black/30 via-transparent to-black/75" />
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-2.5">
              <div className="w-16 h-16 rounded-full overflow-hidden border-2 border-[#ff5a00]/60 shadow-xl shadow-black/60">
                <img src={stream.hostPhoto} alt={stream.hostName} className="w-full h-full object-cover" />
              </div>
              <p className="text-white/70 text-xs font-semibold drop-shadow">{stream.hostName}</p>
            </div>
          </>
        ) : (
          /* Priority 3 — category gradient with host initial */
          <div className={`absolute inset-0 bg-gradient-to-br ${gradientCls} flex flex-col items-center justify-center gap-2.5`}>
            <div className="w-12 h-12 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center">
              <span className="text-white/30 font-bold text-2xl">{initial}</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-[#ff5a00] animate-pulse" />
              <span className="text-white/40 text-[10px] font-bold uppercase tracking-widest">Live Now</span>
            </div>
          </div>
        )}

        {/* LIVE badge — always visible */}
        <div className="absolute top-2.5 left-2.5 z-10 flex items-center gap-1.5 bg-red-600 text-white text-[9px] font-bold px-2 py-0.5 rounded-md uppercase tracking-widest shadow-md">
          <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
          LIVE
        </div>

        {/* Viewer count */}
        <div className="absolute bottom-2.5 right-2.5 z-10 flex items-center gap-1 bg-black/70 backdrop-blur-sm text-white text-[10px] font-mono px-2 py-0.5 rounded-md">
          <svg className="w-2.5 h-2.5 opacity-70" fill="currentColor" viewBox="0 0 24 24">
            <path d="M12 4.5C7 4.5 2.73 7.61 1 12c1.73 4.39 6 7.5 11 7.5s9.27-3.11 11-7.5c-1.73-4.39-6-7.5-11-7.5zm0 12.5c-2.76 0-5-2.24-5-5s2.24-5 5-5 5 2.24 5 5-2.24 5-5 5zm0-8c-1.66 0-3 1.34-3 3s1.34 3 3 3 3-1.34 3-3-1.34-3-3-3z" />
          </svg>
          {stream.viewerCount}
        </div>
      </Link>

      {/* ── Info section ── */}
      <div className="p-3 space-y-2.5">
        <div className="flex items-start gap-2.5">
          {/* Host avatar */}
          <div className="w-8 h-8 rounded-full overflow-hidden bg-[#ff5a00]/10 border border-[#ff5a00]/20 flex-shrink-0 flex items-center justify-center">
            {stream.hostPhoto ? (
              <img src={stream.hostPhoto} alt={stream.hostName} className="w-full h-full object-cover" />
            ) : (
              <span className="text-[#ff5a00] font-bold text-xs">{initial}</span>
            )}
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-white text-sm font-semibold truncate leading-tight">{stream.title}</p>
            <p className="text-zinc-500 text-xs truncate">{stream.hostName}</p>
          </div>
        </div>

        <div className="flex items-center justify-between gap-2">
          <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-md border ${pillCls}`}>
            {stream.category}
          </span>
          <Link
            href={`/streams/${stream.id}`}
            className="text-[11px] font-bold text-[#ff5a00] hover:text-orange-400 transition-colors border border-[#ff5a00]/35 hover:border-orange-400/50 px-2.5 py-1 rounded-lg"
          >
            Join →
          </Link>
        </div>
      </div>
    </div>
  )
}
