// components/ui/DeleteConfirmModal.tsx
// Reusable confirmation modal for destructive actions.
// Dark orange KHOJ theme, keyboard-accessible (Escape closes, Enter confirms).

'use client'

import { useEffect, useRef } from 'react'
import clsx from 'clsx'

interface DeleteConfirmModalProps {
  isOpen: boolean
  title?: string
  description?: string
  itemName?: string
  confirmLabel?: string
  loading?: boolean
  onConfirm: () => void
  onCancel: () => void
}

export function DeleteConfirmModal({
  isOpen,
  title = 'Delete Job Post',
  description = 'Are you sure you want to delete this job post?',
  itemName,
  confirmLabel = 'Delete Job',
  loading = false,
  onConfirm,
  onCancel,
}: DeleteConfirmModalProps) {
  const cancelRef = useRef<HTMLButtonElement>(null)

  // Focus cancel button on open and handle Escape key
  useEffect(() => {
    if (!isOpen) return
    cancelRef.current?.focus()
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape' && !loading) onCancel()
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [isOpen, loading, onCancel])

  if (!isOpen) return null

  return (
    /* Backdrop */
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm"
      onClick={(e) => { if (e.target === e.currentTarget && !loading) onCancel() }}
      role="dialog"
      aria-modal="true"
      aria-labelledby="delete-modal-title"
    >
      {/* Panel */}
      <div className="w-full max-w-md bg-khoj-card border border-red-500/20 rounded-sm shadow-2xl">
        {/* Top accent bar */}
        <div className="h-0.5 w-full bg-gradient-to-r from-red-500/60 via-red-400/40 to-transparent rounded-t-sm" />

        <div className="p-6">
          {/* Icon + Title */}
          <div className="flex items-start gap-4 mb-5">
            <div className="flex-shrink-0 w-10 h-10 rounded-sm bg-red-500/10 border border-red-500/20 flex items-center justify-center">
              <svg
                className="w-5 h-5 text-red-400"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                />
              </svg>
            </div>
            <div>
              <h2
                id="delete-modal-title"
                className="text-sm font-display font-bold text-khoj-text"
              >
                {title}
              </h2>
              <p className="text-xs font-body text-khoj-subtle mt-1 leading-relaxed">
                {description}
              </p>
            </div>
          </div>

          {/* Job name highlight */}
          {itemName && (
            <div className="bg-khoj-bg border border-khoj-border rounded-sm px-4 py-3 mb-5">
              <p className="text-xs font-body text-khoj-muted uppercase tracking-widest mb-0.5">
                Job Post
              </p>
              <p className="text-sm font-display font-semibold text-khoj-text truncate">
                {itemName}
              </p>
            </div>
          )}

          {/* Warning note */}
          <div className="flex items-start gap-2 bg-red-500/5 border border-red-500/15 rounded-sm px-3 py-2.5 mb-6">
            <span className="text-red-400 text-xs mt-0.5">⚠</span>
            <p className="text-[11px] font-body text-red-400/90 leading-relaxed">
              The job will be archived and hidden from the public board. Existing
              applications are preserved and can be accessed from your recruiter
              dashboard. You can restore the job later.
            </p>
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end gap-3">
            <button
              ref={cancelRef}
              type="button"
              onClick={onCancel}
              disabled={loading}
              className={clsx(
                'text-xs font-body font-semibold px-5 py-2.5 rounded-sm border transition-colors',
                'border-khoj-border text-khoj-subtle hover:text-khoj-text hover:border-khoj-accent/30',
                loading && 'opacity-50 cursor-not-allowed'
              )}
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={onConfirm}
              disabled={loading}
              className={clsx(
                'flex items-center gap-2 text-xs font-body font-semibold px-5 py-2.5 rounded-sm transition-colors',
                'bg-red-500/10 border border-red-500/30 text-red-400',
                'hover:bg-red-500/20 hover:border-red-500/50 hover:text-red-300',
                loading && 'opacity-60 cursor-not-allowed'
              )}
            >
              {loading ? (
                <>
                  <svg
                    className="w-3 h-3 animate-spin"
                    viewBox="0 0 24 24"
                    fill="none"
                  >
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                    />
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"
                    />
                  </svg>
                  Deleting…
                </>
              ) : (
                confirmLabel
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
