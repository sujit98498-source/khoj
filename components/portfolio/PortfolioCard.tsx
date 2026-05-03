import { KhojUser, MatchHistoryEntry } from '@/lib/types'
import { Card, StatCard } from '@/components/ui/Card'
import { XPBar, getLevel } from '@/components/ui/XPBar'
import { Badge } from '@/components/ui/Badge'
import { format } from 'date-fns'
import clsx from 'clsx'

interface PortfolioCardProps {
  user: KhojUser
  matchHistory: MatchHistoryEntry[]
}

export function PortfolioCard({ user, matchHistory }: PortfolioCardProps) {
  const winRate = user.matchesPlayed > 0
    ? Math.round((user.wins / user.matchesPlayed) * 100)
    : 0
  const { name: levelName, level } = getLevel(user.xp)

  return (
    <div className="space-y-6">
      {/* Identity block */}
      <Card glow>
        <div className="flex items-center gap-5">
          <div className="w-16 h-16 rounded-sm bg-khoj-accent/20 border border-khoj-accent/40 flex items-center justify-center">
            <span className="text-3xl font-display font-bold text-khoj-accent">
              {user.name.charAt(0).toUpperCase()}
            </span>
          </div>
          <div className="flex-1">
            <h2 className="text-2xl font-display font-bold text-khoj-text">{user.name}</h2>
            <div className="flex items-center gap-2 mt-1">
              <Badge label={`Rank #${user.rank || '–'}`} variant="info" />
              <Badge label={`Level ${level} · ${levelName}`} variant="warning" />
            </div>
            <div className="mt-3">
              <XPBar xp={user.xp} />
            </div>
          </div>
        </div>
      </Card>

      {/* Stats grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatCard label="Total XP" value={user.xp.toLocaleString()} accent="orange" />
        <StatCard label="Wins" value={user.wins} accent="gold" />
        <StatCard label="Rooms" value={user.matchesPlayed} accent="teal" />
        <StatCard label="Win Rate" value={`${winRate}%`} accent="orange" />
      </div>

      {/* Skills */}
      {user.skills.length > 0 && (
        <Card>
          <p className="text-[10px] uppercase tracking-[0.15em] text-khoj-subtle font-body mb-3">Skills</p>
          <div className="flex flex-wrap gap-2">
            {user.skills.map((skill) => (
              <span
                key={skill}
                className="text-xs px-3 py-1 bg-khoj-teal/10 border border-khoj-teal/30 text-khoj-teal rounded-sm font-body font-medium"
              >
                {skill}
              </span>
            ))}
          </div>
        </Card>
      )}

      {/* Match history */}
      <Card>
        <p className="text-[10px] uppercase tracking-[0.15em] text-khoj-subtle font-body mb-4">
          Room History
        </p>
        {matchHistory.length === 0 ? (
          <p className="text-sm text-khoj-subtle font-body text-center py-8">
            No rooms joined yet. Join a tournament to get started!
          </p>
        ) : (
          <div className="space-y-2">
            {matchHistory.map((entry) => (
              <div
                key={entry.matchId}
                className="flex items-center justify-between px-4 py-3 bg-khoj-bg border border-khoj-border rounded-sm"
              >
                <div className="flex items-center gap-3">
                  <span
                    className={clsx(
                      'w-2 h-2 rounded-full flex-shrink-0',
                      entry.result === 'win' ? 'bg-khoj-teal' : entry.result === 'loss' ? 'bg-red-500' : 'bg-khoj-subtle'
                    )}
                  />
                  <div>
                    <p className="text-sm font-body font-medium text-khoj-text">
                      vs {entry.opponentName}
                    </p>
                    <p className="text-[10px] text-khoj-subtle font-body">{entry.tournamentTitle}</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className={clsx(
                    'text-sm font-body font-bold',
                    entry.result === 'win' ? 'text-khoj-teal' : entry.result === 'loss' ? 'text-red-400' : 'text-khoj-subtle'
                  )}>
                    {entry.result.toUpperCase()}
                  </p>
                  <p className="text-[10px] text-khoj-gold font-mono">+{entry.xpEarned} XP</p>
                  <p className="text-[9px] text-khoj-subtle font-body">
                    {format(new Date(entry.date), 'MMM d')}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  )
}
