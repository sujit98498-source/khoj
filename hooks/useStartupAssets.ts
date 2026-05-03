'use client'
// hooks/useStartupAssets.ts
// Room assets subscription + upload helper.

import { useEffect, useState } from 'react'
import { subscribeRoomAssets } from '@/lib/collaboration/roomQueries'
import { addDoc, collection, doc, serverTimestamp, updateDoc } from 'firebase/firestore'
import { requireFirestoreDb } from '@/lib/firebase/config'
import { COLLAB_COLLECTIONS as C } from '@/lib/collaboration/collabCollections'
import {
  uploadRoomAsset,
  validateAssetFile,
  inferAssetType,
  UploadProgress,
} from '@/lib/collaboration/storage'
import type { RoomAsset } from '@/types/collaboration'

export function useStartupAssets(roomId: string, enabled: boolean) {
  const [assets,   setAssets]   = useState<RoomAsset[]>([])
  const [loading,  setLoading]  = useState(true)
  const [uploading, setUploading] = useState(false)
  const [progress, setProgress] = useState<UploadProgress | null>(null)
  const [error,    setError]    = useState<string | null>(null)

  useEffect(() => {
    if (!roomId || !enabled) return
    const unsub = subscribeRoomAssets(roomId, (a) => { setAssets(a); setLoading(false) })
    return unsub
  }, [roomId, enabled])

  async function uploadFile(
    file: File,
    uploadedBy: string,
    visibility: RoomAsset['visibility'] = 'room',
  ): Promise<void> {
    const err = validateAssetFile(file)
    if (err) { setError(err); return }

    setError(null)
    setUploading(true)
    setProgress(null)

    try {
      // Create the Firestore doc first to get the assetId
      const assetRef = await addDoc(collection(requireFirestoreDb(), C.ROOMS, roomId, C.ASSETS), {
        assetType: inferAssetType(file),
        name: file.name,
        contentType: file.type,
        sizeBytes: file.size,
        uploadedBy,
        visibility,
        createdAt: serverTimestamp(),
      })

      const result = await uploadRoomAsset(roomId, assetRef.id, file, setProgress)

      // Update the Firestore doc with the storage path and external URL
      await updateDoc(doc(requireFirestoreDb(), C.ROOMS, roomId, C.ASSETS, assetRef.id), {
        storagePath: result.storagePath,
        externalUrl: result.downloadUrl,
      })
    } catch (e: unknown) {
      setError((e as Error)?.message ?? 'Upload failed')
    } finally {
      setUploading(false)
      setProgress(null)
    }
  }

  return { assets, loading, uploading, progress, error, uploadFile }
}
