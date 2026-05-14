// apps/mobile/lib/theme.ts
// KHOJ Gaming dark theme — single source of truth for all mobile UI colours,
// spacing, typography and border-radius values.

export const colors = {
  // ── Backgrounds ────────────────────────────────────────────────────────────
  bg:           '#0A0A0F',   // deepest background
  card:         '#12121A',   // card / panel surface
  surface:      '#1A1A2E',   // raised surface (inputs, modals)
  surfaceHigh:  '#22223A',   // even more raised (dropdowns, tooltips)

  // ── Borders ─────────────────────────────────────────────────────────────────
  border:       '#1E1E2E',
  borderLight:  '#2A2A40',

  // ── Accent colours ──────────────────────────────────────────────────────────
  purple:       '#7C3AED',   // primary accent
  purpleLight:  '#A855F7',
  purpleDim:    '#7C3AED33', // 20 % alpha
  cyan:         '#06B6D4',
  cyanDim:      '#06B6D433',
  gold:         '#F59E0B',
  goldDim:      '#F59E0B33',
  green:        '#10B981',
  greenDim:     '#10B98133',
  red:          '#EF4444',
  redDim:       '#EF444433',
  orange:       '#F97316',

  // ── Text ────────────────────────────────────────────────────────────────────
  text:         '#FFFFFF',
  textSecondary:'#94A3B8',
  textMuted:    '#64748B',

  // ── Overlays ────────────────────────────────────────────────────────────────
  overlay:      'rgba(0,0,0,0.75)',
  overlayLight: 'rgba(0,0,0,0.40)',
} as const

export const spacing = {
  xs:  4,
  sm:  8,
  md:  12,
  lg:  16,
  xl:  20,
  xxl: 24,
  xxxl:32,
} as const

export const radius = {
  sm:   6,
  md:   10,
  lg:   14,
  xl:   20,
  full: 9999,
} as const

export const fontSize = {
  xs:   11,
  sm:   12,
  base: 14,
  md:   16,
  lg:   18,
  xl:   20,
  xxl:  24,
  xxxl: 28,
} as const

export const fontWeight = {
  regular: '400' as const,
  medium:  '500' as const,
  semibold:'600' as const,
  bold:    '700' as const,
  black:   '900' as const,
}

/** Quick helper — translates XP to a tier label and colour */
export const XP_TIERS = [
  { min: 0,     label: 'Bronze',      color: '#CD7F32' },
  { min: 500,   label: 'Silver',      color: '#C0C0C0' },
  { min: 1500,  label: 'Gold',        color: '#FFD700' },
  { min: 3000,  label: 'Platinum',    color: '#E5E4E2' },
  { min: 6000,  label: 'Diamond',     color: '#B9F2FF' },
  { min: 10000, label: 'Master',      color: '#9B59B6' },
  { min: 20000, label: 'Grandmaster', color: '#E74C3C' },
  { min: 40000, label: 'Champion',    color: '#F39C12' },
] as const

export function getXpTier(xp: number) {
  for (let i = XP_TIERS.length - 1; i >= 0; i--) {
    if (xp >= XP_TIERS[i].min) return XP_TIERS[i]
  }
  return XP_TIERS[0]
}
