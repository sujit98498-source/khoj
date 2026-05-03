// components/arena/MediaCard.tsx
// VideoCard and ClipCard for the Arena media grid.
// Clicking opens /arena/media/[mediaId].

'use client'

import { useRef, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import toast from 'react-hot-toast'
import { MediaDoc, formatDuration, formatViews, timeAgo } from '@/services/mediaService'
import { ReportModal } from '@/components/reports/ReportModal'

// ── CAT gradient map ──────────────────────────────────────────────────────────

const CAT_GRADIENT: Record<string, string> = {
  Education:     'from-blue-900/70 via-zinc-900',
  Technology:    'from-cyan-900/60 via-zinc-900',
  Startup:       'from-amber-900/60 via-zinc-900',
  Gaming:        'from-orange-900/70 via-zinc-900',
  Entertainment: 'from-pink-900/60 via-zinc-900',
  Lifestyle:     'from-green-900/60 via-zinc-900',
  Music:         'from-indigo-900/60 via-zinc-900',
  Other:         'from-zinc-800 via-zinc-900',
}

function gradientFor(cat: string) {
  return CAT_GRADIENT[cat] ?? 'from-zinc-800 via-zinc-900'
}

// ── 3-dot menu ────────────────────────────────────────────────────────────────

interface CardMenuProps {
  media: MediaDoc
  reportedBy?: string
  reporterName?: string
  shareUrl: string
}

function CardMenu({ media, reportedBy, reporterName, shareUrl }: CardMenuProps) {
  const [open, setOpen]           = useState(false)
  const [showReport, setReport]   = useState(false)
  const ref                       = useRef<HTMLDivElement>(null)

  function close() { setOpen(false) }

  function handleShare(e: React.MouseEvent) {
    e.preventDefault()
    e.stopPropagation()
    close()
    navigator.clipboard.writeText(`${window.location.origin}${shareUrl}`)
      .then(() => toast.success('Link copied!', { icon: '🔗' }))
      .catch(() => toast.error('Could not copy link'))
  }

  function handleReport(e: React.MouseEvent) {
    e.preventDefault()
    e.stopPropagation()
    close()
    if (!reportedBy) { toast.error('Sign in to report'); return }
    setReport(true)
  }

  return (
    <>
      <div
        ref={ref}
        className="relative"
        onClick={(e) => { e.preventDefault(); e.stopPropagation() }}
      >
        <button
          onClick={(e) => { e.preventDefault(); e.stopPropagation(); setOpen((v) => !v) }}
          className={`
            w-7 h-7 flex items-center justify-center rounded-lg
            bg-black/60 border border-white/10 backdrop-blur-sm
            text-zinc-400 hover:text-white hover:bg-black/80 transition-all
            opacity-0 group-hover/card:opacity-100 focus:opacity-100
            ${open ? '!opacity-100' : ''}
          `}
          aria-label="More options"
        >
          <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="currentColor">
            <circle cx="12" cy="5"  r="1.5" />
            <circle cx="12" cy="12" r="1.5" />
            <circle cx="12" cy="19" r="1.5" />
          </svg>
        </button>

        {open && (
          <div className="absolute right-0 top-full mt-1 w-44 bg-[#13151d] border border-zinc-700 rounded-xl shadow-2xl shadow-black/60 py-1 z-50">
            <button
              onClick={handleShare}
              className="w-full flex items-center gap-2.5 px-3 py-2 text-xs text-zinc-300 hover:bg-zinc-700/50 hover:text-white transition-colors"
            >
              <svg className="w-3.5 h-3.5 text-zinc-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="18" cy="5" r="3" /><circle cx="6" cy="12" r="3" /><circle cx="18" cy="19" r="3" />
                <line x1="8.59" y1="13.51" x2="15.42" y2="17.49" />
                <line x1="15.41" y1="6.51" x2="8.59" y2="10.49" />
              </svg>
              Share
            </button>
            <button
              onClick={handleReport}
              className="w-full flex items-center gap-2.5 px-3 py-2 text-xs text-red-400 hover:bg-red-500/10 hover:text-red-300 transition-colors"
            >
              <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z" />
                <line x1="4" y1="22" x2="4" y2="15" />
              </svg>
              Report
            </button>
          </div>
        )}
      </div>

      {showReport && reportedBy && reporterName && (
        <ReportModal
          targetType={media.type}
          targetId={media.id}
          targetTitle={media.title}
          targetPreview={media.description}
          targetOwnerId={media.creatorId}
          targetOwnerName={media.creatorName}
          reportedBy={reportedBy}
          reporterName={reporterName}
          onClose={() => setReport(false)}
        />
      )}
    </>
  )
}

// ── Video Card (16:9) ─────────────────────────────────────────────────────────

interface VideoCardProps {
  media: MediaDoc
  reportedBy?: string
  reporterName?: string
}

export function VideoMediaCard({ media, reportedBy, reporterName }: VideoCardProps) {
  const href = `/arena/media/${media.id}`
  const gradient = gradientFor(media.category)
  const initial = media.creatorName.charAt(0).toUpperCase()

  return (
    <Link
      href={href}
      className="relative block bg-[#101218] border border-zinc-800 rounded-xl overflow-hidden hover:border-zinc-600 transition-all duration-200 group/card cursor-pointer hover:shadow-lg hover:shadow-black/40"
    >
      {/* Thumbnail */}
      <div className="relative aspect-video overflow-hidden bg-zinc-950">
        {media.thumbnailUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={media.thumbnailUrl}
            alt={media.title}
            className="w-full h-full object-cover group-hover/card:scale-105 transition-transform duration-300"
          />
        ) : (
          <>
            <div className={`absolute inset-0 bg-gradient-to-br ${gradient} to-zinc-950`} />
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="w-11 h-11 rounded-full bg-white/10 border border-white/20 flex items-center justify-center group-hover/card:bg-[#ff5a00]/20 group-hover/card:border-[#ff5a00]/40 transition-all">
                <svg className="w-5 h-5 text-white/70 group-hover/card:text-[#ff5a00] transition-colors ml-0.5" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M8 5v14l11-7z" />
                </svg>
              </div>
            </div>
            {/* Show title in fallback */}
            <div className="absolute bottom-0 left-0 right-0 p-3 bg-gradient-to-t from-black/80">
              <p className="text-white text-xs font-semibold line-clamp-2 leading-tight">{media.title}</p>
            </div>
          </>
        )}

        {/* Duration */}
        {media.duration > 0 && (
          <div className="absolute bottom-2 right-2 bg-black/80 text-white text-[10px] font-mono px-1.5 py-0.5 rounded-md z-10">
            {formatDuration(media.duration)}
          </div>
        )}

        {/* 3-dot menu */}
        <div className="absolute top-2 right-2 z-10">
          <CardMenu
            media={media}
            reportedBy={reportedBy}
            reporterName={reporterName}
            shareUrl={`/arena/media/${media.id}`}
          />
        </div>
      </div>

      {/* Info */}
      <div className="p-3 space-y-2">
        <div className="flex items-start gap-2.5">
          <div className="w-8 h-8 rounded-full bg-[#ff5a00]/10 border border-[#ff5a00]/20 flex items-center justify-center flex-shrink-0">
            {media.creatorPhoto ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={media.creatorPhoto} alt={media.creatorName} className="w-full h-full rounded-full object-cover" />
            ) : (
              <span className="text-[#ff5a00] font-bold text-xs">{initial}</span>
            )}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-white text-sm font-semibold truncate leading-tight">{media.title}</p>
            <p className="text-zinc-500 text-xs truncate">{media.creatorName}</p>
          </div>
        </div>
        <div className="flex items-center gap-3 text-zinc-600 text-[11px]">
          <span>{formatViews(media.views)} views</span>
          <span>·</span>
          <span>{timeAgo(media.createdAt)}</span>
          <span>·</span>
          <span className="text-zinc-500">{media.category}</span>
        </div>
      </div>
    </Link>
  )
}

// ── Clip Card (9:14) ──────────────────────────────────────────────────────────

export function ClipMediaCard({ media, reportedBy, reporterName }: VideoCardProps) {
  const href = `/arena/media/${media.id}`
  const initial = media.creatorName.charAt(0).toUpperCase()

  return (
    <Link
      href={href}
      className="relative block bg-[#101218] border border-zinc-800 rounded-xl overflow-hidden hover:border-zinc-600 transition-all duration-200 group/card cursor-pointer hover:shadow-md hover:shadow-black/40"
    >
      {/* Vertical thumbnail */}
      <div className="relative aspect-[9/14] overflow-hidden bg-zinc-950">
        {media.thumbnailUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={media.thumbnailUrl}
            alt={media.title}
            className="w-full h-full object-cover group-hover/card:scale-105 transition-transform duration-300"
          />
        ) : (
          <>
            <div className="absolute inset-0 bg-gradient-to-b from-zinc-800/40 via-zinc-900 to-zinc-950" />
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="w-9 h-9 rounded-full bg-white/10 border border-white/20 flex items-center justify-center group-hover/card:bg-[#ff5a00]/20 group-hover/card:border-[#ff5a00]/40 transition-all">
                <svg className="w-4 h-4 text-white/70 group-hover/card:text-[#ff5a00] transition-colors ml-0.5" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M8 5v14l11-7z" />
                </svg>
              </div>
            </div>
          </>
        )}

        {/* Duration */}
        {media.duration > 0 && (
          <div className="absolute bottom-1.5 right-1.5 bg-black/80 text-white text-[9px] font-mono px-1.5 py-0.5 rounded-md z-10">
            {formatDuration(media.duration)}
          </div>
        )}

        {/* 3-dot menu */}
        <div className="absolute top-1.5 right-1.5 z-10">
          <CardMenu
            media={media}
            reportedBy={reportedBy}
            reporterName={reporterName}
            shareUrl={`/arena/media/${media.id}`}
          />
        </div>
      </div>

      {/* Info */}
      <div className="p-2 space-y-1">
        <p className="text-white text-[11px] font-semibold line-clamp-2 leading-tight">{media.title}</p>
        <div className="flex items-center gap-1.5">
          <div className="w-4 h-4 rounded-full bg-[#ff5a00]/10 border border-[#ff5a00]/20 flex items-center justify-center flex-shrink-0">
            {media.creatorPhoto ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={media.creatorPhoto} alt={media.creatorName} className="w-full h-full rounded-full object-cover" />
            ) : (
              <span className="text-[#ff5a00] font-bold" style={{ fontSize: 7 }}>{initial}</span>
            )}
          </div>
          <p className="text-zinc-600 text-[10px] truncate">{media.creatorName}</p>
        </div>
        <p className="text-zinc-700 text-[9px]">{formatViews(media.views)} views · {timeAgo(media.createdAt)}</p>
      </div>
    </Link>
  )
}

// ── Skeleton loaders ──────────────────────────────────────────────────────────

export function VideoCardSkeleton() {
  return (
    <div className="bg-[#101218] border border-zinc-800 rounded-xl overflow-hidden animate-pulse">
      <div className="aspect-video bg-zinc-900" />
      <div className="p-3 space-y-2.5">
        <div className="flex gap-2.5">
          <div className="w-8 h-8 rounded-full bg-zinc-800" />
          <div className="flex-1 space-y-1.5">
            <div className="h-3 bg-zinc-800 rounded w-3/4" />
            <div className="h-2.5 bg-zinc-800 rounded w-1/2" />
          </div>
        </div>
        <div className="h-2.5 bg-zinc-800 rounded w-1/3" />
      </div>
    </div>
  )
}

export function ClipCardSkeleton() {
  return (
    <div className="bg-[#101218] border border-zinc-800 rounded-xl overflow-hidden animate-pulse">
      <div className="aspect-[9/14] bg-zinc-900" />
      <div className="p-2 space-y-1.5">
        <div className="h-3 bg-zinc-800 rounded" />
        <div className="h-2.5 bg-zinc-800 rounded w-3/4" />
      </div>
    </div>
  )
}
