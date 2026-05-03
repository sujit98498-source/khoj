// components/portfolio/ProjectsSection.tsx
// Project cards with title, description, tech stack, live/repo links.

import { Card } from '@/components/ui/Card'
import { PortfolioProject } from '@/lib/types'
import { format } from 'date-fns'
import clsx from 'clsx'

interface ProjectsSectionProps {
  projects: PortfolioProject[]
}

export function ProjectsSection({ projects }: ProjectsSectionProps) {
  // Featured projects first, then chronological
  const sorted = [...projects].sort((a, b) => {
    if (a.featured && !b.featured) return -1
    if (!a.featured && b.featured) return 1
    return new Date(b.builtAt).getTime() - new Date(a.builtAt).getTime()
  })

  return (
    <Card>
      <p className="text-[10px] uppercase tracking-[0.15em] text-khoj-subtle font-body mb-4">
        Projects
      </p>

      {sorted.length === 0 ? (
        <p className="text-sm text-khoj-subtle font-body italic text-center py-4">
          No projects added yet.
        </p>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {sorted.map((project) => (
            <div
              key={project.id}
              className={clsx(
                'flex flex-col p-4 rounded-sm border transition-colors duration-150',
                project.featured
                  ? 'border-khoj-accent/30 bg-khoj-accent/5 hover:border-khoj-accent/50'
                  : 'border-khoj-border bg-khoj-muted/5 hover:border-khoj-border/80'
              )}
            >
              {/* Title row */}
              <div className="flex items-start justify-between gap-2 mb-2">
                <p className="text-sm font-display font-bold text-khoj-text leading-snug">
                  {project.title}
                </p>
                {project.featured && (
                  <span className="flex-shrink-0 text-[9px] uppercase tracking-widest font-body font-bold px-1.5 py-0.5 bg-khoj-accent/10 border border-khoj-accent/30 text-khoj-accent rounded-sm">
                    Featured
                  </span>
                )}
              </div>

              {/* Description */}
              <p className="text-xs text-khoj-subtle font-body leading-relaxed mb-3 flex-1">
                {project.description}
              </p>

              {/* Tech stack */}
              <div className="flex flex-wrap gap-1.5 mb-3">
                {project.techStack.map((tech) => (
                  <span
                    key={tech}
                    className="text-[10px] px-2 py-0.5 bg-khoj-muted/30 border border-khoj-border/50 text-khoj-subtle rounded-sm font-body"
                  >
                    {tech}
                  </span>
                ))}
              </div>

              {/* Footer: links + date */}
              <div className="flex items-center justify-between mt-auto pt-2 border-t border-khoj-border/40">
                <div className="flex items-center gap-3">
                  {project.liveUrl && (
                    <a
                      href={project.liveUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-[11px] font-body text-khoj-accent hover:underline flex items-center gap-1"
                    >
                      ↗ Live
                    </a>
                  )}
                  {project.repoUrl && (
                    <a
                      href={project.repoUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-[11px] font-body text-khoj-subtle hover:text-khoj-text flex items-center gap-1 transition-colors duration-150"
                    >
                      ⌥ Repo
                    </a>
                  )}
                </div>
                <span className="text-[10px] text-khoj-muted font-body">
                  {format(new Date(project.builtAt), 'MMM yyyy')}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </Card>
  )
}
