// lib/portfolio/profileScore.ts
// Pure scoring engine — no React, no UI.
// Import anywhere: edit page, talent search ranking, recruiter API, etc.
//
// ── SCORE BREAKDOWN (total = 100 pts) ────────────────────────────────────────
//
//  Identity      20 pts  photo(8) name(4) username(4) headline(4)
//  About         15 pts  bio≥50chars(8) location(4) field/category(3)
//  Skills        10 pts  3+skills(5) 6+skills(+5)
//  Contact        5 pts  contactEmail(2) availableForOpportunities(3)
//  Social Links  10 pts  1link(4) 3+links(+6)
//  Projects      15 pts  1project(7) 2+projects(+5) live/repoUrl on any(+3)
//  Competitions  10 pts  1comp(5) top3placement(+5)
//  Achievements   5 pts  1+achievement(5)
//  Experience     5 pts  1+experience(5)
//  Education      5 pts  1+education(5)
//
// ── HOW TO USE FOR SEARCH RANKING ────────────────────────────────────────────
//  calculateProfileScore(user).score  → numeric 0-100, add to Firestore doc
//  Index "portfolios" on `score` field DESC → recruiters get strongest first
//  In Talent Search: sort results by user.score instead of raw XP
//
// ── HOW TO USE FOR RECRUITER FILTER ──────────────────────────────────────────
//  Add a "Min profile strength" filter (Beginner/Rising/Strong/Ready/Elite)
//  Map tier → minScore threshold, then filter ALL_TALENT by score >= minScore

import type { PortfolioUser } from '@/lib/types'

// ── Types ─────────────────────────────────────────────────────────────────────

export type ProfileTier =
  | 'Beginner Profile'
  | 'Rising Talent'
  | 'Strong Portfolio'
  | 'Recruiter Ready'
  | 'Elite Profile'

export interface ScoreItem {
  /** Human-readable label shown in UI */
  label: string
  /** Short description of what earns these points */
  hint: string
  /** Points this item is worth when fully completed */
  maxPoints: number
  /** Points actually earned */
  earned: number
  /** True when earned === maxPoints */
  complete: boolean
  /** Category group for display */
  category: string
  /** Priority — lower = show earlier in "complete these next" list */
  priority: number
}

export interface ProfileScoreResult {
  /** Total score 0-100 */
  score: number
  /** Tier badge */
  tier: ProfileTier
  /** Tier accent colour class (Tailwind text-*) */
  tierColor: string
  /** Bar fill colour class (Tailwind bg-*) */
  barColor: string
  /** All scored items */
  items: ScoreItem[]
  /** Items not yet complete, sorted by priority then points */
  missing: ScoreItem[]
  /** Top 3 highest-impact missing items to show as suggestions */
  suggestions: ScoreItem[]
}

// ── Tier config ───────────────────────────────────────────────────────────────

interface TierConfig {
  label: ProfileTier
  minScore: number
  textColor: string
  barColor: string
  icon: string
}

export const TIERS: TierConfig[] = [
  { label: 'Beginner Profile',   minScore: 0,  textColor: 'text-khoj-subtle',  barColor: 'bg-khoj-subtle',  icon: '○' },
  { label: 'Rising Talent',      minScore: 25, textColor: 'text-khoj-accent',  barColor: 'bg-khoj-accent',  icon: '◈' },
  { label: 'Strong Portfolio',   minScore: 50, textColor: 'text-khoj-gold',    barColor: 'bg-khoj-gold',    icon: '◇' },
  { label: 'Recruiter Ready',    minScore: 75, textColor: 'text-khoj-teal',    barColor: 'bg-khoj-teal',    icon: '◉' },
  { label: 'Elite Profile',      minScore: 90, textColor: 'text-purple-400',   barColor: 'bg-purple-400',   icon: '⬡' },
]

function getTier(score: number): TierConfig {
  return [...TIERS].reverse().find((t) => score >= t.minScore) ?? TIERS[0]
}

// ── Scoring rules ─────────────────────────────────────────────────────────────

export function calculateProfileScore(d: Partial<PortfolioUser>): ProfileScoreResult {
  const items: ScoreItem[] = []

  function add(item: Omit<ScoreItem, 'complete'>) {
    items.push({ ...item, complete: item.earned >= item.maxPoints })
  }

  // ── Identity (20 pts) ──────────────────────────────────────────────────────
  add({
    category: 'Identity',
    label: 'Profile photo',
    hint: 'Upload a profile picture',
    maxPoints: 8,
    earned: d.avatarUrl ? 8 : 0,
    priority: 1,
  })
  add({
    category: 'Identity',
    label: 'Full name',
    hint: 'Add your real name',
    maxPoints: 4,
    earned: d.name?.trim() ? 4 : 0,
    priority: 2,
  })
  add({
    category: 'Identity',
    label: 'Username',
    hint: 'Set a unique @handle',
    maxPoints: 4,
    earned: d.username?.trim() ? 4 : 0,
    priority: 3,
  })
  add({
    category: 'Identity',
    label: 'Professional headline',
    hint: 'One-line summary of what you do',
    maxPoints: 4,
    earned: d.headline?.trim() ? 4 : 0,
    priority: 4,
  })

  // ── About (15 pts) ────────────────────────────────────────────────────────
  const bioLen = d.bio?.trim().length ?? 0
  add({
    category: 'About',
    label: 'Bio',
    hint: 'Write at least 50 characters about yourself',
    maxPoints: 8,
    earned: bioLen >= 50 ? 8 : bioLen >= 10 ? 4 : 0,
    priority: 5,
  })
  add({
    category: 'About',
    label: 'Location',
    hint: 'Add your city and country',
    maxPoints: 4,
    earned: d.location?.trim() ? 4 : 0,
    priority: 8,
  })
  add({
    category: 'About',
    label: 'Category / field',
    hint: 'Select your primary domain (Coding, Design, etc.)',
    maxPoints: 3,
    earned: d.field ? 3 : 0,
    priority: 6,
  })

  // ── Skills (10 pts) ───────────────────────────────────────────────────────
  const skillCount = d.skills?.length ?? 0
  add({
    category: 'Skills',
    label: 'Skills (3+)',
    hint: 'Add at least 3 skills to your profile',
    maxPoints: 5,
    earned: skillCount >= 3 ? 5 : skillCount > 0 ? 2 : 0,
    priority: 7,
  })
  add({
    category: 'Skills',
    label: 'Skills (6+)',
    hint: 'Add 6 or more skills for higher visibility',
    maxPoints: 5,
    earned: skillCount >= 6 ? 5 : 0,
    priority: 12,
  })

  // ── Contact (5 pts) ───────────────────────────────────────────────────────
  add({
    category: 'Contact',
    label: 'Open to opportunities',
    hint: 'Toggle availability to attract recruiters',
    maxPoints: 3,
    earned: d.availableForOpportunities ? 3 : 0,
    priority: 9,
  })
  add({
    category: 'Contact',
    label: 'Contact email',
    hint: 'Add a public contact email',
    maxPoints: 2,
    earned: d.contactEmail?.trim() ? 2 : 0,
    priority: 13,
  })

  // ── Social Links (10 pts) ─────────────────────────────────────────────────
  const socialCount = Object.values(d.socialLinks ?? {}).filter(Boolean).length
  add({
    category: 'Social Links',
    label: 'At least one social link',
    hint: 'Connect GitHub, LinkedIn, Twitter, or your website',
    maxPoints: 4,
    earned: socialCount >= 1 ? 4 : 0,
    priority: 10,
  })
  add({
    category: 'Social Links',
    label: '3+ social links',
    hint: 'Add more links for credibility',
    maxPoints: 6,
    earned: socialCount >= 3 ? 6 : 0,
    priority: 16,
  })

  // ── Projects (15 pts) ─────────────────────────────────────────────────────
  const projects = d.projects ?? []
  const hasProjectUrl = projects.some((p) => p.liveUrl || p.repoUrl)
  add({
    category: 'Projects',
    label: 'First project',
    hint: 'Add at least one project to your portfolio',
    maxPoints: 7,
    earned: projects.length >= 1 ? 7 : 0,
    priority: 11,
  })
  add({
    category: 'Projects',
    label: '2+ projects',
    hint: 'Showcase more of your work',
    maxPoints: 5,
    earned: projects.length >= 2 ? 5 : 0,
    priority: 15,
  })
  add({
    category: 'Projects',
    label: 'Project URL (live or repo)',
    hint: 'Link at least one project to a live demo or repo',
    maxPoints: 3,
    earned: hasProjectUrl ? 3 : 0,
    priority: 14,
  })

  // ── Competitions (10 pts) ─────────────────────────────────────────────────
  const comps = d.competitions ?? []
  const hasTop3 = comps.some((c) => ['1st', '2nd', '3rd'].includes(c.placement))
  add({
    category: 'Competitions',
    label: 'Joined a competition',
    hint: 'Compete in a KHOJ tournament',
    maxPoints: 5,
    earned: comps.length >= 1 ? 5 : 0,
    priority: 17,
  })
  add({
    category: 'Competitions',
    label: 'Top 3 placement',
    hint: 'Earn a 1st, 2nd, or 3rd place finish',
    maxPoints: 5,
    earned: hasTop3 ? 5 : 0,
    priority: 18,
  })

  // ── Achievements (5 pts) ──────────────────────────────────────────────────
  add({
    category: 'Achievements',
    label: 'Achievement',
    hint: 'Earn or add a portfolio achievement',
    maxPoints: 5,
    earned: (d.achievements?.length ?? 0) >= 1 ? 5 : 0,
    priority: 19,
  })

  // ── Experience (5 pts) ────────────────────────────────────────────────────
  add({
    category: 'Experience',
    label: 'Work experience',
    hint: 'Add a past or current work role',
    maxPoints: 5,
    earned: (d.experience?.length ?? 0) >= 1 ? 5 : 0,
    priority: 20,
  })

  // ── Education (5 pts) ────────────────────────────────────────────────────
  add({
    category: 'Education',
    label: 'Education',
    hint: 'Add your academic background',
    maxPoints: 5,
    earned: (d.education?.length ?? 0) >= 1 ? 5 : 0,
    priority: 21,
  })

  // ── Totals ─────────────────────────────────────────────────────────────────
  const totalEarned = items.reduce((sum, i) => sum + i.earned, 0)
  const totalMax = items.reduce((sum, i) => sum + i.maxPoints, 0)
  const score = Math.round((totalEarned / totalMax) * 100)

  const tier = getTier(score)

  const missing = items
    .filter((i) => !i.complete)
    .sort((a, b) => a.priority - b.priority || b.maxPoints - a.maxPoints)

  return {
    score,
    tier: tier.label,
    tierColor: tier.textColor,
    barColor: tier.barColor,
    items,
    missing,
    // Top 3 suggestions = highest-priority incomplete items
    suggestions: missing.slice(0, 3),
  }
}

/** Minimum score for each tier — useful for filter thresholds */
export const TIER_THRESHOLDS: Record<ProfileTier, number> = {
  'Beginner Profile':  0,
  'Rising Talent':     25,
  'Strong Portfolio':  50,
  'Recruiter Ready':   75,
  'Elite Profile':     90,
}
