// components/recruiter/ContactModal.tsx
// Shows candidate contact information to a recruiter.
// If contactVisible is false or contactEmail is empty, shows a polite message.

'use client'

import type { PortfolioUser } from '@/lib/types'
import clsx from 'clsx'
import toast from 'react-hot-toast'

interface ContactModalProps {
  user: PortfolioUser
  onClose: () => void
}

export function ContactModal({ user, onClose }: ContactModalProps) {
  const canContact = user.contactVisible !== false && !!user.contactEmail

  function copyEmail() {
    if (!user.contactEmail) return
    navigator.clipboard.writeText(user.contactEmail).then(() => {
      toast.success('Email copied')
    })
  }

  return (
    /* Backdrop */
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />

      {/* Panel */}
      <div
        className="relative w-full max-w-sm bg-khoj-card border border-khoj-border rounded-sm shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-5 pt-5 pb-4 border-b border-khoj-border flex items-start justify-between gap-4">
          <div className="flex items-center gap-3">
            {/* Mini avatar */}
            <div
              className="w-10 h-10 rounded-sm flex items-center justify-center text-sm font-display font-bold bg-khoj-accent/15 text-khoj-accent border border-khoj-accent/30 flex-shrink-0"
            >
              {user.avatarUrl ? (
                <img src={user.avatarUrl} alt={user.name} className="w-full h-full object-cover rounded-sm" />
              ) : (
                user.name.charAt(0).toUpperCase()
              )}
            </div>
            <div>
              <p className="text-sm font-display font-bold text-khoj-text">{user.name}</p>
              {user.username && (
                <p className="text-[10px] font-mono text-khoj-subtle">@{user.username}</p>
              )}
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-khoj-subtle hover:text-khoj-text transition-colors text-base leading-none mt-0.5"
          >
            ✕
          </button>
        </div>

        {/* Body */}
        <div className="px-5 py-5 space-y-4">
          {canContact ? (
            <>
              <p className="text-xs text-khoj-subtle font-body">
                {user.name.split(' ')[0]} has made their contact information visible.
              </p>

              {/* Email row */}
              <div className="flex items-center gap-3 bg-khoj-bg border border-khoj-border rounded-sm px-4 py-3">
                <span className="text-khoj-accent text-base leading-none">✉</span>
                <span className="flex-1 text-sm font-body text-khoj-text truncate">
                  {user.contactEmail}
                </span>
                <button
                  type="button"
                  onClick={copyEmail}
                  className="text-[10px] uppercase tracking-widest font-body text-khoj-accent border border-khoj-accent/40 px-2.5 py-1 rounded-sm hover:bg-khoj-accent/10 transition-colors flex-shrink-0"
                >
                  Copy
                </button>
              </div>

              {/* Social links if any */}
              {user.socialLinks && (
                <div className="flex flex-wrap gap-2">
                  {user.socialLinks.github && (
                    <a
                      href={user.socialLinks.github}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-[10px] font-body text-khoj-subtle hover:text-khoj-teal border border-khoj-border px-2.5 py-1 rounded-sm hover:border-khoj-teal/40 transition-colors"
                    >
                      GitHub →
                    </a>
                  )}
                  {user.socialLinks.linkedin && (
                    <a
                      href={user.socialLinks.linkedin}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-[10px] font-body text-khoj-subtle hover:text-khoj-teal border border-khoj-border px-2.5 py-1 rounded-sm hover:border-khoj-teal/40 transition-colors"
                    >
                      LinkedIn →
                    </a>
                  )}
                  {user.socialLinks.twitter && (
                    <a
                      href={user.socialLinks.twitter}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-[10px] font-body text-khoj-subtle hover:text-khoj-teal border border-khoj-border px-2.5 py-1 rounded-sm hover:border-khoj-teal/40 transition-colors"
                    >
                      Twitter →
                    </a>
                  )}
                  {user.socialLinks.website && (
                    <a
                      href={user.socialLinks.website}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-[10px] font-body text-khoj-subtle hover:text-khoj-teal border border-khoj-border px-2.5 py-1 rounded-sm hover:border-khoj-teal/40 transition-colors"
                    >
                      Website →
                    </a>
                  )}
                </div>
              )}
            </>
          ) : (
            <div className="text-center py-4">
              <span className="text-3xl block mb-3">◈</span>
              <p className="text-sm font-body text-khoj-subtle leading-relaxed">
                {user.name.split(' ')[0]} has not made their contact info public.
              </p>
              <p className="text-xs text-khoj-muted font-body mt-2">
                View their profile to connect via social links.
              </p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-5 pb-5 flex items-center gap-2">
          <a
            href={`/profile/${user.uid}`}
            className="flex-1 text-center text-xs font-body font-semibold bg-khoj-accent text-white px-4 py-2.5 rounded-sm hover:bg-khoj-accent/90 transition-colors"
          >
            View Full Profile →
          </a>
          <button
            type="button"
            onClick={onClose}
            className="text-xs font-body text-khoj-subtle border border-khoj-border px-4 py-2.5 rounded-sm hover:text-khoj-text hover:border-khoj-text/30 transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  )
}
