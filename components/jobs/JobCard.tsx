import { useState } from 'react'
import { Job } from '@/lib/types'
import { Card } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { ReportModal } from '@/components/reports/ReportModal'
import clsx from 'clsx'

interface JobCardProps {
  job: Job & { unlocked: boolean }
  userXP: number
  reportedBy?: string
  reporterName?: string
}

const TYPE_LABELS: Record<string, string> = {
  'full-time': 'Full Time',
  'part-time': 'Part Time',
  'contract': 'Contract',
  'internship': 'Internship',
}

export function JobCard({ job, userXP, reportedBy, reporterName }: JobCardProps) {
  const xpNeeded = job.requiredXP - userXP
  const progressPercent = Math.min((userXP / job.requiredXP) * 100, 100)
  const [menuOpen, setMenuOpen] = useState(false)
  const [showReport, setShowReport] = useState(false)

  return (
    <Card
      className={clsx(
        'flex flex-col gap-4 relative overflow-hidden',
        !job.unlocked && 'opacity-70'
      )}
    >
      {/* Locked overlay shimmer */}
      {!job.unlocked && (
        <div className="absolute inset-0 bg-khoj-bg/20 backdrop-blur-[1px] z-10 flex items-center justify-center rounded-sm">
          <div className="flex flex-col items-center gap-2 text-center px-6">
            <span className="text-2xl">🔒</span>
            <p className="text-xs font-body font-semibold text-khoj-subtle">
              Need {xpNeeded.toLocaleString()} more XP
            </p>
            <div className="w-32 h-1 bg-khoj-border rounded-full overflow-hidden">
              <div
                className="h-full bg-khoj-accent rounded-full"
                style={{ width: `${progressPercent}%` }}
              />
            </div>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="font-display font-bold text-khoj-text">{job.title}</h3>
          <p className="text-sm font-body text-khoj-accent mt-0.5">{job.company}</p>
        </div>
        <div className="flex items-start gap-2">
          <div className="flex flex-col items-end gap-1.5">
            <Badge label={job.unlocked ? 'Unlocked' : 'Locked'} variant={job.unlocked ? 'success' : 'locked'} />
            <Badge label={TYPE_LABELS[job.type]} variant="default" />
          </div>
          {reportedBy && (
            <div className="relative">
              <button
                onClick={() => setMenuOpen((v) => !v)}
                className="w-7 h-7 flex items-center justify-center rounded-sm border border-khoj-border text-khoj-subtle hover:text-khoj-text hover:border-khoj-accent/50 transition-all"
                aria-label="More options"
              >
                <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="currentColor">
                  <circle cx="12" cy="5" r="1.5" />
                  <circle cx="12" cy="12" r="1.5" />
                  <circle cx="12" cy="19" r="1.5" />
                </svg>
              </button>
              {menuOpen && (
                <div className="absolute right-0 top-full mt-1 w-36 bg-[#13151d] border border-zinc-700 rounded-xl shadow-2xl shadow-black/60 py-1 z-50">
                  <button
                    onClick={() => { setMenuOpen(false); setShowReport(true) }}
                    className="w-full flex items-center gap-2 px-3 py-2 text-xs text-red-400 hover:bg-red-500/10 hover:text-red-300 transition-colors"
                  >
                    <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z" />
                      <line x1="4" y1="22" x2="4" y2="15" />
                    </svg>
                    Report Job
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Description */}
      <p className="text-sm text-khoj-subtle font-body leading-relaxed line-clamp-2">
        {job.description}
      </p>

      {/* Details */}
      <div className="flex flex-wrap gap-3 text-[10px] text-khoj-subtle font-body">
        <span className="flex items-center gap-1">
          <span>💰</span> {job.salary}
        </span>
        <span className="flex items-center gap-1">
          <span>📍</span> {job.location}
        </span>
        <span className="flex items-center gap-1 text-khoj-gold">
          <span>⚡</span> {job.requiredXP.toLocaleString()} XP required
        </span>
      </div>

      {/* Skills */}
      <div className="flex flex-wrap gap-1.5">
        {job.skills.map((skill) => (
          <span
            key={skill}
            className="text-[10px] px-2 py-0.5 bg-khoj-muted/20 border border-khoj-border rounded-sm text-khoj-subtle font-body"
          >
            {skill}
          </span>
        ))}
      </div>

      {/* CTA */}
      <Button
        variant={job.unlocked ? 'primary' : 'secondary'}
        disabled={!job.unlocked}
        className="w-full"
        size="sm"
      >
        {job.unlocked ? 'Apply Now →' : `Unlock at ${job.requiredXP.toLocaleString()} XP`}
      </Button>

      {showReport && reportedBy && (
        <ReportModal
          targetType="job"
          targetId={job.id}
          targetTitle={job.title}
          targetPreview={job.description}
          targetOwnerId={(job as Job & { recruiterId?: string }).recruiterId ?? ''}
          targetOwnerName={job.company}
          reportedBy={reportedBy}
          reporterName={reporterName ?? 'Anonymous'}
          onClose={() => setShowReport(false)}
        />
      )}
    </Card>
  )
}
