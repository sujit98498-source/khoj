// components/profile-edit/BasicInfoSection.tsx
// Editable: name, username, headline, bio, field, location, contact email,
// availability toggle, contact visibility toggle.

'use client'

import { EditFormSection } from './EditFormSection'
import type { PortfolioUser } from '@/lib/types'
import clsx from 'clsx'

const FIELDS = ['Coding', 'Design', 'Esports', 'Startups', 'Career', 'Other']

interface Props {
  data: Partial<PortfolioUser>
  errors: Record<string, string>
  onChange: (patch: Partial<PortfolioUser>) => void
}

export function BasicInfoSection({ data, errors, onChange }: Props) {
  const filled = [
    data.name, data.username, data.headline, data.bio, data.field, data.location,
  ].filter(Boolean).length
  const completeness = Math.round((filled / 6) * 100)

  return (
    <EditFormSection title="Basic Info" icon="○" completeness={completeness}>
      {/* Name */}
      <Field label="Full Name" error={errors.name} required>
        <input
          type="text"
          value={data.name ?? ''}
          onChange={(e) => onChange({ name: e.target.value })}
          placeholder="Your full name"
          className={inputCls(!!errors.name)}
        />
      </Field>

      {/* Username */}
      <Field label="Username" error={errors.username} hint="Letters, numbers and underscores only">
        <div className="relative">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-khoj-subtle text-xs font-mono">
            @
          </span>
          <input
            type="text"
            value={data.username ?? ''}
            onChange={(e) => onChange({ username: e.target.value.replace(/[^a-z0-9_]/gi, '') })}
            placeholder="yourhandle"
            className={clsx(inputCls(!!errors.username), 'pl-7')}
          />
        </div>
      </Field>

      {/* Headline */}
      <Field label="Headline" error={errors.headline} hint="e.g. Full-Stack Developer & Open Source Contributor">
        <input
          type="text"
          value={data.headline ?? ''}
          onChange={(e) => onChange({ headline: e.target.value })}
          placeholder="Your professional one-liner"
          className={inputCls(!!errors.headline)}
        />
      </Field>

      {/* Bio */}
      <Field label="Bio" error={errors.bio}>
        <textarea
          rows={4}
          value={data.bio ?? ''}
          onChange={(e) => onChange({ bio: e.target.value })}
          placeholder="Tell the community who you are…"
          className={clsx(inputCls(!!errors.bio), 'resize-none')}
        />
        <p className="text-[10px] text-khoj-muted font-body mt-1 text-right">
          {(data.bio ?? '').length} / 400
        </p>
      </Field>

      {/* Field / Category */}
      <Field label="Category">
        <div className="flex flex-wrap gap-2">
          {FIELDS.map((f) => (
            <button
              key={f}
              type="button"
              onClick={() => onChange({ field: f })}
              className={clsx(
                'text-xs px-3 py-1.5 rounded-sm border font-body transition-all duration-150',
                data.field === f
                  ? 'bg-khoj-accent/15 border-khoj-accent/50 text-khoj-accent'
                  : 'bg-transparent border-khoj-border text-khoj-subtle hover:border-khoj-accent/30 hover:text-khoj-text'
              )}
            >
              {f}
            </button>
          ))}
        </div>
      </Field>

      {/* Location */}
      <Field label="Location" error={errors.location} hint="e.g. Kathmandu, Nepal">
        <input
          type="text"
          value={data.location ?? ''}
          onChange={(e) => onChange({ location: e.target.value })}
          placeholder="City, Country"
          className={inputCls(!!errors.location)}
        />
      </Field>

      {/* Contact email */}
      <Field label="Contact Email" error={errors.contactEmail}>
        <input
          type="email"
          value={data.contactEmail ?? ''}
          onChange={(e) => onChange({ contactEmail: e.target.value })}
          placeholder="hello@you.com"
          className={inputCls(!!errors.contactEmail)}
        />
      </Field>

      {/* Toggles */}
      <div className="flex flex-col sm:flex-row gap-4 pt-1">
        <Toggle
          label="Open to opportunities"
          description="Show the green 'Available' badge on your profile"
          value={!!data.availableForOpportunities}
          onChange={(v) => onChange({ availableForOpportunities: v })}
          color="teal"
        />
        <Toggle
          label="Show contact email publicly"
          description="Let visitors see your contact button"
          value={!!data.contactVisible}
          onChange={(v) => onChange({ contactVisible: v })}
          color="accent"
        />
      </div>
    </EditFormSection>
  )
}

// ── Local helpers ─────────────────────────────────────────────────────────────

function inputCls(hasError: boolean) {
  return clsx(
    'w-full bg-khoj-bg border rounded-sm px-3 py-2 text-sm text-khoj-text font-body',
    'placeholder:text-khoj-muted focus:outline-none transition-colors',
    hasError
      ? 'border-red-500/60 focus:border-red-500'
      : 'border-khoj-border focus:border-khoj-accent/50'
  )
}

function Field({
  label,
  hint,
  error,
  required,
  children,
}: {
  label: string
  hint?: string
  error?: string
  required?: boolean
  children: React.ReactNode
}) {
  return (
    <div>
      <label className="block text-[10px] uppercase tracking-widest text-khoj-subtle font-body mb-1.5">
        {label}
        {required && <span className="text-khoj-accent ml-1">*</span>}
      </label>
      {children}
      {hint && !error && <p className="text-[10px] text-khoj-muted font-body mt-1">{hint}</p>}
      {error && <p className="text-[10px] text-red-400 font-body mt-1">{error}</p>}
    </div>
  )
}

function Toggle({
  label,
  description,
  value,
  onChange,
  color,
}: {
  label: string
  description: string
  value: boolean
  onChange: (v: boolean) => void
  color: 'teal' | 'accent'
}) {
  const track = color === 'teal' ? 'bg-khoj-teal/30 border-khoj-teal/60' : 'bg-khoj-accent/30 border-khoj-accent/60'
  const thumb = color === 'teal' ? 'bg-khoj-teal' : 'bg-khoj-accent'

  return (
    <label className="flex items-start gap-3 cursor-pointer select-none flex-1">
      <button
        type="button"
        role="switch"
        aria-checked={value}
        onClick={() => onChange(!value)}
        className={clsx(
          'mt-0.5 w-9 h-5 rounded-full border transition-all duration-200 relative flex-shrink-0',
          value ? track : 'bg-khoj-muted/20 border-khoj-border'
        )}
      >
        <span
          className={clsx(
            'absolute top-0.5 w-4 h-4 rounded-full transition-all duration-200',
            value ? clsx('left-[18px]', thumb) : 'left-0.5 bg-khoj-subtle'
          )}
        />
      </button>
      <div>
        <p className="text-xs font-body text-khoj-text leading-tight">{label}</p>
        <p className="text-[10px] text-khoj-muted font-body mt-0.5">{description}</p>
      </div>
    </label>
  )
}
