// components/profile-edit/EducationExperienceSection.tsx
// Editable education and work experience lists.

'use client'

import { useState } from 'react'
import { EditFormSection } from './EditFormSection'
import type { PortfolioEducation, PortfolioExperience } from '@/lib/types'
import clsx from 'clsx'

// ── Education ─────────────────────────────────────────────────────────────────

interface EduProps {
  education: PortfolioEducation[]
  onChange: (edu: PortfolioEducation[]) => void
}

function newEdu(): PortfolioEducation {
  return {
    id: `edu_${Date.now()}`,
    institution: '',
    degree: '',
    field: '',
    startYear: '',
    endYear: '',
    current: false,
  }
}

export function EducationSection({ education, onChange }: EduProps) {
  const [expandedId, setExpandedId] = useState<string | null>(null)

  function add() {
    const e = newEdu()
    onChange([...education, e])
    setExpandedId(e.id)
  }

  function update(id: string, patch: Partial<PortfolioEducation>) {
    onChange(education.map((e) => (e.id === id ? { ...e, ...patch } : e)))
  }

  function remove(id: string) {
    onChange(education.filter((e) => e.id !== id))
    if (expandedId === id) setExpandedId(null)
  }

  const completeness = Math.min(100, education.length * 50)

  return (
    <EditFormSection title="Education" icon="▲" completeness={completeness}>
      {education.map((e) => (
        <div key={e.id} className="border border-khoj-border rounded-sm overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 bg-khoj-bg/60">
            <button
              type="button"
              onClick={() => setExpandedId(expandedId === e.id ? null : e.id)}
              className="flex items-center gap-2 flex-1 text-left"
            >
              <span className={clsx('text-[10px] transition-transform', expandedId === e.id ? 'rotate-180' : '')}>▾</span>
              <span className="text-sm font-body text-khoj-text truncate">
                {e.institution || <span className="text-khoj-muted italic">Institution</span>}
                {e.degree && <span className="text-khoj-subtle"> · {e.degree}</span>}
              </span>
            </button>
            <button type="button" onClick={() => remove(e.id)} className="text-khoj-subtle hover:text-red-400 transition-colors text-xs ml-2">✕</button>
          </div>

          {expandedId === e.id && (
            <div className="px-4 pb-4 pt-3 space-y-3 border-t border-khoj-border/50">
              <InputRow label="Institution">
                <input type="text" value={e.institution} onChange={(ev) => update(e.id, { institution: ev.target.value })} placeholder="University / School / Bootcamp" className={inCls()} />
              </InputRow>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <InputRow label="Degree">
                  <input type="text" value={e.degree} onChange={(ev) => update(e.id, { degree: ev.target.value })} placeholder="B.Sc, MBA, Certificate…" className={inCls()} />
                </InputRow>
                <InputRow label="Field of Study">
                  <input type="text" value={e.field} onChange={(ev) => update(e.id, { field: ev.target.value })} placeholder="Computer Science" className={inCls()} />
                </InputRow>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <InputRow label="Start Year">
                  <input type="number" min={1990} max={2099} value={e.startYear} onChange={(ev) => update(e.id, { startYear: ev.target.value })} placeholder="2020" className={inCls()} />
                </InputRow>
                <InputRow label="End Year">
                  <input type="number" min={1990} max={2099} value={e.endYear} disabled={e.current} onChange={(ev) => update(e.id, { endYear: ev.target.value })} placeholder="2024" className={clsx(inCls(), e.current && 'opacity-40 cursor-not-allowed')} />
                </InputRow>
              </div>
              <label className="flex items-center gap-2 cursor-pointer select-none">
                <Checkbox checked={e.current} onChange={(v) => update(e.id, { current: v, endYear: v ? '' : e.endYear })} />
                <span className="text-xs font-body text-khoj-text">Currently studying here</span>
              </label>
              <InputRow label="Description (optional)">
                <textarea rows={2} value={e.description ?? ''} onChange={(ev) => update(e.id, { description: ev.target.value })} placeholder="Achievements, projects, societies…" className={clsx(inCls(), 'resize-none')} />
              </InputRow>
            </div>
          )}
        </div>
      ))}
      <AddButton onClick={add} label="Add Education" />
    </EditFormSection>
  )
}

// ── Experience ────────────────────────────────────────────────────────────────

interface ExpProps {
  experience: PortfolioExperience[]
  onChange: (exp: PortfolioExperience[]) => void
}

function newExp(): PortfolioExperience {
  return {
    id: `exp_${Date.now()}`,
    company: '',
    role: '',
    startDate: '',
    endDate: '',
    current: false,
  }
}

export function ExperienceSection({ experience, onChange }: ExpProps) {
  const [expandedId, setExpandedId] = useState<string | null>(null)

  function add() {
    const e = newExp()
    onChange([...experience, e])
    setExpandedId(e.id)
  }

  function update(id: string, patch: Partial<PortfolioExperience>) {
    onChange(experience.map((e) => (e.id === id ? { ...e, ...patch } : e)))
  }

  function remove(id: string) {
    onChange(experience.filter((e) => e.id !== id))
    if (expandedId === id) setExpandedId(null)
  }

  const completeness = Math.min(100, experience.length * 50)

  return (
    <EditFormSection title="Work Experience" icon="◇" completeness={completeness}>
      {experience.map((e) => (
        <div key={e.id} className="border border-khoj-border rounded-sm overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 bg-khoj-bg/60">
            <button
              type="button"
              onClick={() => setExpandedId(expandedId === e.id ? null : e.id)}
              className="flex items-center gap-2 flex-1 text-left"
            >
              <span className={clsx('text-[10px] transition-transform', expandedId === e.id ? 'rotate-180' : '')}>▾</span>
              <span className="text-sm font-body text-khoj-text truncate">
                {e.role || <span className="text-khoj-muted italic">Role</span>}
                {e.company && <span className="text-khoj-subtle"> @ {e.company}</span>}
                {e.current && <span className="text-[9px] ml-2 text-khoj-teal font-body">Current</span>}
              </span>
            </button>
            <button type="button" onClick={() => remove(e.id)} className="text-khoj-subtle hover:text-red-400 transition-colors text-xs ml-2">✕</button>
          </div>

          {expandedId === e.id && (
            <div className="px-4 pb-4 pt-3 space-y-3 border-t border-khoj-border/50">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <InputRow label="Role / Title">
                  <input type="text" value={e.role} onChange={(ev) => update(e.id, { role: ev.target.value })} placeholder="Software Engineer" className={inCls()} />
                </InputRow>
                <InputRow label="Company">
                  <input type="text" value={e.company} onChange={(ev) => update(e.id, { company: ev.target.value })} placeholder="Company Name" className={inCls()} />
                </InputRow>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <InputRow label="Start Date">
                  <input type="month" value={e.startDate} onChange={(ev) => update(e.id, { startDate: ev.target.value })} className={inCls()} />
                </InputRow>
                <InputRow label="End Date">
                  <input type="month" value={e.endDate} disabled={e.current} onChange={(ev) => update(e.id, { endDate: ev.target.value })} className={clsx(inCls(), e.current && 'opacity-40 cursor-not-allowed')} />
                </InputRow>
              </div>
              <label className="flex items-center gap-2 cursor-pointer select-none">
                <Checkbox checked={e.current} onChange={(v) => update(e.id, { current: v, endDate: v ? '' : e.endDate })} />
                <span className="text-xs font-body text-khoj-text">I currently work here</span>
              </label>
              <InputRow label="Description (optional)">
                <textarea rows={3} value={e.description ?? ''} onChange={(ev) => update(e.id, { description: ev.target.value })} placeholder="Key responsibilities and achievements…" className={clsx(inCls(), 'resize-none')} />
              </InputRow>
            </div>
          )}
        </div>
      ))}
      <AddButton onClick={add} label="Add Experience" />
    </EditFormSection>
  )
}

// ── Shared helpers ─────────────────────────────────────────────────────────────

function InputRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-[10px] uppercase tracking-widest text-khoj-subtle font-body mb-1">{label}</label>
      {children}
    </div>
  )
}

function inCls() {
  return 'w-full bg-khoj-bg border border-khoj-border rounded-sm px-3 py-2 text-sm text-khoj-text font-body placeholder:text-khoj-muted focus:outline-none focus:border-khoj-accent/50 transition-colors'
}

function AddButton({ onClick, label }: { onClick: () => void; label: string }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="w-full py-2.5 border border-dashed border-khoj-border rounded-sm text-xs text-khoj-subtle hover:border-khoj-accent/40 hover:text-khoj-accent font-body transition-all"
    >
      + {label}
    </button>
  )
}

function Checkbox({ checked, onChange }: { checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <span
      onClick={() => onChange(!checked)}
      className={clsx('w-4 h-4 rounded-sm border flex items-center justify-center transition-all cursor-pointer', checked ? 'bg-khoj-teal/20 border-khoj-teal/60' : 'bg-transparent border-khoj-border')}
    >
      {checked && <span className="text-khoj-teal text-[10px] leading-none">✓</span>}
    </span>
  )
}
