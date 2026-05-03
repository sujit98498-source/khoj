// components/portfolio/SkillsSection.tsx
// Skill tags with empty state.

import { Card } from '@/components/ui/Card'

interface SkillsSectionProps {
  skills: string[]
}

export function SkillsSection({ skills }: SkillsSectionProps) {
  return (
    <Card>
      <p className="text-[10px] uppercase tracking-[0.15em] text-khoj-subtle font-body mb-4">
        Skills &amp; Technologies
      </p>

      {skills.length === 0 ? (
        <p className="text-sm text-khoj-subtle font-body italic text-center py-4">
          No skills added yet.
        </p>
      ) : (
        <div className="flex flex-wrap gap-2">
          {skills.map((skill) => (
            <span
              key={skill}
              className="text-xs px-3 py-1.5 bg-khoj-teal/10 border border-khoj-teal/30 text-khoj-teal rounded-sm font-body font-medium hover:bg-khoj-teal/20 transition-colors duration-150"
            >
              {skill}
            </span>
          ))}
        </div>
      )}
    </Card>
  )
}
