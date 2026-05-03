// app/tracks/[trackId]/learn/[lessonId]/page.tsx
// KHOJ Tracks — Lesson player page

'use client'

import { useEffect, useState, useRef } from 'react'
import { useParams, useRouter, useSearchParams } from 'next/navigation'
import { useAuth } from '@/hooks/useAuth'
import Link from 'next/link'
import toast from 'react-hot-toast'
import {
  getTrack,
  subscribeLessons,
  getChallenges,
  subscribeEnrollment,
  subscribeUserSubmissions,
  markLessonComplete,
  submitChallenge,
  TrackDoc,
  TrackLesson,
  TrackChallenge,
  TrackEnrollment,
  TrackSubmission,
  formatDurationTrack,
} from '@/services/trackService'

export default function LessonPage() {
  const { trackId, lessonId } = useParams<{ trackId: string; lessonId: string }>()
  const searchParams = useSearchParams()
  const challengeParam = searchParams.get('challenge')
  const { firebaseUser, khojUser } = useAuth()
  const uid  = firebaseUser?.uid ?? null
  const router = useRouter()

  const [track,       setTrack]       = useState<TrackDoc | null>(null)
  const [lessons,     setLessons]     = useState<TrackLesson[]>([])
  const [challenges,  setChallenges]  = useState<TrackChallenge[]>([])
  const [enrollment,  setEnrollment]  = useState<TrackEnrollment | null>(null)
  const [submissions, setSubmissions] = useState<TrackSubmission[]>([])
  const [marking,     setMarking]     = useState(false)
  const [submitting,  setSubmitting]  = useState(false)
  const [challengeId, setChallengeId] = useState(challengeParam ?? '')
  const [subText,     setSubText]     = useState('')
  const [subLink,     setSubLink]     = useState('')
  const videoRef = useRef<HTMLVideoElement>(null)

  const currentLesson = lessons.find((l) => l.id === lessonId)
  const currentIndex  = lessons.findIndex((l) => l.id === lessonId)
  const nextLesson    = lessons[currentIndex + 1] ?? null
  const prevLesson    = lessons[currentIndex - 1] ?? null

  useEffect(() => {
    if (!trackId) return
    getTrack(trackId).then(setTrack)
    getChallenges(trackId).then(setChallenges)
    const unsub = subscribeLessons(trackId, setLessons)
    return unsub
  }, [trackId])

  useEffect(() => {
    if (!uid || !trackId) return
    return subscribeEnrollment(uid, trackId, (e) => {
      setEnrollment(e)
      if (!e) {
        // Not enrolled — redirect to track page
        router.replace(`/tracks/${trackId}`)
      }
    })
  }, [uid, trackId, router])

  useEffect(() => {
    if (!uid || !trackId) return
    return subscribeUserSubmissions(trackId, uid, setSubmissions)
  }, [uid, trackId])

  const completedIds = enrollment?.completedLessons ?? []
  const isCompleted  = completedIds.includes(lessonId)

  async function handleMarkComplete() {
    if (!uid || !track || !enrollment) return
    setMarking(true)
    try {
      await markLessonComplete(
        uid,
        khojUser?.name ?? 'Anonymous',
        trackId,
        lessonId,
        lessons.length,
        challenges.length
      )
      toast.success(nextLesson ? 'Lesson complete! Moving to next…' : '🎉 Track complete! Badge earned!')
      if (nextLesson) {
        router.push(`/tracks/${trackId}/learn/${nextLesson.id}`)
      }
    } catch {
      toast.error('Failed to mark complete')
    } finally {
      setMarking(false)
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!uid || !challengeId || !subText.trim()) return
    setSubmitting(true)
    try {
      await submitChallenge(
        trackId,
        uid,
        khojUser?.name ?? 'Anonymous',
        khojUser?.avatarUrl ?? '',
        challengeId,
        subText,
        '',
        subLink
      )
      toast.success('Challenge submitted!')
      setSubText('')
      setSubLink('')
    } catch {
      toast.error('Failed to submit challenge')
    } finally {
      setSubmitting(false)
    }
  }

  const selectedChallenge = challenges.find((c) => c.id === challengeId)
  const mySubmission      = submissions.find((s) => s.challengeId === challengeId)

  if (!currentLesson && lessons.length > 0) {
    return (
      <div className="min-h-screen bg-[#0a0b0f] flex items-center justify-center">
        <p className="text-zinc-500">Lesson not found.</p>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#0a0b0f] flex flex-col">
      {/* ── Top bar ── */}
      <header className="fixed top-0 left-0 right-0 h-14 bg-[#0d0e14] border-b border-[#1e1e2e] flex items-center px-5 gap-4 z-30">
        <Link
          href={`/tracks/${trackId}`}
          className="flex items-center gap-1.5 text-zinc-500 hover:text-zinc-300 text-xs transition-colors"
        >
          <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M15 18l-6-6 6-6"/></svg>
          Back to Track
        </Link>
        <div className="h-4 w-px bg-zinc-800" />
        <h1 className="text-white text-sm font-semibold truncate flex-1">
          {track?.title ?? 'Loading…'}
        </h1>
        {enrollment && (
          <div className="hidden sm:flex items-center gap-2 text-xs text-zinc-500">
            <div className="w-24 bg-zinc-800 rounded-full h-1.5">
              <div
                className="h-1.5 rounded-full bg-[#ff5a00]"
                style={{ width: `${enrollment.progressPercent}%` }}
              />
            </div>
            <span>{enrollment.progressPercent}%</span>
          </div>
        )}
      </header>

      <div className="flex flex-1 pt-14">
        {/* ── Main ── */}
        <main className="flex-1 min-w-0 flex flex-col">
          {/* Player */}
          <div className="w-full bg-black">
            {currentLesson?.videoUrl ? (
              <video
                ref={videoRef}
                src={currentLesson.videoUrl}
                controls
                className="w-full max-h-[56vh] object-contain"
                poster={currentLesson.thumbnailUrl || undefined}
              />
            ) : currentLesson?.thumbnailUrl ? (
              <img
                src={currentLesson.thumbnailUrl}
                alt={currentLesson.title}
                className="w-full max-h-[56vh] object-contain"
              />
            ) : (
              <div className="w-full aspect-video flex items-center justify-center bg-zinc-950">
                {!currentLesson ? (
                  <div className="w-6 h-6 border-2 border-[#ff5a00] border-t-transparent rounded-full animate-spin" />
                ) : (
                  <p className="text-zinc-600 text-sm">No video for this lesson</p>
                )}
              </div>
            )}
          </div>

          {/* Lesson info + actions */}
          <div className="p-6 space-y-5 max-w-4xl">
            {/* Title + mark complete */}
            <div className="flex items-start justify-between gap-4 flex-wrap">
              <div>
                <p className="text-zinc-500 text-xs uppercase tracking-wider font-semibold">
                  Lesson {currentIndex + 1} of {lessons.length}
                </p>
                <h2 className="text-white text-xl font-bold mt-1">{currentLesson?.title ?? '…'}</h2>
              </div>
              <div className="flex items-center gap-2 flex-shrink-0">
                {prevLesson && (
                  <Link
                    href={`/tracks/${trackId}/learn/${prevLesson.id}`}
                    className="px-3 py-2 rounded-lg border border-zinc-700 text-zinc-400 text-xs font-semibold hover:border-zinc-500 transition-colors"
                  >
                    ← Prev
                  </Link>
                )}
                {isCompleted ? (
                  <span className="px-4 py-2 rounded-lg bg-green-500/15 text-green-400 border border-green-500/25 text-xs font-bold">
                    ✓ Completed
                  </span>
                ) : (
                  <button
                    onClick={handleMarkComplete}
                    disabled={marking || !enrollment}
                    className="px-4 py-2 rounded-lg bg-[#ff5a00] text-white text-xs font-bold hover:bg-[#ff4400] disabled:opacity-50 transition-colors"
                  >
                    {marking ? '…' : 'Mark Complete'}
                  </button>
                )}
                {nextLesson && (
                  <Link
                    href={`/tracks/${trackId}/learn/${nextLesson.id}`}
                    className="px-3 py-2 rounded-lg bg-zinc-800 text-zinc-300 text-xs font-semibold hover:bg-zinc-700 transition-colors"
                  >
                    Next →
                  </Link>
                )}
              </div>
            </div>

            {/* Description */}
            {currentLesson?.description && (
              <p className="text-zinc-400 text-sm leading-relaxed">{currentLesson.description}</p>
            )}

            {/* ── Challenge section ── */}
            {challenges.length > 0 && (
              <div className="border-t border-[#1e1e2e] pt-5 space-y-4">
                <h3 className="text-white font-bold text-sm">Challenges</h3>
                <div className="flex flex-wrap gap-2">
                  {challenges.map((ch) => {
                    const submitted = submissions.some((s) => s.challengeId === ch.id)
                    return (
                      <button
                        key={ch.id}
                        onClick={() => setChallengeId(challengeId === ch.id ? '' : ch.id)}
                        className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-colors ${
                          challengeId === ch.id
                            ? 'bg-[#ff5a00] text-white border-[#ff5a00]'
                            : submitted
                            ? 'bg-green-500/15 text-green-400 border-green-500/25'
                            : 'border-zinc-700 text-zinc-400 hover:border-zinc-500'
                        }`}
                      >
                        {submitted ? '✓ ' : ''}{ch.title}
                      </button>
                    )
                  })}
                </div>

                {selectedChallenge && (
                  <div className="bg-[#111118] border border-[#1e1e2e] rounded-xl p-5 space-y-4">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <h4 className="text-white font-bold text-sm">{selectedChallenge.title}</h4>
                        <p className="text-zinc-400 text-xs mt-1 leading-relaxed">{selectedChallenge.description}</p>
                        {selectedChallenge.instructions && (
                          <p className="text-zinc-500 text-xs mt-2 whitespace-pre-wrap">{selectedChallenge.instructions}</p>
                        )}
                      </div>
                      <span className="text-[#ff5a00] text-xs font-bold flex-shrink-0">+{selectedChallenge.points} pts</span>
                    </div>

                    {mySubmission ? (
                      <div className={`rounded-lg px-4 py-3 text-xs border ${
                        mySubmission.status === 'approved'  ? 'bg-green-500/10 border-green-500/20 text-green-400' :
                        mySubmission.status === 'rejected'  ? 'bg-red-500/10 border-red-500/20 text-red-400' :
                        'bg-zinc-800 border-zinc-700 text-zinc-400'
                      }`}>
                        <p className="font-bold capitalize">Status: {mySubmission.status}</p>
                        {mySubmission.feedback && <p className="mt-1 text-zinc-500">{mySubmission.feedback}</p>}
                      </div>
                    ) : enrollment ? (
                      <form onSubmit={handleSubmit} className="space-y-3">
                        <textarea
                          value={subText}
                          onChange={(e) => setSubText(e.target.value)}
                          placeholder="Your answer, explanation, or project notes…"
                          rows={4}
                          className="w-full bg-[#0d0e14] border border-zinc-800 rounded-xl px-3 py-2.5 text-sm text-white placeholder-zinc-600 resize-none focus:outline-none focus:border-[#ff5a00]/50 transition-colors"
                        />
                        {(selectedChallenge.submissionType === 'link' || selectedChallenge.submissionType === 'video') && (
                          <input
                            type="url"
                            value={subLink}
                            onChange={(e) => setSubLink(e.target.value)}
                            placeholder="Link to your work (GitHub, Loom, etc.)"
                            className="w-full bg-[#0d0e14] border border-zinc-800 rounded-xl px-3 py-2 text-sm text-white placeholder-zinc-600 focus:outline-none focus:border-[#ff5a00]/50 transition-colors"
                          />
                        )}
                        <button
                          type="submit"
                          disabled={submitting || !subText.trim()}
                          className="px-5 py-2 rounded-lg bg-[#ff5a00] text-white text-sm font-bold hover:bg-[#ff4400] disabled:opacity-50 transition-colors"
                        >
                          {submitting ? 'Submitting…' : 'Submit Challenge'}
                        </button>
                      </form>
                    ) : (
                      <p className="text-zinc-600 text-xs">Enroll to submit challenges.</p>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* Hiring placeholder */}
            <div className="flex items-center gap-3 bg-[#ff5a00]/6 border border-[#ff5a00]/15 rounded-xl px-4 py-3">
              <span className="text-[#ff5a00] text-lg">💼</span>
              <p className="text-zinc-500 text-xs">
                Complete the full track to unlock <span className="text-zinc-300 font-semibold">recruiter visibility</span> and show this as proof of skills.
              </p>
            </div>
          </div>
        </main>

        {/* ── Progress sidebar ── */}
        <aside className="hidden lg:flex flex-col w-72 bg-[#0d0e14] border-l border-[#1e1e2e] fixed right-0 top-14 bottom-0 overflow-y-auto">
          <div className="px-4 py-4 border-b border-[#1e1e2e]">
            <p className="text-white text-xs font-bold uppercase tracking-wider">Course Content</p>
            <p className="text-zinc-600 text-[11px] mt-0.5">
              {completedIds.length} / {lessons.length} complete
            </p>
          </div>
          <div className="flex-1 py-2">
            {lessons.map((lesson, idx) => {
              const done      = completedIds.includes(lesson.id)
              const isCurrent = lesson.id === lessonId
              return (
                <Link
                  key={lesson.id}
                  href={`/tracks/${trackId}/learn/${lesson.id}`}
                  className={`flex items-center gap-3 px-4 py-3 text-left transition-colors ${
                    isCurrent
                      ? 'bg-[#ff5a00]/10 border-r-2 border-[#ff5a00]'
                      : 'hover:bg-white/[0.03]'
                  }`}
                >
                  <div className={`w-5 h-5 rounded-full flex-shrink-0 flex items-center justify-center text-[10px] font-bold ${
                    done
                      ? 'bg-green-500/20 text-green-400'
                      : isCurrent
                      ? 'bg-[#ff5a00]/20 text-[#ff5a00]'
                      : 'bg-zinc-800 text-zinc-600'
                  }`}>
                    {done ? '✓' : idx + 1}
                  </div>
                  <span className={`text-xs truncate ${
                    isCurrent ? 'text-white font-semibold' : done ? 'text-zinc-400' : 'text-zinc-500'
                  }`}>
                    {lesson.title}
                  </span>
                  {lesson.duration > 0 && (
                    <span className="text-[10px] text-zinc-700 flex-shrink-0 ml-auto">
                      {formatDurationTrack(lesson.duration)}
                    </span>
                  )}
                </Link>
              )
            })}
          </div>
        </aside>
      </div>
    </div>
  )
}
