// components/streams/KeyFeaturesPanel.tsx
// Static "Key Features" sidebar panel for the stream room.

'use client'

const FEATURES = [
  {
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5">
        <path d="m15 10 4.553-2.069A1 1 0 0 1 21 8.87v6.26a1 1 0 0 1-1.447.894L15 14" />
        <rect x="3" y="8" width="12" height="8" rx="2" />
      </svg>
    ),
    title: 'High quality video',
    desc: 'HD video with low latency',
  },
  {
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5">
        <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
      </svg>
    ),
    title: 'Real-time chat',
    desc: 'Live chat with all viewers',
  },
  {
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5">
        <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
        <circle cx="9" cy="7" r="4" />
        <line x1="19" y1="8" x2="19" y2="14" />
        <line x1="22" y1="11" x2="16" y2="11" />
      </svg>
    ),
    title: 'Join requests',
    desc: 'Host control over who joins',
  },
  {
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5">
        <rect x="2" y="3" width="20" height="14" rx="2" />
        <line x1="8" y1="21" x2="16" y2="21" />
        <line x1="12" y1="17" x2="12" y2="21" />
      </svg>
    ),
    title: 'Screen sharing',
    desc: 'Share your screen easily',
  },
  {
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5">
        <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
        <circle cx="9" cy="7" r="4" />
        <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
        <path d="M16 3.13a4 4 0 0 1 0 7.75" />
      </svg>
    ),
    title: 'Participant management',
    desc: 'Mute, remove, or promote',
  },
  {
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5">
        <polyline points="22 7 13.5 15.5 8.5 10.5 2 17" />
        <polyline points="16 7 22 7 22 13" />
      </svg>
    ),
    title: 'Stream analytics',
    desc: 'Live viewer count & stats',
  },
]

export function KeyFeaturesPanel() {
  return (
    <div className="p-5">
      <h2 className="text-white font-bold text-base mb-5">Key Features</h2>
      <div className="space-y-4">
        {FEATURES.map((f) => (
          <div key={f.title} className="flex items-start gap-3">
            <div className="w-9 h-9 rounded-xl bg-[#ff5a00]/10 border border-[#ff5a00]/20 flex items-center justify-center flex-shrink-0 text-[#ff5a00]">
              {f.icon}
            </div>
            <div className="flex-1 min-w-0 pt-0.5">
              <p className="text-white text-sm font-semibold leading-tight">{f.title}</p>
              <p className="text-zinc-500 text-xs mt-0.5 leading-relaxed">{f.desc}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
