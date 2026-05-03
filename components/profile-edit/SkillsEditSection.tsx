// components/profile-edit/SkillsSection.tsx
// Add / remove skill tags with a tag-input UX.

'use client'

import { useState, KeyboardEvent } from 'react'
import { EditFormSection } from './EditFormSection'
import clsx from 'clsx'

interface Props {
  skills: string[]
  onChange: (skills: string[]) => void
}

export function SkillsEditSection({ skills, onChange }: Props) {
  const [input, setInput] = useState('')

  function addSkill() {
    const trimmed = input.trim()
    if (!trimmed || skills.includes(trimmed)) {
      setInput('')
      return
    }
    onChange([...skills, trimmed])
    setInput('')
  }

  function removeSkill(skill: string) {
    onChange(skills.filter((s) => s !== skill))
  }

  function handleKey(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault()
      addSkill()
    }
    if (e.key === 'Backspace' && input === '' && skills.length > 0) {
      removeSkill(skills[skills.length - 1])
    }
  }

  const completeness = Math.min(100, Math.round((skills.length / 5) * 100))

  return (
    <EditFormSection title="Skills" icon="◈" completeness={completeness}>
      {/* Tag input */}
      <div
        className={clsx(
          'min-h-[48px] flex flex-wrap gap-1.5 items-center border border-khoj-border rounded-sm px-3 py-2',
          'bg-khoj-bg focus-within:border-khoj-accent/50 transition-colors cursor-text'
        )}
        onClick={() => document.getElementById('skill-input')?.focus()}
      >
        {skills.map((skill) => (
          <span
            key={skill}
            className="flex items-center gap-1 text-xs px-2 py-0.5 bg-khoj-teal/10 border border-khoj-teal/30 text-khoj-teal rounded-sm font-body"
          >
            {skill}
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); removeSkill(skill) }}
              className="text-khoj-teal/60 hover:text-khoj-teal ml-0.5 text-[10px] leading-none"
              aria-label={`Remove ${skill}`}
            >
              ✕
            </button>
          </span>
        ))}
        <input
          id="skill-input"
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKey}
          onBlur={addSkill}
          placeholder={skills.length === 0 ? 'Type a skill and press Enter…' : '+ Add'}
          className="flex-1 min-w-[120px] bg-transparent text-sm text-khoj-text font-body placeholder:text-khoj-muted focus:outline-none"
        />
      </div>
      <p className="text-[10px] text-khoj-muted font-body">
        Press <kbd className="px-1 py-0.5 bg-khoj-card border border-khoj-border rounded text-[9px]">Enter</kbd> or{' '}
        <kbd className="px-1 py-0.5 bg-khoj-card border border-khoj-border rounded text-[9px]">,</kbd> to add.
        Backspace removes the last tag.
      </p>
    </EditFormSection>
  )
}
