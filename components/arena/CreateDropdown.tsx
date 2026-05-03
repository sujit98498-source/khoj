// components/arena/CreateDropdown.tsx
// The "+ Create" button with dropdown for Upload Video, Upload Clip, Go Live.

'use client'

import { useEffect, useRef, useState } from 'react'

interface CreateDropdownProps {
  onUploadVideo: () => void
  onUploadClip: () => void
  onGoLive: () => void
}

export function CreateDropdown({
  onUploadVideo,
  onUploadClip,
  onGoLive,
}: CreateDropdownProps) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [open])

  function pick(fn: () => void) {
    setOpen(false)
    fn()
  }

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-2 bg-[#ff5a00] hover:bg-orange-500 text-white text-sm font-bold px-4 py-2.5 rounded-xl transition-all shadow-lg shadow-orange-500/20"
      >
        <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
          <path d="M12 5v14M5 12h14" />
        </svg>
        Create
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-2 w-56 bg-[#13151d] border border-zinc-700/80 rounded-2xl shadow-2xl shadow-black/70 py-2 z-50 overflow-hidden">
          {/* Upload Video */}
          <button
            onClick={() => pick(onUploadVideo)}
            className="w-full flex items-center gap-3 px-4 py-3 hover:bg-white/5 transition-colors text-left group"
          >
            <div className="w-9 h-9 rounded-xl bg-[#ff5a00]/10 border border-[#ff5a00]/20 flex items-center justify-center flex-shrink-0 group-hover:bg-[#ff5a00]/20 transition-colors">
              <svg className="w-4.5 h-4.5 text-[#ff5a00]" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="2" y="2" width="20" height="20" rx="4" />
                <path d="m10 8 6 4-6 4V8z" fill="currentColor" stroke="none" />
              </svg>
            </div>
            <div>
              <p className="text-sm font-semibold text-white leading-tight">Upload Video</p>
              <p className="text-[11px] text-zinc-500 leading-tight mt-0.5">Long-form content</p>
            </div>
          </button>

          {/* Upload Clip */}
          <button
            onClick={() => pick(onUploadClip)}
            className="w-full flex items-center gap-3 px-4 py-3 hover:bg-white/5 transition-colors text-left group"
          >
            <div className="w-9 h-9 rounded-xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center flex-shrink-0 group-hover:bg-purple-500/20 transition-colors">
              <svg className="w-4.5 h-4.5 text-purple-400" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M15 2H9a1 1 0 0 0-1 1v18a1 1 0 0 0 1 1h6a1 1 0 0 0 1-1V3a1 1 0 0 0-1-1z" />
                <path d="m10 8 4 4-4 4V8z" fill="currentColor" stroke="none" />
              </svg>
            </div>
            <div>
              <p className="text-sm font-semibold text-white leading-tight">Upload Clip</p>
              <p className="text-[11px] text-zinc-500 leading-tight mt-0.5">Short highlights</p>
            </div>
          </button>

          <div className="mx-4 my-1 border-t border-zinc-700/60" />

          {/* Go Live */}
          <button
            onClick={() => pick(onGoLive)}
            className="w-full flex items-center gap-3 px-4 py-3 hover:bg-white/5 transition-colors text-left group"
          >
            <div className="w-9 h-9 rounded-xl bg-red-500/10 border border-red-500/20 flex items-center justify-center flex-shrink-0 group-hover:bg-red-500/20 transition-colors">
              <span className="w-2.5 h-2.5 rounded-full bg-red-500 animate-pulse" />
            </div>
            <div>
              <p className="text-sm font-semibold text-white leading-tight">Go Live</p>
              <p className="text-[11px] text-zinc-500 leading-tight mt-0.5">Start live stream</p>
            </div>
          </button>
        </div>
      )}
    </div>
  )
}
