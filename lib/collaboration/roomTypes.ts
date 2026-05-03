// lib/collaboration/roomTypes.ts
// UI constants, labels, color helpers, analytics stubs, and feature flag re-export.

export { STARTUP_ROOMS_V1 } from '@/types/collaboration'
import type { RoomRole, MemberPermissions, StartupStage, RoleType } from '@/types/collaboration'

// ── Stage ─────────────────────────────────────────────────────────────────────
export const STAGE_OPTIONS: Array<{ value: StartupStage; label: string; desc: string }> = [
  { value: 'idea',     label: '💡 Idea',      desc: 'Still exploring the problem space' },
  { value: 'mvp',      label: '🔧 MVP',       desc: 'Building or testing an initial version' },
  { value: 'traction', label: '📈 Traction',  desc: 'Have early users or validation' },
  { value: 'growth',   label: '🚀 Growth',    desc: 'Scaling the product and team' },
]

export const stageColor = (stage: string): string => {
  switch (stage) {
    case 'idea':     return 'text-zinc-300 border-zinc-600 bg-zinc-800/40'
    case 'mvp':      return 'text-blue-300 border-blue-700 bg-blue-900/30'
    case 'traction': return 'text-green-300 border-green-700 bg-green-900/30'
    case 'growth':   return 'text-khoj-accent border-khoj-accent/50 bg-khoj-accent/10'
    default:         return 'text-zinc-300 border-zinc-600 bg-zinc-800/40'
  }
}

// ── Commitment ────────────────────────────────────────────────────────────────
export const COMMITMENT_LABELS: Record<string, string> = {
  part_time: 'Part-time',
  full_time: 'Full-time',
  flexible: 'Flexible',
}

// ── Location ──────────────────────────────────────────────────────────────────
export const LOCATION_LABELS: Record<string, string> = {
  remote:  '🌐 Remote',
  hybrid:  '⚡ Hybrid',
  onsite:  '📍 On-site',
}

// ── Looking for ───────────────────────────────────────────────────────────────
export const LOOKING_FOR_LABELS: Record<string, string> = {
  cofounder:    'Co-founder',
  contributors: 'Contributors',
  both:         'Co-founder + Contributors',
}

// ── Role type ─────────────────────────────────────────────────────────────────
export const ROLE_TYPE_LABELS: Record<RoleType | string, string> = {
  cofounder:   'Co-founder',
  contributor: 'Contributor',
  advisor:     'Advisor',
}

export const roleTypeBadge = (roleType: string) => {
  switch (roleType) {
    case 'cofounder':   return 'bg-khoj-accent/10 text-khoj-accent border-khoj-accent/30'
    case 'contributor': return 'bg-blue-500/10 text-blue-400 border-blue-500/30'
    case 'advisor':     return 'bg-khoj-gold/10 text-khoj-gold border-khoj-gold/30'
    default:            return 'bg-khoj-muted/40 text-khoj-subtle border-khoj-border'
  }
}

// ── Room role ─────────────────────────────────────────────────────────────────
export const ROOM_ROLE_LABELS: Record<RoomRole | string, string> = {
  owner:      '👑 Owner',
  cofounder:  '🤝 Co-founder',
  member:     '👤 Member',
  advisor:    '🧭 Advisor',
}

// ── Permissions ───────────────────────────────────────────────────────────────
export const OWNER_PERMISSIONS: MemberPermissions = {
  manageMembers:  true,
  manageRoles:    true,
  manageAssets:   true,
  manageSessions: true,
}

export const MEMBER_PERMISSIONS: MemberPermissions = {
  manageMembers:  false,
  manageRoles:    false,
  manageAssets:   false,
  manageSessions: false,
}

export function permissionsForRole(role: RoomRole): MemberPermissions {
  if (role === 'owner' || role === 'cofounder') return OWNER_PERMISSIONS
  return MEMBER_PERMISSIONS
}

// ── Industry tags (discovery filter) ──────────────────────────────────────────
export const INDUSTRY_TAGS = [
  'AI/ML', 'Web3', 'FinTech', 'EdTech', 'HealthTech', 'SaaS',
  'Consumer', 'B2B', 'Gaming', 'Social', 'Climate', 'DevTools',
  'E-commerce', 'Media', 'Infrastructure',
]

// ── Role categories ───────────────────────────────────────────────────────────
export const ROLE_CATEGORIES = [
  'Engineering', 'Design', 'Product', 'Marketing', 'Sales',
  'Operations', 'Finance', 'Legal', 'Data', 'Research', 'Other',
]

// ── Work-style tags ───────────────────────────────────────────────────────────
export const WORK_STYLE_TAGS = [
  'Async-first', 'Deep work', 'Fast iteration', 'Data-driven',
  'Design-led', 'Community-led', 'Revenue-first', 'Research-heavy',
]

// ── Allowed MIME types for room asset uploads ─────────────────────────────────
export const ALLOWED_ASSET_MIME_TYPES = [
  'application/pdf',
  'image/png',
  'image/jpeg',
  'text/plain',
]
export const ASSET_MAX_BYTES = 20 * 1024 * 1024  // 20 MB

// ── Analytics ────────────────────────────────────────────────────────────────
// Lightweight stub — replace with your analytics SDK calls as needed.
const ANALYTICS_EVENTS = [
  'startup_room_create', 'startup_room_view',
  'startup_role_create', 'startup_join_request_submit',
  'startup_join_request_review', 'startup_invite_send',
  'startup_invite_respond', 'startup_match_view',
  'startup_match_click', 'startup_asset_upload',
  'startup_session_start', 'startup_session_join',
] as const

export type AnalyticsEvent = typeof ANALYTICS_EVENTS[number]

export function logCollabEvent(
  event: AnalyticsEvent,
  params?: Record<string, string | number | boolean | undefined>,
) {
  if (process.env.NODE_ENV === 'development') {
    console.log('[collab-analytics]', event, params ?? {})
  }
}

// ── Slug helper ───────────────────────────────────────────────────────────────
export function slugify(value: string): string {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

// ── Timestamp formatting ──────────────────────────────────────────────────────
export function timeAgo(ts: unknown): string {
  try {
    let ms: number
    if (typeof ts === 'string') {
      ms = new Date(ts).getTime()
    } else if (ts && typeof ts === 'object' && 'seconds' in (ts as object)) {
      ms = (ts as { seconds: number }).seconds * 1000
    } else {
      return ''
    }
    const diff = Date.now() - ms
    if (diff < 60_000)   return 'just now'
    if (diff < 3_600_000) return `${Math.floor(diff / 60_000)}m ago`
    if (diff < 86_400_000) return `${Math.floor(diff / 3_600_000)}h ago`
    return `${Math.floor(diff / 86_400_000)}d ago`
  } catch {
    return ''
  }
}
