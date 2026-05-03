// components/community/CommunitySidebar.tsx
// Right sidebar for community page
// Sections: Trending · Top Contributors · Circles · Guidelines

'use client'

import { CIRCLES } from '@/lib/types'
import Link from 'next/link'
import clsx from 'clsx'
import { ReactNode } from 'react'

const TRENDING = [
  { tag: '#Web3Tournament', count: 234, hot: true },
  { tag: '#BuildInPublic', count: 189, hot: true },
  { tag: '#DSAGrind', count: 156, hot: false },
  { tag: '#StartupPitch', count: 98, hot: false },
  { tag: '#TeamSearch', count: 77, hot: false },
  { tag: '#CareerSwitch', count: 61, hot: false },
]

const TOP_CONTRIBUTORS = [
  { name: 'Arjun Mehta', xp: 2340, posts: 34, badge: '🏆' },
  { name: 'Sara Qureshi', xp: 3100, posts: 28, badge: '⚡' },
  { name: 'Meena Krishnan', xp: 1440, posts: 22, badge: '◈' },
  { name: 'Priya Sharma', xp: 1890, posts: 19, badge: '🔥' },
  { name: 'Rishikesh Nair', xp: 560, posts: 15, badge: '◉' },
]

export function CommunitySidebar() {
  return (
    <div className="space-y-5">
      <SidebarCard title="Trending">
        <div className="space-y-2">
          {TRENDING.map((t) => (
            <div key={t.tag} className="flex items-center justify-between">
              <button className="text-xs text-khoj-subtle font-body hover:text-khoj-accent transition-colors text-left">
                {t.tag}
              </button>
              <div className="flex items-center gap-1.5">
                {t.hot && <span className="text-xs">🔥</span>}
                <span className="text-[10px] font-mono text-khoj-muted">{t.count}</span>
              </div>
            </div>
          ))}
        </div>
      </SidebarCard>

      <SidebarCard title="Top Contributors">
        <div className="space-y-3">
          {TOP_CONTRIBUTORS.map((c, i) => {
            const colors = ['#FF4D00', '#FFB800', '#00D4AA', '#6366f1', '#ec4899']
            const color = colors[c.name.charCodeAt(0) % colors.length]
            return (
              <div key={c.name} className="flex items-center gap-3">
                <span className="text-xs font-mono text-khoj-muted w-4 text-center">
                  {i + 1}
                </span>
                <div
                  className="w-7 h-7 rounded-sm flex-shrink-0 flex items-center justify-center font-display font-bold text-[11px]"
                  style={{ backgroundColor: `${color}20`, border: `1px solid ${color}40`, color }}
                >
                  {c.name.charAt(0)}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-body font-medium text-khoj-text truncate">{c.name}</p>
                  <p className="text-[10px] text-khoj-muted font-body">
                    {c.posts} posts · {c.xp} XP
                  </p>
                </div>
                <span className="text-sm">{c.badge}</span>
              </div>
            )
          })}
        </div>
      </SidebarCard>

      <SidebarCard title="Explore Circles">
        <div className="flex flex-wrap gap-2">
          {CIRCLES.map((c) => (
            <button
              key={c.id}
              className={clsx(
                'flex items-center gap-1 px-2.5 py-1 rounded-sm border border-khoj-border text-[11px] font-body transition-all duration-150 hover:border-khoj-muted hover:text-khoj-text',
                c.color
              )}
            >
              {c.icon} {c.label}
            </button>
          ))}
        </div>
      </SidebarCard>

      <SidebarCard title="Saved Posts">
        <div className="space-y-2">
          <p className="text-xs text-khoj-subtle font-body leading-relaxed">
            Revisit the posts you bookmarked from the Community feed.
          </p>
          <Link
            href="/community/saved"
            className="block text-[10px] uppercase tracking-wider text-khoj-accent hover:underline font-body"
          >
            Open saved posts →
          </Link>
        </div>
      </SidebarCard>

      <SidebarCard title="Community Guidelines">
        <div className="space-y-2.5">
          {[
            { icon: '◈', text: 'Be real, be generous, be direct' },
            { icon: '▲', text: 'Share proof, not just promises' },
            { icon: '◉', text: 'No spam, no self-promotion spam' },
            { icon: '⬡', text: 'Support people who are building' },
            { icon: '○', text: 'Critique ideas, not people' },
          ].map((g) => (
            <div key={g.icon} className="flex items-start gap-2">
              <span className="text-xs text-khoj-accent mt-0.5 flex-shrink-0">{g.icon}</span>
              <p className="text-[11px] text-khoj-subtle font-body leading-relaxed">{g.text}</p>
            </div>
          ))}
        </div>
      </SidebarCard>

      <SidebarCard title="Community Rank">
        <div className="space-y-2">
          <p className="text-xs text-khoj-subtle font-body leading-relaxed">
            Community reputation is earned through quality posts, helpful comments, and reactions from peers.
          </p>
          <Link
            href="/leaderboard"
            className="block text-[10px] uppercase tracking-wider text-khoj-accent hover:underline font-body mt-2"
          >
            View full leaderboard →
          </Link>
        </div>
      </SidebarCard>
    </div>
  )
}

function SidebarCard({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="bg-khoj-card border border-khoj-border rounded-sm p-4">
      <p className="text-[10px] uppercase tracking-widest text-khoj-subtle font-body mb-3">{title}</p>
      {children}
    </div>
  )
}