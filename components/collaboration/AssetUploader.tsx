'use client'
// components/collaboration/AssetUploader.tsx + AssetsList.tsx

import React, { useRef } from 'react'
import type { RoomAsset } from '@/types/collaboration'
import { Button } from '@/components/ui/Button'
import { ALLOWED_ASSET_MIME_TYPES, ASSET_MAX_BYTES } from '@/lib/collaboration/roomTypes'

// ── AssetUploader ─────────────────────────────────────────────────────────────

interface UploaderProps {
  onFile: (file: File, visibility: 'room' | 'public') => void
  uploading: boolean
  progress: number
  error: string | null
}

export function AssetUploader({ onFile, uploading, progress, error }: UploaderProps) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [visibility, setVisibility] = React.useState<'room' | 'public'>('room')

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    if (file.size > ASSET_MAX_BYTES) {
      alert('File too large (max 20 MB)')
      return
    }
    if (!ALLOWED_ASSET_MIME_TYPES.includes(file.type as any)) {
      alert('Only PDF, PNG, JPEG, and TXT files are allowed')
      return
    }
    onFile(file, visibility)
    e.target.value = ''
  }

  return (
    <div className="bg-[#0d0d16] border border-dashed border-khoj-border rounded-xl p-5 space-y-3">
      <p className="text-khoj-subtle text-xs">PDF, PNG, JPEG, TXT · Max 20 MB</p>
      <div className="flex items-center gap-3 flex-wrap">
        <select
          className="bg-khoj-card border border-khoj-border rounded-lg px-3 py-1.5 text-khoj-text text-sm focus:outline-none"
          value={visibility}
          onChange={(e) => setVisibility(e.target.value as any)}
        >
          <option value="room">Room only</option>
          <option value="public">Public</option>
        </select>
        <Button
          variant="secondary"
          onClick={() => inputRef.current?.click()}
          disabled={uploading}
        >
          {uploading ? `Uploading ${Math.round(progress)}%…` : 'Choose File'}
        </Button>
      </div>
      {uploading && (
        <div className="h-1.5 bg-khoj-border rounded-full overflow-hidden">
          <div
            className="h-full bg-khoj-accent transition-all"
            style={{ width: `${progress}%` }}
          />
        </div>
      )}
      {error && <p className="text-red-400 text-xs">{error}</p>}
      <input ref={inputRef} type="file" className="hidden" onChange={handleChange} />
    </div>
  )
}

// ── AssetsList ────────────────────────────────────────────────────────────────

interface ListProps { assets: RoomAsset[] }

const ASSET_ICONS: Record<string, string> = {
  pdf: '📄', image: '🖼', doc: '📝', other: '📁',
}

export function AssetsList({ assets }: ListProps) {
  if (assets.length === 0) {
    return <p className="text-khoj-subtle text-sm text-center py-6">No files uploaded yet.</p>
  }

  return (
    <div className="space-y-2 mt-4">
      {assets.map((a) => (
        <div
          key={a.id}
          className="flex items-center gap-3 bg-[#0d0d16] border border-khoj-border rounded-lg px-4 py-3"
        >
          <span className="text-2xl flex-shrink-0">{ASSET_ICONS[a.assetType] ?? '📁'}</span>
          <div className="flex-1 min-w-0">
            <p className="text-khoj-text text-sm font-medium truncate">{a.name}</p>
            <p className="text-khoj-subtle text-xs mt-0.5 capitalize">{a.assetType} · {a.visibility}</p>
          </div>
          {a.storagePath && (
            <a
              href={a.storagePath}
              target="_blank"
              rel="noopener noreferrer"
              className="text-khoj-accent text-xs hover:underline flex-shrink-0"
            >
              View
            </a>
          )}
        </div>
      ))}
    </div>
  )
}
