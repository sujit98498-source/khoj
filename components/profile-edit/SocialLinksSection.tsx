// components/profile-edit/SocialLinksSection.tsx
// Edit all social / portfolio links with URL validation.

'use client'

import { EditFormSection } from './EditFormSection'
import type { PortfolioSocialLinks } from '@/lib/types'
import clsx from 'clsx'

const LINK_FIELDS: { key: keyof PortfolioSocialLinks; label: string; icon: string; placeholder: string }[] = [
  { key: 'github',   label: 'GitHub',      icon: '⌥', placeholder: 'https://github.com/you' },
  { key: 'linkedin', label: 'LinkedIn',    icon: '◧', placeholder: 'https://linkedin.com/in/you' },
  { key: 'twitter',  label: 'Twitter / X', icon: '◩', placeholder: 'https://twitter.com/you' },
  { key: 'website',  label: 'Website',     icon: '◈', placeholder: 'https://yoursite.com' },
  { key: 'instagram',label: 'Instagram',   icon: '◉', placeholder: 'https://instagram.com/you' },
]

function isValidUrl(v: string) {
  if (!v) return true
  try { new URL(v); return true } catch { return false }
}

interface Props {
  links: PortfolioSocialLinks
  errors: Record<string, string>
  onChange: (links: PortfolioSocialLinks) => void
}

export function SocialLinksSection({ links, errors, onChange }: Props) {
  const filled = LINK_FIELDS.filter((f) => links[f.key]).length
  const completeness = Math.round((filled / LINK_FIELDS.length) * 100)

  function handleChange(key: keyof PortfolioSocialLinks, value: string) {
    onChange({ ...links, [key]: value })
  }

  return (
    <EditFormSection title="Social & Links" icon="◧" completeness={completeness}>
      {LINK_FIELDS.map(({ key, label, icon, placeholder }) => {
        const val = links[key] ?? ''
        const hasError = !isValidUrl(val) || !!errors[`social_${key}`]
        return (
          <div key={key}>
            <label className="block text-[10px] uppercase tracking-widest text-khoj-subtle font-body mb-1.5">
              <span className="mr-1">{icon}</span>{label}
            </label>
            <input
              type="url"
              value={val}
              onChange={(e) => handleChange(key, e.target.value)}
              placeholder={placeholder}
              className={clsx(
                'w-full bg-khoj-bg border rounded-sm px-3 py-2 text-sm text-khoj-text font-body',
                'placeholder:text-khoj-muted focus:outline-none transition-colors',
                hasError && val
                  ? 'border-red-500/60 focus:border-red-500'
                  : 'border-khoj-border focus:border-khoj-accent/50'
              )}
            />
            {hasError && val && (
              <p className="text-[10px] text-red-400 font-body mt-1">Enter a valid URL (https://…)</p>
            )}
          </div>
        )
      })}
    </EditFormSection>
  )
}
