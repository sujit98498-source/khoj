// components/portfolio/AchievementsSection.tsx
// Achievement cards with icon, title, description, date, and XP value.

import { Card } from '@/components/ui/Card'
import { PortfolioAchievement } from '@/lib/types'
import { format } from 'date-fns'

interface AchievementsSectionProps {
  achievements: PortfolioAchievement[]
}

export function AchievementsSection({ achievements }: AchievementsSectionProps) {
  return (
    <Card>
      <p className="text-[10px] uppercase tracking-[0.15em] text-khoj-subtle font-body mb-4">
        Achievements &amp; Milestones
      </p>

      {achievements.length === 0 ? (
        <p className="text-sm text-khoj-subtle font-body italic text-center py-4">
          No achievements unlocked yet — keep competing.
        </p>
      ) : (
        <div className="space-y-3">
          {achievements.map((a) => (
            <div
              key={a.id}
              className="flex items-start gap-4 p-4 rounded-sm bg-khoj-gold/5 border border-khoj-gold/20 hover:border-khoj-gold/40 transition-colors duration-150"
            >
              <span className="text-2xl flex-shrink-0 leading-none mt-0.5">{a.icon}</span>
              <div className="flex-1 min-w-0">
                <div className="flex flex-wrap items-center gap-2 mb-1">
                  <p className="text-sm font-display font-bold text-khoj-text">{a.title}</p>
                  {a.xpValue && (
                    <span className="text-[10px] font-mono text-khoj-gold font-bold">
                      +{a.xpValue} XP
                    </span>
                  )}
                </div>
                <p className="text-xs text-khoj-subtle font-body leading-relaxed">{a.description}</p>
                <p className="text-[10px] text-khoj-muted font-body mt-1.5">
                  {format(new Date(a.date), 'MMMM d, yyyy')}
                </p>
              </div>
            </div>
          ))}
        </div>
      )}
    </Card>
  )
}
