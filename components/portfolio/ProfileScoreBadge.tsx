// components/portfolio/ProfileScoreBadge.tsx
// Compact profile strength badge for the public profile page.
// Shows tier icon, tier label, score bar, and score number.

'use client'

import type { PortfolioUser } from '@/lib/types'
import { calculateProfileScore, TIERS } from '@/lib/portfolio/profileScore'
import clsx from 'clsx'

interface Props {
  user: Partial<PortfolioUser>
  /** Show full bar + category breakdown; false = compact inline badge */
  expanded?: boolean
}

export function ProfileScoreBadge({ user, expanded = false }: Props) {
  const { score, tier, tierColor, barColor } = calculateProfileScore(user)
  const tierConfig = TIERS.find((t) => t.label === tier) ?? TIERS[0]

  if (!expanded) {
    // ── Inline badge (default) — used in profile header / talent card ──
    return (
      <div
        className="inline-flex items-center gap-2 bg-khoj-card border border-khoj-border rounded-sm px-3 py-1.5"
        title={`Profile Strength: ${score}/100 — ${tier}`}
      >
        <span className={clsx('text-base leading-none', tierColor)}>{tierConfig.icon}</span>
        <div className="flex flex-col gap-0.5 min-w-[80px]">
          <div className="flex items-center justify-between">
            <span className={clsx('text-[9px] font-body font-semibold uppercase tracking-widest', tierColor)}>
              {tier}
            </span>
            <span className={clsx('text-[9px] font-display font-bold tabular-nums', tierColor)}>
              {score}
            </span>
          </div>
          <div className="h-1 bg-khoj-muted/20 rounded-full overflow-hidden w-full">
            <div
              className={clsx('h-full rounded-full transition-all duration-700', barColor)}
              style={{ width: `${score}%` }}
            />
          </div>
        </div>
      </div>
    )
  }

  // ── Expanded card — used below ProfileHeader ──
  return (
    <div className="bg-khoj-card border border-khoj-border rounded-sm px-5 py-4">
      <div className="flex items-center justify-between gap-4 mb-3">
        <div className="flex items-center gap-2">
          <span className={clsx('text-xl leading-none', tierColor)}>{tierConfig.icon}</span>
          <div>
            <p className="text-xs font-display font-bold text-khoj-text">Profile Strength</p>
            <p className={clsx('text-[10px] font-body font-semibold uppercase tracking-widest', tierColor)}>
              {tier}
            </p>
          </div>
        </div>

        {/* Tier dots */}
        <div className="flex items-center gap-1">
          {TIERS.map((t) => (
            <div
              key={t.label}
              title={t.label}
              className={clsx(
                'h-1.5 rounded-full transition-all duration-500',
                score >= t.minScore ? t.barColor : 'bg-khoj-muted/20',
                score >= t.minScore ? 'w-5' : 'w-2.5'
              )}
            />
          ))}
          <span className={clsx('ml-2 text-base font-display font-bold tabular-nums', tierColor)}>
            {score}<span className="text-xs text-khoj-subtle font-body">/100</span>
          </span>
        </div>
      </div>

      {/* Bar */}
      <div className="h-2 bg-khoj-muted/15 rounded-full overflow-hidden">
        <div
          className={clsx('h-full rounded-full transition-all duration-700', barColor)}
          style={{ width: `${score}%` }}
        />
      </div>

      {/* Tier labels */}
      <div className="flex justify-between mt-1.5">
        {TIERS.map((t) => (
          <span
            key={t.label}
            className={clsx(
              'text-[8px] font-body hidden sm:block',
              score >= t.minScore ? t.textColor : 'text-khoj-muted/40'
            )}
          >
            {t.minScore}
          </span>
        ))}
      </div>
    </div>
  )
}
