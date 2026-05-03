'use client'

import type { NetworkCounts, NetworkTab } from '@/services/networkService'
import clsx from 'clsx'

interface NetworkTabsProps {
  activeTab: NetworkTab
  counts: NetworkCounts
  onChange: (tab: NetworkTab) => void
}

const TABS: Array<{ id: NetworkTab; label: string }> = [
  { id: 'connections', label: 'Connections' },
  { id: 'followers', label: 'Followers' },
  { id: 'following', label: 'Following' },
]

export function NetworkTabs({ activeTab, counts, onChange }: NetworkTabsProps) {
  return (
    <div className="flex gap-1 overflow-x-auto border-b border-khoj-border">
      {TABS.map((tab) => (
        <button
          key={tab.id}
          type="button"
          onClick={() => onChange(tab.id)}
          className={clsx(
            'flex items-center gap-2 border-b-2 px-4 py-3 text-sm font-body font-semibold transition-colors -mb-px',
            activeTab === tab.id
              ? 'border-khoj-accent text-khoj-accent'
              : 'border-transparent text-khoj-subtle hover:text-khoj-text'
          )}
        >
          {tab.label}
          <span
            className={clsx(
              'rounded-sm px-1.5 py-0.5 text-[10px] font-mono',
              activeTab === tab.id
                ? 'bg-khoj-accent/15 text-khoj-accent'
                : 'border border-khoj-border bg-khoj-bg text-khoj-muted'
            )}
          >
            {counts[tab.id]}
          </span>
        </button>
      ))}
    </div>
  )
}
