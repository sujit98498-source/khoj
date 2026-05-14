// apps/mobile/lib/conversationService.ts
// Get or create a 1-on-1 conversation between two users.
// Both participants' profile data is stored in the conversation document
// so the inbox can render without extra lookups.

import {
  collection,
  query,
  where,
  getDocs,
  addDoc,
  serverTimestamp,
  doc,
  getDoc,
} from 'firebase/firestore'
import { db, COLLECTIONS } from './firebase'

export async function getOrCreateConversation(
  myUid: string,
  myName: string,
  myAvatarUrl: string | null | undefined,
  otherUid: string,
): Promise<string> {
  // Try to find an existing conversation
  const q = query(
    collection(db, COLLECTIONS.CONVERSATIONS),
    where('participantIds', 'array-contains', myUid),
  )
  const snap = await getDocs(q)
  const existing = snap.docs.find((d) => {
    const data = d.data()
    return Array.isArray(data.participantIds) && data.participantIds.includes(otherUid)
  })
  if (existing) return existing.id

  // Fetch other user's profile for the participants map
  let otherName = 'Gamer'
  let otherAvatarUrl: string | null = null
  try {
    const otherDoc = await getDoc(doc(db, COLLECTIONS.USERS, otherUid))
    if (otherDoc.exists()) {
      const d = otherDoc.data()
      otherName = d.gamerTag ?? d.name ?? 'Gamer'
      otherAvatarUrl = d.avatarUrl ?? null
    }
  } catch {
    // use defaults
  }

  // Create the conversation
  const ref = await addDoc(collection(db, COLLECTIONS.CONVERSATIONS), {
    participantIds: [myUid, otherUid],
    participants: {
      [myUid]: { name: myName, avatarUrl: myAvatarUrl ?? null },
      [otherUid]: { name: otherName, avatarUrl: otherAvatarUrl },
    },
    lastMessage: '',
    lastMessageAt: serverTimestamp(),
    lastMessageSenderId: '',
    unreadCount: { [myUid]: 0, [otherUid]: 0 },
    createdAt: serverTimestamp(),
  })
  return ref.id
}
