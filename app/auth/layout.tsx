// app/auth/layout.tsx
// Shared layout for all auth pages — full-screen centered design

import { ReactNode } from 'react'

export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-khoj-bg grid-bg flex items-center justify-center px-4 relative overflow-hidden">
      {/* Ambient glow blobs */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-96 h-96 bg-khoj-accent/5 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 w-64 h-64 bg-khoj-teal/3 rounded-full blur-3xl pointer-events-none" />

      <div className="w-full max-w-sm relative z-10 animate-fade-in">
        {/* Logo */}
        <div className="flex items-center gap-3 mb-10 justify-center">
          <div className="w-9 h-9 bg-khoj-accent rounded-sm flex items-center justify-center animate-glow">
            <span className="text-white font-display font-bold">K</span>
          </div>
          <span className="text-2xl font-display font-bold text-khoj-text tracking-widest">KHOJ</span>
        </div>

        {/* Card */}
        <div className="bg-khoj-card border border-khoj-border rounded-sm p-8">
          {children}
        </div>

        <p className="text-center text-[10px] text-khoj-muted font-body mt-6 tracking-wider uppercase">
          Compete · Earn · Unlock
        </p>
      </div>
    </div>
  )
}
