// components/jobs/OpportunityCard.tsx
// Card for non-standard listings in the Opportunity Market:
// co-founder, internship, project, funding, competition, mentor.
// HiringJobCard handles existing recruiter-posted "startup_job" listings.

'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { formatDistanceToNow } from 'date-fns'
import type { Opportunity, OpportunityType } from '@/lib/types'
import clsx from 'clsx'
import { getLatestRoomEvaluation } from '@/services/startupEvaluationService'

// ── Visual config per type ─────────────────────────────────────────────────────
const TYPE_CONFIG: Record<
  OpportunityType,
  { label: string; color: string; icon: string }
> = {
  cofounder:   { label: 'Co-founder',  color: 'text-khoj-accent border-khoj-accent/30 bg-khoj-accent/8',   icon: '⚡' },
  startup_job: { label: 'Startup Job', color: 'text-khoj-teal border-khoj-teal/30 bg-khoj-teal/8',         icon: '◉' },
  internship:  { label: 'Internship',  color: 'text-khoj-teal border-khoj-teal/30 bg-khoj-teal/8',         icon: '◇' },
  project:     { label: 'Project',     color: 'text-blue-400 border-blue-400/30 bg-blue-500/8',             icon: '▦' },
  funding:     { label: 'Funding',     color: 'text-khoj-gold border-khoj-gold/30 bg-khoj-gold/8',          icon: '◈' },
  competition: { label: 'Competition', color: 'text-purple-400 border-purple-400/30 bg-purple-500/8',       icon: '▲' },
  mentor:      { label: 'Mentor',      color: 'text-green-400 border-green-400/30 bg-green-500/8',          icon: '○' },
}

const COMP_LABELS: Record<string, string> = {
  equity:  'Equity',
  paid:    'Paid',
  unpaid:  'Volunteer',
  stipend: 'Stipend',
  prize:   'Prize Pool',
}

const STAGE_LABELS: Record<string, string> = {
  idea:     'Idea Stage',
  mvp:      'MVP',
  traction: 'Traction',
  growth:   'Growth',
}

interface OpportunityCardProps {
  opportunity: Opportunity
}

export function OpportunityCard({ opportunity: opp }: OpportunityCardProps) {
  const cfg = TYPE_CONFIG[opp.type]
  const timeAgo = formatDistanceToNow(new Date(opp.createdAt), { addSuffix: true })
  const [aiSummary, setAiSummary] = useState<{ overallScore: number; ratingLabel: string } | null>(
    opp.aiScore != null
      ? { overallScore: opp.aiScore, ratingLabel: opp.aiRatingLabel ?? 'KHOJ AI Score' }
      : null
  )

  useEffect(() => {
    if (aiSummary || !opp.roomId || !['cofounder', 'startup_job', 'funding'].includes(opp.type)) return
    let mounted = true
    getLatestRoomEvaluation(opp.roomId)
      .then((data) => {
        if (!mounted || !data) return
        setAiSummary({ overallScore: data.overallScore, ratingLabel: data.ratingLabel })
      })
      .catch(() => {})
    return () => { mounted = false }
  }, [opp.roomId, opp.type, aiSummary])

  // CTA text + href by type
  const { ctaLabel, ctaHref } = (() => {
    if (opp.type === 'cofounder' && opp.roomId) {
      return { ctaLabel: 'Apply Now', ctaHref: `/rooms/${opp.roomId}?tab=roles` }
    }
    if (opp.type === 'competition') {
      return { ctaLabel: 'View Tournaments', ctaHref: '/tournaments' }
    }
    if (opp.type === 'funding') {
      return { ctaLabel: 'Learn More', ctaHref: opp.roomId ? `/rooms/${opp.roomId}` : '#' }
    }
    return { ctaLabel: 'Express Interest', ctaHref: '#' }
  })()

  return (
    <div
      className={clsx(
        'group flex flex-col gap-4 bg-khoj-card border border-khoj-border rounded-sm p-5',
        'transition-all duration-200',
        'hover:border-khoj-accent/40 hover:shadow-[0_0_28px_rgba(255,77,0,0.07)]',
      )}
    >
      {/* ── Header ── */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          {/* Type badge */}
          <span
            className={clsx(
              'inline-flex items-center gap-1 text-xs font-mono border rounded-sm px-2 py-0.5 mb-2',
              cfg.color,
            )}
          >
            {cfg.icon} {cfg.label}
          </span>

          <h3 className="font-semibold text-sm text-white leading-snug line-clamp-2 group-hover:text-khoj-accent transition-colors">
            {opp.title}
          </h3>

          <p className="text-xs text-khoj-subtle mt-0.5">
            {opp.postedByName}
            {opp.startupName ? ` · ${opp.startupName}` : ''}
          </p>
        </div>
      </div>

      {/* ── Description ── */}
      <p className="text-xs text-khoj-subtle leading-relaxed line-clamp-3">
        {opp.description}
      </p>

      {/* ── Meta pills ── */}
      <div className="flex flex-wrap gap-2">
        {/* Stage (co-founder / funding) */}
        {opp.startupStage && (
          <span className="text-xs font-mono border border-khoj-border text-khoj-subtle px-2 py-0.5 rounded-sm">
            {STAGE_LABELS[opp.startupStage] ?? opp.startupStage}
          </span>
        )}

        {/* Compensation */}
        {opp.compensationType && (
          <span className="text-xs font-mono border border-khoj-border text-khoj-subtle px-2 py-0.5 rounded-sm">
            {COMP_LABELS[opp.compensationType] ?? opp.compensationType}
            {opp.equityRange ? ` · ${opp.equityRange}` : ''}
          </span>
        )}

        {/* Duration */}
        {opp.durationWeeks != null && (
          <span className="text-xs font-mono border border-khoj-border text-khoj-subtle px-2 py-0.5 rounded-sm">
            {opp.durationWeeks} wks
          </span>
        )}

        {/* Weekly commitment (co-founder) */}
        {opp.weeklyCommitment && (
          <span className="text-xs font-mono border border-khoj-border text-khoj-subtle px-2 py-0.5 rounded-sm">
            {opp.weeklyCommitment}
          </span>
        )}

        {/* Remote */}
        {opp.remoteAllowed && (
          <span className="text-xs font-mono border border-khoj-teal/30 text-khoj-teal bg-khoj-teal/8 px-2 py-0.5 rounded-sm">
            Remote
          </span>
        )}

        {/* Location */}
        {opp.location && !opp.remoteAllowed && (
          <span className="text-xs font-mono border border-khoj-border text-khoj-subtle px-2 py-0.5 rounded-sm">
            {opp.location}
          </span>
        )}

        {/* Funding amount */}
        {opp.fundingNeeded && (
          <span className="text-xs font-mono border border-khoj-gold/30 text-khoj-gold bg-khoj-gold/8 px-2 py-0.5 rounded-sm">
            {opp.fundingNeeded}
          </span>
        )}

        {/* Prize pool */}
        {opp.prizePool && (
          <span className="text-xs font-mono border border-khoj-gold/30 text-khoj-gold bg-khoj-gold/8 px-2 py-0.5 rounded-sm">
            {opp.prizePool} prize
          </span>
        )}
      </div>

      {/* ── Skills ── */}
      {opp.skillsRequired.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {opp.skillsRequired.slice(0, 5).map((s) => (
            <span
              key={s}
              className="text-xs bg-white/5 border border-white/10 text-khoj-subtle px-2 py-0.5 rounded-sm"
            >
              {s}
            </span>
          ))}
          {opp.skillsRequired.length > 5 && (
            <span className="text-xs text-khoj-subtle">+{opp.skillsRequired.length - 5}</span>
          )}
        </div>
      )}

      {/* ── Traction (funding) ── */}
      {opp.traction && (
        <p className="text-xs text-khoj-gold/80 border border-khoj-gold/20 bg-khoj-gold/5 rounded-sm px-3 py-2 leading-relaxed">
          📈 {opp.traction}
        </p>
      )}

      {/* ── KHOJ AI Score badge ── */}
      {aiSummary ? (
        <div className="flex items-center gap-2 px-3 py-2 bg-khoj-accent/8 border border-khoj-accent/25 rounded-sm">
          <span className="text-khoj-accent font-bold text-sm">⚡ {aiSummary.overallScore}/10</span>
          <span className="text-khoj-subtle text-xs">{aiSummary.ratingLabel}</span>
          <span className="ml-auto text-[10px] text-khoj-subtle/60 uppercase tracking-wide">KHOJ AI</span>
        </div>
      ) : (opp.type === 'cofounder' || opp.type === 'startup_job') && opp.roomId ? (
        <div className="flex items-center gap-2 px-3 py-1.5 bg-khoj-border/30 border border-khoj-border/60 rounded-sm">
          <span className="text-khoj-subtle/60 text-xs">⚡ Not yet evaluated with KHOJ AI</span>
        </div>
      ) : null}

      {/* ── Footer ── */}
      <div className="flex items-center justify-between pt-1 mt-auto">
        <span className="text-xs text-khoj-subtle/60">{timeAgo}</span>

        <Link
          href={ctaHref}
          className={clsx(
            'text-xs font-mono px-3 py-1.5 rounded-sm border transition-all duration-150',
            'border-khoj-accent/40 text-khoj-accent hover:bg-khoj-accent hover:text-white',
          )}
        >
          {ctaLabel}
        </Link>
      </div>
    </div>
  )
}
