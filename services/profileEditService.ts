// services/profileEditService.ts
// Save layer for the Edit Profile page.
//
// ── HOW TO CONNECT A REAL DATABASE ────────────────────────────────────────────
//
//  Firestore (recommended for this stack):
//    import { doc, setDoc, serverTimestamp } from 'firebase/firestore'
//    import { requireFirestoreDb } from '@/lib/firebase/config'
//    const ref = doc(requireFirestoreDb(), 'portfolios', uid)
//    await setDoc(ref, { ...data, updatedAt: serverTimestamp() }, { merge: true })
//
//  Supabase:
//    await supabase.from('portfolios').upsert({ uid, ...data, updated_at: new Date() })
//
//  REST API:
//    await fetch(`/api/profile/${uid}`, { method: 'PATCH', body: JSON.stringify(data) })
//
// ── HOW TO ADD IMAGE UPLOAD ───────────────────────────────────────────────────
//
//  Firebase Storage (recommended):
//    import { ref as storageRef, uploadBytes, getDownloadURL } from 'firebase/storage'
//    const snap = await uploadBytes(storageRef(requireFirebaseStorage(), `avatars/${uid}`), file)
//    const url  = await getDownloadURL(snap.ref)
//    // Then save url into PortfolioUser.avatarUrl via saveProfileData()
//
//  Cloudinary / Uploadthing:
//    Call their upload API, get back a URL, same final step.
//
// ─────────────────────────────────────────────────────────────────────────────

import { PortfolioUser } from '@/lib/types'

const DRAFT_KEY = 'khoj_profile_draft'
const SAVE_DEBOUNCE_MS = 2000

/** Persist a draft to localStorage (auto-save). */
export function saveDraft(uid: string, data: Partial<PortfolioUser>): void {
  try {
    localStorage.setItem(
      `${DRAFT_KEY}_${uid}`,
      JSON.stringify({ data, savedAt: Date.now() })
    )
  } catch {
    // Storage unavailable — silently ignore
  }
}

/** Load a previously saved draft, or null if none exists. */
export function loadDraft(uid: string): { data: Partial<PortfolioUser>; savedAt: number } | null {
  try {
    const raw = localStorage.getItem(`${DRAFT_KEY}_${uid}`)
    if (!raw) return null
    return JSON.parse(raw)
  } catch {
    return null
  }
}

/** Remove the draft after a successful save. */
export function clearDraft(uid: string): void {
  try {
    localStorage.removeItem(`${DRAFT_KEY}_${uid}`)
  } catch {
    // ignore
  }
}

export { SAVE_DEBOUNCE_MS }

/**
 * Save the user's profile data.
 *
 * Currently: merges into localStorage mock store so the public profile page
 *            can read it in the same session (demo-only).
 * Future:    replace the body with a real DB call (see instructions above).
 */
export async function saveProfileData(
  uid: string,
  data: Partial<PortfolioUser>
): Promise<{ success: boolean; error?: string }> {
  try {
    // ── MOCK SAVE: persist to localStorage under a key the portfolio service reads ──
    const existing = localStorage.getItem(`khoj_portfolio_${uid}`)
    const current: Partial<PortfolioUser> = existing ? JSON.parse(existing) : {}
    const merged = { ...current, ...data, uid }
    localStorage.setItem(`khoj_portfolio_${uid}`, JSON.stringify(merged))

    // Simulate network latency in dev
    await new Promise((r) => setTimeout(r, 400))

    clearDraft(uid)
    return { success: true }
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : 'Unknown error' }
  }
}

/**
 * Load a user's saved profile from the mock localStorage store.
 * Returns null if nothing is saved yet.
 */
export function loadSavedProfile(uid: string): Partial<PortfolioUser> | null {
  try {
    const raw = localStorage.getItem(`khoj_portfolio_${uid}`)
    return raw ? JSON.parse(raw) : null
  } catch {
    return null
  }
}
