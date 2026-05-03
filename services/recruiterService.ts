// services/recruiterService.ts
// Local state for recruiter saved/shortlisted candidates.
// ── DB swap ──
//   Replace localStorage bodies with Firestore sub-collections:
//   recruiters/{recruiterId}/saved/{candidateUid}
//   recruiters/{recruiterId}/shortlist/{candidateUid}
//   Use setDoc / deleteDoc with timestamps for audit trail.

const SAVED_KEY = (id: string) => `khoj_recruiter_saved_${id}`
const SHORTLIST_KEY = (id: string) => `khoj_recruiter_shortlist_${id}`

function readList(key: string): string[] {
  if (typeof window === 'undefined') return []
  try {
    return JSON.parse(localStorage.getItem(key) ?? '[]')
  } catch {
    return []
  }
}

function writeList(key: string, list: string[]): void {
  if (typeof window === 'undefined') return
  localStorage.setItem(key, JSON.stringify(list))
}

/** Return all saved candidate UIDs for this recruiter. */
export function getSavedCandidates(recruiterId: string): string[] {
  return readList(SAVED_KEY(recruiterId))
}

/** Toggle saved state. Returns updated list. */
export function toggleSavedCandidate(recruiterId: string, uid: string): string[] {
  const current = getSavedCandidates(recruiterId)
  const next = current.includes(uid)
    ? current.filter((id) => id !== uid)
    : [...current, uid]
  writeList(SAVED_KEY(recruiterId), next)
  return next
}

/** Return all shortlisted candidate UIDs for this recruiter. */
export function getShortlistedCandidates(recruiterId: string): string[] {
  return readList(SHORTLIST_KEY(recruiterId))
}

/** Toggle shortlist state. Returns updated list. */
export function toggleShortlistedCandidate(recruiterId: string, uid: string): string[] {
  const current = getShortlistedCandidates(recruiterId)
  const next = current.includes(uid)
    ? current.filter((id) => id !== uid)
    : [...current, uid]
  writeList(SHORTLIST_KEY(recruiterId), next)
  return next
}

/** Remove a candidate from both saved and shortlist. */
export function removeCandidate(recruiterId: string, uid: string): void {
  writeList(SAVED_KEY(recruiterId), getSavedCandidates(recruiterId).filter((id) => id !== uid))
  writeList(SHORTLIST_KEY(recruiterId), getShortlistedCandidates(recruiterId).filter((id) => id !== uid))
}
