// components/portfolio/MatchHistorySection.tsx
// Room/match history table with W/L/D indicators, opponent, tournament, XP, date.

import { Card } from '@/components/ui/Card'
import { MatchHistoryEntry } from '@/lib/types'
import { format } from 'date-fns'
import clsx from 'clsx'

interface MatchHistorySectionProps {
  matchHistory: MatchHistoryEntry[]
}

export function MatchHistorySection({ matchHistory }: MatchHistorySectionProps) {
  return (
    <Card>
      <p className="text-[10px] uppercase tracking-[0.15em] text-khoj-subtle font-body mb-4">
        Room History
      </p>

      {matchHistory.length === 0 ? (
        <p className="text-sm text-khoj-subtle font-body italic text-center py-4">
          No rooms played yet.
        </p>
      ) : (
        <div className="space-y-2">
          {matchHistory.map((entry) => (
            <div
              key={entry.matchId}
              className="flex items-center justify-between py-2.5 px-3 rounded-sm bg-khoj-muted/10 border border-khoj-border/40 hover:border-khoj-border transition-colors duration-150"
            >
              <div className="flex items-center gap-3">
                <span
                  className={clsx(
                    'text-[11px] font-display font-bold uppercase tracking-wider w-6 text-center',
                    entry.result === 'win' && 'text-khoj-teal',
                    entry.result === 'loss' && 'text-red-400',
                    entry.result === 'draw' && 'text-khoj-subtle'
                  )}
                >
                  {entry.result === 'win' ? 'W' : entry.result === 'loss' ? 'L' : 'D'}
                </span>
                <div>
                  <p className="text-xs font-body text-khoj-text">{entry.tournamentTitle}</p>
                  <p className="text-[10px] text-khoj-subtle font-body">vs {entry.opponentName}</p>
                </div>
              </div>
              <div className="text-right flex-shrink-0">
                <p
                  className={clsx(
                    'text-xs font-mono font-bold',
                    entry.xpEarned > 0 ? 'text-khoj-gold' : 'text-khoj-subtle'
                  )}
                >
                  {entry.xpEarned > 0 ? `+${entry.xpEarned} XP` : '–'}
                </p>
                <p className="text-[10px] text-khoj-subtle font-body">
                  {format(new Date(entry.date), 'MMM d, yyyy')}
                </p>
              </div>
            </div>
          ))}
        </div>
      )}
    </Card>
  )
}
