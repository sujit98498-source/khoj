// components/talent/TalentCard.tsx
// Premium talent card for the Talent Search grid.
// Clicking anywhere on the card navigates to /profile/[uid].

'use client'

import Link from 'next/link'
import { PortfolioUser } from '@/lib/types'
import { getLevel } from '@/components/ui/XPBar'
import clsx from 'clsx'

const AVATAR_COLORS = ['#FF4D00', '#FFB800', '#00D4AA', '#6366f1', '#ec4899', '#14b8a6']

function avatarColor(name: string) {
  return AVATAR_COLORS[name.charCodeAt(0) % AVATAR_COLORS.length]
}

const FIELD_ICONS: Record<string, string> = {
  Coding: '⟨/⟩',
  Design: '◉',
  Esports: '🎮',
  Startups: '⚡',
  Career: '▲',
  Default: '◈',
}

interface TalentCardProps {
  user: PortfolioUser
}

export function TalentCard({ user }: TalentCardProps) {
  const { level, name: levelName } = getLevel(user.xp)
  const color = avatarColor(user.name)
  const fieldIcon = FIELD_ICONS[user.field ?? ''] ?? FIELD_ICONS.Default
  const topSkills = user.skills.slice(0, 4)
  const topAchievement = user.achievements[0]

  return (
    <Link
      href={`/profile/${user.uid}`}
      className={clsx(
        'group flex flex-col bg-khoj-card border rounded-sm p-5 transition-all duration-200',
        'hover:border-khoj-accent/40 hover:shadow-[0_0_30px_rgba(255,77,0,0.08)] hover:-translate-y-0.5',
        user.verifiedChampion
          ? 'border-khoj-gold/30'
          : 'border-khoj-border'
      )}
    >
      {/* ── Top row: avatar + name + badges ── */}
      <div className="flex items-start gap-3 mb-4">
        {/* Avatar */}
        <div
          className="w-12 h-12 flex-shrink-0 rounded-sm flex items-center justify-center text-lg font-display font-bold transition-transform duration-200 group-hover:scale-105"
          style={{
            backgroundColor: `${color}18`,
            border: `1.5px solid ${color}40`,
            color,
          }}
        >
          {user.avatarUrl ? (
            <img
              src={user.avatarUrl}
              alt={user.name}
              className="w-full h-full object-cover rounded-sm"
            />
          ) : (
            user.name.charAt(0).toUpperCase()
          )}
        </div>

        {/* Identity */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-sm font-display font-bold text-khoj-text truncate group-hover:text-khoj-accent transition-colors duration-150">
              {user.name}
            </span>
            {user.verifiedChampion && (
              <span
                title="Verified Champion"
                className="flex-shrink-0 text-[9px] uppercase tracking-widest font-body font-bold px-1.5 py-0.5 bg-khoj-gold/15 border border-khoj-gold/40 text-khoj-gold rounded-sm"
              >
                ★ Champion
              </span>
            )}
          </div>

          {user.username && (
            <p className="text-[10px] font-mono text-khoj-subtle mt-0.5">@{user.username}</p>
          )}

          {/* Field tag */}
          {user.field && (
            <span className="inline-flex items-center gap-1 text-[9px] uppercase tracking-wider font-body text-khoj-subtle mt-1">
              <span>{fieldIcon}</span>
              <span>{user.field}</span>
            </span>
          )}
        </div>
      </div>

      {/* ── Bio ── */}
      {user.bio && (
        <p className="text-xs text-khoj-subtle font-body leading-relaxed line-clamp-2 mb-4">
          {user.bio}
        </p>
      )}

      {/* ── Skills ── */}
      {topSkills.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mb-4">
          {topSkills.map((skill) => (
            <span
              key={skill}
              className="text-[10px] px-2 py-0.5 bg-khoj-teal/10 border border-khoj-teal/25 text-khoj-teal rounded-sm font-body"
            >
              {skill}
            </span>
          ))}
          {user.skills.length > 4 && (
            <span className="text-[10px] px-2 py-0.5 bg-khoj-muted/20 border border-khoj-border/50 text-khoj-subtle rounded-sm font-body">
              +{user.skills.length - 4}
            </span>
          )}
        </div>
      )}

      {/* ── Top achievement ── */}
      {topAchievement && (
        <div className="flex items-center gap-2 mb-4 px-3 py-2 rounded-sm bg-khoj-gold/5 border border-khoj-gold/15">
          <span className="text-base leading-none flex-shrink-0">{topAchievement.icon}</span>
          <p className="text-[10px] text-khoj-gold font-body truncate">{topAchievement.title}</p>
        </div>
      )}

      {/* ── Stats row ── */}
      <div className="mt-auto border-t border-khoj-border/50 pt-3 flex items-center justify-between gap-2">
        <div className="flex items-center gap-4">
          <div className="text-center">
            <p className="text-xs font-display font-bold text-khoj-accent">{user.xp.toLocaleString()}</p>
            <p className="text-[9px] uppercase tracking-wider text-khoj-subtle font-body">XP</p>
          </div>
          <div className="text-center">
            <p className="text-xs font-display font-bold text-khoj-gold">#{user.rank}</p>
            <p className="text-[9px] uppercase tracking-wider text-khoj-subtle font-body">Rank</p>
          </div>
          <div className="text-center">
            <p className="text-xs font-display font-bold text-khoj-teal">{user.wins}</p>
            <p className="text-[9px] uppercase tracking-wider text-khoj-subtle font-body">Wins</p>
          </div>
        </div>

        <div className="flex flex-col items-end gap-1">
          {/* Level */}
          <span className="text-[9px] uppercase tracking-wider font-body px-2 py-0.5 bg-khoj-accent/10 border border-khoj-accent/25 text-khoj-accent rounded-sm">
            Lv {level} · {levelName}
          </span>
          {/* Availability */}
          {user.availableForOpportunities ? (
            <span className="flex items-center gap-1 text-[9px] text-khoj-teal font-body">
              <span className="w-1.5 h-1.5 rounded-full bg-khoj-teal animate-pulse" />
              Available
            </span>
          ) : (
            <span className="text-[9px] text-khoj-subtle font-body">Not available</span>
          )}
        </div>
      </div>

      {/* ── Location ── */}
      {user.location && (
        <p className="text-[10px] text-khoj-muted font-body mt-2 flex items-center gap-1">
          <span>⌖</span>
          {user.location}
        </p>
      )}
    </Link>
  )
}
