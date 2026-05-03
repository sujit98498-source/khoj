// components/arena/UploadMediaModal.tsx
// Multi-step upload modal for Videos and Clips.
// Steps: Details → Video/File → Thumbnail → Review → Upload

'use client'

import { useCallback, useRef, useState } from 'react'
import toast from 'react-hot-toast'
import {
  MediaType,
  MEDIA_CATEGORIES,
  MEDIA_PURPOSES,
  UploadProgress,
  uploadMedia,
  formatDuration,
} from '@/services/mediaService'

// ── Types ─────────────────────────────────────────────────────────────────────

interface UploadMediaModalProps {
  type: MediaType
  creatorId: string
  creatorName: string
  creatorPhoto: string
  onClose: () => void
  onSuccess: (mediaId: string) => void
}

type Step = 'details' | 'file' | 'thumbnail' | 'review'
const STEPS: Step[] = ['details', 'file', 'thumbnail', 'review']

const STEP_LABELS: Record<Step, string> = {
  details:   'Details',
  file:      'Video',
  thumbnail: 'Thumbnail',
  review:    'Review',
}

const ALLOWED_TYPES = ['video/mp4', 'video/webm', 'video/quicktime']

// ── Main Component ────────────────────────────────────────────────────────────

export function UploadMediaModal({
  type,
  creatorId,
  creatorName,
  creatorPhoto,
  onClose,
  onSuccess,
}: UploadMediaModalProps) {
  const isClip = type === 'clip'

  // Form fields
  const [title, setTitle]             = useState('')
  const [description, setDesc]        = useState('')
  const [category, setCategory]       = useState('')
  const [purpose, setPurpose]         = useState('')
  const [tags, setTags]               = useState('')
  const [visibility, setVisibility]   = useState<'public' | 'private'>('public')

  // File state
  const [videoFile, setVideoFile]     = useState<File | null>(null)
  const [videoPreviewUrl, setVideoPreviewUrl] = useState<string | null>(null)
  const [duration, setDuration]       = useState(0)
  const [clipWarning, setClipWarning] = useState(false)
  const [thumbFile, setThumbFile]     = useState<File | null>(null)
  const [thumbPreviewUrl, setThumbPreviewUrl] = useState<string | null>(null)

  // Step + upload
  const [step, setStep]               = useState<Step>('details')
  const [progress, setProgress]       = useState<UploadProgress>({ stage: 'idle', percent: 0 })
  const [uploading, setUploading]     = useState(false)

  const videoInputRef = useRef<HTMLInputElement>(null)
  const thumbInputRef = useRef<HTMLInputElement>(null)
  const videoElemRef  = useRef<HTMLVideoElement>(null)

  const stepIdx = STEPS.indexOf(step)

  // ── File handlers ─────────────────────────────────────────────────────────

  const handleVideoDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    const file = e.dataTransfer.files[0]
    if (file) handleVideoFile(file)
  }, [])

  function handleVideoFile(file: File) {
    if (!ALLOWED_TYPES.includes(file.type)) {
      toast.error('Unsupported format. Use MP4, WebM or MOV.')
      return
    }
    const maxBytes = isClip ? 500 * 1024 * 1024 : 5 * 1024 * 1024 * 1024
    const maxLabel = isClip ? '500 MB' : '5 GB'
    if (file.size > maxBytes) {
      toast.error(`File too large. Maximum size is ${maxLabel}.`)
      return
    }
    const url = URL.createObjectURL(file)
    setVideoFile(file)
    setVideoPreviewUrl(url)

    // Extract duration via hidden video element
    const vid = document.createElement('video')
    vid.preload = 'metadata'
    vid.onloadedmetadata = () => {
      const d = Math.floor(vid.duration)
      setDuration(d)
      if (isClip && d > 60) setClipWarning(true)
      else setClipWarning(false)
      URL.revokeObjectURL(vid.src)
    }
    vid.src = url
  }

  function handleThumbFile(file: File) {
    if (!file.type.startsWith('image/')) {
      toast.error('Thumbnail must be an image.')
      return
    }
    setThumbFile(file)
    setThumbPreviewUrl(URL.createObjectURL(file))
  }

  // ── Validation ────────────────────────────────────────────────────────────

  function validateStep(): boolean {
    if (step === 'details') {
      if (!title.trim()) { toast.error('Title is required'); return false }
      if (!category)      { toast.error('Category is required'); return false }
      if (!purpose)       { toast.error('Purpose is required'); return false }
    }
    if (step === 'file') {
      if (!videoFile) { toast.error('Please select a video file'); return false }
    }
    return true
  }

  function next() {
    if (!validateStep()) return
    const nextStep = STEPS[stepIdx + 1]
    if (nextStep) setStep(nextStep)
  }

  function back() {
    const prev = STEPS[stepIdx - 1]
    if (prev) setStep(prev)
  }

  // ── Submit ────────────────────────────────────────────────────────────────

  async function handlePublish(status: 'published' | 'draft') {
    if (!title.trim()) { toast.error('Title is required'); return }
    if (!category)     { toast.error('Category is required'); return }
    if (!purpose)      { toast.error('Purpose is required'); return }
    if (!videoFile)    { toast.error('No video file selected'); return }
    if (!creatorId)    { toast.error('You must be signed in to upload'); return }
    if (uploading)     { return }

    setUploading(true)

    try {
      const parsedTags = tags
        .split(',')
        .map((t) => t.trim().toLowerCase())
        .filter(Boolean)
        .slice(0, 10)

      const mediaId = await uploadMedia(
        {
          type,
          title: title.trim(),
          description: description.trim(),
          category,
          purpose,
          tags: parsedTags,
          visibility,
          creatorId,
          creatorName,
          creatorPhoto,
        },
        videoFile,
        thumbFile,
        duration,
        status,
        setProgress,
      )

      toast.success(
        status === 'draft' ? 'Draft saved!' : `${isClip ? 'Clip' : 'Video'} published!`,
        { style: { background: '#13151d', color: '#fff', border: '1px solid #272a35' } },
      )
      onSuccess(mediaId)
    } catch (err: unknown) {
      const code = (err as { code?: string })?.code ?? ''
      const message = err instanceof Error ? err.message : String(err)

      console.error('[UploadMediaModal] publish error:', { code, message, err })

      if (code === 'storage/unauthorized' || code === 'permission-denied') {
        toast.error('Permission denied. Please sign out, sign back in, and retry.')
      } else if (code === 'storage/quota-exceeded') {
        toast.error('Storage quota exceeded. Please contact support.')
      } else if (code === 'storage/canceled') {
        toast.error('Upload was cancelled.')
      } else if (
        code === 'storage/retry-limit-exceeded' ||
        code === 'storage/unknown' ||
        message.toLowerCase().includes('network') ||
        message.toLowerCase().includes('fetch')
      ) {
        toast.error('Network error during upload. Check your connection and retry.')
      } else if (code === 'unavailable' || code === 'deadline-exceeded') {
        toast.error('Server unavailable. Please retry in a moment.')
      } else if (
        code === 'failed-precondition' ||
        message.toLowerCase().includes('firestore') ||
        message.toLowerCase().includes('document')
      ) {
        toast.error('Failed to save video info to the database. Check Firestore rules.')
      } else {
        toast.error(
          message
            ? `Upload failed: ${message}`
            : 'Upload failed. Open the browser console for details.',
        )
      }

      setUploading(false)
    }
  }

  // ── Render helpers ────────────────────────────────────────────────────────

  const titleText = isClip ? 'Upload Clip' : 'Upload Video'
  const accentColor = isClip ? '#a855f7' : '#ff5a00'

  function ProgressBar() {
    if (!uploading) return null
    const labels: Record<UploadProgress['stage'], string> = {
      idle:               'Starting...',
      uploading_video:    'Uploading file...',
      uploading_thumbnail:'Uploading thumbnail...',
      saving:             'Saving to database...',
      done:               'Done!',
      error:              'Error',
    }
    return (
      <div className="absolute inset-0 bg-[#07080c]/90 backdrop-blur-sm flex flex-col items-center justify-center z-50 rounded-2xl gap-5 px-8">
        <div className="w-16 h-16 rounded-2xl flex items-center justify-center"
          style={{ background: `${accentColor}15`, border: `1px solid ${accentColor}30` }}>
          {progress.stage === 'done' ? (
            <svg className="w-8 h-8 text-green-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M20 6 9 17l-5-5" />
            </svg>
          ) : (
            <svg className="w-8 h-8 animate-spin" style={{ color: accentColor }} viewBox="0 0 24 24" fill="none">
              <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" strokeOpacity="0.2" />
              <path d="M12 2a10 10 0 0 1 10 10" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
            </svg>
          )}
        </div>
        <div className="text-center">
          <p className="text-white font-bold text-base">{labels[progress.stage]}</p>
          <p className="text-zinc-500 text-sm mt-1">{progress.percent}%</p>
        </div>
        <div className="w-full max-w-xs bg-zinc-800 rounded-full h-2 overflow-hidden">
          <div
            className="h-full rounded-full transition-all duration-300"
            style={{ width: `${progress.percent}%`, backgroundColor: accentColor }}
          />
        </div>
      </div>
    )
  }

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.80)', backdropFilter: 'blur(8px)' }}
      onClick={(e) => { if (e.target === e.currentTarget && !uploading) onClose() }}
    >
      <div className="relative w-full max-w-3xl bg-[#0d0e14] border border-zinc-800 rounded-2xl shadow-2xl shadow-black/70 overflow-hidden flex flex-col max-h-[90vh]">
        <ProgressBar />

        {/* ── Header ─────────────────────────────────────────────────── */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-800 flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center"
              style={{ background: `${accentColor}15`, border: `1px solid ${accentColor}30` }}>
              <svg className="w-4 h-4" style={{ color: accentColor }} viewBox="0 0 24 24" fill="currentColor">
                <path d="M8 5v14l11-7z" />
              </svg>
            </div>
            <h2 className="text-white font-bold text-base">{titleText}</h2>
          </div>
          <button
            onClick={() => { if (!uploading) onClose() }}
            className="text-zinc-500 hover:text-white transition-colors"
          >
            <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M18 6 6 18M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* ── Step bar ──────────────────────────────────────────────── */}
        <div className="flex items-center gap-0 px-6 pt-4 pb-3 flex-shrink-0">
          {STEPS.map((s, i) => {
            const done    = i < stepIdx
            const current = i === stepIdx
            return (
              <div key={s} className="flex items-center flex-1">
                <div className="flex items-center gap-2 flex-shrink-0">
                  <div
                    className="w-6 h-6 rounded-full flex items-center justify-center text-[11px] font-bold flex-shrink-0 transition-all"
                    style={{
                      background: done || current ? accentColor : '#1e1e2e',
                      color: done || current ? 'white' : '#6b6b80',
                      border: `2px solid ${done || current ? accentColor : '#3a3a4a'}`,
                    }}
                  >
                    {done ? (
                      <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round">
                        <path d="M20 6 9 17l-5-5" />
                      </svg>
                    ) : (i + 1)}
                  </div>
                  <span
                    className="text-xs font-semibold whitespace-nowrap"
                    style={{ color: current ? 'white' : done ? '#9ca3af' : '#6b6b80' }}
                  >
                    {STEP_LABELS[s]}
                  </span>
                </div>
                {i < STEPS.length - 1 && (
                  <div className="flex-1 h-px mx-3" style={{ background: done ? accentColor : '#272a35' }} />
                )}
              </div>
            )
          })}
        </div>

        {/* ── Step body ──────────────────────────────────────────────── */}
        <div className="flex-1 overflow-y-auto px-6 py-4 space-y-5">

          {/* ── DETAILS STEP ────────────────────────────────────────── */}
          {step === 'details' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              {/* Left col */}
              <div className="space-y-4">
                {/* Title */}
                <div>
                  <label className="block text-xs font-semibold text-zinc-400 mb-1.5">
                    Title <span style={{ color: accentColor }}>*</span>
                  </label>
                  <input
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    maxLength={100}
                    placeholder="Enter a catchy title..."
                    className="w-full bg-[#101218] border border-zinc-800 text-white text-sm placeholder-zinc-600 rounded-xl px-3.5 py-2.5 outline-none focus:border-zinc-600 transition-all"
                  />
                  <p className="text-zinc-700 text-[10px] mt-1 text-right">{title.length}/100</p>
                </div>

                {/* Description */}
                <div>
                  <label className="block text-xs font-semibold text-zinc-400 mb-1.5">Description</label>
                  <textarea
                    value={description}
                    onChange={(e) => setDesc(e.target.value)}
                    maxLength={3000}
                    rows={4}
                    placeholder="Tell the story behind your content..."
                    className="w-full bg-[#101218] border border-zinc-800 text-white text-sm placeholder-zinc-600 rounded-xl px-3.5 py-2.5 outline-none focus:border-zinc-600 resize-none transition-all"
                  />
                </div>

                {/* Tags */}
                <div>
                  <label className="block text-xs font-semibold text-zinc-400 mb-1.5">Tags</label>
                  <input
                    value={tags}
                    onChange={(e) => setTags(e.target.value)}
                    placeholder="startup, coding, india (comma-separated)"
                    className="w-full bg-[#101218] border border-zinc-800 text-white text-sm placeholder-zinc-600 rounded-xl px-3.5 py-2.5 outline-none focus:border-zinc-600 transition-all"
                  />
                  <p className="text-zinc-600 text-[10px] mt-1">Up to 10 tags</p>
                </div>
              </div>

              {/* Right col */}
              <div className="space-y-4">
                {/* Category */}
                <div>
                  <label className="block text-xs font-semibold text-zinc-400 mb-1.5">
                    Category <span style={{ color: accentColor }}>*</span>
                  </label>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    className="w-full bg-[#101218] border border-zinc-800 text-white text-sm rounded-xl px-3.5 py-2.5 outline-none focus:border-zinc-600 transition-all appearance-none"
                  >
                    <option value="">Select category</option>
                    {MEDIA_CATEGORIES.map((c) => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                </div>

                {/* Purpose */}
                <div>
                  <label className="block text-xs font-semibold text-zinc-400 mb-1.5">
                    Purpose <span style={{ color: accentColor }}>*</span>
                  </label>
                  <select
                    value={purpose}
                    onChange={(e) => setPurpose(e.target.value)}
                    className="w-full bg-[#101218] border border-zinc-800 text-white text-sm rounded-xl px-3.5 py-2.5 outline-none focus:border-zinc-600 transition-all appearance-none"
                  >
                    <option value="">Select purpose</option>
                    {MEDIA_PURPOSES.map((p) => (
                      <option key={p} value={p}>{p}</option>
                    ))}
                  </select>
                </div>

                {/* Categories quick-list */}
                <div className="bg-[#101218] border border-zinc-800 rounded-xl p-4">
                  <p className="text-[10px] uppercase tracking-widest text-zinc-600 font-semibold mb-2">Categories</p>
                  <ul className="space-y-1">
                    {MEDIA_CATEGORIES.map((c) => (
                      <li key={c}>
                        <button
                          onClick={() => setCategory(c)}
                          className={`text-xs transition-colors ${category === c ? 'font-semibold' : 'text-zinc-500 hover:text-zinc-300'}`}
                          style={{ color: category === c ? accentColor : undefined }}
                        >
                          • {c}
                        </button>
                      </li>
                    ))}
                  </ul>
                  <p className="text-[10px] uppercase tracking-widest text-zinc-600 font-semibold mt-4 mb-2">Purpose</p>
                  <ul className="space-y-1">
                    {MEDIA_PURPOSES.map((p) => (
                      <li key={p}>
                        <button
                          onClick={() => setPurpose(p)}
                          className={`text-xs transition-colors ${purpose === p ? 'font-semibold' : 'text-zinc-500 hover:text-zinc-300'}`}
                          style={{ color: purpose === p ? accentColor : undefined }}
                        >
                          • {p}
                        </button>
                      </li>
                    ))}
                  </ul>
                </div>

                {/* Visibility */}
                <div>
                  <label className="block text-xs font-semibold text-zinc-400 mb-2">Visibility</label>
                  <div className="flex gap-4">
                    {(['public', 'private'] as const).map((v) => (
                      <label key={v} className="flex items-center gap-2 cursor-pointer">
                        <div
                          onClick={() => setVisibility(v)}
                          className="w-4 h-4 rounded-full border-2 flex items-center justify-center cursor-pointer transition-all"
                          style={{
                            borderColor: visibility === v ? accentColor : '#3a3a4a',
                            background: visibility === v ? accentColor : 'transparent',
                          }}
                        >
                          {visibility === v && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
                        </div>
                        <span className="text-sm text-zinc-300 capitalize">{v}</span>
                      </label>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ── FILE STEP ───────────────────────────────────────────── */}
          {step === 'file' && (
            <div className="space-y-4">
              {/* Drop zone */}
              <div
                onDragOver={(e) => e.preventDefault()}
                onDrop={handleVideoDrop}
                onClick={() => videoInputRef.current?.click()}
                className="relative border-2 border-dashed border-zinc-700 rounded-2xl flex flex-col items-center justify-center gap-4 cursor-pointer hover:border-zinc-500 transition-all group"
                style={{ minHeight: videoFile ? 'auto' : '200px', padding: videoFile ? '20px' : '48px 24px' }}
              >
                {videoFile ? (
                  <div className="flex items-center gap-4 w-full">
                    <div className="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0"
                      style={{ background: `${accentColor}15`, border: `1px solid ${accentColor}30` }}>
                      <svg className="w-6 h-6" style={{ color: accentColor }} viewBox="0 0 24 24" fill="currentColor">
                        <path d="M8 5v14l11-7z" />
                      </svg>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-white font-semibold text-sm truncate">{videoFile.name}</p>
                      <p className="text-zinc-500 text-xs mt-0.5">
                        {(videoFile.size / 1024 / 1024).toFixed(1)} MB
                        {duration > 0 && ` · ${formatDuration(duration)}`}
                      </p>
                    </div>
                    <button
                      onClick={(e) => { e.stopPropagation(); setVideoFile(null); setVideoPreviewUrl(null); setDuration(0); setClipWarning(false) }}
                      className="text-zinc-500 hover:text-red-400 transition-colors flex-shrink-0"
                    >
                      <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M18 6 6 18M6 6l12 12" />
                      </svg>
                    </button>
                  </div>
                ) : (
                  <>
                    <div className="w-14 h-14 rounded-2xl flex items-center justify-center"
                      style={{ background: `${accentColor}10`, border: `1px solid ${accentColor}20` }}>
                      <svg className="w-7 h-7 text-zinc-500 group-hover:text-zinc-300 transition-colors" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
                        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                        <polyline points="17 8 12 3 7 8" />
                        <line x1="12" y1="3" x2="12" y2="15" />
                      </svg>
                    </div>
                    <div className="text-center">
                      <p className="text-white font-semibold text-sm">Drag &amp; drop your {isClip ? 'clip' : 'video'} here</p>
                      <p className="text-zinc-500 text-xs mt-1">or click to browse</p>
                    </div>
                    <button
                      onClick={(e) => { e.stopPropagation(); videoInputRef.current?.click() }}
                      className="px-5 py-2 border border-zinc-700 rounded-xl text-sm text-zinc-300 hover:border-zinc-500 hover:text-white transition-all"
                    >
                      Browse File
                    </button>
                  </>
                )}
              </div>

              <input
                ref={videoInputRef}
                type="file"
                accept="video/mp4,video/webm,video/quicktime"
                className="hidden"
                onChange={(e) => { const f = e.target.files?.[0]; if (f) handleVideoFile(f) }}
              />

              {/* Warnings */}
              {clipWarning && (
                <div className="flex items-start gap-3 bg-amber-500/10 border border-amber-500/30 rounded-xl px-4 py-3">
                  <svg className="w-4 h-4 text-amber-400 flex-shrink-0 mt-0.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                    <path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z" />
                    <line x1="12" y1="9" x2="12" y2="13" />
                    <line x1="12" y1="17" x2="12.01" y2="17" />
                  </svg>
                  <div>
                    <p className="text-amber-400 text-xs font-semibold">Clips are recommended under 60 seconds</p>
                    <p className="text-amber-400/70 text-[11px] mt-0.5">Your clip is {formatDuration(duration)}. You can still upload, but shorter clips perform better.</p>
                  </div>
                </div>
              )}

              <p className="text-zinc-600 text-xs text-center">
                Accepted: MP4, WebM, MOV · Max {isClip ? '500 MB' : '5 GB'}
              </p>
            </div>
          )}

          {/* ── THUMBNAIL STEP ──────────────────────────────────────── */}
          {step === 'thumbnail' && (
            <div className="space-y-4">
              <p className="text-zinc-400 text-sm">
                Add a custom thumbnail — if skipped, a dark gradient placeholder is shown.
              </p>

              {thumbPreviewUrl ? (
                <div className="relative rounded-xl overflow-hidden aspect-video max-w-sm mx-auto bg-zinc-900">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={thumbPreviewUrl} alt="Thumbnail preview" className="w-full h-full object-cover" />
                  <button
                    onClick={() => { setThumbFile(null); setThumbPreviewUrl(null) }}
                    className="absolute top-2 right-2 w-7 h-7 rounded-lg bg-black/70 border border-white/20 text-white flex items-center justify-center hover:bg-red-500/80 transition-all"
                  >
                    <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                      <path d="M18 6 6 18M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              ) : (
                <div
                  onClick={() => thumbInputRef.current?.click()}
                  className="border-2 border-dashed border-zinc-700 rounded-2xl flex flex-col items-center justify-center gap-3 cursor-pointer hover:border-zinc-500 transition-all py-14"
                >
                  <svg className="w-10 h-10 text-zinc-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
                    <rect x="3" y="3" width="18" height="18" rx="3" />
                    <circle cx="8.5" cy="8.5" r="1.5" />
                    <path d="M21 15l-5-5L5 21" />
                  </svg>
                  <p className="text-zinc-400 text-sm">Click to upload thumbnail</p>
                  <p className="text-zinc-600 text-xs">PNG, JPG, WebP — recommended 1280×720</p>
                </div>
              )}

              <input
                ref={thumbInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => { const f = e.target.files?.[0]; if (f) handleThumbFile(f) }}
              />

              <button
                onClick={() => next()}
                className="text-zinc-500 text-xs hover:text-zinc-300 underline"
              >
                Skip — use auto-generated thumbnail
              </button>
            </div>
          )}

          {/* ── REVIEW STEP ────────────────────────────────────────── */}
          {step === 'review' && (
            <div className="grid grid-cols-1 md:grid-cols-5 gap-5">
              {/* Thumbnail preview */}
              <div className="md:col-span-2">
                <div className="relative aspect-video rounded-xl overflow-hidden bg-zinc-900 flex items-center justify-center">
                  {thumbPreviewUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={thumbPreviewUrl} alt="Thumbnail" className="w-full h-full object-cover" />
                  ) : (
                    <div className="absolute inset-0 bg-gradient-to-br from-zinc-800 via-zinc-900 to-zinc-950 flex items-center justify-center">
                      <svg className="w-10 h-10 text-zinc-600" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M8 5v14l11-7z" />
                      </svg>
                    </div>
                  )}
                  {duration > 0 && (
                    <div className="absolute bottom-2 right-2 bg-black/80 text-white text-[10px] font-mono px-1.5 py-0.5 rounded-md">
                      {formatDuration(duration)}
                    </div>
                  )}
                </div>
              </div>

              {/* Meta */}
              <div className="md:col-span-3 space-y-3">
                <div>
                  <p className="text-[10px] text-zinc-600 uppercase tracking-widest mb-1">Title</p>
                  <p className="text-white font-bold text-sm leading-snug">{title || '—'}</p>
                </div>
                <div className="grid grid-cols-2 gap-3 text-xs">
                  <div>
                    <p className="text-zinc-600 uppercase tracking-widest text-[9px] mb-0.5">Type</p>
                    <p className="text-zinc-300 capitalize">{type}</p>
                  </div>
                  <div>
                    <p className="text-zinc-600 uppercase tracking-widest text-[9px] mb-0.5">Category</p>
                    <p className="text-zinc-300">{category || '—'}</p>
                  </div>
                  <div>
                    <p className="text-zinc-600 uppercase tracking-widest text-[9px] mb-0.5">Purpose</p>
                    <p className="text-zinc-300">{purpose || '—'}</p>
                  </div>
                  <div>
                    <p className="text-zinc-600 uppercase tracking-widest text-[9px] mb-0.5">Visibility</p>
                    <p className="text-zinc-300 capitalize">{visibility}</p>
                  </div>
                  {videoFile && (
                    <>
                      <div>
                        <p className="text-zinc-600 uppercase tracking-widest text-[9px] mb-0.5">Size</p>
                        <p className="text-zinc-300">{(videoFile.size / 1024 / 1024).toFixed(1)} MB</p>
                      </div>
                      {duration > 0 && (
                        <div>
                          <p className="text-zinc-600 uppercase tracking-widest text-[9px] mb-0.5">Duration</p>
                          <p className="text-zinc-300">{formatDuration(duration)}</p>
                        </div>
                      )}
                    </>
                  )}
                </div>
                {tags && (
                  <div>
                    <p className="text-zinc-600 uppercase tracking-widest text-[9px] mb-1.5">Tags</p>
                    <div className="flex flex-wrap gap-1.5">
                      {tags.split(',').map((t) => t.trim()).filter(Boolean).map((t) => (
                        <span key={t} className="text-[10px] px-2 py-0.5 bg-zinc-800 border border-zinc-700 rounded-md text-zinc-400">
                          {t}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
                {description && (
                  <div>
                    <p className="text-zinc-600 uppercase tracking-widest text-[9px] mb-1">Description</p>
                    <p className="text-zinc-400 text-xs leading-relaxed line-clamp-3">{description}</p>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* ── Footer ─────────────────────────────────────────────────── */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-zinc-800 flex-shrink-0">
          <div>
            {stepIdx > 0 && (
              <button
                onClick={back}
                disabled={uploading}
                className="px-5 py-2 text-sm font-semibold text-zinc-400 hover:text-white bg-zinc-800/50 hover:bg-zinc-700/60 rounded-xl transition-all disabled:opacity-40"
              >
                Back
              </button>
            )}
          </div>

          <div className="flex items-center gap-3">
            {step === 'review' ? (
              <>
                <button
                  onClick={() => handlePublish('draft')}
                  disabled={uploading}
                  className="px-5 py-2 text-sm font-semibold text-zinc-400 hover:text-white border border-zinc-700 hover:border-zinc-500 rounded-xl transition-all disabled:opacity-40"
                >
                  Save Draft
                </button>
                <button
                  onClick={() => handlePublish('published')}
                  disabled={uploading}
                  className="px-6 py-2 text-sm font-bold text-white rounded-xl transition-all disabled:opacity-40"
                  style={{ background: accentColor }}
                >
                  Publish
                </button>
              </>
            ) : (
              <>
                {step === 'thumbnail' && (
                  <button
                    onClick={() => next()}
                    disabled={uploading}
                    className="px-5 py-2 text-sm font-semibold text-zinc-400 hover:text-white border border-zinc-700 hover:border-zinc-500 rounded-xl transition-all"
                  >
                    Skip
                  </button>
                )}
                <button
                  onClick={next}
                  disabled={uploading}
                  className="px-6 py-2 text-sm font-bold text-white rounded-xl transition-all disabled:opacity-40"
                  style={{ background: accentColor }}
                >
                  Next →
                </button>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Hidden video element for duration extraction */}
      <video ref={videoElemRef} className="hidden" />
    </div>
  )
}
