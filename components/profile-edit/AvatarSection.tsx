// components/profile-edit/AvatarSection.tsx
// Thin card wrapper around AvatarUploader for the Edit Profile form.
// Receives form state and calls patch() on upload / remove.

'use client'

import { EditFormSection } from './EditFormSection'
import { AvatarUploader } from './AvatarUploader'
import type { PortfolioUser } from '@/lib/types'

interface Props {
  data: Partial<PortfolioUser>
  onChange: (patch: Partial<PortfolioUser>) => void
}

export function AvatarSection({ data, onChange }: Props) {
  const completeness = data.avatarUrl ? 100 : 0

  return (
    <EditFormSection title="Profile Photo" icon="◉" defaultOpen completeness={completeness}>
      <AvatarUploader
        currentUrl={data.avatarUrl}
        userName={data.name ?? 'U'}
        userId={data.uid ?? 'anonymous'}
        onUpload={(url) => onChange({ avatarUrl: url })}
        onRemove={() => onChange({ avatarUrl: undefined })}
      />
    </EditFormSection>
  )
}
