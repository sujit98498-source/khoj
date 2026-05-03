// lib/collaboration/storage.ts
// Firebase Storage helpers for Collaboration Room assets.

import {
  ref,
  uploadBytesResumable,
  getDownloadURL,
  deleteObject,
  UploadTaskSnapshot,
} from 'firebase/storage'
import { requireFirebaseStorage } from '@/lib/firebase/config'
import { ALLOWED_ASSET_MIME_TYPES, ASSET_MAX_BYTES } from './roomTypes'
import type { AssetType } from '@/types/collaboration'

export interface UploadProgress {
  bytesTransferred: number
  totalBytes: number
  percent: number
}

export interface UploadResult {
  storagePath: string
  downloadUrl: string
  contentType: string
  sizeBytes: number
}

// ── Validate file before upload ───────────────────────────────────────────────
export function validateAssetFile(file: File): string | null {
  if (!ALLOWED_ASSET_MIME_TYPES.includes(file.type)) {
    return `File type "${file.type}" is not allowed. Allowed: PDF, PNG, JPEG, TXT.`
  }
  if (file.size > ASSET_MAX_BYTES) {
    return `File exceeds 20 MB limit (${(file.size / 1_048_576).toFixed(1)} MB).`
  }
  return null
}

// ── Infer AssetType from MIME ─────────────────────────────────────────────────
export function inferAssetType(file: File): AssetType {
  if (file.type === 'application/pdf') return 'deck'
  if (file.type.startsWith('image/')) return 'image'
  return 'doc'
}

// ── Upload a room asset ───────────────────────────────────────────────────────
export function uploadRoomAsset(
  roomId: string,
  assetId: string,
  file: File,
  onProgress?: (p: UploadProgress) => void,
): Promise<UploadResult> {
  return new Promise((resolve, reject) => {
    // Path must match storage.rules: rooms/{roomId}/assets/{assetId}/...
    const storagePath = `rooms/${roomId}/assets/${assetId}/${file.name}`
    const storageRef = ref(requireFirebaseStorage(), storagePath)

    const task = uploadBytesResumable(storageRef, file, {
      contentType: file.type,
    })

    task.on(
      'state_changed',
      (snapshot: UploadTaskSnapshot) => {
        onProgress?.({
          bytesTransferred: snapshot.bytesTransferred,
          totalBytes: snapshot.totalBytes,
          percent: Math.round((snapshot.bytesTransferred / snapshot.totalBytes) * 100),
        })
      },
      (error) => reject(error),
      async () => {
        const downloadUrl = await getDownloadURL(task.snapshot.ref)
        resolve({
          storagePath,
          downloadUrl,
          contentType: file.type,
          sizeBytes: file.size,
        })
      },
    )
  })
}

// ── Delete a room asset from storage ─────────────────────────────────────────
export async function deleteRoomAssetFile(storagePath: string): Promise<void> {
  await deleteObject(ref(requireFirebaseStorage(), storagePath))
}
