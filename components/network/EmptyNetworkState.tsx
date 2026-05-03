import Link from 'next/link'
import type { NetworkTab } from '@/services/networkService'

interface EmptyNetworkStateProps {
  tab: NetworkTab
  search?: string
}

const COPY: Record<NetworkTab, { title: string; body: string; cta: string; href: string }> = {
  connections: {
    title: 'No connections yet',
    body: 'Build your professional circle by connecting with founders, creators, and builders.',
    cta: 'Discover people in Community',
    href: '/community',
  },
  followers: {
    title: 'No followers yet',
    body: 'Publish proof, join rooms, and share progress so others can discover your work.',
    cta: 'Browse Arena',
    href: '/arena',
  },
  following: {
    title: 'Not following anyone yet',
    body: 'Follow people whose projects, startup rooms, or learning journey you want to track.',
    cta: 'Explore startup rooms',
    href: '/rooms',
  },
}

export function EmptyNetworkState({ tab, search }: EmptyNetworkStateProps) {
  if (search?.trim()) {
    return (
      <div className="flex flex-col items-center justify-center rounded-sm border border-khoj-border bg-khoj-card px-6 py-16 text-center">
        <p className="text-sm font-semibold text-khoj-text">No people match "{search}"</p>
        <p className="mt-1 text-xs text-khoj-subtle">Try a different name or clear the search.</p>
      </div>
    )
  }

  const copy = COPY[tab]
  return (
    <div className="flex flex-col items-center justify-center rounded-sm border border-khoj-border bg-khoj-card px-6 py-16 text-center">
      <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-sm border border-khoj-accent/30 bg-khoj-accent/10 text-khoj-accent">
        ◈
      </div>
      <p className="text-base font-display font-bold text-khoj-text">{copy.title}</p>
      <p className="mt-2 max-w-sm text-sm leading-6 text-khoj-subtle">{copy.body}</p>
      <Link
        href={copy.href}
        className="mt-5 rounded-sm border border-khoj-accent/40 px-4 py-2 text-xs font-semibold uppercase tracking-[0.14em] text-khoj-accent transition-colors hover:bg-khoj-accent/10"
      >
        {copy.cta}
      </Link>
    </div>
  )
}
