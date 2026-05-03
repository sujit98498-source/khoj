// components/portfolio/ProfileHeader.tsx
// Hero section: avatar, name, username, bio, field, availability badge,
// social links, and contact/connect button.

import Link from 'next/link'
import { PortfolioUser } from '@/lib/types'
import { Badge } from '@/components/ui/Badge'
import { XPBar, getLevel } from '@/components/ui/XPBar'
import clsx from 'clsx'

const AVATAR_COLORS = ['#FF4D00', '#FFB800', '#00D4AA', '#6366f1', '#ec4899', '#14b8a6']

function avatarColor(name: string) {
  return AVATAR_COLORS[name.charCodeAt(0) % AVATAR_COLORS.length]
}

const SOCIAL_ICONS: Record<string, { icon: string; label: string }> = {
  github: { icon: '⌥', label: 'GitHub' },
  linkedin: { icon: '◧', label: 'LinkedIn' },
  twitter: { icon: '◩', label: 'Twitter / X' },
  website: { icon: '◈', label: 'Website' },
  instagram: { icon: '◉', label: 'Instagram' },
}

interface ProfileHeaderProps {
  user: PortfolioUser
  isOwner?: boolean
}

export function ProfileHeader({ user, isOwner = false }: ProfileHeaderProps) {
  const { level, name: levelName } = getLevel(user.xp)
  const color = avatarColor(user.name)
  const socialEntries = Object.entries(user.socialLinks).filter(([, v]) => Boolean(v)) as [
    keyof typeof SOCIAL_ICONS,
    string,
  ][]

  return (
    <div className="bg-khoj-card border border-khoj-accent/30 shadow-[0_0_40px_rgba(255,77,0,0.08)] rounded-sm p-6 md:p-8">
      <div className="flex flex-col sm:flex-row gap-6 items-start">
        {/* Avatar */}
        <div
          className="w-20 h-20 md:w-24 md:h-24 flex-shrink-0 rounded-sm flex items-center justify-center text-3xl md:text-4xl font-display font-bold"
          style={{
            backgroundColor: `${color}18`,
            border: `2px solid ${color}45`,
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
          <div className="flex flex-wrap items-start gap-3 mb-2">
            <h1 className="text-2xl md:text-3xl font-display font-bold text-khoj-text leading-tight">
              {user.name}
            </h1>
            {user.availableForOpportunities && (
              <span className="mt-1 inline-flex items-center gap-1.5 text-[10px] uppercase tracking-widest font-body font-bold px-2.5 py-1 bg-khoj-teal/10 border border-khoj-teal/40 text-khoj-teal rounded-sm">
                <span className="w-1.5 h-1.5 rounded-full bg-khoj-teal animate-pulse" />
                Open to Opportunities
              </span>
            )}
          </div>

          {user.username && (
            <p className="text-[11px] font-mono text-khoj-subtle mb-2">@{user.username}</p>
          )}

          {/* Level badges */}
          <div className="flex flex-wrap gap-2 mb-3">
            <Badge label={`Level ${level} · ${levelName}`} variant="warning" size="md" />
            {user.rank > 0 && <Badge label={`Rank #${user.rank}`} variant="info" size="md" />}
            {user.field && <Badge label={user.field} variant="default" size="md" />}
          </div>

          {/* XP bar */}
          <div className="max-w-xs mb-4">
            <XPBar xp={user.xp} />
          </div>

          {/* Bio */}
          {user.bio ? (
            <p className="text-sm text-khoj-text/80 font-body leading-relaxed max-w-xl mb-4">
              {user.bio}
            </p>
          ) : (
            <p className="text-sm text-khoj-subtle font-body italic mb-4">No bio yet.</p>
          )}

          {/* Social links + contact */}
          <div className="flex flex-wrap items-center gap-3">
            {socialEntries.map(([key, url]) => {
              const meta = SOCIAL_ICONS[key] ?? { icon: '↗', label: key }
              return (
                <a
                  key={key}
                  href={url}
                  target="_blank"
                  rel="noopener noreferrer"
                  title={meta.label}
                  className="flex items-center gap-1.5 text-[11px] font-body text-khoj-subtle hover:text-khoj-accent transition-colors duration-150 border border-transparent hover:border-khoj-border px-2 py-1 rounded-sm"
                >
                  <span className="text-base leading-none">{meta.icon}</span>
                  <span className="capitalize">{key}</span>
                </a>
              )
            })}

            {user.contactEmail && (
              <a
                href={`mailto:${user.contactEmail}`}
                className={clsx(
                  'flex items-center gap-1.5 text-[11px] font-body font-semibold uppercase tracking-wider',
                  'px-4 py-2 rounded-sm border transition-all duration-150',
                  'bg-khoj-accent/10 border-khoj-accent/40 text-khoj-accent',
                  'hover:bg-khoj-accent/20 hover:border-khoj-accent'
                )}
              >
                ✉ Contact
              </a>
            )}

            {isOwner && (
              <Link
                href="/settings/profile"
                className={clsx(
                  'flex items-center gap-1.5 text-[11px] font-body font-semibold uppercase tracking-wider',
                  'px-4 py-2 rounded-sm border transition-all duration-150',
                  'border-khoj-border text-khoj-subtle',
                  'hover:border-khoj-accent/40 hover:text-khoj-accent'
                )}
              >
                ✎ Edit Profile
              </Link>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
