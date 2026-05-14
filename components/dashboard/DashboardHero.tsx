// components/dashboard/DashboardHero.tsx
// Premium hero section for KHOJ dashboard.
// Contains: welcome text, tagline, XP bar, level badge, quick action buttons.

'use client'

import Link from 'next/link'
import { KhojUser } from '@/lib/types'
import { getLevel } from '@/components/ui/XPBar'
import { useEffect, useState } from 'react'

interface DashboardHeroProps {
  user: KhojUser
}

const QUICK_ACTIONS = [
  { icon: '▶', label: 'Explore Arena',       href: '/arena',   accent: false },
  { icon: '▶', label: 'Upload Video',        href: '/studio',  accent: false },
  { icon: '◈', label: 'Startup Room',         href: '/rooms',   accent: false },
  { icon: '◫', label: 'Growth Roadmap',       href: '/khoj-ai', accent: true  },
] as const

export function DashboardHero({ user }: DashboardHeroProps) {
  const { level, name: levelName, progress, nextXP } = getLevel(user.xp)
  const [animWidth, setAnimWidth] = useState(0)
  const firstName = user.name.split(' ')[0]

  useEffect(() => {
    const t = setTimeout(() => setAnimWidth(progress), 150)
    return () => clearTimeout(t)
  }, [progress])

  return (
    <div
      className="relative overflow-hidden rounded-lg border border-khoj-border"
      style={{
        background:
          'linear-gradient(135deg, #0f0f10 0%, #141416 40%, #1a1008 70%, #0f0f10 100%)',
        boxShadow: '0 0 60px rgba(255, 77, 0, 0.08), 0 0 120px rgba(255, 77, 0, 0.04)',
      }}
    >
      {/* Glow orb top-right */}
      <div
        className="pointer-events-none absolute -top-20 -right-20 w-72 h-72 rounded-full opacity-20"
        style={{
          background:
            'radial-gradient(circle, rgba(255,77,0,0.6) 0%, rgba(255,184,0,0.2) 50%, transparent 70%)',
        }}
        aria-hidden
      />
      {/* Glow orb bottom-left */}
      <div
        className="pointer-events-none absolute -bottom-16 -left-10 w-48 h-48 rounded-full opacity-10"
        style={{
          background:
            'radial-gradient(circle, rgba(0,212,170,0.5) 0%, transparent 70%)',
        }}
        aria-hidden
      />

      <div className="relative z-10 px-7 py-7">
        {/* Top row: greeting + level badge */}
        <div className="flex items-start justify-between gap-4 flex-wrap mb-5">
          <div>
            <p className="text-[10px] uppercase tracking-[0.22em] text-khoj-accent font-body font-semibold mb-1.5">
              Dashboard
            </p>
            <h1 className="text-2xl sm:text-3xl font-display font-extrabold text-white leading-tight">
              Welcome back, {firstName} 👋
            </h1>
            <p className="text-sm text-khoj-subtle font-body mt-1.5 tracking-wide">
              Create.&nbsp; Compete.&nbsp; Collaborate.&nbsp; Win.
            </p>
          </div>

          {/* Level pill */}
          <div className="flex-shrink-0 flex items-center gap-2 bg-white/5 border border-white/10 rounded-sm px-3 py-2">
            <span className="text-xs text-khoj-subtle font-body">Level</span>
            <span className="text-lg font-display font-extrabold text-khoj-accent leading-none">
              {level}
            </span>
            <span className="text-xs font-semibold text-khoj-gold tracking-wide">
              {levelName}
            </span>
          </div>
        </div>

        {/* XP progress bar */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-[10px] uppercase tracking-[0.15em] text-khoj-subtle font-body">
              XP Progress
            </span>
            <span className="text-[10px] font-mono text-khoj-subtle">
              {user.xp.toLocaleString()}&nbsp;/&nbsp;{nextXP.toLocaleString()} XP
            </span>
          </div>
          <div className="w-full h-1.5 bg-white/10 rounded-full overflow-hidden">
            <div
              className="h-full rounded-full transition-all duration-1000 ease-out"
              style={{
                width: `${animWidth}%`,
                background: 'linear-gradient(90deg, #FF4D00, #FFB800)',
                boxShadow: '0 0 8px rgba(255,77,0,0.5)',
              }}
            />
          </div>
        </div>

        {/* Quick action buttons */}
        <div className="flex gap-2.5 flex-wrap">
          {QUICK_ACTIONS.map((action) => (
            <Link
              key={action.href}
              href={action.href}
              className={
                action.accent
                  ? 'inline-flex items-center gap-1.5 px-4 py-2 rounded-sm text-xs font-bold uppercase tracking-[0.1em] text-white transition-all duration-200 hover:-translate-y-px hover:shadow-[0_4px_16px_rgba(255,77,0,0.45)]'
                  : 'inline-flex items-center gap-1.5 px-4 py-2 rounded-sm text-xs font-semibold uppercase tracking-[0.1em] text-khoj-text transition-all duration-200 hover:-translate-y-px hover:border-khoj-accent/50 hover:text-white'
              }
              style={
                action.accent
                  ? { background: 'linear-gradient(135deg, #FF4D00, #FF7A00)' }
                  : {
                      background: 'rgba(255,255,255,0.05)',
                      border: '1px solid rgba(255,255,255,0.1)',
                    }
              }
            >
              <span aria-hidden className="text-sm">{action.icon}</span>
              {action.label}
            </Link>
          ))}
        </div>
      </div>
    </div>
  )
}
