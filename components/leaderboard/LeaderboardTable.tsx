import { KhojUser } from '@/lib/types'
import { getLevel } from '@/components/ui/XPBar'
import clsx from 'clsx'

interface LeaderboardTableProps {
  users: KhojUser[]
  currentUserId?: string
}

const RANK_STYLES: Record<number, { bg: string; text: string; label: string }> = {
  1: { bg: 'bg-khoj-gold/10 border-khoj-gold/30', text: 'text-khoj-gold', label: '🥇' },
  2: { bg: 'bg-khoj-subtle/10 border-khoj-subtle/20', text: 'text-khoj-subtle', label: '🥈' },
  3: { bg: 'bg-orange-900/10 border-orange-800/20', text: 'text-orange-400', label: '🥉' },
}

export function LeaderboardTable({ users, currentUserId }: LeaderboardTableProps) {
  return (
    <div className="space-y-2">
      {/* Header */}
      <div className="grid grid-cols-12 gap-4 px-5 pb-2">
        <div className="col-span-1">
          <span className="text-[9px] uppercase tracking-wider text-khoj-subtle font-body">#</span>
        </div>
        <div className="col-span-5">
          <span className="text-[9px] uppercase tracking-wider text-khoj-subtle font-body">Player</span>
        </div>
        <div className="col-span-2 text-center">
          <span className="text-[9px] uppercase tracking-wider text-khoj-subtle font-body">XP</span>
        </div>
        <div className="col-span-2 text-center">
          <span className="text-[9px] uppercase tracking-wider text-khoj-subtle font-body">Wins</span>
        </div>
        <div className="col-span-2 text-center">
          <span className="text-[9px] uppercase tracking-wider text-khoj-subtle font-body">Level</span>
        </div>
      </div>

      {users.map((user, index) => {
        const rank = index + 1
        const rankStyle = RANK_STYLES[rank]
        const isMe = user.uid === currentUserId
        const { name: levelName } = getLevel(user.xp)

        return (
          <div
            key={user.uid}
            className={clsx(
              'grid grid-cols-12 gap-4 items-center px-5 py-4 border rounded-sm transition-all duration-150',
              rankStyle
                ? `${rankStyle.bg}`
                : 'bg-khoj-card border-khoj-border',
              isMe && !rankStyle && 'border-khoj-accent/30 bg-khoj-accent/5'
            )}
          >
            {/* Rank */}
            <div className="col-span-1">
              {rankStyle ? (
                <span className="text-lg">{rankStyle.label}</span>
              ) : (
                <span className="text-sm font-mono text-khoj-subtle">{rank}</span>
              )}
            </div>

            {/* Name + badge */}
            <div className="col-span-5 flex items-center gap-3">
              <div className={clsx(
                'w-8 h-8 rounded-sm flex items-center justify-center text-xs font-display font-bold flex-shrink-0',
                isMe ? 'bg-khoj-accent/20 text-khoj-accent border border-khoj-accent/30' : 'bg-khoj-muted/30 text-khoj-subtle border border-khoj-border'
              )}>
                {user.name.charAt(0).toUpperCase()}
              </div>
              <div className="min-w-0">
                <p className={clsx(
                  'text-sm font-body font-semibold truncate',
                  isMe ? 'text-khoj-accent' : rankStyle ? rankStyle.text : 'text-khoj-text'
                )}>
                  {user.name} {isMe && '(you)'}
                </p>
                <p className="text-[10px] text-khoj-subtle font-body">
                  {user.matchesPlayed} rooms
                </p>
              </div>
            </div>

            {/* XP */}
            <div className="col-span-2 text-center">
              <span className={clsx(
                'text-sm font-mono font-bold',
                rankStyle ? rankStyle.text : 'text-khoj-text'
              )}>
                {user.xp.toLocaleString()}
              </span>
            </div>

            {/* Wins */}
            <div className="col-span-2 text-center">
              <span className="text-sm font-mono text-khoj-teal">{user.wins}</span>
            </div>

            {/* Level */}
            <div className="col-span-2 text-center">
              <span className="text-[10px] font-body text-khoj-subtle">{levelName}</span>
            </div>
          </div>
        )
      })}
    </div>
  )
}
