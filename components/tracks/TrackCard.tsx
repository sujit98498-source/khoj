// components/tracks/TrackCard.tsx
// Browse grid card for a track. Shows enrollment progress if enrolled.

import Link from 'next/link'
import { TrackDoc, TrackEnrollment, levelBg } from '@/services/trackService'

interface Props {
  track: TrackDoc
  enrollment?: TrackEnrollment | null
}

export function TrackCard({ track, enrollment }: Props) {
  return (
    <Link href={`/tracks/${track.id}`} className="block group">
      <div className="bg-[#111118] border border-[#1e1e2e] rounded-2xl overflow-hidden hover:border-zinc-600 transition-all hover:-translate-y-0.5 duration-200">
        {/* Thumbnail */}
        <div className="relative aspect-video bg-zinc-900 overflow-hidden">
          {track.thumbnailUrl ? (
            <img
              src={track.thumbnailUrl}
              alt={track.title}
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-4xl opacity-20">📚</div>
          )}
          {/* Level badge */}
          <div className="absolute top-2 left-2">
            <span className={`text-[10px] font-bold px-2.5 py-1 rounded-full border backdrop-blur-sm ${levelBg(track.level)}`}>
              {track.level.charAt(0).toUpperCase() + track.level.slice(1)}
            </span>
          </div>
          {/* Progress badge */}
          {enrollment && (
            <div className="absolute top-2 right-2">
              <span className="text-[10px] font-bold px-2.5 py-1 rounded-full bg-[#ff5a00]/90 text-white backdrop-blur-sm">
                {enrollment.status === 'completed' ? '✓ Done' : `${enrollment.progressPercent}%`}
              </span>
            </div>
          )}
        </div>

        {/* Info */}
        <div className="p-4 space-y-3">
          <div>
            <p className="text-[10px] font-bold text-[#ff5a00] uppercase tracking-wider mb-1">{track.category}</p>
            <h3 className="text-white font-bold text-sm leading-snug line-clamp-2 group-hover:text-[#ff5a00] transition-colors">
              {track.title}
            </h3>
          </div>

          {/* Creator */}
          <div className="flex items-center gap-2">
            <div className="w-5 h-5 rounded-full overflow-hidden bg-zinc-800 flex-shrink-0">
              {track.creatorPhoto
                ? <img src={track.creatorPhoto} alt="" className="w-full h-full object-cover" />
                : <div className="w-full h-full flex items-center justify-center text-[9px] font-bold text-zinc-500">{track.creatorName?.charAt(0)}</div>
              }
            </div>
            <span className="text-[11px] text-zinc-500 truncate">{track.creatorName}</span>
          </div>

          {/* Stats */}
          <div className="flex items-center gap-2 text-[11px] text-zinc-600 flex-wrap">
            <span>{track.lessonCount} lessons</span>
            <span>·</span>
            <span>{track.challengeCount} challenges</span>
            <span>·</span>
            <span>{(track.enrolledCount ?? 0).toLocaleString()} enrolled</span>
          </div>

          {/* Progress bar if enrolled */}
          {enrollment && (
            <div className="w-full bg-zinc-800 rounded-full h-1.5">
              <div
                className="h-1.5 rounded-full bg-[#ff5a00] transition-all"
                style={{ width: `${enrollment.progressPercent}%` }}
              />
            </div>
          )}

          {/* CTA */}
          <span className={`text-xs font-bold px-4 py-2 rounded-lg inline-block transition-colors ${
            enrollment?.status === 'completed'
              ? 'bg-green-500/15 text-green-400'
              : enrollment
              ? 'bg-[#ff5a00]/15 text-[#ff5a00]'
              : 'bg-[#ff5a00] text-white group-hover:bg-[#ff4400]'
          }`}>
            {enrollment?.status === 'completed'
              ? '✓ Completed'
              : enrollment
              ? 'Continue'
              : 'Start Track'}
          </span>
        </div>
      </div>
    </Link>
  )
}
