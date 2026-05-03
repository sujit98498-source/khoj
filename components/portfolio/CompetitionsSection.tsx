// components/portfolio/CompetitionsSection.tsx
// List of competitions entered with placement badges, XP, and optional prize.

import { Card } from '@/components/ui/Card'
import { PortfolioCompetition, PlacementBadge } from '@/lib/types'
import { format } from 'date-fns'
import clsx from 'clsx'

const PLACEMENT_CONFIG: Record<
  PlacementBadge,
  { label: string; color: string; bg: string; border: string }
> = {
  '1st': {
    label: '1st Place',
    color: 'text-khoj-gold',
    bg: 'bg-khoj-gold/15',
    border: 'border-khoj-gold/40',
  },
  '2nd': {
    label: '2nd Place',
    color: 'text-slate-300',
    bg: 'bg-slate-400/10',
    border: 'border-slate-400/30',
  },
  '3rd': {
    label: '3rd Place',
    color: 'text-orange-400',
    bg: 'bg-orange-400/10',
    border: 'border-orange-400/30',
  },
  top10: {
    label: 'Top 10',
    color: 'text-khoj-teal',
    bg: 'bg-khoj-teal/10',
    border: 'border-khoj-teal/30',
  },
  finalist: {
    label: 'Finalist',
    color: 'text-blue-400',
    bg: 'bg-blue-400/10',
    border: 'border-blue-400/30',
  },
  participant: {
    label: 'Participant',
    color: 'text-khoj-subtle',
    bg: 'bg-khoj-muted/10',
    border: 'border-khoj-border/50',
  },
}

interface CompetitionsSectionProps {
  competitions: PortfolioCompetition[]
}

export function CompetitionsSection({ competitions }: CompetitionsSectionProps) {
  const sorted = [...competitions].sort(
    (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
  )

  return (
    <Card>
      <p className="text-[10px] uppercase tracking-[0.15em] text-khoj-subtle font-body mb-4">
        Competitions &amp; Tournaments
      </p>

      {sorted.length === 0 ? (
        <p className="text-sm text-khoj-subtle font-body italic text-center py-4">
          No tournaments entered yet.
        </p>
      ) : (
        <div className="space-y-3">
          {sorted.map((comp) => {
            const placement = PLACEMENT_CONFIG[comp.placement]
            return (
              <div
                key={comp.id}
                className="flex items-center justify-between gap-3 p-3 rounded-sm border border-khoj-border/50 bg-khoj-muted/5 hover:border-khoj-border transition-colors duration-150"
              >
                <div className="flex items-center gap-3 min-w-0">
                  {/* Placement badge */}
                  <span
                    className={clsx(
                      'flex-shrink-0 text-[10px] uppercase tracking-wider font-body font-bold px-2 py-1 border rounded-sm',
                      placement.color,
                      placement.bg,
                      placement.border
                    )}
                  >
                    {placement.label}
                  </span>

                  <div className="min-w-0">
                    <p className="text-sm font-body font-semibold text-khoj-text truncate">
                      {comp.tournamentTitle}
                    </p>
                    <p className="text-[10px] text-khoj-subtle font-body">
                      {comp.category} · {format(new Date(comp.date), 'MMM d, yyyy')}
                    </p>
                  </div>
                </div>

                <div className="flex-shrink-0 text-right">
                  <p className="text-xs font-mono font-bold text-khoj-gold">
                    +{comp.xpEarned} XP
                  </p>
                  {comp.prize && (
                    <p className="text-[10px] text-khoj-teal font-body font-semibold">
                      ₹{comp.prize.toLocaleString()}
                    </p>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </Card>
  )
}
