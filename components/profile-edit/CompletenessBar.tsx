// components/profile-edit/CompletenessBar.tsx
// Rich profile strength widget — shown at top of Edit Profile page.
// Driven by the pure scoring engine in lib/portfolio/profileScore.ts.
// Updates in real-time as the user fills in fields.

'use client'

import { useState } from 'react'
import type { PortfolioUser } from '@/lib/types'
import { calculateProfileScore, TIERS } from '@/lib/portfolio/profileScore'
import clsx from 'clsx'

interface Props {
  data: Partial<PortfolioUser>
}

export function CompletenessBar({ data }: Props) {
  const result = calculateProfileScore(data)
  const [showAll, setShowAll] = useState(false)

  const { score, tier, tierColor, barColor, items, missing, suggestions } = result

  // Group all items by category for the breakdown table
  const categories = Array.from(new Set(items.map((i) => i.category)))

  const tierConfig = TIERS.find((t) => t.label === tier) ?? TIERS[0]

  return (
    <div className="bg-khoj-card border border-khoj-border rounded-sm overflow-hidden">
      {/* ── Header row ── */}
      <div className="px-5 py-4 flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-3">
          <span className={clsx('text-xl leading-none', tierColor)}>{tierConfig.icon}</span>
          <div>
            <p className="text-xs font-display font-bold text-khoj-text">Profile Strength</p>
            <p className={clsx('text-[10px] font-body font-semibold uppercase tracking-widest mt-0.5', tierColor)}>
              {tier}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {/* Tier progress dots */}
          <div className="hidden sm:flex items-center gap-1">
            {TIERS.map((t) => (
              <div
                key={t.label}
                title={`${t.label} (${t.minScore}+)`}
                className={clsx(
                  'h-1.5 rounded-full transition-all duration-500',
                  score >= t.minScore ? t.barColor : 'bg-khoj-muted/20',
                  score >= t.minScore ? 'w-6' : 'w-3'
                )}
              />
            ))}
          </div>

          <span className={clsx('text-2xl font-display font-bold tabular-nums', tierColor)}>
            {score}
            <span className="text-sm text-khoj-subtle font-body">/100</span>
          </span>
        </div>
      </div>

      {/* ── Progress bar ── */}
      <div className="px-5 pb-4">
        <div className="h-2.5 bg-khoj-muted/15 rounded-full overflow-hidden">
          <div
            className={clsx('h-full rounded-full transition-all duration-700', barColor)}
            style={{ width: `${score}%` }}
          />
        </div>

        {/* Tier markers */}
        <div className="relative h-3 mt-1">
          {TIERS.slice(1).map((t) => (
            <div
              key={t.label}
              className="absolute flex flex-col items-center"
              style={{ left: `${t.minScore}%`, transform: 'translateX(-50%)' }}
            >
              <div className={clsx('w-px h-2', score >= t.minScore ? t.barColor : 'bg-khoj-border')} />
            </div>
          ))}
        </div>

        {/* Next tier nudge */}
        {tier !== 'Elite Profile' && (() => {
          const nextTier = TIERS[TIERS.findIndex((t) => t.label === tier) + 1]
          const needed = nextTier.minScore - score
          return needed > 0 ? (
            <p className="text-[10px] text-khoj-subtle font-body mt-1">
              <span className={clsx('font-semibold', nextTier.textColor)}>{needed} more pts</span>
              {' '}to reach <span className={clsx('font-semibold', nextTier.textColor)}>{nextTier.label}</span>
            </p>
          ) : null
        })()}
      </div>

      {/* ── Suggestions: Complete these next ── */}
      {suggestions.length > 0 && (
        <div className="px-5 pb-4 border-t border-khoj-border/50 pt-4">
          <p className="text-[10px] uppercase tracking-widest text-khoj-subtle font-body mb-3">
            Complete these next
          </p>
          <div className="space-y-2">
            {suggestions.map((s) => (
              <div key={s.label} className="flex items-center gap-3 group">
                <span className="w-5 h-5 rounded-sm border border-khoj-border bg-khoj-bg flex-shrink-0 flex items-center justify-center text-[10px] text-khoj-muted">
                  +{s.maxPoints}
                </span>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-body text-khoj-text truncate">{s.label}</p>
                  <p className="text-[10px] font-body text-khoj-muted">{s.hint}</p>
                </div>
                <span className="text-[10px] font-body text-khoj-accent opacity-0 group-hover:opacity-100 transition-opacity">
                  +{s.maxPoints} pts →
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Category breakdown (collapsible) ── */}
      <div className="border-t border-khoj-border/50">
        <button
          type="button"
          onClick={() => setShowAll((v) => !v)}
          className="w-full px-5 py-3 flex items-center justify-between text-[10px] uppercase tracking-widest text-khoj-subtle font-body hover:text-khoj-text transition-colors"
        >
          <span>Category breakdown</span>
          <span className={clsx('transition-transform duration-200', showAll ? 'rotate-180' : '')}>▾</span>
        </button>

        {showAll && (
          <div className="px-5 pb-4 grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-3">
            {categories.map((cat) => {
              const catItems = items.filter((i) => i.category === cat)
              const catEarned = catItems.reduce((s, i) => s + i.earned, 0)
              const catMax = catItems.reduce((s, i) => s + i.maxPoints, 0)
              const catPct = Math.round((catEarned / catMax) * 100)
              const allDone = catItems.every((i) => i.complete)

              return (
                <div key={cat}>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-[10px] font-body text-khoj-text">{cat}</span>
                    <span className={clsx('text-[10px] font-body font-semibold', allDone ? 'text-khoj-teal' : 'text-khoj-subtle')}>
                      {catEarned}/{catMax} pts
                    </span>
                  </div>
                  <div className="h-1 bg-khoj-muted/15 rounded-full overflow-hidden">
                    <div
                      className={clsx('h-full rounded-full transition-all duration-500', allDone ? 'bg-khoj-teal' : 'bg-khoj-accent/60')}
                      style={{ width: `${catPct}%` }}
                    />
                  </div>
                  {/* Item pills */}
                  <div className="flex flex-wrap gap-1 mt-1.5">
                    {catItems.map((item) => (
                      <span
                        key={item.label}
                        title={item.hint}
                        className={clsx(
                          'text-[9px] px-1.5 py-0.5 rounded-sm border font-body transition-colors',
                          item.complete
                            ? 'bg-khoj-teal/10 border-khoj-teal/30 text-khoj-teal'
                            : 'bg-khoj-muted/10 border-khoj-border/50 text-khoj-muted'
                        )}
                      >
                        {item.complete ? '✓ ' : ''}{item.label}
                      </span>
                    ))}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
