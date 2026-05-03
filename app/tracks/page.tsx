// app/tracks/page.tsx
// KHOJ Tracks — browse and discover learning tracks

'use client'

import { useEffect, useState, useMemo } from 'react'
import { useAuth } from '@/hooks/useAuth'
import { AppShell } from '@/components/layout/AppShell'
import Link from 'next/link'
import {
  subscribeTracks,
  subscribeAllEnrollments,
  TrackDoc,
  TrackEnrollment,
  TrackLevel,
  TRACK_CATEGORIES,
  levelBg,
} from '@/services/trackService'

const CATEGORY_ICONS: Record<string, string> = {
  All: '⊞',
  Coding: '</>',
  Startup: '🚀',
  Design: '✏',
  Gaming: '◈',
  Business: '◉',
  Marketing: '▲',
  Language: '◎',
  Other: '▣',
}

const LEVELS: { value: string; label: string }[] = [
  { value: '',             label: 'All Levels'    },
  { value: 'beginner',     label: 'Beginner'      },
  { value: 'intermediate', label: 'Intermediate'  },
  { value: 'advanced',     label: 'Advanced'      },
]

export default function TracksPage() {
  const { firebaseUser, khojUser } = useAuth()
  const uid = firebaseUser?.uid ?? null

  const [tracks,      setTracks]      = useState<TrackDoc[]>([])
  const [enrollments, setEnrollments] = useState<TrackEnrollment[]>([])
  const [loading,     setLoading]     = useState(true)
  const [search,      setSearch]      = useState('')
  const [category,    setCategory]    = useState('All')
  const [level,       setLevel]       = useState('')

  useEffect(() => {
    setLoading(true)
    const unsub = subscribeTracks({}, (t) => {
      setTracks(t)
      setLoading(false)
    })
    return unsub
  }, [])

  useEffect(() => {
    if (!uid) return
    return subscribeAllEnrollments(uid, setEnrollments)
  }, [uid])

  const enrollmentMap = useMemo(() => {
    const m = new Map<string, TrackEnrollment>()
    enrollments.forEach((e) => m.set(e.trackId, e))
    return m
  }, [enrollments])

  const filtered = useMemo(() => {
    return tracks.filter((t) => {
      if (category !== 'All' && t.category !== category) return false
      if (level && t.level !== level) return false
      if (search) {
        const q = search.toLowerCase()
        return (
          t.title.toLowerCase().includes(q) ||
          t.description.toLowerCase().includes(q) ||
          t.creatorName.toLowerCase().includes(q) ||
          t.tags?.some((tag) => tag.toLowerCase().includes(q))
        )
      }
      return true
    })
  }, [tracks, category, level, search])

  // Enrolled tracks for "Continue Learning" strip
  const myTracks = enrollments
    .filter((e) => e.status === 'in_progress')
    .slice(0, 3)

  return (
    <AppShell>
      <div className="max-w-7xl mx-auto px-6 py-6 space-y-8">

        {/* ── Hero ── */}
        <div className="relative rounded-2xl overflow-hidden bg-gradient-to-r from-[#0d0e14] via-[#111118] to-[#0d0e14] border border-[#1e1e2e] px-8 py-10">
          <div className="absolute inset-0 opacity-10 pointer-events-none">
            <div className="absolute top-4 right-20 w-32 h-32 rounded-full bg-[#ff5a00] blur-3xl" />
            <div className="absolute bottom-4 right-60 w-24 h-24 rounded-full bg-orange-400 blur-2xl" />
          </div>
          <div className="relative max-w-xl">
            <h1 className="text-3xl font-extrabold text-white tracking-tight">KHOJ Tracks</h1>
            <p className="text-zinc-400 mt-1 text-sm">Learn. Compete. Get hired.</p>
            <p className="text-zinc-500 mt-3 text-sm leading-relaxed">
              Structured learning paths where you build real proof, complete challenges, and become visible to recruiters.
            </p>
            <div className="flex items-center gap-3 mt-5">
              {khojUser && (
                <Link
                  href="/tracks/create"
                  className="px-4 py-2 rounded-lg bg-[#ff5a00] text-white text-sm font-bold hover:bg-[#ff4400] transition-colors"
                >
                  + Create Track
                </Link>
              )}
              <a
                href="#featured"
                className="px-4 py-2 rounded-lg border border-zinc-700 text-zinc-300 text-sm font-semibold hover:border-zinc-500 transition-colors"
              >
                ▶ How it works
              </a>
            </div>
          </div>
          {/* Decorative badge */}
          <div className="absolute right-8 top-1/2 -translate-y-1/2 hidden lg:flex items-center justify-center w-32 h-32 rounded-full border-4 border-[#ff5a00]/30 bg-[#ff5a00]/10">
            <span className="text-5xl">🏆</span>
          </div>
        </div>

        {/* ── Search + filters ── */}
        <div className="space-y-3">
          <div className="flex items-center gap-3 flex-wrap">
            <div className="flex-1 min-w-[220px] max-w-sm flex items-center gap-2 bg-[#111118] border border-[#1e1e2e] rounded-xl px-3 py-2.5 focus-within:border-[#ff5a00]/40 transition-colors">
              <svg className="w-4 h-4 text-zinc-600 flex-shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search tracks, topics, creators..."
                className="bg-transparent text-sm text-white placeholder-zinc-600 outline-none w-full"
              />
            </div>

            <select
              value={level}
              onChange={(e) => setLevel(e.target.value)}
              className="bg-[#111118] border border-[#1e1e2e] text-zinc-300 text-sm rounded-xl px-3 py-2.5 outline-none focus:border-[#ff5a00]/40 transition-colors"
            >
              {LEVELS.map((l) => (
                <option key={l.value} value={l.value}>{l.label}</option>
              ))}
            </select>
          </div>

          {/* Category chips */}
          <div className="flex flex-wrap gap-2">
            {['All', ...TRACK_CATEGORIES].map((cat) => (
              <button
                key={cat}
                onClick={() => setCategory(cat)}
                className={`px-4 py-1.5 rounded-full text-xs font-bold border transition-colors ${
                  category === cat
                    ? 'bg-[#ff5a00] text-white border-[#ff5a00]'
                    : 'text-zinc-400 border-zinc-800 hover:border-zinc-600 hover:text-zinc-200'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>

        {/* ── Continue Learning strip ── */}
        {myTracks.length > 0 && (
          <section className="space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-white font-bold text-base">Continue Learning</h2>
              <Link href="/dashboard" className="text-[#ff5a00] text-xs font-semibold hover:text-orange-400">View all →</Link>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {myTracks.map((e) => (
                <Link
                  key={e.trackId}
                  href={`/tracks/${e.trackId}${e.lastLessonId ? `/learn/${e.lastLessonId}` : ''}`}
                  className="flex items-center gap-3 bg-[#111118] border border-[#1e1e2e] rounded-xl p-3 hover:border-zinc-700 transition-colors group"
                >
                  <div className="w-14 h-14 rounded-lg overflow-hidden bg-zinc-900 flex-shrink-0">
                    {e.thumbnailUrl ? (
                      <img src={e.thumbnailUrl} alt={e.title} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-2xl">📚</div>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-white text-xs font-bold truncate group-hover:text-[#ff5a00] transition-colors">{e.title}</p>
                    <div className="mt-1.5 w-full bg-zinc-800 rounded-full h-1.5">
                      <div className="h-1.5 rounded-full bg-[#ff5a00]" style={{ width: `${e.progressPercent}%` }} />
                    </div>
                    <p className="text-zinc-500 text-[10px] mt-1">{e.progressPercent}% complete</p>
                  </div>
                </Link>
              ))}
            </div>
          </section>
        )}

        {/* ── Track grid ── */}
        <section id="featured" className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-white font-bold text-base">
              {category === 'All' ? 'All Tracks' : `${category} Tracks`}
              <span className="ml-2 text-zinc-600 font-normal text-sm">({filtered.length})</span>
            </h2>
          </div>

          {loading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {Array.from({ length: 8 }).map((_, i) => (
                <div key={i} className="bg-[#111118] rounded-2xl overflow-hidden border border-[#1e1e2e] animate-pulse">
                  <div className="aspect-video bg-zinc-900" />
                  <div className="p-4 space-y-2">
                    <div className="h-4 bg-zinc-800 rounded w-3/4" />
                    <div className="h-3 bg-zinc-800 rounded w-1/2" />
                    <div className="h-2 bg-zinc-800 rounded w-full mt-3" />
                  </div>
                </div>
              ))}
            </div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-20">
              <p className="text-4xl mb-3">📭</p>
              <p className="text-zinc-400 font-semibold">No tracks found</p>
              <p className="text-zinc-600 text-sm mt-1">Try a different category or search term</p>
              {khojUser && (
                <Link href="/tracks/create" className="inline-block mt-4 px-5 py-2 bg-[#ff5a00] text-white text-sm font-bold rounded-lg hover:bg-[#ff4400] transition-colors">
                  Create the first track
                </Link>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {filtered.map((track) => (
                <TrackCard
                  key={track.id}
                  track={track}
                  enrollment={enrollmentMap.get(track.id) ?? null}
                />
              ))}
            </div>
          )}
        </section>

        {/* ── Why Tracks? ── */}
        <section className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-4">
          {[
            { icon: '🎓', title: 'Learn from top creators', desc: 'Structured content and real projects' },
            { icon: '🏆', title: 'Prove your skills', desc: 'Complete challenges and build proof' },
            { icon: '💼', title: 'Get discovered', desc: 'Show up in recruiter search and get hired' },
          ].map((item) => (
            <div key={item.title} className="flex items-start gap-4 bg-[#111118] border border-[#1e1e2e] rounded-xl p-5">
              <span className="text-2xl flex-shrink-0">{item.icon}</span>
              <div>
                <p className="text-white text-sm font-bold">{item.title}</p>
                <p className="text-zinc-500 text-xs mt-0.5">{item.desc}</p>
              </div>
            </div>
          ))}
        </section>

      </div>
    </AppShell>
  )
}

// ── Track Card ────────────────────────────────────────────────────────────────

function TrackCard({
  track,
  enrollment,
}: {
  track: TrackDoc
  enrollment: TrackEnrollment | null
}) {
  const progress = enrollment?.progressPercent ?? 0
  const isEnrolled = enrollment !== null

  return (
    <Link
      href={`/tracks/${track.id}`}
      className="group flex flex-col bg-[#111118] border border-[#1e1e2e] rounded-2xl overflow-hidden hover:border-zinc-700 transition-all hover:-translate-y-0.5"
    >
      {/* Thumbnail */}
      <div className="relative aspect-video overflow-hidden bg-zinc-900">
        {track.thumbnailUrl ? (
          <img
            src={track.thumbnailUrl}
            alt={track.title}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-zinc-900 to-zinc-800">
            <span className="text-4xl opacity-30">📚</span>
          </div>
        )}
        {/* Level badge */}
        <span className={`absolute top-2 left-2 text-[10px] font-bold px-2 py-0.5 rounded-full border ${levelBg(track.level)}`}>
          {track.level.charAt(0).toUpperCase() + track.level.slice(1)}
        </span>
        {isEnrolled && (
          <span className="absolute top-2 right-2 bg-[#ff5a00]/90 text-white text-[10px] font-bold px-2 py-0.5 rounded-full">
            Enrolled
          </span>
        )}
      </div>

      {/* Content */}
      <div className="flex flex-col flex-1 p-4 space-y-3">
        <div>
          <p className="text-[10px] font-bold text-[#ff5a00] uppercase tracking-wider">{track.category}</p>
          <h3 className="text-white text-sm font-bold mt-0.5 line-clamp-2 group-hover:text-[#ff5a00] transition-colors">
            {track.title}
          </h3>
        </div>

        {/* Creator */}
        <div className="flex items-center gap-2">
          <div className="w-5 h-5 rounded-full bg-zinc-800 overflow-hidden flex-shrink-0">
            {track.creatorPhoto ? (
              <img src={track.creatorPhoto} alt={track.creatorName} className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-[8px] font-bold text-zinc-400">
                {track.creatorName.charAt(0)}
              </div>
            )}
          </div>
          <span className="text-zinc-500 text-[11px] truncate">{track.creatorName}</span>
        </div>

        {/* Stats */}
        <div className="flex items-center gap-3 text-[10px] text-zinc-600">
          <span>{track.lessonCount} Lessons</span>
          <span>·</span>
          <span>{track.challengeCount} Challenges</span>
          <span>·</span>
          <span>{(track.enrolledCount ?? 0).toLocaleString()} Enrolled</span>
        </div>

        {/* Progress bar if enrolled */}
        {isEnrolled && (
          <div className="space-y-1">
            <div className="w-full bg-zinc-800 rounded-full h-1.5">
              <div
                className="h-1.5 rounded-full bg-[#ff5a00] transition-all"
                style={{ width: `${progress}%` }}
              />
            </div>
            <p className="text-zinc-600 text-[10px]">{progress}%</p>
          </div>
        )}

        {/* CTA */}
        <div className="mt-auto pt-2">
          <span className={`block w-full text-center py-2 rounded-lg text-xs font-bold transition-colors ${
            enrollment?.status === 'completed'
              ? 'bg-green-500/15 text-green-400 border border-green-500/25'
              : isEnrolled
              ? 'bg-[#ff5a00]/15 text-[#ff5a00] border border-[#ff5a00]/25 group-hover:bg-[#ff5a00] group-hover:text-white'
              : 'bg-[#ff5a00] text-white group-hover:bg-[#ff4400]'
          }`}>
            {enrollment?.status === 'completed' ? '✓ Completed' : isEnrolled ? 'Continue' : 'Start Track'}
          </span>
        </div>
      </div>
    </Link>
  )
}
