// app/studio/earnings/page.tsx
// KHOJ Studio — Earnings (coming soon placeholder)

'use client'

import Link from 'next/link'

const LOCKED_CARDS = [
  {
    icon: '💰',
    title: 'Tips & Donations',
    description: 'Let your audience support you directly through one-time or recurring tips.',
    tag: 'Soon',
  },
  {
    icon: '🤝',
    title: 'Sponsorships',
    description: 'Partner with brands and companies looking to reach your audience.',
    tag: 'Soon',
  },
  {
    icon: '📢',
    title: 'Ad Revenue',
    description: 'Earn from ads served on your published videos and live streams.',
    tag: 'Soon',
  },
  {
    icon: '💸',
    title: 'Payouts',
    description: 'Withdraw your earned balance via your connected payment method.',
    tag: 'Soon',
  },
  {
    icon: '🏆',
    title: 'Tournament Prizes',
    description: 'Prize pool payouts from KHOJ tournaments you win.',
    tag: 'Soon',
  },
  {
    icon: '⭐',
    title: 'Creator Fund',
    description: 'Monthly allocation from the KHOJ Creator Fund for top-performing creators.',
    tag: 'Soon',
  },
]

export default function StudioEarningsPage() {
  return (
    <div className="p-8 space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-white text-2xl font-bold tracking-tight">Earnings</h1>
        <p className="text-zinc-500 text-sm mt-0.5">Monetise your content and audience</p>
      </div>

      {/* Coming soon banner */}
      <div className="relative overflow-hidden bg-gradient-to-br from-[#ff5a00]/20 to-[#0d0e14] border border-[#ff5a00]/30 rounded-2xl p-8">
        <div className="absolute inset-0 pointer-events-none">
          {/* decorative circles */}
          <div className="absolute -top-8 -right-8 w-48 h-48 rounded-full bg-[#ff5a00]/10" />
          <div className="absolute -bottom-12 -left-4 w-32 h-32 rounded-full bg-[#ff5a00]/5" />
        </div>
        <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="flex items-center gap-3">
              <span className="text-4xl">💎</span>
              <div>
                <h2 className="text-white text-xl font-bold">KHOJ Monetisation</h2>
                <p className="text-zinc-400 text-sm">Launching for creators with 500+ followers</p>
              </div>
            </div>
            <p className="text-zinc-400 text-sm max-w-xl mt-3">
              We're building a monetisation ecosystem for KHOJ creators. Grow your audience now to be first in line when earnings go live.
            </p>
          </div>
          <div className="flex-shrink-0 text-center bg-[#0d0e14]/60 border border-[#ff5a00]/30 rounded-xl px-6 py-4 space-y-1">
            <p className="text-[#ff5a00] text-3xl font-black">0</p>
            <p className="text-zinc-500 text-xs">Lifetime Earnings (USD)</p>
          </div>
        </div>
      </div>

      {/* Locked monetisation cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {LOCKED_CARDS.map((card) => (
          <div
            key={card.title}
            className="bg-[#0d0e14] border border-[#1e1e2e] rounded-2xl p-5 space-y-3 relative overflow-hidden opacity-70 select-none"
          >
            {/* Lock overlay */}
            <div className="absolute inset-0 flex items-center justify-center bg-zinc-950/40 backdrop-blur-[1px] z-10 rounded-2xl">
              <div className="flex flex-col items-center gap-1">
                <svg className="w-6 h-6 text-zinc-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/>
                </svg>
                <span className="text-zinc-400 text-[10px] font-bold uppercase tracking-wider">{card.tag}</span>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-2xl">{card.icon}</span>
              <h3 className="text-white text-sm font-bold">{card.title}</h3>
            </div>
            <p className="text-zinc-500 text-xs leading-relaxed">{card.description}</p>
          </div>
        ))}
      </div>

      {/* Progress toward eligibility */}
      <div className="bg-[#0d0e14] border border-[#1e1e2e] rounded-2xl p-6 space-y-4">
        <h2 className="text-white text-sm font-bold">Eligibility Progress</h2>
        <div className="space-y-3">
          <EligibilityRow label="Followers" current={0} required={500} unit="followers" />
          <EligibilityRow label="Published Videos" current={0} required={3} unit="videos" />
          <EligibilityRow label="Total Views" current={0} required={1000} unit="views" />
          <EligibilityRow label="Account Age" current={0} required={30} unit="days" />
        </div>
        <p className="text-zinc-600 text-xs pt-1">
          Meet all criteria to unlock monetisation. Requirements subject to change.
        </p>
      </div>
    </div>
  )
}

function EligibilityRow({ label, current, required, unit }: {
  label: string; current: number; required: number; unit: string
}) {
  const pct = Math.min((current / required) * 100, 100)
  const met = current >= required

  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between text-xs">
        <span className="text-zinc-400 font-semibold">{label}</span>
        <span className={met ? 'text-emerald-400 font-bold' : 'text-zinc-500'}>
          {met ? '✓ Met' : `${current} / ${required} ${unit}`}
        </span>
      </div>
      <div className="h-1.5 bg-zinc-800 rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full transition-all ${met ? 'bg-emerald-500' : 'bg-[#ff5a00]'}`}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  )
}
