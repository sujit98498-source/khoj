// components/ui/XPBar.tsx
// Animated XP progress bar showing level progression

'use client'

import { useEffect, useState } from 'react'
import clsx from 'clsx'

interface XPBarProps {
  xp: number
  className?: string
}

// Level thresholds
const LEVELS = [0, 100, 300, 600, 1000, 2000, 5000]
const LEVEL_NAMES = ['Rookie', 'Contender', 'Challenger', 'Expert', 'Elite', 'Legend', 'GOAT']

export function getLevel(xp: number): { level: number; name: string; progress: number; nextXP: number } {
  let level = 0
  for (let i = 0; i < LEVELS.length - 1; i++) {
    if (xp >= LEVELS[i]) level = i
  }
  const currentThreshold = LEVELS[level]
  const nextThreshold = LEVELS[level + 1] ?? LEVELS[level] * 2
  const progress = ((xp - currentThreshold) / (nextThreshold - currentThreshold)) * 100
  return {
    level: level + 1,
    name: LEVEL_NAMES[level],
    progress: Math.min(progress, 100),
    nextXP: nextThreshold,
  }
}

export function XPBar({ xp, className }: XPBarProps) {
  const { level, name, progress, nextXP } = getLevel(xp)
  const [animatedWidth, setAnimatedWidth] = useState(0)

  useEffect(() => {
    const timer = setTimeout(() => setAnimatedWidth(progress), 100)
    return () => clearTimeout(timer)
  }, [progress])

  return (
    <div className={clsx('flex flex-col gap-2', className)}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-[10px] uppercase tracking-[0.15em] text-khoj-subtle font-body">Level {level}</span>
          <span className="text-xs font-body font-semibold text-khoj-accent">{name}</span>
        </div>
        <span className="text-[10px] text-khoj-subtle font-mono">
          {xp.toLocaleString()} / {nextXP.toLocaleString()} XP
        </span>
      </div>
      <div className="w-full h-1.5 bg-khoj-border rounded-full overflow-hidden">
        <div
          className="h-full bg-gradient-to-r from-khoj-accent to-khoj-gold rounded-full transition-all duration-1000 ease-out"
          style={{ width: `${animatedWidth}%` }}
        />
      </div>
    </div>
  )
}
