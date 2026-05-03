// app/tracks/[trackId]/manage/page.tsx
// Track management — creator's control panel for a track

'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { useAuth } from '@/hooks/useAuth'
import { AppShell } from '@/components/layout/AppShell'
import Link from 'next/link'
import toast from 'react-hot-toast'
import {
  getTrack,
  subscribeLessons,
  getChallenges,
  subscribeSubmissions,
  updateTrack,
  addLesson,
  deleteLesson,
  reviewSubmission,
  deleteTrack,
  TrackDoc,
  TrackLesson,
  TrackChallenge,
  TrackSubmission,
  TRACK_CATEGORIES,
  TrackLevel,
  TrackCategory,
  formatDurationTrack,
} from '@/services/trackService'
import { subscribeMediaByType, MediaDoc } from '@/services/mediaService'

type Tab = 'overview' | 'lessons' | 'submissions'

export default function ManageTrackPage() {
  const { trackId } = useParams<{ trackId: string }>()
  const { firebaseUser, khojUser } = useAuth()
  const uid    = firebaseUser?.uid ?? null
  const router = useRouter()

  const [track,       setTrack]       = useState<TrackDoc | null>(null)
  const [lessons,     setLessons]     = useState<TrackLesson[]>([])
  const [challenges,  setChallenges]  = useState<TrackChallenge[]>([])
  const [submissions, setSubmissions] = useState<TrackSubmission[]>([])
  const [myMedia,     setMyMedia]     = useState<MediaDoc[]>([])
  const [tab,         setTab]         = useState<Tab>('overview')
  const [saving,      setSaving]      = useState(false)
  const [deleting,    setDeleting]    = useState<string | null>(null)

  // Edit form state
  const [title,       setTitle]       = useState('')
  const [description, setDescription] = useState('')
  const [category,    setCategory]    = useState<TrackCategory>('Coding')
  const [level,       setLevel]       = useState<TrackLevel>('beginner')
  const [status,      setStatus]      = useState<'published' | 'draft'>('draft')

  // New lesson
  const [newTitle,    setNewTitle]    = useState('')
  const [newMediaId,  setNewMediaId]  = useState('')
  const [isPreview,   setIsPreview]   = useState(false)
  const [addingLesson,setAddingLesson]= useState(false)

  useEffect(() => {
    if (!trackId) return
    getTrack(trackId).then((t) => {
      if (!t) return
      setTrack(t)
      setTitle(t.title)
      setDescription(t.description)
      setCategory(t.category as TrackCategory)
      setLevel(t.level)
      setStatus(t.status)
    })
    getChallenges(trackId).then(setChallenges)
    const u1 = subscribeLessons(trackId, setLessons)
    const u2 = subscribeSubmissions(trackId, setSubmissions)
    return () => { u1(); u2() }
  }, [trackId])

  useEffect(() => {
    if (!uid) return
    const u1 = subscribeMediaByType('video', (docs) =>
      setMyMedia((p) => [...p.filter((m) => m.type !== 'video'), ...docs.filter((d) => d.creatorId === uid)])
    )
    const u2 = subscribeMediaByType('clip', (docs) =>
      setMyMedia((p) => [...p.filter((m) => m.type !== 'clip'), ...docs.filter((d) => d.creatorId === uid)])
    )
    return () => { u1(); u2() }
  }, [uid])

  // Redirect if not owner
  useEffect(() => {
    if (track && uid && track.creatorId !== uid) {
      router.replace(`/tracks/${trackId}`)
    }
  }, [track, uid, trackId, router])

  async function handleSave() {
    if (!trackId) return
    setSaving(true)
    try {
      await updateTrack(trackId, { title, description, category, level, status })
      toast.success('Track updated!')
    } catch {
      toast.error('Failed to update')
    } finally {
      setSaving(false)
    }
  }

  async function handleAddLesson() {
    if (!newTitle.trim()) { toast.error('Lesson needs a title'); return }
    const media = myMedia.find((m) => m.id === newMediaId)
    setAddingLesson(true)
    try {
      await addLesson(trackId, {
        title: newTitle,
        description: '',
        type: media?.type === 'clip' ? 'clip' : 'video',
        mediaId: newMediaId,
        videoUrl: media?.videoUrl ?? '',
        thumbnailUrl: media?.thumbnailUrl ?? '',
        duration: media?.duration ?? 0,
        order: lessons.length,
        isPreview,
      })
      setNewTitle('')
      setNewMediaId('')
      setIsPreview(false)
      toast.success('Lesson added!')
    } catch {
      toast.error('Failed to add lesson')
    } finally {
      setAddingLesson(false)
    }
  }

  async function handleDeleteLesson(lessonId: string) {
    setDeleting(lessonId)
    try {
      await deleteLesson(trackId, lessonId)
      toast.success('Lesson removed')
    } catch {
      toast.error('Failed to remove lesson')
    } finally {
      setDeleting(null)
    }
  }

  async function handleReview(
    subId: string,
    status: 'approved' | 'rejected',
    feedback: string
  ) {
    try {
      await reviewSubmission(trackId, subId, status, status === 'approved' ? 100 : 0, feedback)
      toast.success(`Submission ${status}`)
    } catch {
      toast.error('Failed to update submission')
    }
  }

  async function handleDeleteTrack() {
    if (!confirm('Archive this track? It will be hidden from public listing.')) return
    await deleteTrack(trackId)
    toast.success('Track archived')
    router.push('/tracks')
  }

  if (!track) {
    return (
      <AppShell>
        <div className="flex items-center justify-center h-64">
          <div className="w-6 h-6 border-2 border-[#ff5a00] border-t-transparent rounded-full animate-spin" />
        </div>
      </AppShell>
    )
  }

  const pendingSubs = submissions.filter((s) => s.status === 'submitted')

  return (
    <AppShell>
      <div className="max-w-4xl mx-auto px-6 py-6 space-y-6">

        {/* Header */}
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <div className="flex items-center gap-2 text-xs text-zinc-600 mb-1">
              <Link href="/tracks" className="hover:text-zinc-400">Tracks</Link>
              <span>/</span>
              <Link href={`/tracks/${trackId}`} className="hover:text-zinc-400 truncate max-w-[200px]">{track.title}</Link>
              <span>/</span>
              <span className="text-zinc-400">Manage</span>
            </div>
            <h1 className="text-white text-xl font-extrabold">{track.title}</h1>
          </div>
          <div className="flex items-center gap-2">
            <Link
              href={`/tracks/${trackId}`}
              className="px-3 py-2 rounded-lg border border-zinc-700 text-zinc-400 text-xs font-semibold hover:border-zinc-500 transition-colors"
            >
              View Track →
            </Link>
            <button
              onClick={handleDeleteTrack}
              className="px-3 py-2 rounded-lg border border-red-900 text-red-500 text-xs font-semibold hover:bg-red-500/10 transition-colors"
            >
              Archive
            </button>
          </div>
        </div>

        {/* Stats strip */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { label: 'Enrolled',     value: track.enrolledCount ?? 0 },
            { label: 'Completed',    value: track.completedCount ?? 0 },
            { label: 'Lessons',      value: lessons.length },
            { label: 'Pending Reviews', value: pendingSubs.length },
          ].map((s) => (
            <div key={s.label} className="bg-[#111118] border border-[#1e1e2e] rounded-xl p-4 text-center">
              <p className="text-2xl font-extrabold text-white">{s.value}</p>
              <p className="text-zinc-500 text-xs mt-0.5">{s.label}</p>
            </div>
          ))}
        </div>

        {/* Tabs */}
        <div className="flex items-center gap-1 border-b border-[#1e1e2e]">
          {(['overview', 'lessons', 'submissions'] as Tab[]).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`px-4 py-2.5 text-xs font-bold capitalize border-b-2 transition-colors ${
                tab === t
                  ? 'text-[#ff5a00] border-[#ff5a00]'
                  : 'text-zinc-500 border-transparent hover:text-zinc-300'
              }`}
            >
              {t}
              {t === 'submissions' && pendingSubs.length > 0 && (
                <span className="ml-1.5 bg-[#ff5a00] text-white text-[9px] px-1.5 py-0.5 rounded-full">
                  {pendingSubs.length}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* ── Overview tab ── */}
        {tab === 'overview' && (
          <div className="bg-[#111118] border border-[#1e1e2e] rounded-2xl p-6 space-y-5">
            <h2 className="text-white font-bold">Edit Track Info</h2>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-zinc-400">Title</label>
              <input value={title} onChange={(e) => setTitle(e.target.value)} className={INPUT} />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-zinc-400">Description</label>
              <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={4} className={INPUT + ' resize-none'} />
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-zinc-400">Category</label>
                <select value={category} onChange={(e) => setCategory(e.target.value as TrackCategory)} className={SELECT}>
                  {TRACK_CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-zinc-400">Level</label>
                <select value={level} onChange={(e) => setLevel(e.target.value as TrackLevel)} className={SELECT}>
                  <option value="beginner">Beginner</option>
                  <option value="intermediate">Intermediate</option>
                  <option value="advanced">Advanced</option>
                </select>
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-zinc-400">Status</label>
                <select value={status} onChange={(e) => setStatus(e.target.value as 'published' | 'draft')} className={SELECT}>
                  <option value="published">Published</option>
                  <option value="draft">Draft</option>
                </select>
              </div>
            </div>

            <button
              onClick={handleSave}
              disabled={saving}
              className="px-5 py-2.5 rounded-lg bg-[#ff5a00] text-white text-sm font-bold hover:bg-[#ff4400] disabled:opacity-50 transition-colors"
            >
              {saving ? 'Saving…' : 'Save Changes'}
            </button>
          </div>
        )}

        {/* ── Lessons tab ── */}
        {tab === 'lessons' && (
          <div className="space-y-4">
            {/* Lesson list */}
            <div className="bg-[#111118] border border-[#1e1e2e] rounded-2xl overflow-hidden divide-y divide-[#1e1e2e]">
              {lessons.length === 0 ? (
                <p className="text-zinc-600 text-sm text-center py-8">No lessons yet.</p>
              ) : (
                lessons.map((lesson, idx) => (
                  <div key={lesson.id} className="flex items-center gap-3 px-5 py-3">
                    <span className="w-6 text-zinc-700 text-xs font-bold text-center">{idx + 1}</span>
                    {lesson.thumbnailUrl && (
                      <img src={lesson.thumbnailUrl} alt="" className="w-12 h-8 object-cover rounded flex-shrink-0" />
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="text-white text-xs font-semibold truncate">{lesson.title}</p>
                      <p className="text-zinc-600 text-[10px]">
                        {lesson.type} · {formatDurationTrack(lesson.duration)}
                        {lesson.isPreview && ' · Free Preview'}
                      </p>
                    </div>
                    <button
                      onClick={() => handleDeleteLesson(lesson.id)}
                      disabled={deleting === lesson.id}
                      className="text-red-500 hover:text-red-400 text-xs disabled:opacity-40"
                    >
                      {deleting === lesson.id ? '…' : 'Remove'}
                    </button>
                  </div>
                ))
              )}
            </div>

            {/* Add lesson */}
            <div className="bg-[#111118] border border-[#1e1e2e] rounded-2xl p-5 space-y-4">
              <h3 className="text-white font-bold text-sm">Add Lesson</h3>
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-zinc-400">Lesson Title</label>
                <input
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  placeholder="Lesson title"
                  className={INPUT}
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-zinc-400">Pick from your media</label>
                <select
                  value={newMediaId}
                  onChange={(e) => {
                    setNewMediaId(e.target.value)
                    const m = myMedia.find((x) => x.id === e.target.value)
                    if (m && !newTitle) setNewTitle(m.title)
                  }}
                  className={SELECT}
                >
                  <option value="">— Select media —</option>
                  {myMedia.map((m) => (
                    <option key={m.id} value={m.id}>{m.title}</option>
                  ))}
                </select>
              </div>
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" checked={isPreview} onChange={(e) => setIsPreview(e.target.checked)} className="accent-[#ff5a00]" />
                <span className="text-zinc-400 text-xs">Free preview</span>
              </label>
              <button
                onClick={handleAddLesson}
                disabled={addingLesson}
                className="px-4 py-2 rounded-lg border border-[#ff5a00] text-[#ff5a00] text-sm font-bold hover:bg-[#ff5a00]/10 disabled:opacity-50 transition-colors"
              >
                {addingLesson ? 'Adding…' : '+ Add Lesson'}
              </button>
            </div>
          </div>
        )}

        {/* ── Submissions tab ── */}
        {tab === 'submissions' && (
          <div className="space-y-3">
            {submissions.length === 0 ? (
              <div className="bg-[#111118] border border-[#1e1e2e] rounded-xl p-10 text-center">
                <p className="text-zinc-600 text-sm">No challenge submissions yet.</p>
              </div>
            ) : (
              submissions.map((sub) => {
                const challenge = challenges.find((c) => c.id === sub.challengeId)
                return (
                  <div key={sub.id} className="bg-[#111118] border border-[#1e1e2e] rounded-xl p-5 space-y-3">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <p className="text-white text-sm font-bold">{sub.userName}</p>
                        <p className="text-zinc-500 text-xs mt-0.5">Challenge: {challenge?.title ?? sub.challengeId}</p>
                      </div>
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                        sub.status === 'approved'  ? 'bg-green-500/15 text-green-400' :
                        sub.status === 'rejected'  ? 'bg-red-500/15 text-red-400' :
                        sub.status === 'reviewed'  ? 'bg-yellow-500/15 text-yellow-400' :
                        'bg-zinc-700 text-zinc-400'
                      }`}>
                        {sub.status}
                      </span>
                    </div>
                    <p className="text-zinc-400 text-sm bg-[#0d0e14] rounded-lg px-3 py-2 whitespace-pre-wrap">{sub.content}</p>
                    {sub.videoUrl && (
                      <a href={sub.videoUrl} target="_blank" rel="noreferrer" className="text-[#ff5a00] text-xs hover:underline">
                        View Link →
                      </a>
                    )}
                    {sub.status === 'submitted' && (
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => handleReview(sub.id, 'approved', 'Great work!')}
                          className="px-3 py-1.5 rounded-lg bg-green-500/15 text-green-400 border border-green-500/25 text-xs font-bold hover:bg-green-500/25 transition-colors"
                        >
                          ✓ Approve
                        </button>
                        <button
                          onClick={() => handleReview(sub.id, 'rejected', 'Needs improvement.')}
                          className="px-3 py-1.5 rounded-lg bg-red-500/15 text-red-400 border border-red-500/25 text-xs font-bold hover:bg-red-500/25 transition-colors"
                        >
                          ✕ Reject
                        </button>
                      </div>
                    )}
                    {sub.feedback && sub.status !== 'submitted' && (
                      <p className="text-zinc-600 text-xs italic">Feedback: {sub.feedback}</p>
                    )}
                  </div>
                )
              })
            )}
          </div>
        )}
      </div>
    </AppShell>
  )
}

const INPUT  = 'w-full bg-[#0d0e14] border border-zinc-800 rounded-xl px-3 py-2.5 text-sm text-white placeholder-zinc-600 focus:outline-none focus:border-[#ff5a00]/50 transition-colors'
const SELECT = 'w-full bg-[#0d0e14] border border-zinc-800 rounded-xl px-3 py-2.5 text-sm text-zinc-300 focus:outline-none focus:border-[#ff5a00]/50 transition-colors'
