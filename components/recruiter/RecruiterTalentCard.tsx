// components/recruiter/RecruiterTalentCard.tsx
// Talent card for the Recruiter Dashboard.
// Extends TalentCard with recruiter-specific actions:
//   Save ♥ · Shortlist ★ · Contact ✉ · View Profile →
// Profile strength score badge shown inline.

'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import type { PortfolioUser } from '@/lib/types'
import { calculateProfileScore, TIERS } from '@/lib/portfolio/profileScore'
import { getLevel } from '@/components/ui/XPBar'
import { ContactModal } from './ContactModal'
import { InviteModal } from '@/components/jobs/InviteModal'
import { buildConversationId, getOrCreateConversation } from '@/services/messageService'
import { useAuth } from '@/hooks/useAuth'
import clsx from 'clsx'
import toast from 'react-hot-toast'

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

interface RecruiterTalentCardProps {
  user: PortfolioUser
  saved: boolean
  shortlisted: boolean
  onToggleSave: (uid: string) => void
  onToggleShortlist: (uid: string) => void
}

export function RecruiterTalentCard({
  user,
  saved,
  shortlisted,
  onToggleSave,
  onToggleShortlist,
}: RecruiterTalentCardProps) {
  const [showContact, setShowContact] = useState(false)
  const [showInvite, setShowInvite] = useState(false)
  const router = useRouter()
  const { khojUser } = useAuth()

  const { level, name: levelName } = getLevel(user.xp)
  const color = avatarColor(user.name)
  const fieldIcon = FIELD_ICONS[user.field ?? ''] ?? FIELD_ICONS.Default
  const topSkills = user.skills.slice(0, 5)

  const { score, tier, barColor, tierColor } = calculateProfileScore(user)
  const tierConfig = TIERS.find((t) => t.label === tier) ?? TIERS[0]

  function handleSave(e: React.MouseEvent) {
    e.preventDefault()
    onToggleSave(user.uid)
    toast.success(saved ? 'Removed from saved' : 'Candidate saved', { duration: 1500 })
  }

  function handleShortlist(e: React.MouseEvent) {
    e.preventDefault()
    onToggleShortlist(user.uid)
    toast.success(shortlisted ? 'Removed from shortlist' : 'Added to shortlist', { duration: 1500 })
  }

  async function handleMessage(e: React.MouseEvent) {
    e.preventDefault()
    if (!khojUser) {
      router.push('/auth/login')
      return
    }
    try {
      await getOrCreateConversation(
        { uid: khojUser.uid, name: khojUser.name, avatarUrl: khojUser.avatarUrl, username: khojUser.username, role: khojUser.role ?? 'user' },
        { uid: user.uid, name: user.name, username: user.username, avatarUrl: user.avatarUrl, role: 'user' }
      )
    } catch {
      // Proceed anyway — the conversation page will create the doc on arrival
    }
    const convoId = buildConversationId(khojUser.uid, user.uid)
    router.push(`/messages/${convoId}`)
  }

  function handleInvite(e: React.MouseEvent) {
    e.preventDefault()
    if (!khojUser) { toast.error('Sign in to invite'); return }
    setShowInvite(true)
  }

  return (
    <>
      <div
        className={clsx(
          'group flex flex-col bg-khoj-card border rounded-sm transition-all duration-200',
          'hover:border-khoj-accent/40 hover:shadow-[0_0_28px_rgba(255,77,0,0.07)] hover:-translate-y-0.5',
          shortlisted
            ? 'border-khoj-gold/40'
            : saved
            ? 'border-khoj-teal/30'
            : user.verifiedChampion
            ? 'border-khoj-gold/20'
            : 'border-khoj-border'
        )}
      >
        {/* ── Status strip ── */}
        {(saved || shortlisted) && (
          <div
            className={clsx(
              'px-4 py-1.5 flex items-center gap-2 text-[9px] uppercase tracking-widest font-body border-b',
              shortlisted
                ? 'bg-khoj-gold/8 border-khoj-gold/20 text-khoj-gold'
                : 'bg-khoj-teal/8 border-khoj-teal/20 text-khoj-teal'
            )}
          >
            <span>{shortlisted ? '★ Shortlisted' : '♥ Saved'}</span>
          </div>
        )}

        <div className="p-5 flex flex-col flex-1">
          {/* ── Identity row ── */}
          <div className="flex items-start gap-3 mb-3">
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

            {/* Name + meta */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1.5 flex-wrap">
                <Link
                  href={`/profile/${user.uid}`}
                  className="text-sm font-display font-bold text-khoj-text hover:text-khoj-accent transition-colors duration-150 truncate"
                >
                  {user.name}
                </Link>
                {user.verifiedChampion && (
                  <span className="text-[9px] uppercase tracking-widest font-body font-bold px-1.5 py-0.5 bg-khoj-gold/15 border border-khoj-gold/40 text-khoj-gold rounded-sm flex-shrink-0">
                    ★ Champion
                  </span>
                )}
              </div>

              {user.username && (
                <p className="text-[10px] font-mono text-khoj-subtle mt-0.5">@{user.username}</p>
              )}

              <div className="flex items-center gap-2 flex-wrap mt-1">
                {user.field && (
                  <span className="inline-flex items-center gap-1 text-[9px] uppercase tracking-wider font-body text-khoj-subtle">
                    <span>{fieldIcon}</span>
                    <span>{user.field}</span>
                  </span>
                )}
                {user.location && (
                  <span className="text-[9px] text-khoj-muted font-body truncate">
                    ◎ {user.location}
                  </span>
                )}
              </div>
            </div>

            {/* Profile score badge */}
            <div
              className="flex-shrink-0 flex flex-col items-end gap-0.5"
              title={`Profile Strength: ${score}/100 — ${tier}`}
            >
              <span className={clsx('text-base leading-none', tierColor)}>{tierConfig.icon}</span>
              <span className={clsx('text-[10px] font-display font-bold tabular-nums', tierColor)}>
                {score}
              </span>
              <div className="w-8 h-1 bg-khoj-muted/20 rounded-full overflow-hidden">
                <div
                  className={clsx('h-full rounded-full', barColor)}
                  style={{ width: `${score}%` }}
                />
              </div>
            </div>
          </div>

          {/* ── Headline ── */}
          {user.headline && (
            <p className="text-[11px] font-body text-khoj-text/80 mb-2 line-clamp-1 italic">
              "{user.headline}"
            </p>
          )}

          {/* ── Bio ── */}
          {!user.headline && user.bio && (
            <p className="text-xs text-khoj-subtle font-body leading-relaxed line-clamp-2 mb-3">
              {user.bio}
            </p>
          )}

          {/* ── Availability ── */}
          {user.availableForOpportunities && (
            <div className="flex items-center gap-1.5 mb-3">
              <span className="w-1.5 h-1.5 rounded-full bg-khoj-teal animate-pulse flex-shrink-0" />
              <span className="text-[10px] text-khoj-teal font-body">Available for opportunities</span>
            </div>
          )}

          {/* ── Skills ── */}
          {topSkills.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mb-3">
              {topSkills.map((skill) => (
                <span
                  key={skill}
                  className="text-[10px] px-2 py-0.5 bg-khoj-teal/10 border border-khoj-teal/25 text-khoj-teal rounded-sm font-body"
                >
                  {skill}
                </span>
              ))}
              {user.skills.length > 5 && (
                <span className="text-[10px] px-2 py-0.5 bg-khoj-muted/20 border border-khoj-border/50 text-khoj-subtle rounded-sm font-body">
                  +{user.skills.length - 5}
                </span>
              )}
            </div>
          )}

          {/* ── Top achievement ── */}
          {user.achievements[0] && (
            <div className="flex items-center gap-2 mb-3 px-3 py-2 rounded-sm bg-khoj-gold/5 border border-khoj-gold/15">
              <span className="text-base leading-none flex-shrink-0">{user.achievements[0].icon}</span>
              <p className="text-[10px] text-khoj-gold font-body truncate">
                {user.achievements[0].title}
              </p>
              {user.achievements.length > 1 && (
                <span className="text-[9px] text-khoj-muted font-body flex-shrink-0 ml-auto">
                  +{user.achievements.length - 1}
                </span>
              )}
            </div>
          )}

          {/* ── Stats row ── */}
          <div className="mt-auto border-t border-khoj-border/50 pt-3 flex items-center justify-between gap-2 mb-3">
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
            <span className="text-[9px] uppercase tracking-wider font-body px-2 py-0.5 bg-khoj-accent/10 border border-khoj-accent/25 text-khoj-accent rounded-sm">
              Lv {level} · {levelName}
            </span>
          </div>

          {/* ── Recruiter action row ── */}
          <div className="grid grid-cols-4 gap-1.5">
            {/* Save */}
            <button
              type="button"
              onClick={handleSave}
              title={saved ? 'Remove from saved' : 'Save candidate'}
              className={clsx(
                'flex items-center justify-center py-2 rounded-sm border text-xs transition-all duration-150',
                saved
                  ? 'bg-khoj-teal/15 border-khoj-teal/50 text-khoj-teal'
                  : 'bg-khoj-bg border-khoj-border text-khoj-subtle hover:border-khoj-teal/40 hover:text-khoj-teal'
              )}
            >
              {saved ? '♥' : '♡'}
            </button>

            {/* Shortlist */}
            <button
              type="button"
              onClick={handleShortlist}
              title={shortlisted ? 'Remove from shortlist' : 'Add to shortlist'}
              className={clsx(
                'flex items-center justify-center py-2 rounded-sm border text-xs transition-all duration-150',
                shortlisted
                  ? 'bg-khoj-gold/15 border-khoj-gold/50 text-khoj-gold'
                  : 'bg-khoj-bg border-khoj-border text-khoj-subtle hover:border-khoj-gold/40 hover:text-khoj-gold'
              )}
            >
              {shortlisted ? '★' : '☆'}
            </button>

            {/* Message */}
            <button
              type="button"
              onClick={handleMessage}
              title="Send a message"
              className="flex items-center justify-center py-2 rounded-sm border border-khoj-border bg-khoj-bg text-khoj-subtle text-xs hover:border-khoj-accent/40 hover:text-khoj-accent transition-all duration-150"
            >
              ✉
            </button>

            {/* View Profile */}
            <Link
              href={`/profile/${user.uid}`}
              title="View full profile"
              className="flex items-center justify-center py-2 rounded-sm border border-khoj-border bg-khoj-bg text-khoj-subtle text-xs hover:border-khoj-accent/40 hover:text-khoj-accent transition-all duration-150"
            >
              →
            </Link>
          </div>

          {/* Invite to apply (full-width) */}
          <button
            type="button"
            onClick={handleInvite}
            className="mt-1.5 w-full py-2 text-[10px] uppercase tracking-widest font-body border border-khoj-accent/30 text-khoj-accent rounded-sm hover:bg-khoj-accent/10 transition-all duration-150"
          >
            Invite to Apply
          </button>
        </div>
      </div>

      {/* Contact modal */}
      {showContact && <ContactModal user={user} onClose={() => setShowContact(false)} />}

      {/* Invite modal */}
      {showInvite && (
        <InviteModal
          recipient={{ uid: user.uid, name: user.name, username: user.username, avatarUrl: user.avatarUrl }}
          onClose={() => setShowInvite(false)}
        />
      )}
    </>
  )
}
