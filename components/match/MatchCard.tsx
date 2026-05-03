import { Match } from '@/lib/types'
import { Card } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { format } from 'date-fns'
import clsx from 'clsx'

interface MatchCardProps {
  match: Match
  currentUserId: string
  onSelect?: (match: Match) => void
}

const STATUS_MAP = {
  pending: { label: 'Pending', variant: 'warning' as const },
  room_created: { label: 'Room Ready', variant: 'info' as const },
  active: { label: 'Live', variant: 'success' as const },
  under_review: { label: 'Review', variant: 'warning' as const },
  completed: { label: 'Done', variant: 'default' as const },
}

export function MatchCard({ match, currentUserId, onSelect }: MatchCardProps) {
  const isPlayer1 = match.player1Id === currentUserId
  const myScore = isPlayer1 ? match.player1Score : match.player2Score
  const theirScore = isPlayer1 ? match.player2Score : match.player1Score
  const opponentName = isPlayer1 ? match.player2Name : match.player1Name
  const didWin = match.winnerId === currentUserId
  const isCompleted = match.status === 'completed'

  return (
    <Card
      hover
      className={clsx(
        'cursor-pointer',
        isCompleted && didWin && 'border-khoj-gold/20',
        isCompleted && !didWin && match.winnerId && 'border-red-500/10'
      )}
      onClick={() => onSelect?.(match)}
    >
      <div className="flex items-center justify-between gap-4">
        {/* Match info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <Badge label={STATUS_MAP[match.status].label} variant={STATUS_MAP[match.status].variant} />
            {isCompleted && (
              <Badge
                label={match.winnerId === null ? 'Draw' : didWin ? 'Won' : 'Lost'}
                variant={match.winnerId === null ? 'default' : didWin ? 'success' : 'danger'}
              />
            )}
          </div>
          <p className="text-sm font-body font-semibold text-khoj-text truncate">
            vs {opponentName}
          </p>
          <p className="text-[10px] text-khoj-subtle font-body mt-0.5">
            {format(new Date(match.createdAt), 'MMM d, yyyy · h:mm a')}
          </p>
        </div>

        {/* Score */}
        {isCompleted && (
          <div className="text-right flex-shrink-0">
            <p
              className={clsx(
                'text-2xl font-display font-bold',
                didWin ? 'text-khoj-gold' : match.winnerId ? 'text-red-400' : 'text-khoj-subtle'
              )}
            >
              {myScore} – {theirScore}
            </p>
          </div>
        )}

        {!isCompleted && (
          <div className="text-right flex-shrink-0">
            <p className="text-xs text-khoj-subtle font-body">Tap to submit</p>
          </div>
        )}
      </div>
    </Card>
  )
}
