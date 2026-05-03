'use client'

import { KhojUser } from '@/lib/types'
import { Card } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { getLevel } from '@/components/ui/XPBar'

interface UserProfileCardProps {
  user: KhojUser
  showEmail?: boolean
}

export function UserProfileCard({ user, showEmail = true }: UserProfileCardProps) {
  const { level, name: levelName } = getLevel(user.xp)

  return (
    <Card glow className="text-center">
      {/* Avatar */}
      <div className="w-16 h-16 bg-khoj-accent rounded-full flex items-center justify-center text-white text-3xl font-bold mx-auto mb-4">
        {user.name.charAt(0).toUpperCase()}
      </div>

      {/* Name & Email */}
      <h2 className="font-display font-bold text-lg mb-1">{user.name}</h2>
      {showEmail && <p className="text-xs text-khoj-subtle mb-4">{user.email}</p>}

      {/* Level & Rank */}
      <div className="flex items-center justify-center gap-3 mb-4">
        <Badge label={`Level ${level}`} variant="info" />
        <Badge label={levelName} variant="success" />
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-2 text-xs">
        <div>
          <p className="text-khoj-subtle mb-1">XP</p>
          <p className="font-display font-bold text-khoj-accent">{user.xp.toLocaleString()}</p>
        </div>
        <div>
          <p className="text-khoj-subtle mb-1">Rank</p>
          <p className="font-display font-bold text-khoj-accent">#{user.rank}</p>
        </div>
        <div>
          <p className="text-khoj-subtle mb-1">Wins</p>
          <p className="font-display font-bold text-khoj-accent">{user.wins}</p>
        </div>
      </div>

      {/* Skills */}
      {user.skills.length > 0 && (
        <div className="mt-4 pt-4 border-t border-khoj-border">
          <p className="text-xs text-khoj-subtle mb-2 uppercase tracking-wide">Skills</p>
          <div className="flex flex-wrap gap-1 justify-center">
            {user.skills.slice(0, 5).map((skill) => (
              <Badge key={skill} label={skill} size="sm" variant="default" />
            ))}
            {user.skills.length > 5 && (
              <Badge label={`+${user.skills.length - 5}`} size="sm" variant="default" />
            )}
          </div>
        </div>
      )}
    </Card>
  )
}
