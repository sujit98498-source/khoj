// components/tracks/LessonList.tsx
// Numbered lesson roadmap with completion status and lock indicators.

'use client'

import Link from 'next/link'
import { TrackLesson, formatDurationTrack } from '@/services/trackService'

interface Props {
  trackId: string
  lessons: TrackLesson[]
  completedIds: string[]
  currentLessonId?: string | null
  enrolled: boolean
}

export function LessonList({ trackId, lessons, completedIds, currentLessonId, enrolled }: Props) {
  if (lessons.length === 0) {
    return (
      <div className="bg-[#111118] border border-[#1e1e2e] rounded-2xl p-6 text-center">
        <p className="text-zinc-500 text-sm">No lessons added yet.</p>
      </div>
    )
  }

  return (
    <div className="bg-[#111118] border border-[#1e1e2e] rounded-2xl overflow-hidden">
      <div className="px-4 py-3 border-b border-[#1e1e2e]">
        <h3 className="text-sm font-bold text-white">Track Roadmap</h3>
        <p className="text-[10px] text-zinc-600 mt-0.5">{completedIds.length}/{lessons.length} completed</p>
      </div>
      <div className="divide-y divide-[#1e1e2e]">
        {lessons.map((lesson, idx) => {
          const done      = completedIds.includes(lesson.id)
          const isCurrent = lesson.id === currentLessonId
          const canAccess = lesson.isPreview || enrolled

          return (
            <div
              key={lesson.id}
              className={`flex items-center gap-3 px-4 py-3 transition-colors ${
                isCurrent
                  ? 'bg-[#ff5a00]/10'
                  : done
                  ? 'bg-green-500/5'
                  : 'hover:bg-zinc-900/50'
              }`}
            >
              {/* Number / status indicator */}
              <div
                className={`w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 text-[10px] font-extrabold ${
                  done
                    ? 'bg-green-500 text-white'
                    : isCurrent
                    ? 'bg-[#ff5a00] text-white'
                    : 'bg-zinc-800 text-zinc-500'
                }`}
              >
                {done ? (
                  <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                ) : isCurrent ? (
                  <svg className="w-2.5 h-2.5" viewBox="0 0 24 24" fill="currentColor">
                    <polygon points="5 3 19 12 5 21 5 3" />
                  </svg>
                ) : (
                  idx + 1
                )}
              </div>

              {/* Lesson info */}
              <div className="flex-1 min-w-0">
                {canAccess ? (
                  <Link
                    href={`/tracks/${trackId}/learn/${lesson.id}`}
                    className={`text-xs font-semibold block truncate transition-colors ${
                      isCurrent
                        ? 'text-[#ff5a00]'
                        : done
                        ? 'text-zinc-400'
                        : 'text-white hover:text-[#ff5a00]'
                    }`}
                  >
                    {lesson.title}
                  </Link>
                ) : (
                  <span className="text-xs font-semibold text-zinc-600 block truncate">{lesson.title}</span>
                )}
                <div className="flex items-center gap-2 mt-0.5">
                  {lesson.duration > 0 && (
                    <span className="text-[10px] text-zinc-600">{formatDurationTrack(lesson.duration)}</span>
                  )}
                  {lesson.isPreview && (
                    <span className="text-[10px] text-[#ff5a00] font-semibold">Free Preview</span>
                  )}
                  {done && <span className="text-[10px] text-green-400 font-semibold">Completed</span>}
                  {isCurrent && !done && <span className="text-[10px] text-[#ff5a00] font-semibold">In Progress</span>}
                </div>
              </div>

              {/* Lock icon */}
              {!canAccess && (
                <svg className="w-3.5 h-3.5 text-zinc-700 flex-shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                  <path d="M7 11V7a5 5 0 0110 0v4" />
                </svg>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
