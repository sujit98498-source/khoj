'use client'
// components/ai/StartupAIEvaluationPanel.tsx
// KHOJ AI — "AI Evaluation" tab inside a Startup Room
// Shows evaluation if one exists, or prompts founder to run one.

import React, { useEffect, useState } from 'react'
import { auth } from '@/lib/firebase/config'
import type { CollabRoom } from '@/types/collaboration'
import type { StartupEvaluationResult } from '@/lib/ai/startupEvaluation'
import type { StoredEvaluation } from '@/services/startupEvaluationService'
import { getEvaluationById, subscribeToRoomEvaluation } from '@/services/startupEvaluationService'
import { StartupEvaluationForm } from './StartupEvaluationForm'
import { StartupEvaluationResult as ResultCard } from './StartupEvaluationResult'
import { useRouter } from 'next/navigation'

interface Props {
  room: CollabRoom
  currentUserId: string
  /** Whether the viewer is the founder or team member */
  canManage: boolean
}

type PanelState = 'idle' | 'form' | 'result'

export function StartupAIEvaluationPanel({ room, currentUserId, canManage }: Props) {
  const router = useRouter()
  const [panelState, setPanelState] = useState<PanelState>('idle')
  const [evaluation, setEvaluation] = useState<StoredEvaluation | null>(null)
  const [pendingResult, setPendingResult] = useState<{ result: StartupEvaluationResult; evaluationId: string | null } | null>(null)
  const [loadingExisting, setLoadingExisting] = useState(true)

  // Subscribe to latest room evaluation
  useEffect(() => {
    const unsub = subscribeToRoomEvaluation(room.id, async (summary) => {
      if (!summary) { setLoadingExisting(false); return }
      // If we're the owner, fetch full evaluation
      if (canManage) {
        const full = await getEvaluationById(summary.evaluationId).catch(() => null)
        setEvaluation(full ?? (summary as any))
      } else {
        setEvaluation(summary as any)
      }
      setLoadingExisting(false)
    })
    return () => unsub()
  }, [room.id, canManage])

  function handleResult(result: StartupEvaluationResult, evaluationId: string | null) {
    setPendingResult({ result, evaluationId })
    setPanelState('result')
  }

  function handleRerun() {
    setPendingResult(null)
    setPanelState('form')
  }

  // ── Loading ─────────────────────────────────────────────────────────────────
  if (loadingExisting) {
    return (
      <div className="flex items-center justify-center py-16 text-khoj-subtle text-sm gap-2">
        <span className="w-4 h-4 border-2 border-khoj-accent border-t-transparent rounded-full animate-spin" />
        Loading evaluation…
      </div>
    )
  }

  // ── Show form overlay ───────────────────────────────────────────────────────
  if (panelState === 'form') {
    return (
      <StartupEvaluationForm
        roomId={room.id}
        prefill={{
          startupName: room.title,
          oneLiner: room.summary ?? '',
          stage: (room.startup?.stage as any) ?? 'idea',
          targetMarket: room.startup?.country ?? '',
          problem: room.startup?.problem ?? '',
          solution: room.startup?.solution ?? '',
          category: room.tags?.[0] ?? '',
        }}
        onResult={handleResult}
        onCancel={() => setPanelState('idle')}
      />
    )
  }

  // ── Show pending result (just submitted) ────────────────────────────────────
  if (panelState === 'result' && pendingResult) {
    return (
      <div className="space-y-4">
        <ResultCard
          result={pendingResult.result}
          evaluationId={pendingResult.evaluationId}
          startupName={room.title}
          isOwner={canManage}
          onImprove={handleRerun}
          onCreateRoom={() => router.push('/rooms/startups')}
          onRerun={handleRerun}
        />
      </div>
    )
  }

  // ── Existing evaluation ─────────────────────────────────────────────────────
  if (evaluation) {
    const hasFullData = !evaluation.restricted && evaluation.scores

    if (hasFullData) {
      return (
        <div className="space-y-4">
          <ResultCard
            result={evaluation as StartupEvaluationResult}
            evaluationId={evaluation.evaluationId}
            startupName={room.title}
            isOwner={canManage}
            onImprove={canManage ? handleRerun : undefined}
            onRerun={canManage ? handleRerun : undefined}
          />
        </div>
      )
    }

    // Restricted view (non-owner sees public summary)
    return (
      <div className="space-y-5">
        {/* Score card — public */}
        <div className="bg-gradient-to-br from-[#13131f] to-khoj-card border border-khoj-border rounded-2xl p-6 flex items-center gap-5">
          <div
            className="w-20 h-20 rounded-full flex-shrink-0 flex items-center justify-center"
            style={{ background: `conic-gradient(#ff4d00 ${Math.round(((evaluation.overallScore ?? 0) / 10) * 100)}%, #1e1e2e ${Math.round(((evaluation.overallScore ?? 0) / 10) * 100)}%)` }}
          >
            <div className="w-14 h-14 rounded-full bg-khoj-card flex flex-col items-center justify-center">
              <span className="text-xl font-bold text-khoj-accent">{evaluation.overallScore}</span>
              <span className="text-[9px] text-khoj-subtle">/10</span>
            </div>
          </div>
          <div>
            <div className="text-[10px] uppercase tracking-[0.2em] text-khoj-accent font-semibold mb-1">KHOJ AI Score</div>
            <div className="text-lg font-bold text-khoj-text">{evaluation.ratingLabel}</div>
            <p className="text-sm text-khoj-subtle mt-1 leading-snug">{evaluation.summary}</p>
          </div>
        </div>
        <div className="bg-[#0d0d1a] border border-khoj-border rounded-xl p-5 flex items-center gap-3">
          <span className="text-2xl">🔒</span>
          <div>
            <p className="text-sm font-semibold text-khoj-text">Full evaluation is visible to the founding team only.</p>
            <p className="text-xs text-khoj-subtle mt-0.5">Request access to join this startup and view detailed insights.</p>
          </div>
        </div>
        <p className="text-[11px] text-khoj-subtle/50 text-center leading-relaxed">
          ⚠️ This AI evaluation is guidance only, not a guarantee of success. Validate with real users.
        </p>
      </div>
    )
  }

  // ── Empty state ─────────────────────────────────────────────────────────────
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center space-y-5 max-w-md mx-auto">
      <div className="w-16 h-16 rounded-full bg-khoj-accent/10 border border-khoj-accent/20 flex items-center justify-center text-3xl">
        ⚡
      </div>
      <div>
        <h3 className="text-khoj-text font-bold text-lg">No AI Evaluation Yet</h3>
        <p className="text-khoj-subtle text-sm mt-2 leading-relaxed">
          Your startup idea has not been evaluated yet. Run KHOJ AI to find weaknesses, improve your pitch, and prepare to build.
        </p>
      </div>
      {canManage ? (
        <button
          onClick={() => setPanelState('form')}
          className="px-6 py-3 rounded-xl bg-khoj-accent border border-khoj-accent text-white text-sm font-semibold hover:bg-orange-500 hover:shadow-[0_0_24px_rgba(255,77,0,0.4)] transition-all"
        >
          ⚡ Evaluate with KHOJ AI
        </button>
      ) : (
        <p className="text-xs text-khoj-subtle/60">Only the founding team can run an evaluation.</p>
      )}
      <p className="text-[11px] text-khoj-subtle/50 leading-relaxed">
        ⚠️ This AI evaluation is guidance only, not a guarantee of success. Validate with real users.
      </p>
    </div>
  )
}
