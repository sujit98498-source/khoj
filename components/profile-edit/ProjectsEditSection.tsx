// components/profile-edit/ProjectsEditSection.tsx
// Add / edit / remove portfolio projects.

'use client'

import { useState } from 'react'
import { EditFormSection } from './EditFormSection'
import type { PortfolioProject } from '@/lib/types'
import clsx from 'clsx'

function newProject(): PortfolioProject {
  return {
    id: `proj_${Date.now()}`,
    title: '',
    description: '',
    techStack: [],
    builtAt: new Date().toISOString().slice(0, 7), // YYYY-MM
    featured: false,
  }
}

interface Props {
  projects: PortfolioProject[]
  onChange: (projects: PortfolioProject[]) => void
}

export function ProjectsEditSection({ projects, onChange }: Props) {
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [techInput, setTechInput] = useState<Record<string, string>>({})

  function addProject() {
    const p = newProject()
    onChange([...projects, p])
    setExpandedId(p.id)
  }

  function updateProject(id: string, patch: Partial<PortfolioProject>) {
    onChange(projects.map((p) => (p.id === id ? { ...p, ...patch } : p)))
  }

  function removeProject(id: string) {
    onChange(projects.filter((p) => p.id !== id))
    if (expandedId === id) setExpandedId(null)
  }

  function addTech(id: string) {
    const val = (techInput[id] ?? '').trim()
    if (!val) return
    const proj = projects.find((p) => p.id === id)
    if (!proj || proj.techStack.includes(val)) {
      setTechInput((t) => ({ ...t, [id]: '' }))
      return
    }
    updateProject(id, { techStack: [...proj.techStack, val] })
    setTechInput((t) => ({ ...t, [id]: '' }))
  }

  function removeTech(id: string, tech: string) {
    const proj = projects.find((p) => p.id === id)
    if (!proj) return
    updateProject(id, { techStack: proj.techStack.filter((t) => t !== tech) })
  }

  const completeness = projects.length > 0 ? Math.min(100, projects.length * 33) : 0

  return (
    <EditFormSection title="Projects" icon="▣" completeness={completeness}>
      {/* Project list */}
      {projects.map((proj) => (
        <div key={proj.id} className="border border-khoj-border rounded-sm overflow-hidden">
          {/* Row header */}
          <div className="flex items-center justify-between px-4 py-3 bg-khoj-bg/60">
            <button
              type="button"
              onClick={() => setExpandedId(expandedId === proj.id ? null : proj.id)}
              className="flex items-center gap-2 flex-1 text-left"
            >
              <span className={clsx('text-[10px] transition-transform', expandedId === proj.id ? 'rotate-180' : '')}>▾</span>
              <span className="text-sm font-body text-khoj-text truncate">
                {proj.title || <span className="text-khoj-muted italic">Untitled project</span>}
              </span>
              {proj.featured && (
                <span className="text-[9px] px-1.5 py-0.5 bg-khoj-gold/15 border border-khoj-gold/30 text-khoj-gold rounded-sm font-body">
                  Featured
                </span>
              )}
            </button>
            <button
              type="button"
              onClick={() => removeProject(proj.id)}
              className="text-khoj-subtle hover:text-red-400 transition-colors text-xs ml-2 flex-shrink-0"
            >
              ✕
            </button>
          </div>

          {/* Expanded form */}
          {expandedId === proj.id && (
            <div className="px-4 pb-4 pt-3 space-y-3 border-t border-khoj-border/50">
              <InputRow label="Project Title" required>
                <input
                  type="text"
                  value={proj.title}
                  onChange={(e) => updateProject(proj.id, { title: e.target.value })}
                  placeholder="My Awesome Project"
                  className={inCls()}
                />
              </InputRow>

              <InputRow label="Description">
                <textarea
                  rows={3}
                  value={proj.description}
                  onChange={(e) => updateProject(proj.id, { description: e.target.value })}
                  placeholder="What does it do and why did you build it?"
                  className={clsx(inCls(), 'resize-none')}
                />
              </InputRow>

              {/* Tech stack */}
              <InputRow label="Tech Stack">
                <div className="flex flex-wrap gap-1.5 mb-2">
                  {proj.techStack.map((t) => (
                    <span key={t} className="flex items-center gap-1 text-[10px] px-2 py-0.5 bg-khoj-teal/10 border border-khoj-teal/30 text-khoj-teal rounded-sm font-body">
                      {t}
                      <button type="button" onClick={() => removeTech(proj.id, t)} className="text-khoj-teal/60 hover:text-khoj-teal text-[9px] leading-none">✕</button>
                    </span>
                  ))}
                </div>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={techInput[proj.id] ?? ''}
                    onChange={(e) => setTechInput((t) => ({ ...t, [proj.id]: e.target.value }))}
                    onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addTech(proj.id) } }}
                    placeholder="React, Node.js…"
                    className={clsx(inCls(), 'flex-1')}
                  />
                  <button type="button" onClick={() => addTech(proj.id)} className="px-3 py-2 text-xs border border-khoj-border rounded-sm text-khoj-subtle hover:text-khoj-text hover:border-khoj-accent/40 font-body transition-colors">
                    Add
                  </button>
                </div>
              </InputRow>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <InputRow label="Live URL">
                  <input type="url" value={proj.liveUrl ?? ''} onChange={(e) => updateProject(proj.id, { liveUrl: e.target.value })} placeholder="https://..." className={inCls()} />
                </InputRow>
                <InputRow label="Repo URL">
                  <input type="url" value={proj.repoUrl ?? ''} onChange={(e) => updateProject(proj.id, { repoUrl: e.target.value })} placeholder="https://github.com/..." className={inCls()} />
                </InputRow>
              </div>

              <InputRow label="Built Date">
                <input type="month" value={proj.builtAt?.slice(0, 7) ?? ''} onChange={(e) => updateProject(proj.id, { builtAt: e.target.value })} className={clsx(inCls(), 'w-40')} />
              </InputRow>

              <label className="flex items-center gap-2 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={!!proj.featured}
                  onChange={(e) => updateProject(proj.id, { featured: e.target.checked })}
                  className="sr-only"
                />
                <span className={clsx('w-4 h-4 rounded-sm border flex items-center justify-center transition-all', proj.featured ? 'bg-khoj-gold/20 border-khoj-gold/60' : 'bg-transparent border-khoj-border')}>
                  {proj.featured && <span className="text-khoj-gold text-[10px] leading-none">✓</span>}
                </span>
                <span className="text-xs font-body text-khoj-text">Pin as featured project</span>
              </label>
            </div>
          )}
        </div>
      ))}

      {/* Add button */}
      <button
        type="button"
        onClick={addProject}
        className="w-full py-2.5 border border-dashed border-khoj-border rounded-sm text-xs text-khoj-subtle hover:border-khoj-accent/40 hover:text-khoj-accent font-body transition-all duration-150"
      >
        + Add Project
      </button>
    </EditFormSection>
  )
}

function InputRow({ label, required, children }: { label: string; required?: boolean; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-[10px] uppercase tracking-widest text-khoj-subtle font-body mb-1">
        {label}{required && <span className="text-khoj-accent ml-1">*</span>}
      </label>
      {children}
    </div>
  )
}

function inCls() {
  return 'w-full bg-khoj-bg border border-khoj-border rounded-sm px-3 py-2 text-sm text-khoj-text font-body placeholder:text-khoj-muted focus:outline-none focus:border-khoj-accent/50 transition-colors'
}
