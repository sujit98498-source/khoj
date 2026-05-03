// components/jobs/JobForm.tsx
// Create / edit a job post — used in /recruiter/jobs (new) and inline edit.
// Fully controlled form; calls onSave(data) on submit.

'use client'

import { useState } from 'react'
import type {
  JobPost,
  WorkType,
  ExperienceLevel,
  JobCategory,
} from '@/lib/types'
import clsx from 'clsx'
import toast from 'react-hot-toast'

// ── Option definitions ────────────────────────────────────────────────────────

const WORK_TYPES: { value: WorkType; label: string }[] = [
  { value: 'remote', label: 'Remote' },
  { value: 'onsite', label: 'On-Site' },
  { value: 'hybrid', label: 'Hybrid' },
]

const EXPERIENCE_LEVELS: { value: ExperienceLevel; label: string }[] = [
  { value: 'intern', label: 'Internship' },
  { value: 'entry', label: 'Entry Level' },
  { value: 'mid', label: 'Mid Level' },
  { value: 'senior', label: 'Senior' },
  { value: 'lead', label: 'Lead / Staff' },
  { value: 'executive', label: 'Director / Executive' },
]

const CATEGORIES: JobCategory[] = [
  'Coding', 'Design', 'Esports', 'Startups', 'Marketing', 'Data', 'Product', 'Other',
]

const CURRENCIES = ['NPR', 'USD', 'INR', 'EUR', 'GBP']

// ── Default state ─────────────────────────────────────────────────────────────

const emptyForm = () => ({
  title: '',
  company: '',
  location: '',
  workType: 'remote' as WorkType,
  salaryMin: '',
  salaryMax: '',
  salaryCurrency: 'NPR',
  category: 'Coding' as JobCategory,
  experienceLevel: 'mid' as ExperienceLevel,
  requiredSkills: [] as string[],
  description: '',
  deadline: '',
  active: true,
})

type FormState = ReturnType<typeof emptyForm>

// ── Component ─────────────────────────────────────────────────────────────────

interface JobFormProps {
  /** Pre-fill fields for editing */
  initialData?: Partial<JobPost>
  /** Called with validated form data (sans id/meta) on save */
  onSave: (
    data: Omit<JobPost, 'id' | 'createdAt' | 'updatedAt' | 'applicationCount' | 'recruiterId' | 'recruiterName'>
  ) => void
  onCancel?: () => void
  loading?: boolean
}

// ── Helpers ────────────────────────────────────────────────────────────────────

function FieldLabel({ children, required }: { children: React.ReactNode; required?: boolean }) {
  return (
    <label className="text-[10px] uppercase tracking-widest font-body text-khoj-subtle mb-1 block">
      {children}
      {required && <span className="text-khoj-accent ml-0.5">*</span>}
    </label>
  )
}

function TextInput({
  value,
  onChange,
  placeholder,
  type = 'text',
  className,
}: {
  value: string
  onChange: (v: string) => void
  placeholder?: string
  type?: string
  className?: string
}) {
  return (
    <input
      type={type}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      className={clsx(
        'w-full bg-khoj-bg border border-khoj-border rounded-sm px-3 py-2 text-sm font-body text-khoj-text placeholder:text-khoj-muted',
        'focus:outline-none focus:border-khoj-accent/60 focus:ring-1 focus:ring-khoj-accent/20 transition-colors',
        className
      )}
    />
  )
}

function SelectInput<T extends string>({
  value,
  onChange,
  options,
}: {
  value: T
  onChange: (v: T) => void
  options: { value: T; label: string }[]
}) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value as T)}
      className="w-full bg-khoj-bg border border-khoj-border rounded-sm px-3 py-2 text-sm font-body text-khoj-text focus:outline-none focus:border-khoj-accent/60 transition-colors"
    >
      {options.map((o) => (
        <option key={o.value} value={o.value}>
          {o.label}
        </option>
      ))}
    </select>
  )
}

export function JobForm({ initialData, onSave, onCancel, loading }: JobFormProps) {
  const [form, setForm] = useState<FormState>(() => {
    if (!initialData) return emptyForm()
    return {
      title: initialData.title ?? '',
      company: initialData.company ?? '',
      location: initialData.location ?? '',
      workType: initialData.workType ?? 'remote',
      salaryMin: initialData.salaryMin?.toString() ?? '',
      salaryMax: initialData.salaryMax?.toString() ?? '',
      salaryCurrency: initialData.salaryCurrency ?? 'NPR',
      category: initialData.category ?? 'Coding',
      experienceLevel: initialData.experienceLevel ?? 'mid',
      requiredSkills: initialData.requiredSkills ?? [],
      description: initialData.description ?? '',
      deadline: initialData.deadline
        ? initialData.deadline.slice(0, 10) // ISO date → YYYY-MM-DD
        : '',
      active: initialData.active ?? true,
    }
  })

  const [skillInput, setSkillInput] = useState('')

  function set<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((prev) => ({ ...prev, [key]: value }))
  }

  function addSkill() {
    const skill = skillInput.trim()
    if (!skill) return
    if (form.requiredSkills.includes(skill)) return
    if (form.requiredSkills.length >= 10) {
      toast.error('Maximum 10 skills')
      return
    }
    set('requiredSkills', [...form.requiredSkills, skill])
    setSkillInput('')
  }

  function removeSkill(skill: string) {
    set('requiredSkills', form.requiredSkills.filter((s) => s !== skill))
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()

    if (!form.title.trim()) { toast.error('Job title is required'); return }
    if (!form.company.trim()) { toast.error('Company name is required'); return }
    if (!form.location.trim()) { toast.error('Location is required'); return }
    if (!form.description.trim()) { toast.error('Description is required'); return }
    if (!form.deadline) { toast.error('Deadline is required'); return }
    if (new Date(form.deadline) < new Date()) { toast.error('Deadline must be in the future'); return }
    if (form.requiredSkills.length === 0) { toast.error('Add at least one required skill'); return }

    onSave({
      title: form.title.trim(),
      company: form.company.trim(),
      location: form.location.trim(),
      workType: form.workType,
      salaryMin: form.salaryMin ? Number(form.salaryMin) : undefined,
      salaryMax: form.salaryMax ? Number(form.salaryMax) : undefined,
      salaryCurrency: form.salaryCurrency,
      category: form.category,
      experienceLevel: form.experienceLevel,
      requiredSkills: form.requiredSkills,
      description: form.description.trim(),
      deadline: new Date(form.deadline).toISOString(),
      active: form.active,
    })
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      {/* Row 1: Title + Company */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <FieldLabel required>Job Title</FieldLabel>
          <TextInput
            value={form.title}
            onChange={(v) => set('title', v)}
            placeholder="e.g. Senior Frontend Engineer"
          />
        </div>
        <div>
          <FieldLabel required>Company</FieldLabel>
          <TextInput
            value={form.company}
            onChange={(v) => set('company', v)}
            placeholder="e.g. NovaTech Labs"
          />
        </div>
      </div>

      {/* Row 2: Location + Work Type */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <FieldLabel required>Location</FieldLabel>
          <TextInput
            value={form.location}
            onChange={(v) => set('location', v)}
            placeholder="e.g. Kathmandu, Nepal or Remote"
          />
        </div>
        <div>
          <FieldLabel required>Work Type</FieldLabel>
          <SelectInput
            value={form.workType}
            onChange={(v) => set('workType', v)}
            options={WORK_TYPES}
          />
        </div>
      </div>

      {/* Row 3: Salary */}
      <div>
        <FieldLabel>Salary Range (optional)</FieldLabel>
        <div className="flex gap-2">
          <TextInput
            type="number"
            value={form.salaryMin}
            onChange={(v) => set('salaryMin', v)}
            placeholder="Min"
            className="flex-1"
          />
          <TextInput
            type="number"
            value={form.salaryMax}
            onChange={(v) => set('salaryMax', v)}
            placeholder="Max"
            className="flex-1"
          />
          <select
            value={form.salaryCurrency}
            onChange={(e) => set('salaryCurrency', e.target.value)}
            className="bg-khoj-bg border border-khoj-border rounded-sm px-2 py-2 text-xs font-body text-khoj-text focus:outline-none focus:border-khoj-accent/60 transition-colors"
          >
            {CURRENCIES.map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Row 4: Category + Experience Level */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <FieldLabel required>Category</FieldLabel>
          <select
            value={form.category}
            onChange={(e) => set('category', e.target.value as JobCategory)}
            className="w-full bg-khoj-bg border border-khoj-border rounded-sm px-3 py-2 text-sm font-body text-khoj-text focus:outline-none focus:border-khoj-accent/60 transition-colors"
          >
            {CATEGORIES.map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
        </div>
        <div>
          <FieldLabel required>Experience Level</FieldLabel>
          <SelectInput
            value={form.experienceLevel}
            onChange={(v) => set('experienceLevel', v)}
            options={EXPERIENCE_LEVELS}
          />
        </div>
      </div>

      {/* Row 5: Required Skills */}
      <div>
        <FieldLabel required>Required Skills</FieldLabel>
        <div className="flex gap-2">
          <TextInput
            value={skillInput}
            onChange={setSkillInput}
            placeholder="Type a skill and press Add"
            className="flex-1"
          />
          <button
            type="button"
            onClick={addSkill}
            className="text-xs font-body px-3 py-2 border border-khoj-accent/40 text-khoj-accent rounded-sm hover:bg-khoj-accent/10 transition-colors flex-shrink-0"
          >
            + Add
          </button>
        </div>
        {form.requiredSkills.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mt-2">
            {form.requiredSkills.map((skill) => (
              <span
                key={skill}
                className="inline-flex items-center gap-1 text-[10px] font-mono px-2 py-0.5 bg-khoj-accent/10 border border-khoj-accent/20 text-khoj-accent rounded-sm"
              >
                {skill}
                <button
                  type="button"
                  onClick={() => removeSkill(skill)}
                  className="hover:text-white ml-0.5 transition-colors"
                >
                  ×
                </button>
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Row 6: Description */}
      <div>
        <FieldLabel required>Job Description</FieldLabel>
        <textarea
          value={form.description}
          onChange={(e) => set('description', e.target.value)}
          placeholder="Describe the role, responsibilities, and what makes it exciting..."
          rows={6}
          className="w-full bg-khoj-bg border border-khoj-border rounded-sm px-3 py-2 text-sm font-body text-khoj-text placeholder:text-khoj-muted focus:outline-none focus:border-khoj-accent/60 focus:ring-1 focus:ring-khoj-accent/20 transition-colors resize-none leading-relaxed"
        />
        <p className="text-[9px] text-khoj-muted mt-1">{form.description.length} / 2000</p>
      </div>

      {/* Row 7: Deadline + Active toggle */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <FieldLabel required>Application Deadline</FieldLabel>
          <TextInput
            type="date"
            value={form.deadline}
            onChange={(v) => set('deadline', v)}
          />
        </div>
        <div className="flex flex-col justify-end pb-0.5">
          <label className="flex items-center gap-3 cursor-pointer group">
            <div
              onClick={() => set('active', !form.active)}
              className={clsx(
                'w-9 h-5 rounded-full border transition-colors relative',
                form.active ? 'bg-khoj-accent border-khoj-accent' : 'bg-khoj-bg border-khoj-border'
              )}
            >
              <span
                className={clsx(
                  'absolute top-0.5 w-4 h-4 rounded-full transition-all',
                  form.active ? 'left-4 bg-white' : 'left-0.5 bg-khoj-muted'
                )}
              />
            </div>
            <span className="text-[10px] uppercase tracking-widest font-body text-khoj-subtle">
              {form.active ? 'Active — accepting applications' : 'Inactive — paused'}
            </span>
          </label>
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-3 pt-2 border-t border-khoj-border">
        <button
          type="submit"
          disabled={loading}
          className="flex-1 sm:flex-none sm:min-w-[140px] py-2.5 px-5 bg-khoj-accent text-white text-xs font-body font-semibold rounded-sm hover:bg-khoj-accent/90 transition-colors disabled:opacity-50"
        >
          {loading ? 'Saving…' : initialData?.id ? 'Update Job' : 'Post Job'}
        </button>
        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            className="py-2.5 px-4 text-xs font-body text-khoj-subtle border border-khoj-border rounded-sm hover:text-khoj-text hover:border-khoj-accent/30 transition-colors"
          >
            Cancel
          </button>
        )}
      </div>
    </form>
  )
}
