// services/messageService.ts
// Firebase Firestore-backed messaging service.
//
// ── CONVERSATION ID STRATEGY ──────────────────────────────────────────────────
//   Deterministic: conv_${[uid1, uid2].sort().join('_')}
//   Sorting both UIDs guarantees the same two users always resolve to one thread
//   regardless of who initiates — no duplicates possible.
//
// ── REAL-TIME ─────────────────────────────────────────────────────────────────
//   useConversations() and useChatMessages() hooks use onSnapshot listeners.
//   This module provides the write-path async functions.
// ─────────────────────────────────────────────────────────────────────────────

import {
  collection,
  doc,
  setDoc,
  addDoc,
  updateDoc,
  getDoc,
  getDocs,
  query,
  where,
  serverTimestamp,
  increment,
  arrayUnion,
  deleteField,
  Timestamp,
  writeBatch,
} from 'firebase/firestore'
import { db } from '@/lib/firebase/config'
import { COLLECTIONS, subCollections } from '@/lib/firebase/collections'
import { getUserById } from '@/services/userService'
import type { Conversation, DirectMessage, MessageParticipant } from '@/lib/types'

// ── Utility ───────────────────────────────────────────────────────────────────

/**
 * Deterministic conversation ID — always the same for a given pair of UIDs.
 * Pure string operation — safe to call synchronously before any Firestore writes.
 */
export function buildConversationId(uid1: string, uid2: string): string {
  return `conv_${[uid1, uid2].sort().join('_')}`
}

function tsToISO(ts: unknown): string {
  if (!ts) return new Date().toISOString()
  if (ts instanceof Timestamp) return ts.toDate().toISOString()
  if (typeof ts === 'string') return ts
  return new Date().toISOString()
}

// ── Conversation CRUD ─────────────────────────────────────────────────────────

/**
 * Return existing conversation or create a new one between two participants.
 * Safe to call multiple times — idempotent (uses setDoc merge:true).
 */
export async function getOrCreateConversation(
  sender: MessageParticipant,
  recipient: MessageParticipant
): Promise<Conversation> {
  const id = buildConversationId(sender.uid, recipient.uid)
  const ref = doc(db, COLLECTIONS.CONVERSATIONS, id)
  const snap = await getDoc(ref)

  if (snap.exists()) {
    const d = snap.data()
    // If an older doc was bootstrapped with participants: [], patch it now
    // so the conversation list can render real names instead of 'Unknown User'.
    if (!d.participants || d.participants.length === 0) {
      await updateDoc(ref, { participants: [sender, recipient] })
    }
    return {
      id,
      participants: (d.participants && d.participants.length > 0) ? d.participants : [sender, recipient],
      participantIds: d.participantIds,
      lastMessage: d.lastMessage,
      lastMessageAt: d.lastMessageAt ? tsToISO(d.lastMessageAt) : undefined,
      lastMessageSenderId: d.lastMessageSenderId,
      createdAt: tsToISO(d.createdAt),
      unreadCount: d.unreadCount ?? {},
    } as Conversation
  }

  const convoData = {
    participants: [sender, recipient],
    participantIds: [sender.uid, recipient.uid],
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
    // Set a sentinel lastMessageAt so this conversation is included in
    // orderBy('lastMessageAt', 'desc') queries even before any messages exist.
    lastMessageAt: serverTimestamp(),
    unreadCount: { [sender.uid]: 0, [recipient.uid]: 0 },
  }

  await setDoc(ref, convoData)

  return {
    id,
    participants: [sender, recipient],
    participantIds: [sender.uid, recipient.uid],
    createdAt: new Date().toISOString(),
    unreadCount: { [sender.uid]: 0, [recipient.uid]: 0 },
  }
}

/**
 * Get a single conversation by ID. Returns null if not found.
 * Defaults participants / participantIds to [] so callers never crash on missing fields.
 */
export async function getConversation(id: string): Promise<Conversation | null> {
  const snap = await getDoc(doc(db, COLLECTIONS.CONVERSATIONS, id))
  if (!snap.exists()) return null
  const d = snap.data()
  return {
    id: snap.id,
    participants: d.participants ?? [],
    participantIds: d.participantIds ?? [],
    lastMessage: d.lastMessage,
    lastMessageAt: d.lastMessageAt ? tsToISO(d.lastMessageAt) : undefined,
    lastMessageSenderId: d.lastMessageSenderId,
    createdAt: tsToISO(d.createdAt),
    updatedAt: d.updatedAt ? tsToISO(d.updatedAt) : undefined,
    unreadCount: d.unreadCount ?? {},
  }
}

// ── Messages ──────────────────────────────────────────────────────────────────

/**
 * Send a message. Handles three scenarios:
 *   1. Normal: conversation doc exists with participantIds → fast path
 *   2. Repair: conversation doc exists but has no participantIds (legacy data)
 *              → repair the doc first, then write message
 *   3. Bootstrap: conversation doc does not exist at all → create doc then write
 *
 * Uses a two-step approach so the message create rule always sees a conversation
 * doc with a valid participantIds field (required by Firestore security rules).
 */
export async function sendMessage(
  conversationId: string,
  senderId: string,
  text: string
): Promise<void> {
  const trimmed = text.trim()
  if (!trimmed) return

  const convoRef = doc(db, COLLECTIONS.CONVERSATIONS, conversationId)
  const msgsRef = collection(db, subCollections.messages(conversationId))

  // Derive UIDs from the deterministic conversation ID as a fallback.
  // Format: conv_<uid1>_<uid2>  (Firebase UIDs are alphanumeric — no underscores)
  const derivedIds = conversationId.replace(/^conv_/, '').split('_').filter(Boolean)

  // ── Step 1: read existing conversation ─────────────────────────────────────
  let participantIds: string[] = derivedIds
  let convoDocExists = false
  let needsRepair = false

  try {
    const convoSnap = await getDoc(convoRef)
    convoDocExists = convoSnap.exists()
    if (convoDocExists) {
      const pids = convoSnap.data()?.participantIds as string[] | undefined
      if (pids?.length) {
        participantIds = pids
      } else {
        // Doc exists but participantIds field is missing or empty — needs repair
        needsRepair = true
      }
    }
  } catch (readErr) {
    // PERMISSION_DENIED: old conversation doc has no participantIds field.
    // Firestore rule `uid in resource.data.participantIds` errors on null fields.
    // We'll repair the doc via setDoc below (see updated Firestore rules).
    console.error('[sendMessage] getDoc failed — attempting repair:', readErr)
    convoDocExists = true
    needsRepair = true
  }

  const recipientId = participantIds.find((id) => id !== senderId) ?? ''
  const preview = trimmed.length > 80 ? trimmed.slice(0, 80) + '…' : trimmed

  // ── Step 2: repair or bootstrap the conversation doc ──────────────────────
  // This must happen BEFORE addDoc so the Firestore message-create rule can
  // call get(conversation) and see a valid participantIds field.
  // IMPORTANT: we do NOT include `participants: []` here — doing so would wipe
  // any existing rich participant data and cause "Unknown User" in the UI.
  if (needsRepair || !convoDocExists) {
    const bootstrapData: Record<string, unknown> = {
      participantIds,
      createdAt: serverTimestamp(),
    }

    // For a brand-new doc (not just a repair), also write participants immediately
    // so the conversation list shows real names without waiting for background repair.
    if (!convoDocExists) {
      try {
        const [senderUser, recipientUser] = await Promise.all([
          getUserById(senderId).catch(() => null),
          recipientId ? getUserById(recipientId).catch(() => null) : Promise.resolve(null),
        ])
        const buildParticipant = (pid: string, user: Awaited<ReturnType<typeof getUserById>>) => {
          const u = user as (typeof user) & { displayName?: string; photoURL?: string }
          return {
            uid: pid,
            name:
              (u as any)?.name ||
              (u as any)?.username ||
              (u as any)?.displayName ||
              (u as any)?.email?.split('@')[0] ||
              `User (${pid.slice(0, 8)})`,
            username: (u as any)?.username ?? '',
            avatarUrl: (u as any)?.avatarUrl || (u as any)?.photoURL || '',
          }
        }
        bootstrapData.participants = [
          buildParticipant(senderId, senderUser),
          ...(recipientId ? [buildParticipant(recipientId, recipientUser)] : []),
        ]
      } catch {
        // Non-fatal — background repair in useConversations will fix it later
      }
    }

    await setDoc(convoRef, bootstrapData, { merge: true })
  }

  // ── Step 3: write message ──────────────────────────────────────────────────
  await addDoc(msgsRef, {
    conversationId,
    senderId,
    receiverId: recipientId || null,
    text: trimmed,
    createdAt: serverTimestamp(),
    readBy: [senderId],
  })

  // ── Step 4: update conversation metadata ──────────────────────────────────
  const updateData: Record<string, unknown> = {
    lastMessage: preview,
    lastMessageAt: serverTimestamp(),
    lastMessageSenderId: senderId,
    updatedAt: serverTimestamp(),
    [`unreadCount.${senderId}`]: 0,
  }
  if (recipientId) {
    updateData[`unreadCount.${recipientId}`] = increment(1)
  }
  await updateDoc(convoRef, updateData)
}

/**
 * Mark all messages in a conversation as read by a given user.
 * 1. Adds uid to `readBy` on every message that doesn't already include it.
 * 2. Resets `unreadCount.{uid}` to 0 on the conversation document.
 *
 * This is what triggers "Seen" on the sender's side — the sender checks
 * whether the recipient's uid appears in msg.readBy.
 */
export async function markConversationRead(
  conversationId: string,
  uid: string
): Promise<void> {
  try {
    const convoRef = doc(db, COLLECTIONS.CONVERSATIONS, conversationId)
    const msgsRef = collection(db, subCollections.messages(conversationId))

    // Find messages not yet read by this user
    const msgsSnap = await getDocs(msgsRef)
    const unread = msgsSnap.docs.filter((d) => {
      const rb = d.data()?.readBy as string[] | undefined
      return !rb?.includes(uid)
    })

    if (unread.length > 0) {
      const batch = writeBatch(db)
      unread.forEach((d) => batch.update(d.ref, { readBy: arrayUnion(uid) }))
      await batch.commit()
    }

    // Reset the unread counter on the conversation doc
    await updateDoc(convoRef, { [`unreadCount.${uid}`]: 0 }).catch(() => {})
  } catch {
    // Silent — never block the UI for a read-receipt failure
  }
}

/**
 * Get the "other" participant (not the viewer) from a conversation object.
 *
 * Resolution order:
 *   1. Participant entry with a valid name (not "Unknown User" / uid-prefix)
 *   2. Any participant entry that exists in the array (even with a broken name —
 *      it at least has the correct uid which background repair can fix shortly)
 *   3. Uid derived from participantIds with "Unknown User" as temporary placeholder
 *
 * Never returns undefined. The caller should re-render when the conversation
 * participants are updated by the background enrichment in useConversations.
 */
export function getOtherParticipant(
  convo: Conversation,
  myUid: string
): MessageParticipant {
  const isNameValid = (name?: string) =>
    !!name && name !== 'Unknown User' && !name.startsWith('User (')

  // 1. Best case: valid rich participant snapshot
  const valid = convo.participants.find(
    (p) => p.uid !== myUid && isNameValid(p.name)
  )
  if (valid) return valid

  // 2. Any participant with the correct uid (might have broken name, but
  //    background repair will fix it on next snapshot)
  const partial = convo.participants.find((p) => p.uid !== myUid)
  if (partial) return partial

  // 3. Last resort: derive uid from participantIds
  const otherUid =
    convo.participantIds.find((id) => id !== myUid) ??
    convo.participantIds[0] ??
    'unknown'

  return { uid: otherUid, name: 'Unknown User' }
}

/**
 * Return the total number of unread messages for a user by summing the
 * unreadCount.{uid} field across all their conversations.
 * Returns 0 on any error so badge counts never break the UI.
 */
export async function getTotalUnread(userId: string): Promise<number> {
  try {
    const q = query(
      collection(db, COLLECTIONS.CONVERSATIONS),
      where('participantIds', 'array-contains', userId)
    )
    const snap = await getDocs(q)
    let total = 0
    snap.forEach((d) => {
      const count = d.data()?.unreadCount?.[userId]
      if (typeof count === 'number') total += count
    })
    return total
  } catch (error) {
    console.error('[getTotalUnread] error:', error)
    return 0
  }
}

/**
 * Write or clear a typing indicator on the conversation document.
 * Writes `typing.{uid}: serverTimestamp()` when typing, deletes it when done.
 * Silent on permission errors so it never blocks message sending.
 */
export async function setTyping(
  conversationId: string,
  uid: string,
  isTyping: boolean
): Promise<void> {
  const convoRef = doc(db, COLLECTIONS.CONVERSATIONS, conversationId)
  const update = isTyping
    ? { [`typing.${uid}`]: serverTimestamp() }
    : { [`typing.${uid}`]: deleteField() }
  await updateDoc(convoRef, update).catch(() => {})
}

/**
 * Bump the current user's lastActive timestamp.
 * Used to power online/offline presence indicators.
 */
export async function updatePresence(uid: string): Promise<void> {
  const userRef = doc(db, 'users', uid)
  await updateDoc(userRef, { lastActive: serverTimestamp() }).catch(() => {})
}

// ── Conversation repair ───────────────────────────────────────────────────────

export interface ConversationRepairResult {
  total: number
  repaired: number
  skipped: number
  errors: string[]
}

/**
 * One-time migration: repair every conversation the given user participates in
 * that has empty, partial, or "Unknown User" participant data.
 *
 * Uses participantIds as the source of truth, fetches users/{uid} for each,
 * and writes back a complete participants array. Missing user documents are
 * replaced with a safe fallback (uid prefix) and logged to the console.
 *
 * Firestore write batches are flushed every 490 ops to stay under the 500 limit.
 */
export async function repairConversationParticipants(
  uid: string
): Promise<ConversationRepairResult> {
  const result: ConversationRepairResult = { total: 0, repaired: 0, skipped: 0, errors: [] }

  try {
    // Scope the query to conversations this user participates in
    const q = query(
      collection(db, COLLECTIONS.CONVERSATIONS),
      where('participantIds', 'array-contains', uid)
    )
    const snap = await getDocs(q)
    result.total = snap.size

    // Batch state — flushed every 490 ops to stay under Firestore's 500-op limit
    let currentBatch = writeBatch(db)
    let opsInBatch = 0
    const flushBatch = async () => {
      if (opsInBatch > 0) {
        await currentBatch.commit()
        currentBatch = writeBatch(db)
        opsInBatch = 0
      }
    }

    for (const d of snap.docs) {
      const data = d.data()
      const participantIds: string[] = data.participantIds ?? []
      const existing: MessageParticipant[] = data.participants ?? []

      // Determine if repair is needed:
      //  1. participants array is empty
      //  2. participants array is shorter than participantIds (some entries missing)
      //  3. any entry has no name, "Unknown User", or a uid-prefix fallback
      const isNameBroken = (name?: string) =>
        !name || name === 'Unknown User' || name.startsWith('User (')

      const needsRepair =
        existing.length === 0 ||
        existing.length < participantIds.length ||
        existing.some((p) => isNameBroken(p.name))

      if (!needsRepair) {
        result.skipped++
        continue
      }

      // Build a fresh participants array from participantIds
      let fetchFailed = false
      const rebuilt: MessageParticipant[] = []

      for (const pid of participantIds) {
        // Re-use the existing entry if it already has a valid name
        const kept = existing.find(
          (p) => p.uid === pid && p.name && p.name !== 'Unknown User' && !p.name.startsWith('User (')
        )
        if (kept) {
          rebuilt.push(kept)
          continue
        }

        // Fetch from Firestore
        try {
          const user = await getUserById(pid)
          if (user) {
            const u = user as typeof user & { displayName?: string; photoURL?: string }
            rebuilt.push({
              uid: pid,
              name:
                (u as any).name ||
                (u as any).username ||
                (u as any).displayName ||
                (u as any).email?.split('@')[0] ||
                `User (${pid.slice(0, 8)})`,
              username: (u as any).username ?? '',
              avatarUrl: (u as any).avatarUrl || (u as any).photoURL || '',
            })
          } else {
            // User doc doesn't exist — safe fallback with visible UID prefix
            const fallbackName = `User (${pid.slice(0, 8)})`
            console.warn(
              `[repairConversationParticipants] User doc missing for uid=${pid}. ` +
              `Conversation ${d.id} will show "${fallbackName}".`
            )
            rebuilt.push({ uid: pid, name: fallbackName })
          }
        } catch (userErr) {
          console.error(
            `[repairConversationParticipants] Failed to fetch user ${pid} ` +
            `for conversation ${d.id}:`,
            userErr
          )
          result.errors.push(`conv ${d.id}: fetch user ${pid.slice(0, 8)} failed`)
          fetchFailed = true
          break
        }
      }

      if (fetchFailed || rebuilt.length === 0) continue

      console.log(
        `[repairConversationParticipants] Repairing ${d.id} → [${
          rebuilt.map((p) => p.name).join(', ')
        }]`
      )

      currentBatch.update(d.ref, { participants: rebuilt })
      opsInBatch++
      result.repaired++

      if (opsInBatch >= 490) await flushBatch()
    }

    await flushBatch() // commit any remaining writes
  } catch (err) {
    console.error('[repairConversationParticipants] fatal error:', err)
    result.errors.push(String(err))
  }

  return result
}

// Re-export DirectMessage so existing imports still resolve
export type { DirectMessage }
