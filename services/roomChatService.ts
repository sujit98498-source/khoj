import {
  collection,
  doc,
  onSnapshot,
  orderBy,
  query,
  setDoc,
  where,
} from 'firebase/firestore'
import { requireFirestoreDb } from '@/lib/firebase/config'
import { COLLECTIONS } from '@/lib/firebase/collections'

export interface RoomMessage {
  id: string
  roomId: string
  authorId: string
  authorName: string
  content: string
  createdAt: string
}

const STORAGE_PREFIX = 'khoj-room-messages:'
const CHAT_EVENT = 'khoj-room-chat-updated'

function getStorageKey(roomId: string) {
  return `${STORAGE_PREFIX}${roomId}`
}

function sortMessages(messages: RoomMessage[]) {
  return [...messages].sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime())
}

function mergeMessages(messages: RoomMessage[]) {
  const map = new Map<string, RoomMessage>()
  messages.forEach((message) => map.set(message.id, message))
  return sortMessages(Array.from(map.values()))
}

function persistMessages(roomId: string, messages: RoomMessage[]) {
  if (typeof window === 'undefined') return
  window.localStorage.setItem(getStorageKey(roomId), JSON.stringify(mergeMessages(messages)))
}

export function getRoomMessages(roomId: string): RoomMessage[] {
  if (typeof window === 'undefined') return []

  try {
    const raw = window.localStorage.getItem(getStorageKey(roomId))
    if (!raw) return []

    const parsed = JSON.parse(raw) as RoomMessage[]
    return sortMessages(parsed)
  } catch {
    return []
  }
}

export async function sendRoomMessage(input: {
  roomId: string
  authorId: string
  authorName: string
  content: string
}) {
  const message: RoomMessage = {
    id: crypto.randomUUID(),
    roomId: input.roomId,
    authorId: input.authorId,
    authorName: input.authorName,
    content: input.content.trim(),
    createdAt: new Date().toISOString(),
  }

  const nextMessages = mergeMessages([...getRoomMessages(input.roomId), message])
  persistMessages(input.roomId, nextMessages)
  window.dispatchEvent(new CustomEvent(CHAT_EVENT, { detail: { roomId: input.roomId } }))

  try {
    await setDoc(doc(requireFirestoreDb(), COLLECTIONS.ROOM_MESSAGES, message.id), message)
  } catch (error) {
    console.error('Failed to persist room message to Firestore:', error)
  }

  return message
}

export function subscribeToRoomMessages(roomId: string, onChange: (messages: RoomMessage[]) => void) {
  if (typeof window === 'undefined') {
    return () => undefined
  }

  const emitLocal = () => onChange(getRoomMessages(roomId))
  emitLocal()

  let unsubscribeFirestore: () => void = () => {}

  try {
    const messagesQuery = query(
      collection(requireFirestoreDb(), COLLECTIONS.ROOM_MESSAGES),
      where('roomId', '==', roomId),
      orderBy('createdAt', 'asc')
    )

    unsubscribeFirestore = onSnapshot(
      messagesQuery,
      (snapshot) => {
        const remoteMessages = snapshot.docs.map((messageDoc) => {
          const data = messageDoc.data() as Omit<RoomMessage, 'id'> & { id?: string }
          return {
            id: data.id || messageDoc.id,
            roomId: data.roomId,
            authorId: data.authorId,
            authorName: data.authorName,
            content: data.content,
            createdAt: data.createdAt,
          } satisfies RoomMessage
        })

        const merged = mergeMessages([...getRoomMessages(roomId), ...remoteMessages])
        persistMessages(roomId, merged)
        onChange(merged)
      },
      () => {
        emitLocal()
      }
    )
  } catch {
    emitLocal()
  }

  const handleStorage = (event: StorageEvent) => {
    if (event.key === getStorageKey(roomId)) {
      emitLocal()
    }
  }

  const handleCustomEvent = (event: Event) => {
    const detail = (event as CustomEvent<{ roomId?: string }>).detail
    if (!detail?.roomId || detail.roomId === roomId) {
      emitLocal()
    }
  }

  window.addEventListener('storage', handleStorage)
  window.addEventListener(CHAT_EVENT, handleCustomEvent)

  return () => {
    unsubscribeFirestore()
    window.removeEventListener('storage', handleStorage)
    window.removeEventListener(CHAT_EVENT, handleCustomEvent)
  }
}
