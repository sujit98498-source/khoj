// components/streams/CreateStreamModal.tsx
// Modal for creating a new live stream.
// On submit: writes to Firestore streams/{id}, then redirects to /streams/{id}

'use client'

import { useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { collection, addDoc, serverTimestamp } from 'firebase/firestore'
import { db } from '@/lib/firebase/config'
import { StreamCategory } from '@/lib/types'
import { Button } from '@/components/ui/Button'
import toast from 'react-hot-toast'

const CATEGORIES: StreamCategory[] = [
  'Coding',
  'Gaming',
  'Startup',
  'Fitness',
  'Design',
  'Education',
  'Tournaments',
  'Other',
]

interface CreateStreamModalProps {
  onClose: () => void
  hostId: string
  hostName: string
  hostPhoto: string
}

export function CreateStreamModal({
  onClose,
  hostId,
  hostName,
  hostPhoto,
}: CreateStreamModalProps) {
  const router = useRouter()
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [category, setCategory] = useState<StreamCategory>('Coding')
  const [visibility, setVisibility] = useState<'public' | 'private'>('public')
  const [chatEnabled, setChatEnabled] = useState(true)
  const [thumbnailUrl, setThumbnailUrl] = useState('')
  const [isCreating, setIsCreating] = useState(false)
  // Ref guard prevents duplicate submissions if React batches or user double-clicks
  const creatingRef = useRef(false)

  const handleStart = async () => {
    // --- Validate ---
    if (!title.trim()) {
      toast.error('Stream title is required')
      return
    }
    if (!hostId) {
      toast.error('Please log in to start a stream')
      return
    }

    // --- Guard against double submission ---
    if (creatingRef.current) return
    creatingRef.current = true
    setIsCreating(true)

    try {
      console.log('[CreateStreamModal] Creating stream for hostId:', hostId)

      const docRef = await addDoc(collection(db, 'streams'), {
        title: title.trim(),
        description: description.trim(),
        category,
        visibility,
        status: 'live',
        hostId,
        hostName: hostName || 'KHOJ User',
        hostPhoto: hostPhoto || '',
        viewerCount: 0,
        likeCount: 0,
        thumbnailUrl: thumbnailUrl.trim() || '',
        chatEnabled,
        createdAt: serverTimestamp(),
        endedAt: null,
      })

      console.log('[CreateStreamModal] Stream created:', docRef.id)
      toast.success('Stream created! Going live...')
      onClose()
      router.push(`/streams/${docRef.id}`)
    } catch (error: unknown) {
      console.error('[CreateStreamModal] CREATE STREAM ERROR:', error)
      creatingRef.current = false
      setIsCreating(false)

      const message =
        error instanceof Error ? error.message : String(error)

      if (
        message.toLowerCase().includes('permission') ||
        message.toLowerCase().includes('missing or insufficient')
      ) {
        toast.error(
          'Permission denied — your Firestore rules need to be deployed. Run: npx firebase deploy --only firestore:rules',
          { duration: 8000 }
        )
      } else if (
        message.toLowerCase().includes('offline') ||
        message.toLowerCase().includes('unavailable')
      ) {
        toast.error('Firebase is offline — check your internet connection and try again.')
      } else if (message.toLowerCase().includes('invalid-argument')) {
        toast.error(`Invalid data: ${message}`)
      } else {
        toast.error(`Failed to create stream: ${message}`, { duration: 6000 })
      }
      return
    }

    // Only reached on success — reset flag (component will unmount anyway)
    creatingRef.current = false
  }

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-khoj-card border border-khoj-border rounded-sm w-full max-w-lg shadow-2xl animate-slide-up">

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-khoj-border">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
            <h2 className="text-khoj-text font-display font-bold text-lg tracking-wide">Go Live</h2>
          </div>
          <button
            onClick={onClose}
            className="text-khoj-subtle hover:text-khoj-text transition-colors text-xl leading-none"
          >
            ✕
          </button>
        </div>

        {/* Body */}
        <div className="px-6 py-5 space-y-4">

          {/* Title */}
          <div>
            <label className="block text-xs font-body font-semibold text-khoj-subtle uppercase tracking-widest mb-1.5">
              Stream Title *
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="What are you streaming today?"
              maxLength={100}
              className="w-full bg-khoj-bg border border-khoj-border rounded-sm px-3 py-2.5 text-sm text-khoj-text placeholder-khoj-subtle/50 focus:outline-none focus:border-khoj-accent/60 transition-colors"
            />
          </div>

          {/* Description */}
          <div>
            <label className="block text-xs font-body font-semibold text-khoj-subtle uppercase tracking-widest mb-1.5">
              Description
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Tell viewers what this stream is about..."
              rows={2}
              maxLength={300}
              className="w-full bg-khoj-bg border border-khoj-border rounded-sm px-3 py-2.5 text-sm text-khoj-text placeholder-khoj-subtle/50 focus:outline-none focus:border-khoj-accent/60 transition-colors resize-none"
            />
          </div>

          {/* Category */}
          <div>
            <label className="block text-xs font-body font-semibold text-khoj-subtle uppercase tracking-widest mb-1.5">
              Category
            </label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value as StreamCategory)}
              className="w-full bg-khoj-bg border border-khoj-border rounded-sm px-3 py-2.5 text-sm text-khoj-text focus:outline-none focus:border-khoj-accent/60 transition-colors"
            >
              {CATEGORIES.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </div>

          {/* Visibility + Chat row */}
          <div className="flex gap-4">
            <div className="flex-1">
              <label className="block text-xs font-body font-semibold text-khoj-subtle uppercase tracking-widest mb-1.5">
                Visibility
              </label>
              <select
                value={visibility}
                onChange={(e) => setVisibility(e.target.value as 'public' | 'private')}
                className="w-full bg-khoj-bg border border-khoj-border rounded-sm px-3 py-2.5 text-sm text-khoj-text focus:outline-none focus:border-khoj-accent/60 transition-colors"
              >
                <option value="public">Public</option>
                <option value="private">Private</option>
              </select>
            </div>

            <div className="flex-1">
              <label className="block text-xs font-body font-semibold text-khoj-subtle uppercase tracking-widest mb-1.5">
                Live Chat
              </label>
              <button
                type="button"
                onClick={() => setChatEnabled((v) => !v)}
                className={`w-full px-3 py-2.5 text-sm font-body font-medium rounded-sm border transition-all ${
                  chatEnabled
                    ? 'bg-khoj-accent/10 border-khoj-accent/40 text-khoj-accent'
                    : 'bg-khoj-bg border-khoj-border text-khoj-subtle'
                }`}
              >
                {chatEnabled ? '✓ Enabled' : '✗ Disabled'}
              </button>
            </div>
          </div>

          {/* Thumbnail URL */}
          <div>
            <label className="block text-xs font-body font-semibold text-khoj-subtle uppercase tracking-widest mb-1.5">
              Thumbnail URL (optional)
            </label>
            <input
              type="url"
              value={thumbnailUrl}
              onChange={(e) => setThumbnailUrl(e.target.value)}
              placeholder="https://..."
              className="w-full bg-khoj-bg border border-khoj-border rounded-sm px-3 py-2.5 text-sm text-khoj-text placeholder-khoj-subtle/50 focus:outline-none focus:border-khoj-accent/60 transition-colors"
            />
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-khoj-border flex items-center justify-end gap-3">
          <Button variant="secondary" size="sm" onClick={onClose} disabled={isCreating}>
            Cancel
          </Button>
          <Button variant="primary" size="sm" onClick={handleStart} loading={isCreating} disabled={isCreating}>
            {isCreating ? 'Starting...' : '🔴 Start Stream'}
          </Button>
        </div>
      </div>
    </div>
  )
}
