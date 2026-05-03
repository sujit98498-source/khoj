// services/announcementService.ts
// Create, fetch, delete, and subscribe to announcements

import {
  collection,
  doc,
  addDoc,
  getDocs,
  deleteDoc,
  query,
  orderBy,
  onSnapshot,
  Unsubscribe,
  limit,
} from 'firebase/firestore'
import { requireFirestoreDb } from '@/lib/firebase/config'
import { COLLECTIONS } from '@/lib/firebase/collections'
import { Announcement } from '@/lib/types'

type AnnouncementRecord = Partial<Announcement> & { content?: string }

function normalizeAnnouncement(data: AnnouncementRecord, id: string): Announcement {
  return {
    id,
    title: data.title ?? 'Announcement',
    message: data.message ?? data.content ?? '',
    createdAt: data.createdAt ?? new Date(0).toISOString(),
    createdBy: data.createdBy ?? 'system',
  }
}

export interface CreateAnnouncementInput {
  title: string
  message: string
  createdBy: string
}

export async function createAnnouncement(input: CreateAnnouncementInput): Promise<string> {
  const ref = await addDoc(collection(requireFirestoreDb(), COLLECTIONS.ANNOUNCEMENTS), {
    ...input,
    createdAt: new Date().toISOString(),
  })
  return ref.id
}

export async function getAnnouncements(count: number = 20): Promise<Announcement[]> {
  const q = query(
    collection(requireFirestoreDb(), COLLECTIONS.ANNOUNCEMENTS),
    orderBy('createdAt', 'desc'),
    limit(count)
  )
  const snap = await getDocs(q)
  return snap.docs.map((d) => normalizeAnnouncement(d.data() as AnnouncementRecord, d.id))
}

export async function deleteAnnouncement(id: string): Promise<void> {
  await deleteDoc(doc(requireFirestoreDb(), COLLECTIONS.ANNOUNCEMENTS, id))
}

export function subscribeToAnnouncements(
  onUpdate: (announcements: Announcement[]) => void,
  count: number = 10
): Unsubscribe {
  const q = query(
    collection(requireFirestoreDb(), COLLECTIONS.ANNOUNCEMENTS),
    orderBy('createdAt', 'desc'),
    limit(count)
  )

  return onSnapshot(
    q,
    (snap) => {
      const data = snap.docs.map((d) => normalizeAnnouncement(d.data() as AnnouncementRecord, d.id))
      onUpdate(data)
    },
    (error) => {
      // orderBy on a single field uses Firestore's auto-built index so this
      // should rarely fail — log it once and call onUpdate with empty array.
      console.error('[KHOJ] Announcements listener error:', error.message)
      onUpdate([])
    }
  )
}
