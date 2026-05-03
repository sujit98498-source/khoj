// lib/collaboration/matching.ts
// Client-side startup profile matching algorithm.
// Runs locally with profiles fetched from Firestore.
// Mirror this logic in functions/src/collaborationRooms/matching.ts for the cloud version.

import type { StartupProfile, CollabRoom, StartupRole, MatchResult } from '@/types/collaboration'

// ── Scoring weights ────────────────────────────────────────────────────────────
const W = {
  roleFit:        0.30,
  skillOverlap:   0.25,
  commitment:     0.15,
  location:       0.10,
  stageMatch:     0.10,
  proofSignals:   0.10,
}

// ── Helpers ───────────────────────────────────────────────────────────────────
function overlap(a: string[], b: string[]): number {
  if (!a.length || !b.length) return 0
  const setB = new Set(b.map((s) => s.toLowerCase()))
  const common = a.filter((s) => setB.has(s.toLowerCase())).length
  return common / Math.max(a.length, b.length)
}

function bool(val: boolean): number { return val ? 1 : 0 }

// ── Score a profile against a room and required role ─────────────────────────
export function scoreProfile(
  profile: StartupProfile,
  room: CollabRoom,
  targetRole: StartupRole | null,
): MatchResult['breakdown'] {
  const startup = room.startup

  // Role fit: does profile.roleCategories overlap with role.category?
  const roleFit = targetRole
    ? overlap(profile.roleCategories, [targetRole.category])
    : 0

  // Skill overlap: mustHaveSkills vs profile.skills
  const requiredSkills = targetRole?.mustHaveSkills ?? []
  const skillOverlap = requiredSkills.length
    ? overlap(profile.skills, requiredSkills)
    : overlap(profile.skills, []) // 0 if no skills specified

  // Commitment match
  const wantedCommitment = targetRole?.commitment ?? startup?.commitment
  const commitmentMatch = wantedCommitment
    ? bool(profile.availability === wantedCommitment || profile.availability === 'flexible' || wantedCommitment === 'flexible')
    : 0.5 // neutral

  // Location match
  const wantedLocation = targetRole?.locationMode ?? startup?.locationMode
  const locationMatch = wantedLocation
    ? bool(profile.locationMode === wantedLocation || wantedLocation === 'remote' || profile.locationMode === 'remote')
    : 0.5

  // Stage interest match
  const stageMatch = startup?.stage && profile.stageInterests?.length
    ? bool(profile.stageInterests.includes(startup.stage))
    : 0.3

  // Proof signals (normalised 0-1)
  const ps = profile.proofSignals ?? {}
  const proofScore = Math.min(1,
    ((ps.tracksCompleted ?? 0) * 0.1) +
    ((ps.arenaProjects ?? 0) * 0.15) +
    ((ps.totalXp ?? 0) / 5000) * 0.5 +
    ((ps.leaderboardPercentile ?? 0) / 100) * 0.25,
  )

  return {
    roleFit:         Math.round(roleFit         * 100) / 100,
    skillOverlap:    Math.round(skillOverlap    * 100) / 100,
    commitmentMatch: Math.round(commitmentMatch * 100) / 100,
    locationMatch:   Math.round(locationMatch   * 100) / 100,
    stageMatch:      Math.round(stageMatch      * 100) / 100,
    proofSignals:    Math.round(proofScore      * 100) / 100,
  }
}

export function computeScore(breakdown: MatchResult['breakdown']): number {
  return (
    breakdown.roleFit         * W.roleFit        +
    breakdown.skillOverlap    * W.skillOverlap   +
    breakdown.commitmentMatch * W.commitment     +
    breakdown.locationMatch   * W.location       +
    breakdown.stageMatch      * W.stageMatch     +
    breakdown.proofSignals    * W.proofSignals
  )
}

// ── Rank profiles ─────────────────────────────────────────────────────────────
export function rankProfiles(
  profiles: StartupProfile[],
  room: CollabRoom,
  targetRole: StartupRole | null,
  topN = 20,
): MatchResult[] {
  return profiles
    .filter((p) => p.visibility === 'public')
    .map((profile) => {
      const breakdown = scoreProfile(profile, room, targetRole)
      return { profile, score: computeScore(breakdown), breakdown }
    })
    .sort((a, b) => b.score - a.score)
    .slice(0, topN)
}
