// app/tracks/[trackId]/page.tsx
// KHOJ Tracks — Track detail page (matching design mockup)
// Layout: full-width header → tabs → 3-col (roadmap | content | leaderboard)

'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { useAuth } from '@/hooks/useAuth'
import { AppShell } from '@/components/layout/AppShell'
import Link from 'next/link'
import toast from 'react-hot-toast'
import { ProgressCircle } from '@/components/tracks/ProgressCircle'
import { LeaderboardPanel } from '@/components/tracks/LeaderboardPanel'
import { LessonList } from '@/components/tracks/LessonList'
import { ChallengeCard } from '@/components/tracks/ChallengeCard'
import {
  getTrack,
  subscribeLessons,
  getChallenges,
  enrollInTrack,
  subscribeEnrollment,
  subscribeUserSubmissions,
  subscribeUserLeaderboardEntry,
  TrackDoc,
  TrackLesson,
  TrackChallenge,
  TrackEnrollment,
  TrackSubmission,
  LeaderboardEntry,
  levelBg,
  formatDurationTrack,
  XP_PER_LESSON,
  XP_DEFAULT_CHALLENGE,
} from '@/services/trackService'

type TabId = 'overview' | 'lessons' | 'challenges' | 'leaderboard'

const TABS: { id: TabId; label: string }[] = [
  { id: 'overview',    label: 'Overview'    },
  { id: 'lessons',     label: 'Lessons'     },
  { id: 'challenges',  label: 'Challenges'  },
  { id: 'leaderboard', label: 'Leaderboard' },
]

export default function TrackDetailPage() {
  const { trackId }              = useParams<{ trackId: string }>()
  const { firebaseUser, khojUser } = useAuth()
  const uid                      = firebaseUser?.uid ?? null
  const router = useRouter()

  const [track,       setTrack]       = useState<TrackDoc | null | undefined>(undefined)
  const [lessons,     setLessons]     = useState<TrackLesson[]>([])
  const [challenges,  setChallenges]  = useState<TrackChallenge[]>([])
  const [enrollment,  setEnrollment]  = useState<TrackEnrollment | null>(null)
  const [submissions, setSubmissions] = useState<TrackSubmission[]>([])
  const [lbEntry,     setLbEntry]     = useState<LeaderboardEntry | null>(null)
  const [enrolling,   setEnrolling]   = useState(false)
  const [tab,         setTab]         = useState<TabId>('overview')

  useEffect(() => {
    if (!trackId) return
    getTrack(trackId).then(setTrack)
    getChallenges(trackId).then(setChallenges)
    const unsub = subscribeLessons(trackId, setLessons)
    return unsub
  }, [trackId])

  useEffect(() => {
    if (!uid || !trackId) return
    return subscribeEnrollment(uid, trackId, setEnrollment)
  }, [uid, trackId])

  useEffect(() => {
    if (!uid || !trackId) return
    return subscribeUserSubmissions(trackId, uid, setSubmissions)
  }, [uid, trackId])

  useEffect(() => {
    if (!uid || !trackId) return
    return subscribeUserLeaderboardEntry(trackId, uid, setLbEntry)
  }, [uid, trackId])

  const isOwner      = track?.creatorId === uid
  const completedIds = enrollment?.completedLessons ?? []
  const myXP         = lbEntry?.xp ?? 0
  const totalDuration = lessons.reduce((a, l) => a + (l.duration ?? 0), 0)
  const currentLesson = (() => {
    if (enrollment?.lastLessonId) return lessons.find((l) => l.id === enrollment.lastLessonId) ?? lessons[0] ?? null
    return lessons.find((l) => !completedIds.includes(l.id)) ?? lessons[0] ?? null
  })()
  const nextChallenge = challenges.find((c) => !submissions.find((s) => s.challengeId === c.id))
  const progressPercent = enrollment?.progressPercent ?? 0

  async function handleEnroll() {
    if (!uid) { router.push('/auth/login'); return }
    if (!track) return
    setEnrolling(true)
    try {
      await enrollInTrack(uid, track, lessons.length, challenges.length, khojUser?.name ?? 'Anonymous', khojUser?.avatarUrl ?? '')
      toast.success('Enrolled! Start your first lesson.')
    } catch {
      toast.error('Failed to enroll')
    } finally {
      setEnrolling(false)
    }
  }

  function handleContinue() {
    if (currentLesson) router.push(`/tracks/${trackId}/learn/${currentLesson.id}`)
    else if (lessons[0]) router.push(`/tracks/${trackId}/learn/${lessons[0].id}`)
  }

  // ── Loading ──
  if (track === undefined) {
    return (
      <AppShell>
        <div className="flex items-center justify-center h-64">
          <div className="w-6 h-6 border-2 border-[#ff5a00] border-t-transparent rounded-full animate-spin" />
        </div>
      </AppShell>
    )
  }

  // ── Not found ──
  if (track === null) {
    return (
      <AppShell>
        <div className="text-center py-24 space-y-3">
          <p className="text-5xl">🔍</p>
          <p className="text-zinc-400 text-lg font-semibold">Track not found</p>
          <Link href="/tracks" className="text-[#ff5a00] text-sm hover:underline">← Back to Tracks</Link>
        </div>
      </AppShell>
    )
  }


  return (
    <AppShell>
      <div className="min-h-screen bg-[#0d0e14]">
        <div className="max-w-[1400px] mx-auto px-4 py-5 space-y-5">

          {/* ── Breadcrumb ── */}
          <div className="flex items-center gap-2 text-xs text-zinc-600">
            <Link href="/tracks" className="hover:text-zinc-400 transition-colors">Tracks</Link>
            <span>›</span>
            <span className="text-zinc-400 truncate">{track.title}</span>
          </div>

          {/* ── Track Header Card ── */}
          <div className="bg-[#111118] border border-[#1e1e2e] rounded-2xl overflow-hidden">
            <div className="flex flex-col lg:flex-row gap-0">
              {/* Thumbnail */}
              <div className="lg:w-64 lg:flex-shrink-0">
                <div className="w-full h-44 lg:h-full bg-zinc-900 overflow-hidden">
                  {track.thumbnailUrl ? (
                    <img src={track.thumbnailUrl} alt={track.title} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-6xl opacity-15">📚</div>
                  )}
                </div>
              </div>

              {/* Info block */}
              <div className="flex-1 p-5 lg:p-6">
                <div className="flex flex-col lg:flex-row gap-6">
                  {/* Left: title / description / stats */}
                  <div className="flex-1 space-y-3">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className={`text-[10px] font-bold px-2.5 py-1 rounded-full border ${levelBg(track.level)}`}>
                        {track.level.charAt(0).toUpperCase() + track.level.slice(1)}
                      </span>
                      <span className="text-[10px] font-bold text-[#ff5a00] uppercase tracking-wider">{track.category}</span>
                    </div>
                    <h1 className="text-xl lg:text-2xl font-extrabold text-white leading-tight">{track.title}</h1>
                    <p className="text-zinc-400 text-sm leading-relaxed line-clamp-2">{track.description}</p>

                    {/* Stats */}
                    <div className="flex flex-wrap items-center gap-4 text-xs text-zinc-500 pt-1">
                      <div className="flex items-center gap-1.5">
                        <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M15 10l4.553-2.069A1 1 0 0121 8.87V18a1 1 0 01-1.447.894L15 16.87"/><rect x="2" y="6" width="13" height="12" rx="2"/></svg>
                        <span>{track.lessonCount} Lessons</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="9 11 12 14 22 4"/><path d="M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11"/></svg>
                        <span>{track.challengeCount} Challenges</span>
                      </div>
                      {totalDuration > 0 && (
                        <div className="flex items-center gap-1.5">
                          <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
                          <span>{formatDurationTrack(totalDuration)}</span>
                        </div>
                      )}
                      <div className="flex items-center gap-1.5">
                        <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 00-3-3.87"/><path d="M16 3.13a4 4 0 010 7.75"/></svg>
                        <span>{(track.enrolledCount ?? 0).toLocaleString()} Enrolled</span>
                      </div>
                    </div>

                    {/* Instructor */}
                    <Link href={`/profile/${track.creatorId}`} className="inline-flex items-center gap-2 group">
                      <div className="w-7 h-7 rounded-full overflow-hidden bg-zinc-800">
                        {track.creatorPhoto
                          ? <img src={track.creatorPhoto} alt={track.creatorName} className="w-full h-full object-cover" />
                          : <div className="w-full h-full flex items-center justify-center text-xs font-bold text-zinc-400">{track.creatorName?.charAt(0)}</div>
                        }
                      </div>
                      <span className="text-zinc-400 text-xs group-hover:text-white transition-colors">{track.creatorName}</span>
                      <span className="text-[#ff5a00] text-xs">✓</span>
                      {track.averageRating > 0 && (
                        <span className="text-xs text-zinc-500">★ {track.averageRating.toFixed(1)}</span>
                      )}
                    </Link>
                  </div>

                  {/* Right: Progress circle + CTA */}
                  <div className="lg:w-52 flex-shrink-0 flex flex-col items-center gap-4">
                    {enrollment ? (
                      <>
                        <div className="text-center">
                          <p className="text-xs text-zinc-500 font-semibold mb-2">Your Progress</p>
                          <ProgressCircle percent={progressPercent} size={110} />
                        </div>
                        {myXP > 0 && (
                          <div className="text-center">
                            <p className="text-[#ff5a00] font-extrabold text-lg leading-none">{myXP} XP</p>
                            <p className="text-zinc-600 text-[10px] mt-0.5">Earned in this track</p>
                          </div>
                        )}
                        <div className="w-full space-y-2">
                          {enrollment.status === 'completed' ? (
                            <div className="text-center py-2 space-y-1">
                              <p className="text-3xl">🏆</p>
                              <p className="text-green-400 text-xs font-bold">Track Completed!</p>
                            </div>
                          ) : (
                            <button onClick={handleContinue} className="w-full py-2.5 rounded-xl bg-[#ff5a00] text-white font-bold text-sm hover:bg-[#ff4400] transition-colors">
                              Continue Learning
                            </button>
                          )}
                          <button onClick={() => setTab('lessons')} className="block w-full py-2 text-center rounded-xl border border-zinc-700 text-zinc-400 text-sm font-semibold hover:border-zinc-500 hover:text-zinc-200 transition-colors">
                            Track Details
                          </button>
                        </div>
                        {isOwner && (
                          <Link href={`/tracks/${trackId}/manage`} className="text-xs text-zinc-600 hover:text-zinc-400 transition-colors">✎ Manage Track</Link>
                        )}
                      </>
                    ) : (
                      <>
                        <div className="text-center space-y-1">
                          <p className="text-5xl">📚</p>
                          <p className="text-zinc-500 text-xs">Free · Self-paced</p>
                        </div>
                        <div className="w-full space-y-2">
                          <button onClick={handleEnroll} disabled={enrolling} className="w-full py-2.5 rounded-xl bg-[#ff5a00] text-white font-bold text-sm hover:bg-[#ff4400] disabled:opacity-50 transition-colors">
                            {enrolling ? 'Enrolling…' : 'Start Track — Free'}
                          </button>
                          {isOwner && (
                            <Link href={`/tracks/${trackId}/manage`} className="block w-full py-2 text-center rounded-xl border border-zinc-700 text-zinc-400 text-sm font-semibold hover:border-zinc-500 hover:text-zinc-200 transition-colors">
                              ✎ Manage Track
                            </Link>
                          )}
                        </div>
                      </>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* ── Tabs ── */}
          <div className="flex items-center gap-1 border-b border-[#1e1e2e]">
            {TABS.map((t) => (
              <button key={t.id} onClick={() => setTab(t.id)}
                className={`px-4 py-2.5 text-sm font-semibold transition-colors relative ${tab === t.id ? 'text-[#ff5a00]' : 'text-zinc-500 hover:text-zinc-300'}`}
              >
                {t.label}
                {tab === t.id && <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#ff5a00] rounded-full" />}
              </button>
            ))}
          </div>

          {/* ── Tab content wrapper ── */}
          <div className="flex gap-5 items-start">

            {/* ── MAIN CONTENT ── */}
            <div className="flex-1 min-w-0">

              {/* Overview tab */}
              {tab === 'overview' && (
                <div className="flex gap-5 items-start">
                  {/* Roadmap sidebar */}
                  <div className="w-56 flex-shrink-0 hidden lg:block">
                    <LessonList trackId={trackId} lessons={lessons} completedIds={completedIds} currentLessonId={currentLesson?.id} enrolled={!!enrollment} />
                  </div>

                  {/* Center content */}
                  <div className="flex-1 min-w-0 space-y-5">
                    {/* Enroll CTA when not enrolled */}
                    {!enrollment && (
                      <div className="bg-[#111118] border border-[#1e1e2e] rounded-2xl p-8 text-center space-y-4">
                        <p className="text-4xl">🚀</p>
                        <h3 className="text-white font-bold text-lg">Start Learning</h3>
                        <p className="text-zinc-400 text-sm max-w-sm mx-auto">Enroll for free to access all {lessons.length} lessons, {challenges.length} challenges, and earn XP on the leaderboard.</p>
                        <button onClick={handleEnroll} disabled={enrolling} className="px-8 py-3 rounded-xl bg-[#ff5a00] text-white font-bold text-sm hover:bg-[#ff4400] disabled:opacity-50 transition-colors">
                          {enrolling ? 'Enrolling…' : 'Enroll for Free'}
                        </button>
                      </div>
                    )}

                    {/* Current lesson */}
                    {currentLesson && enrollment && (
                      <div className="bg-[#111118] border border-[#1e1e2e] rounded-2xl p-5 space-y-4">
                        <p className="text-xs text-zinc-500 uppercase tracking-wider font-semibold">Current Lesson</p>
                        <div className="flex gap-4 items-center">
                          <div className="w-16 h-16 rounded-xl overflow-hidden bg-zinc-900 flex-shrink-0">
                            {currentLesson.thumbnailUrl ? (
                              <img src={currentLesson.thumbnailUrl} alt="" className="w-full h-full object-cover" />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center bg-[#ff5a00]/15">
                                <svg className="w-7 h-7 text-[#ff5a00]" viewBox="0 0 24 24" fill="currentColor"><polygon points="5 3 19 12 5 21 5 3"/></svg>
                              </div>
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <h3 className="text-white font-bold text-base leading-snug">{currentLesson.title}</h3>
                            <p className="text-zinc-500 text-xs mt-1">Lesson {lessons.findIndex((l) => l.id === currentLesson.id) + 1} of {lessons.length}</p>
                            {currentLesson.description && <p className="text-zinc-400 text-xs mt-1.5 line-clamp-2">{currentLesson.description}</p>}
                          </div>
                        </div>
                        <Link href={`/tracks/${trackId}/learn/${currentLesson.id}`} className="flex items-center justify-center w-full py-2.5 rounded-xl bg-[#ff5a00] text-white font-bold text-sm hover:bg-[#ff4400] transition-colors">
                          {completedIds.includes(currentLesson.id) ? 'Rewatch Lesson' : 'Continue Lesson'}
                        </Link>
                      </div>
                    )}

                    {/* Upcoming challenge */}
                    {nextChallenge && enrollment && (
                      <div>
                        <p className="text-xs text-zinc-500 uppercase tracking-wider font-semibold mb-3">Upcoming Challenge</p>
                        <div className="bg-[#111118] border border-[#1e1e2e] rounded-2xl p-5 flex gap-4 items-center">
                          <div className="w-16 h-16 rounded-xl bg-[#ff5a00]/10 border border-[#ff5a00]/20 flex items-center justify-center flex-shrink-0 text-3xl">🏆</div>
                          <div className="flex-1 min-w-0 space-y-1">
                            <div className="flex items-center gap-2">
                              <h3 className="text-white font-bold text-sm">{nextChallenge.title}</h3>
                              <span className="text-[10px] text-[#ff5a00] bg-[#ff5a00]/15 border border-[#ff5a00]/25 px-2 py-0.5 rounded-full font-bold">Challenge</span>
                            </div>
                            <p className="text-zinc-400 text-xs line-clamp-2">{nextChallenge.description}</p>
                            <div className="flex items-center gap-4 text-xs">
                              <span className="text-zinc-500">Reward <span className="text-[#ff5a00] font-bold">🏅 {nextChallenge.points} XP</span></span>
                              {nextChallenge.dueDate && <span className="text-zinc-500">Deadline <span className="text-zinc-300">⏰ {nextChallenge.dueDate}</span></span>}
                            </div>
                          </div>
                          <button onClick={() => setTab('challenges')} className="px-4 py-2 rounded-xl bg-[#ff5a00] text-white text-xs font-bold whitespace-nowrap hover:bg-[#ff4400] transition-colors flex-shrink-0">
                            View Challenge
                          </button>
                        </div>
                      </div>
                    )}

                    {/* What you will build */}
                    <div className="bg-[#111118] border border-[#1e1e2e] rounded-2xl p-5 space-y-4">
                      <h3 className="text-white font-bold text-sm">What you will build</h3>
                      <div className="grid grid-cols-3 sm:grid-cols-5 gap-3">
                        {[
                          { icon: '🖥', label: 'Real Projects' },
                          { icon: '⚡', label: 'Interactive UI' },
                          { icon: '🎯', label: 'Challenges' },
                          { icon: '💼', label: 'Portfolio Ready' },
                          { icon: '🚀', label: 'Get Hired' },
                        ].map((item) => (
                          <div key={item.label} className="flex flex-col items-center gap-2 p-3 rounded-xl bg-zinc-900/50 border border-zinc-800">
                            <span className="text-2xl">{item.icon}</span>
                            <p className="text-[10px] text-zinc-400 text-center font-medium leading-tight">{item.label}</p>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Hiring banner */}
                    <div className="bg-gradient-to-r from-[#ff5a00]/10 to-orange-500/5 border border-[#ff5a00]/20 rounded-2xl p-5 flex gap-4 items-center">
                      <span className="text-3xl flex-shrink-0">🚀</span>
                      <div className="flex-1 min-w-0">
                        <p className="text-white font-bold text-sm">Complete this track and get hired!</p>
                        <p className="text-zinc-400 text-xs mt-1 leading-relaxed">Top companies hire from KHOJ Tracks. Complete all lessons, submit projects, and rank on the leaderboard to get noticed by recruiters.</p>
                      </div>
                      <Link href="/jobs" className="flex-shrink-0 px-4 py-2 rounded-xl bg-[#ff5a00] text-white text-xs font-bold hover:bg-[#ff4400] transition-colors">See Jobs</Link>
                    </div>
                  </div>
                </div>
              )}

              {/* Lessons tab */}
              {tab === 'lessons' && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <h2 className="text-white font-bold">All Lessons ({lessons.length})</h2>
                    <span className="text-xs text-zinc-500">{completedIds.length} completed · +{XP_PER_LESSON} XP each</span>
                  </div>
                  {lessons.length === 0 ? (
                    <div className="bg-[#111118] border border-[#1e1e2e] rounded-2xl p-8 text-center"><p className="text-zinc-500 text-sm">No lessons added yet.</p></div>
                  ) : (
                    <div className="bg-[#111118] border border-[#1e1e2e] rounded-2xl overflow-hidden divide-y divide-[#1e1e2e]">
                      {lessons.map((lesson, idx) => {
                        const done = completedIds.includes(lesson.id)
                        const isCurrent = lesson.id === currentLesson?.id
                        const canAccess = lesson.isPreview || !!enrollment
                        return (
                          <div key={lesson.id} className={`flex items-center gap-4 p-4 transition-colors ${isCurrent ? 'bg-[#ff5a00]/8' : done ? 'bg-green-500/5' : 'hover:bg-zinc-900/50'}`}>
                            <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 text-xs font-extrabold ${done ? 'bg-green-500 text-white' : isCurrent ? 'bg-[#ff5a00] text-white' : 'bg-zinc-800 text-zinc-500'}`}>
                              {done ? '✓' : isCurrent ? '▶' : idx + 1}
                            </div>
                            <div className="flex-1 min-w-0">
                              {canAccess ? (
                                <Link href={`/tracks/${trackId}/learn/${lesson.id}`} className={`text-sm font-semibold hover:text-[#ff5a00] transition-colors ${isCurrent ? 'text-[#ff5a00]' : done ? 'text-zinc-400' : 'text-white'}`}>{lesson.title}</Link>
                              ) : (
                                <span className="text-sm text-zinc-600 font-semibold">{lesson.title}</span>
                              )}
                              <div className="flex items-center gap-2 mt-0.5 text-xs text-zinc-600">
                                {lesson.duration > 0 && <span>{formatDurationTrack(lesson.duration)}</span>}
                                {lesson.isPreview && <span className="text-[#ff5a00] font-semibold">Free Preview</span>}
                                {done && <span className="text-green-400 font-semibold">Completed</span>}
                              </div>
                            </div>
                            {done && <span className="text-xs text-[#ff5a00] font-bold flex-shrink-0">+{XP_PER_LESSON} XP</span>}
                            {!canAccess && <svg className="w-4 h-4 text-zinc-700 flex-shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0110 0v4"/></svg>}
                          </div>
                        )
                      })}
                    </div>
                  )}
                </div>
              )}

              {/* Challenges tab */}
              {tab === 'challenges' && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h2 className="text-white font-bold">Challenges ({challenges.length})</h2>
                    <span className="text-xs text-zinc-500">+{XP_DEFAULT_CHALLENGE} XP avg · appears on leaderboard</span>
                  </div>
                  {challenges.length === 0 ? (
                    <div className="bg-[#111118] border border-[#1e1e2e] rounded-2xl p-8 text-center"><p className="text-zinc-500 text-sm">No challenges yet.</p></div>
                  ) : (
                    <div className="space-y-3">
                      {challenges.map((c) => {
                        const mySub = uid ? submissions.find((s) => s.challengeId === c.id) : null
                        return (
                          <ChallengeCard key={c.id} trackId={trackId} challenge={c}
                            userId={uid ?? ''} userName={khojUser?.name ?? 'Anonymous'} userPhoto={khojUser?.avatarUrl ?? ''}
                            existingSubmission={mySub}
                          />
                        )
                      })}
                    </div>
                  )}
                  {!enrollment && challenges.length > 0 && (
                    <div className="bg-[#ff5a00]/8 border border-[#ff5a00]/20 rounded-xl p-4 text-center">
                      <p className="text-zinc-400 text-sm">
                        <button onClick={handleEnroll} className="text-[#ff5a00] font-bold hover:underline">Enroll in this track</button>
                        {' '}to submit challenges and earn XP.
                      </p>
                    </div>
                  )}
                </div>
              )}

              {/* Leaderboard tab */}
              {tab === 'leaderboard' && (
                <div className="max-w-lg space-y-4">
                  <div className="flex items-center justify-between">
                    <h2 className="text-white font-bold">Track Leaderboard</h2>
                    <span className="text-xs text-zinc-500">+{XP_PER_LESSON} XP/lesson · +points/challenge</span>
                  </div>
                  <LeaderboardPanel trackId={trackId} currentUserId={uid} />
                </div>
              )}
            </div>

            {/* ── RIGHT PANEL: always visible on xl screens ── */}
            <div className="w-72 flex-shrink-0 hidden xl:block sticky top-20">
              <LeaderboardPanel trackId={trackId} currentUserId={uid} />
            </div>
          </div>

        </div>
      </div>
    </AppShell>
  )
}
