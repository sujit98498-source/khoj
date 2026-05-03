// components/profile-edit/AvatarUploader.tsx
// Reusable profile image upload component.
//
// Features:
//  - Current avatar preview (falls back to initials if no URL)
//  - Click-to-upload + drag & drop
//  - Validates: jpg/png/webp only, max 5 MB
//  - uploadBytesResumable → real-time progress bar
//  - getDownloadURL on completion → calls onUpload(url) immediately
//  - Remove / change image controls
//  - Error + loading states
//
// Storage path: profile-images/{userId}/{timestamp}_{sanitisedFileName}
//
// TO EXTEND FOR COVER IMAGE:
//   Pass storagePath="cover-images/{userId}/..." and adjust dimensions.

'use client'

import { useRef, useState, DragEvent, ChangeEvent } from 'react'
import { ref as storageRef, uploadBytesResumable, getDownloadURL, deleteObject } from 'firebase/storage'
import { requireFirebaseStorage } from '@/lib/firebase/config'
import clsx from 'clsx'

// ── Constants ─────────────────────────────────────────────────────────────────

const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp']
const MAX_BYTES = 5 * 1024 * 1024 // 5 MB
const AVATAR_COLORS = ['#FF4D00', '#FFB800', '#00D4AA', '#6366f1', '#ec4899', '#14b8a6']

function avatarColor(name: string) {
  return AVATAR_COLORS[name.charCodeAt(0) % AVATAR_COLORS.length]
}

// ── Types ─────────────────────────────────────────────────────────────────────

interface AvatarUploaderProps {
  /** Current avatar URL — null/undefined = show initials */
  currentUrl?: string
  /** Display name used for initials fallback and storage path */
  userName: string
  /** Firebase UID — determines storage folder */
  userId: string
  /** Called with the new download URL immediately after upload completes */
  onUpload: (url: string) => void
  /** Called when the user removes their avatar */
  onRemove: () => void
}

// ── Component ─────────────────────────────────────────────────────────────────

export function AvatarUploader({
  currentUrl,
  userName,
  userId,
  onUpload,
  onRemove,
}: AvatarUploaderProps) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [progress, setProgress] = useState<number | null>(null) // 0-100, null = idle
  const [error, setError] = useState<string | null>(null)
  const [dragging, setDragging] = useState(false)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null) // optimistic local preview

  const color = avatarColor(userName)
  const displayUrl = previewUrl ?? currentUrl

  // ── Validation ────────────────────────────────────────────────────────────

  function validateFile(file: File): string | null {
    if (!ALLOWED_TYPES.includes(file.type)) {
      return `Unsupported format. Use JPG, PNG, or WebP.`
    }
    if (file.size > MAX_BYTES) {
      return `File too large. Maximum size is 5 MB.`
    }
    return null
  }

  // ── Upload ────────────────────────────────────────────────────────────────

  function uploadFile(file: File) {
    const validationError = validateFile(file)
    if (validationError) {
      setError(validationError)
      return
    }

    setError(null)

    // Optimistic local preview while upload runs
    const objectUrl = URL.createObjectURL(file)
    setPreviewUrl(objectUrl)

    // Build a safe storage path
    const safeName = file.name.replace(/[^a-z0-9._-]/gi, '_')
    const path = `profile-images/${userId}/${Date.now()}_${safeName}`
    const fileRef = storageRef(requireFirebaseStorage(), path)

    const uploadTask = uploadBytesResumable(fileRef, file, {
      contentType: file.type,
      customMetadata: { uploadedBy: userId },
    })

    setProgress(0)

    uploadTask.on(
      'state_changed',
      (snapshot) => {
        const pct = Math.round((snapshot.bytesTransferred / snapshot.totalBytes) * 100)
        setProgress(pct)
      },
      (err) => {
        setProgress(null)
        setPreviewUrl(null)
        URL.revokeObjectURL(objectUrl)

        // Map Firebase error codes to user-friendly messages
        const code = (err as { code?: string }).code ?? ''
        if (code === 'storage/unauthorized') {
          setError('Upload not authorised. Check Firebase Storage rules.')
        } else if (code === 'storage/canceled') {
          setError('Upload was cancelled.')
        } else {
          setError('Upload failed. Please try again.')
        }
      },
      async () => {
        const downloadUrl = await getDownloadURL(uploadTask.snapshot.ref)
        setProgress(null)
        // Keep preview — it now matches the live URL
        onUpload(downloadUrl)
        URL.revokeObjectURL(objectUrl)
        setPreviewUrl(null) // let parent-provided currentUrl take over
      }
    )
  }

  // ── Input / drag handlers ─────────────────────────────────────────────────

  function handleInputChange(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (file) uploadFile(file)
    // Reset input so the same file can be re-selected
    e.target.value = ''
  }

  function handleDrop(e: DragEvent<HTMLDivElement>) {
    e.preventDefault()
    setDragging(false)
    const file = e.dataTransfer.files?.[0]
    if (file) uploadFile(file)
  }

  function handleDragOver(e: DragEvent<HTMLDivElement>) {
    e.preventDefault()
    setDragging(true)
  }

  function handleDragLeave() {
    setDragging(false)
  }

  async function handleRemove() {
    setPreviewUrl(null)
    setError(null)
    onRemove()

    // Optionally delete from Storage — only if the URL is from our bucket
    // This is best-effort; don't block the UI on it.
    if (currentUrl?.includes('firebasestorage')) {
      try {
        const fileRef = storageRef(requireFirebaseStorage(), currentUrl)
        await deleteObject(fileRef)
      } catch {
        // Silent — old image deletion is non-critical
      }
    }
  }

  const isUploading = progress !== null

  return (
    <div className="flex flex-col sm:flex-row items-start sm:items-center gap-6">
      {/* ── Avatar preview ── */}
      <div className="relative flex-shrink-0">
        <div
          className={clsx(
            'w-24 h-24 rounded-sm flex items-center justify-center text-3xl font-display font-bold overflow-hidden transition-all duration-200',
            isUploading && 'opacity-60'
          )}
          style={{
            backgroundColor: `${color}18`,
            border: `2px solid ${color}${displayUrl ? '60' : '45'}`,
            color,
          }}
        >
          {displayUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={displayUrl}
              alt={userName}
              className="w-full h-full object-cover"
            />
          ) : (
            userName.charAt(0).toUpperCase()
          )}
        </div>

        {/* Uploading spinner overlay */}
        {isUploading && (
          <div className="absolute inset-0 flex items-center justify-center rounded-sm bg-black/40">
            <span
              className="w-6 h-6 rounded-full border-2 border-white/30 border-t-white animate-spin"
              aria-label="Uploading"
            />
          </div>
        )}
      </div>

      {/* ── Controls ── */}
      <div className="flex-1 min-w-0 space-y-3">
        {/* Drop zone / button row */}
        <div
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          className={clsx(
            'border-2 border-dashed rounded-sm px-4 py-4 flex flex-col sm:flex-row items-center gap-3 transition-all duration-150 cursor-pointer',
            dragging
              ? 'border-khoj-accent bg-khoj-accent/5'
              : 'border-khoj-border hover:border-khoj-accent/40 hover:bg-white/[0.015]'
          )}
          onClick={() => !isUploading && inputRef.current?.click()}
        >
          <span className="text-2xl text-khoj-subtle select-none">⬆</span>
          <div className="text-center sm:text-left">
            <p className="text-xs font-body text-khoj-text">
              {isUploading ? 'Uploading…' : 'Drag & drop or '}
              {!isUploading && (
                <span className="text-khoj-accent font-semibold cursor-pointer hover:underline">
                  browse
                </span>
              )}
            </p>
            <p className="text-[10px] text-khoj-muted font-body mt-0.5">
              JPG, PNG or WebP · Max 5 MB
            </p>
          </div>
        </div>

        {/* Hidden file input */}
        <input
          ref={inputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          onChange={handleInputChange}
          className="sr-only"
          aria-label="Upload profile image"
        />

        {/* Progress bar */}
        {isUploading && (
          <div className="space-y-1">
            <div className="h-1.5 bg-khoj-muted/20 rounded-full overflow-hidden">
              <div
                className="h-full bg-khoj-accent rounded-full transition-all duration-300"
                style={{ width: `${progress}%` }}
              />
            </div>
            <p className="text-[10px] text-khoj-subtle font-body text-right">{progress}%</p>
          </div>
        )}

        {/* Error message */}
        {error && (
          <div className="flex items-start gap-2 px-3 py-2 bg-red-500/10 border border-red-500/30 rounded-sm">
            <span className="text-red-400 text-xs mt-0.5">⚠</span>
            <p className="text-xs text-red-400 font-body">{error}</p>
          </div>
        )}

        {/* Remove button — only shown when there is an image */}
        {(displayUrl || currentUrl) && !isUploading && (
          <button
            type="button"
            onClick={handleRemove}
            className="text-[10px] font-body text-khoj-subtle hover:text-red-400 transition-colors uppercase tracking-wider"
          >
            ✕ Remove photo
          </button>
        )}
      </div>
    </div>
  )
}
