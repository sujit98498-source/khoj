// app/tracks/create/page.tsx
// Create a new KHOJ Track

'use client'

// Prevent build-time prerendering so Firebase is only initialized in the browser.
export const dynamic = 'force-dynamic'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/hooks/useAuth'
import { AppShell } from '@/components/layout/AppShell'
import Link from 'next/link'
import toast from 'react-hot-toast'
import { ref, uploadBytesResumable, getDownloadURL } from 'firebase/storage'
import { requireFirebaseStorage } from '@/lib/firebase/config'
import {
  createTrack,
  addLesson,
  addChallenge,
  TRACK_CATEGORIES,
  TrackLevel,
  TrackCategory,
  TrackLesson,
  TrackChallenge,
} from '@/services/trackService'
import { subscribeMediaByType, MediaDoc } from '@/services/mediaService'

const BLANK_LESSON: Omit<TrackLesson, 'id' | 'createdAt'> = {
  title: '',
  description: '',
  type: 'video',
  mediaId: '',
  videoUrl: '',
  thumbnailUrl: '',
  duration: 0,
  order: 0,
  isPreview: false,
}

const BLANK_CHALLENGE: Omit<TrackChallenge, 'id' | 'createdAt'> = {
  title: '',
  description: '',
  instructions: '',
  difficulty: 'easy',
  points: 100,
  submissionType: 'text',
  dueDate: '',
  order: 0,
}

export default function CreateTrackPage() {
  const { firebaseUser, khojUser } = useAuth()
  const uid  = firebaseUser?.uid ?? null
  const router = useRouter()

  const [step, setStep] = useState<1 | 2 | 3>(1)
  const [saving, setSaving] = useState(false)

  // Track info
  const [title,       setTitle]       = useState('')
  const [description, setDescription] = useState('')
  const [category,    setCategory]    = useState<TrackCategory>('Coding')
  const [level,       setLevel]       = useState<TrackLevel>('beginner')
  const [visibility,  setVisibility]  = useState<'public' | 'private'>('public')
  const [thumbFile,   setThumbFile]   = useState<File | null>(null)
  const [thumbPreview,setThumbPreview]= useState('')
  const [uploadPct,   setUploadPct]   = useState(0)

  // Lessons
  const [lessons, setLessons] = useState<Omit<TrackLesson, 'id' | 'createdAt'>[]>([])
  const [myMedia, setMyMedia] = useState<MediaDoc[]>([])
  const [newLesson, setNewLesson] = useState({ ...BLANK_LESSON })

  // Challenges
  const [challenges, setChallenges] = useState<Omit<TrackChallenge, 'id' | 'createdAt'>[]>([])
  const [newChallenge, setNewChallenge] = useState({ ...BLANK_CHALLENGE })

  useEffect(() => {
    if (!uid) return
    // Load creator's videos + clips
    const u1 = subscribeMediaByType('video', (docs) => {
      setMyMedia((prev) => {
        const filtered = prev.filter((m) => m.type !== 'video')
        return [...filtered, ...docs.filter((d) => d.creatorId === uid)]
      })
    })
    const u2 = subscribeMediaByType('clip', (docs) => {
      setMyMedia((prev) => {
        const filtered = prev.filter((m) => m.type !== 'clip')
        return [...filtered, ...docs.filter((d) => d.creatorId === uid)]
      })
    })
    return () => { u1(); u2() }
  }, [uid])

  function handleThumb(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setThumbFile(file)
    setThumbPreview(URL.createObjectURL(file))
  }

  function pickMedia(media: MediaDoc) {
    setNewLesson((prev) => ({
      ...prev,
      title: prev.title || media.title,
      type: media.type === 'clip' ? 'clip' : 'video',
      mediaId: media.id,
      videoUrl: media.videoUrl,
      thumbnailUrl: media.thumbnailUrl,
      duration: media.duration ?? 0,
    }))
  }

  function addLessonToList() {
    if (!newLesson.title.trim()) { toast.error('Lesson needs a title'); return }
    setLessons((prev) => [...prev, { ...newLesson, order: prev.length }])
    setNewLesson({ ...BLANK_LESSON })
  }

  function removeLesson(idx: number) {
    setLessons((prev) => prev.filter((_, i) => i !== idx))
  }

  function addChallengeToList() {
    if (!newChallenge.title.trim()) { toast.error('Challenge needs a title'); return }
    setChallenges((prev) => [...prev, { ...newChallenge, order: prev.length }])
    setNewChallenge({ ...BLANK_CHALLENGE })
  }

  function removeChallenge(idx: number) {
    setChallenges((prev) => prev.filter((_, i) => i !== idx))
  }

  async function handlePublish(status: 'published' | 'draft') {
    if (!uid || !khojUser) return
    if (!title.trim()) { toast.error('Track needs a title'); return }
    setSaving(true)
    try {
      // Upload thumbnail if provided
      let thumbnailUrl = ''
      if (thumbFile) {
        const storageRef = ref(requireFirebaseStorage(), `trackThumbnails/${uid}/${Date.now()}_${thumbFile.name}`)
        await new Promise<void>((resolve, reject) => {
          const task = uploadBytesResumable(storageRef, thumbFile)
          task.on('state_changed',
            (snap) => setUploadPct(Math.round(snap.bytesTransferred / snap.totalBytes * 100)),
            reject,
            async () => { thumbnailUrl = await getDownloadURL(task.snapshot.ref); resolve() }
          )
        })
      }

      const trackId = await createTrack({
        title,
        description,
        category,
        level,
        creatorId: uid,
        creatorName: khojUser.name,
        creatorPhoto: khojUser.avatarUrl ?? '',
        thumbnailUrl,
        visibility,
        status,
        lessonCount: lessons.length,
        challengeCount: challenges.length,
        enrolledCount: 0,
        completedCount: 0,
        averageRating: 0,
        tags: [],
      })

      // Save lessons
      for (const lesson of lessons) {
        await addLesson(trackId, lesson)
      }
      // Save challenges
      for (const challenge of challenges) {
        await addChallenge(trackId, challenge)
      }

      toast.success(status === 'published' ? 'Track published!' : 'Draft saved!')
      router.push(`/tracks/${trackId}`)
    } catch (err) {
      console.error(err)
      toast.error('Failed to save track')
    } finally {
      setSaving(false)
    }
  }

  if (!uid) {
    return (
      <AppShell>
        <div className="text-center py-24">
          <p className="text-zinc-500">Please log in to create a track.</p>
        </div>
      </AppShell>
    )
  }

  return (
    <AppShell>
      <div className="max-w-3xl mx-auto px-6 py-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-white text-2xl font-extrabold">Create Track</h1>
            <p className="text-zinc-500 text-sm mt-0.5">Build a learning path for your community</p>
          </div>
          <Link href="/tracks" className="text-zinc-500 hover:text-zinc-300 text-sm transition-colors">← Back</Link>
        </div>

        {/* Step indicator */}
        <div className="flex items-center gap-0">
          {([1, 2, 3] as const).map((s, i) => (
            <div key={s} className="flex items-center">
              <button
                onClick={() => { if (s < step || title.trim()) setStep(s) }}
                className={`w-8 h-8 rounded-full text-xs font-bold border transition-colors ${
                  step === s
                    ? 'bg-[#ff5a00] text-white border-[#ff5a00]'
                    : step > s
                    ? 'bg-green-500/20 text-green-400 border-green-500/30'
                    : 'bg-zinc-800 text-zinc-600 border-zinc-700'
                }`}
              >
                {step > s ? '✓' : s}
              </button>
              <span className={`ml-2 text-xs font-semibold ${step === s ? 'text-white' : 'text-zinc-600'}`}>
                {s === 1 ? 'Info' : s === 2 ? 'Lessons' : 'Challenges'}
              </span>
              {i < 2 && <div className="w-8 h-px bg-zinc-800 mx-3" />}
            </div>
          ))}
        </div>

        {/* ── Step 1: Track Info ── */}
        {step === 1 && (
          <div className="space-y-5 bg-[#111118] border border-[#1e1e2e] rounded-2xl p-6">
            <h2 className="text-white font-bold">Track Information</h2>

            <Field label="Title *">
              <input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. Frontend Developer Track"
                maxLength={80}
                className={INPUT}
              />
            </Field>

            <Field label="Description">
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="What will learners build and achieve?"
                rows={4}
                maxLength={500}
                className={INPUT + ' resize-none'}
              />
            </Field>

            <div className="grid grid-cols-2 gap-4">
              <Field label="Category">
                <select value={category} onChange={(e) => setCategory(e.target.value as TrackCategory)} className={SELECT}>
                  {TRACK_CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
                </select>
              </Field>
              <Field label="Level">
                <select value={level} onChange={(e) => setLevel(e.target.value as TrackLevel)} className={SELECT}>
                  <option value="beginner">Beginner</option>
                  <option value="intermediate">Intermediate</option>
                  <option value="advanced">Advanced</option>
                </select>
              </Field>
            </div>

            <Field label="Visibility">
              <select value={visibility} onChange={(e) => setVisibility(e.target.value as 'public' | 'private')} className={SELECT}>
                <option value="public">Public</option>
                <option value="private">Private</option>
              </select>
            </Field>

            {/* Thumbnail */}
            <Field label="Thumbnail">
              <label className="cursor-pointer block">
                <input type="file" accept="image/*" className="hidden" onChange={handleThumb} />
                {thumbPreview ? (
                  <img src={thumbPreview} alt="thumb" className="w-48 h-28 object-cover rounded-xl border border-zinc-700" />
                ) : (
                  <div className="w-48 h-28 bg-zinc-900 border border-zinc-700 rounded-xl flex flex-col items-center justify-center gap-2 hover:border-zinc-500 transition-colors">
                    <span className="text-2xl">🖼</span>
                    <span className="text-zinc-500 text-xs">Click to upload</span>
                  </div>
                )}
              </label>
            </Field>

            <div className="flex justify-end">
              <button
                onClick={() => { if (!title.trim()) { toast.error('Add a title'); return } setStep(2) }}
                className="px-5 py-2.5 rounded-lg bg-[#ff5a00] text-white text-sm font-bold hover:bg-[#ff4400] transition-colors"
              >
                Next: Add Lessons →
              </button>
            </div>
          </div>
        )}

        {/* ── Step 2: Lessons ── */}
        {step === 2 && (
          <div className="space-y-5">
            {/* Existing lessons */}
            {lessons.length > 0 && (
              <div className="bg-[#111118] border border-[#1e1e2e] rounded-2xl overflow-hidden divide-y divide-[#1e1e2e]">
                {lessons.map((l, idx) => (
                  <div key={idx} className="flex items-center gap-3 px-4 py-3">
                    <span className="w-6 h-6 rounded-full bg-zinc-800 text-zinc-500 text-xs flex items-center justify-center flex-shrink-0">{idx + 1}</span>
                    {l.thumbnailUrl && <img src={l.thumbnailUrl} alt="" className="w-12 h-8 object-cover rounded flex-shrink-0" />}
                    <div className="flex-1 min-w-0">
                      <p className="text-white text-xs font-semibold truncate">{l.title}</p>
                      <p className="text-zinc-600 text-[10px]">{l.type}</p>
                    </div>
                    <button onClick={() => removeLesson(idx)} className="text-red-500 hover:text-red-400 text-xs flex-shrink-0">✕</button>
                  </div>
                ))}
              </div>
            )}

            {/* Add lesson form */}
            <div className="bg-[#111118] border border-[#1e1e2e] rounded-2xl p-5 space-y-4">
              <h3 className="text-white font-bold text-sm">Add Lesson</h3>

              <Field label="Lesson Title *">
                <input
                  value={newLesson.title}
                  onChange={(e) => setNewLesson((p) => ({ ...p, title: e.target.value }))}
                  placeholder="e.g. Introduction to React Hooks"
                  className={INPUT}
                />
              </Field>

              <Field label="Pick from your uploaded videos">
                <div className="grid grid-cols-2 gap-2 max-h-48 overflow-y-auto">
                  {myMedia.length === 0 ? (
                    <p className="text-zinc-600 text-xs col-span-2 py-4 text-center">
                      No videos uploaded yet.{' '}
                      <Link href="/arena" className="text-[#ff5a00] hover:underline">Upload in Arena →</Link>
                    </p>
                  ) : (
                    myMedia.map((m) => (
                      <button
                        key={m.id}
                        type="button"
                        onClick={() => pickMedia(m)}
                        className={`flex items-center gap-2 p-2 rounded-lg border text-left transition-colors ${
                          newLesson.mediaId === m.id
                            ? 'border-[#ff5a00] bg-[#ff5a00]/10'
                            : 'border-zinc-800 hover:border-zinc-600'
                        }`}
                      >
                        {m.thumbnailUrl && <img src={m.thumbnailUrl} alt="" className="w-10 h-7 object-cover rounded flex-shrink-0" />}
                        <span className="text-xs text-zinc-300 truncate">{m.title}</span>
                      </button>
                    ))
                  )}
                </div>
              </Field>

              <div className="flex items-center gap-3">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={newLesson.isPreview}
                    onChange={(e) => setNewLesson((p) => ({ ...p, isPreview: e.target.checked }))}
                    className="accent-[#ff5a00]"
                  />
                  <span className="text-zinc-400 text-xs">Free preview</span>
                </label>
              </div>

              <button
                type="button"
                onClick={addLessonToList}
                className="px-4 py-2 rounded-lg border border-[#ff5a00] text-[#ff5a00] text-sm font-bold hover:bg-[#ff5a00]/10 transition-colors"
              >
                + Add Lesson
              </button>
            </div>

            <div className="flex items-center justify-between">
              <button onClick={() => setStep(1)} className="text-zinc-500 text-sm hover:text-zinc-300">← Back</button>
              <button
                onClick={() => setStep(3)}
                className="px-5 py-2.5 rounded-lg bg-[#ff5a00] text-white text-sm font-bold hover:bg-[#ff4400] transition-colors"
              >
                Next: Add Challenges →
              </button>
            </div>
          </div>
        )}

        {/* ── Step 3: Challenges + Publish ── */}
        {step === 3 && (
          <div className="space-y-5">
            {/* Existing challenges */}
            {challenges.length > 0 && (
              <div className="bg-[#111118] border border-[#1e1e2e] rounded-2xl overflow-hidden divide-y divide-[#1e1e2e]">
                {challenges.map((c, idx) => (
                  <div key={idx} className="flex items-center gap-3 px-4 py-3">
                    <span className="w-6 h-6 rounded-full bg-zinc-800 text-zinc-500 text-xs flex items-center justify-center flex-shrink-0">{idx + 1}</span>
                    <div className="flex-1 min-w-0">
                      <p className="text-white text-xs font-semibold truncate">{c.title}</p>
                      <p className="text-zinc-600 text-[10px]">{c.difficulty} · +{c.points} pts</p>
                    </div>
                    <button onClick={() => removeChallenge(idx)} className="text-red-500 hover:text-red-400 text-xs flex-shrink-0">✕</button>
                  </div>
                ))}
              </div>
            )}

            {/* Add challenge form */}
            <div className="bg-[#111118] border border-[#1e1e2e] rounded-2xl p-5 space-y-4">
              <h3 className="text-white font-bold text-sm">Add Challenge</h3>
              <Field label="Challenge Title *">
                <input
                  value={newChallenge.title}
                  onChange={(e) => setNewChallenge((p) => ({ ...p, title: e.target.value }))}
                  placeholder="e.g. Build a Portfolio Website"
                  className={INPUT}
                />
              </Field>
              <Field label="Description">
                <textarea
                  value={newChallenge.description}
                  onChange={(e) => setNewChallenge((p) => ({ ...p, description: e.target.value }))}
                  placeholder="What should the learner build or demonstrate?"
                  rows={3}
                  className={INPUT + ' resize-none'}
                />
              </Field>
              <div className="grid grid-cols-3 gap-3">
                <Field label="Difficulty">
                  <select
                    value={newChallenge.difficulty}
                    onChange={(e) => setNewChallenge((p) => ({ ...p, difficulty: e.target.value as any }))}
                    className={SELECT}
                  >
                    <option value="easy">Easy</option>
                    <option value="medium">Medium</option>
                    <option value="hard">Hard</option>
                  </select>
                </Field>
                <Field label="Points">
                  <input
                    type="number"
                    value={newChallenge.points}
                    onChange={(e) => setNewChallenge((p) => ({ ...p, points: parseInt(e.target.value) || 0 }))}
                    min={0}
                    max={1000}
                    className={INPUT}
                  />
                </Field>
                <Field label="Submission">
                  <select
                    value={newChallenge.submissionType}
                    onChange={(e) => setNewChallenge((p) => ({ ...p, submissionType: e.target.value as any }))}
                    className={SELECT}
                  >
                    <option value="text">Text</option>
                    <option value="link">Link</option>
                    <option value="file">File</option>
                    <option value="video">Video</option>
                  </select>
                </Field>
              </div>
              <button
                type="button"
                onClick={addChallengeToList}
                className="px-4 py-2 rounded-lg border border-[#ff5a00] text-[#ff5a00] text-sm font-bold hover:bg-[#ff5a00]/10 transition-colors"
              >
                + Add Challenge
              </button>
            </div>

            {/* Upload progress */}
            {saving && uploadPct > 0 && uploadPct < 100 && (
              <div className="space-y-1">
                <p className="text-zinc-500 text-xs">Uploading thumbnail… {uploadPct}%</p>
                <div className="w-full bg-zinc-800 rounded-full h-1.5">
                  <div className="h-1.5 rounded-full bg-[#ff5a00] transition-all" style={{ width: `${uploadPct}%` }} />
                </div>
              </div>
            )}

            <div className="flex items-center justify-between gap-3 flex-wrap">
              <button onClick={() => setStep(2)} className="text-zinc-500 text-sm hover:text-zinc-300">← Back</button>
              <div className="flex items-center gap-3">
                <button
                  onClick={() => handlePublish('draft')}
                  disabled={saving}
                  className="px-4 py-2.5 rounded-lg border border-zinc-700 text-zinc-400 text-sm font-semibold hover:border-zinc-500 disabled:opacity-50 transition-colors"
                >
                  Save Draft
                </button>
                <button
                  onClick={() => handlePublish('published')}
                  disabled={saving}
                  className="px-5 py-2.5 rounded-lg bg-[#ff5a00] text-white text-sm font-bold hover:bg-[#ff4400] disabled:opacity-50 transition-colors"
                >
                  {saving ? 'Publishing…' : 'Publish Track 🚀'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </AppShell>
  )
}

// ── Helpers ───────────────────────────────────────────────────────────────────
const INPUT  = 'w-full bg-[#0d0e14] border border-zinc-800 rounded-xl px-3 py-2.5 text-sm text-white placeholder-zinc-600 focus:outline-none focus:border-[#ff5a00]/50 transition-colors'
const SELECT = 'w-full bg-[#0d0e14] border border-zinc-800 rounded-xl px-3 py-2.5 text-sm text-zinc-300 focus:outline-none focus:border-[#ff5a00]/50 transition-colors'

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <label className="block text-xs font-semibold text-zinc-400">{label}</label>
      {children}
    </div>
  )
}
