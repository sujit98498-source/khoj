// components/messages/MoreMenu.tsx
// Dropdown "more actions" menu for the chat header (three-dot button).
// Closes on outside click, Escape key, or when an item is selected.

'use client'

import { useEffect, useRef } from 'react'
import Link from 'next/link'
import clsx from 'clsx'
import toast from 'react-hot-toast'

interface MoreMenuItem {
  label: string
  icon: React.ReactNode
  onClick?: () => void
  href?: string
  variant?: 'default' | 'danger'
}

interface MoreMenuProps {
  otherUid: string
  otherName: string
  onClose: () => void
}

export function MoreMenu({ otherUid, otherName, onClose }: MoreMenuProps) {
  const menuRef = useRef<HTMLDivElement>(null)

  // Close on Escape
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [onClose])

  // Close on outside click
  useEffect(() => {
    function onOutside(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        onClose()
      }
    }
    // Use mousedown so it fires before click handlers on the trigger button
    document.addEventListener('mousedown', onOutside)
    return () => document.removeEventListener('mousedown', onOutside)
  }, [onClose])

  function noop(label: string) {
    onClose()
    toast(`"${label}" feature coming soon`, {
      style: {
        background: '#1a1a1a',
        color: '#e5e5e5',
        border: '1px solid #2a2a2a',
        fontFamily: 'var(--font-body)',
        fontSize: '13px',
      },
    })
  }

  const items: MoreMenuItem[] = [
    {
      label: 'View Profile',
      href: `/profile/${otherUid}`,
      icon: (
        <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="8" r="4" />
          <path d="M4 20c0-4 3.6-7 8-7s8 3 8 7" />
        </svg>
      ),
    },
    {
      label: 'Mute Notifications',
      onClick: () => noop('Mute Notifications'),
      icon: (
        <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
          <path d="M13.73 21a2 2 0 0 1-3.46 0" />
          <path d="M18.63 13A17.9 17.9 0 0 1 18 8" />
          <path d="M6.26 6.26A5.86 5.86 0 0 0 6 8c0 7-3 9-3 9h14" />
          <path d="M18 8a6 6 0 0 0-9.33-5" />
          <line x1="2" y1="2" x2="22" y2="22" />
        </svg>
      ),
    },
    {
      label: 'Search in Conversation',
      onClick: () => noop('Search in Conversation'),
      icon: (
        <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="11" cy="11" r="8" />
          <path d="m21 21-4.35-4.35" />
        </svg>
      ),
    },
    {
      label: 'Clear Chat',
      onClick: () => noop('Clear Chat'),
      icon: (
        <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="3 6 5 6 21 6" />
          <path d="M19 6l-1 14H6L5 6" />
          <path d="M10 11v6M14 11v6" />
          <path d="M9 6V4h6v2" />
        </svg>
      ),
    },
    {
      label: `Block ${otherName}`,
      onClick: () => noop(`Block ${otherName}`),
      variant: 'danger',
      icon: (
        <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="10" />
          <line x1="4.93" y1="4.93" x2="19.07" y2="19.07" />
        </svg>
      ),
    },
    {
      label: `Report ${otherName}`,
      onClick: () => noop(`Report ${otherName}`),
      variant: 'danger',
      icon: (
        <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
          <path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z" />
          <line x1="4" y1="22" x2="4" y2="15" />
        </svg>
      ),
    },
  ]

  return (
    <div
      ref={menuRef}
      className="absolute right-0 top-full mt-2 w-52 bg-khoj-card border border-khoj-border rounded-xl shadow-2xl shadow-black/40 z-40 overflow-hidden"
      role="menu"
    >
      {items.map((item, i) => {
        const baseClass = clsx(
          'w-full flex items-center gap-3 px-4 py-2.5 text-sm font-body transition-colors text-left',
          item.variant === 'danger'
            ? 'text-red-400 hover:bg-red-500/10 hover:text-red-300'
            : 'text-khoj-subtle hover:bg-khoj-border/30 hover:text-khoj-text'
        )

        // Separator before the danger zone
        const showSep = i > 0 && item.variant === 'danger' && items[i - 1].variant !== 'danger'

        return (
          <div key={item.label}>
            {showSep && <div className="h-px bg-khoj-border/50 mx-3 my-1" />}
            {item.href ? (
              <Link href={item.href} className={baseClass} onClick={onClose} role="menuitem">
                {item.icon}
                {item.label}
              </Link>
            ) : (
              <button
                type="button"
                className={baseClass}
                onClick={item.onClick}
                role="menuitem"
              >
                {item.icon}
                {item.label}
              </button>
            )}
          </div>
        )
      })}
    </div>
  )
}
