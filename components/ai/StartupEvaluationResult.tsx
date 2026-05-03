'use client'
// components/ai/StartupEvaluationResult.tsx
// KHOJ AI — Startup Evaluation Results Display
// Shows score card, breakdown, strengths, weaknesses, risks, next steps, etc.

import React, { useState } from 'react'
import type { StartupEvaluationResult } from '@/lib/ai/startupEvaluation'

interface Props {
  result: StartupEvaluationResult
  evaluationId: string | null
  startupName?: string
  /** Whether the viewer is the founder/owner — controls visibility of weaknesses/risks */
  isOwner?: boolean
  onImprove?: () => void
  onCreateRoom?: () => void
  onPublishToMarket?: () => void
  onRerun?: () => void
}

// ── Score colour helpers ──────────────────────────────────────────────────────
function scoreColor(score: number): string {
  if (score >= 8.5) return 'text-emerald-400'
  if (score >= 7)   return 'text-khoj-accent'
  if (score >= 5)   return 'text-amber-400'
  return 'text-red-400'
}

function scoreBarColor(score: number): string {
  if (score >= 8.5) return 'bg-emerald-400'
  if (score >= 7)   return 'bg-khoj-accent'
  if (score >= 5)   return 'bg-amber-400'
  return 'bg-red-400'
}

function ringStyle(score: number): string {
  // CSS conic-gradient arc for a circular ring
  const pct = Math.round((score / 10) * 100)
  const colour =
    score >= 8.5 ? '#34d399' :
    score >= 7   ? '#ff4d00' :
    score >= 5   ? '#f59e0b' :
                   '#f87171'
  return `background: conic-gradient(${colour} ${pct}%, #1e1e2e ${pct}%)`
}

// ── Score dimension labels ────────────────────────────────────────────────────
const DIMENSION_LABELS: Record<string, string> = {
  problemClarity:        'Problem Clarity',
  customerClarity:       'Customer Clarity',
  marketPotential:       'Market Potential',
  solutionStrength:      'Solution Strength',
  differentiation:       'Differentiation',
  businessModel:         'Business Model',
  executionFeasibility:  'Execution Feasibility',
  teamReadiness:         'Team Readiness',
  tractionValidation:    'Traction / Validation',
  fundingReadiness:      'Funding Readiness',
}

const DIMENSION_WEIGHTS: Record<string, string> = {
  problemClarity:        '15%',
  customerClarity:       '10%',
  marketPotential:       '15%',
  solutionStrength:      '10%',
  differentiation:       '10%',
  businessModel:         '10%',
  executionFeasibility:  '10%',
  teamReadiness:         '10%',
  tractionValidation:    '5%',
  fundingReadiness:      '5%',
}

// ── Section wrapper ───────────────────────────────────────────────────────────
function Section({ title, icon, children }: { title: string; icon: string; children: React.ReactNode }) {
  return (
    <div className="bg-[#0d0d1a] border border-khoj-border rounded-xl p-5 space-y-3">
      <div className="flex items-center gap-2">
        <span className="text-base">{icon}</span>
        <h3 className="text-sm font-bold text-khoj-text uppercase tracking-wide">{title}</h3>
      </div>
      {children}
    </div>
  )
}

// ── List item ─────────────────────────────────────────────────────────────────
function ListItem({ text, bullet }: { text: string; bullet: string }) {
  return (
    <li className="flex items-start gap-2 text-sm text-khoj-text/90 leading-relaxed">
      <span className="mt-0.5 text-base flex-shrink-0">{bullet}</span>
      <span>{text}</span>
    </li>
  )
}

export function StartupEvaluationResult({
  result,
  evaluationId,
  startupName,
  isOwner = true,
  onImprove,
  onCreateRoom,
  onPublishToMarket,
  onRerun,
}: Props) {
  const [showStrategicReport, setShowStrategicReport] = useState(false)
  const [exportLoading, setExportLoading] = useState(false)

  const { overallScore, ratingLabel, confidenceLevel, summary, scores, strengths, weaknesses,
          risks, nextSteps, recommendedRoles, suggestedMVP, investorReadiness, strategicReport } = result

  function handleExport() {
    setExportLoading(true)
    const fileName = `khoj-ai-evaluation-${(startupName ?? 'startup').replace(/\s+/g, '-').toLowerCase()}.txt`
    const content = [
      `KHOJ AI Startup Evaluation`,
      `Startup: ${startupName ?? 'Unnamed'}`,
      `Score: ${overallScore}/10 — ${ratingLabel}`,
      `Confidence: ${confidenceLevel}`,
      `\nSummary:\n${summary}`,
      `\n⚠️ This AI evaluation is guidance only, not a guarantee of success. Validate with real users.`,
      `\n${strategicReport}`,
    ].join('\n')
    const blob = new Blob([content], { type: 'text/plain' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = fileName
    a.click()
    URL.revokeObjectURL(url)
    setExportLoading(false)
  }

  const confidenceColors: Record<string, string> = {
    low:    'text-red-400 bg-red-900/20 border-red-700/30',
    medium: 'text-amber-400 bg-amber-900/20 border-amber-700/30',
    high:   'text-emerald-400 bg-emerald-900/20 border-emerald-700/30',
  }
  const confidenceLabelMap: Record<string, string> = {
    low:    'Low confidence — add more detail to improve accuracy',
    medium: 'Medium confidence',
    high:   'High confidence — comprehensive input received',
  }

  return (
    <div className="space-y-5 animate-slide-up">
      {/* ── Disclaimer banner ───────────────────────────────────────────── */}
      <div className="px-4 py-3 bg-amber-900/20 border border-amber-700/30 rounded-xl text-[12px] text-amber-300/80 leading-relaxed">
        ⚠️ <strong>This AI evaluation is guidance only, not a guarantee of success.</strong> Validate with real users.
      </div>

      {/* ── Big Score Card ──────────────────────────────────────────────── */}
      <div className="bg-gradient-to-br from-[#13131f] to-khoj-card border border-khoj-border rounded-2xl p-6 flex flex-col sm:flex-row items-center gap-6">
        {/* Ring */}
        <div className="relative flex-shrink-0 w-28 h-28">
          <div
            className="w-28 h-28 rounded-full flex items-center justify-center"
            style={{ background: `conic-gradient(${overallScore >= 8.5 ? '#34d399' : overallScore >= 7 ? '#ff4d00' : overallScore >= 5 ? '#f59e0b' : '#f87171'} ${Math.round((overallScore / 10) * 100)}%, #1e1e2e ${Math.round((overallScore / 10) * 100)}%)` }}
          >
            <div className="w-20 h-20 rounded-full bg-khoj-card flex flex-col items-center justify-center">
              <span className={`text-2xl font-bold font-display ${scoreColor(overallScore)}`}>
                {overallScore}
              </span>
              <span className="text-[10px] text-khoj-subtle">/10</span>
            </div>
          </div>
        </div>

        {/* Labels */}
        <div className="flex-1 text-center sm:text-left space-y-2">
          <div className="text-[10px] uppercase tracking-[0.2em] text-khoj-accent font-semibold">
            Validation Readiness Score
          </div>
          {startupName && (
            <h2 className="text-xl font-bold text-khoj-text">{startupName}</h2>
          )}
          <div className={`text-lg font-bold ${scoreColor(overallScore)}`}>{ratingLabel}</div>
          <div className={`inline-flex items-center gap-1.5 text-[11px] px-3 py-1 rounded-full border ${confidenceColors[confidenceLevel] ?? ''}`}>
            <span className="w-1.5 h-1.5 rounded-full bg-current" />
            {confidenceLabelMap[confidenceLevel]}
          </div>
          <p className="text-sm text-khoj-subtle leading-relaxed">{summary}</p>
        </div>
      </div>

      {/* ── Score Breakdown ─────────────────────────────────────────────── */}
      <Section title="Score Breakdown" icon="📊">
        <div className="space-y-3">
          {(Object.entries(scores) as [string, number][]).map(([key, val]) => (
            <div key={key}>
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs text-khoj-subtle">{DIMENSION_LABELS[key] ?? key}</span>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] text-khoj-subtle/60">{DIMENSION_WEIGHTS[key]}</span>
                  <span className={`text-xs font-bold ${scoreColor(val)}`}>{val}/10</span>
                </div>
              </div>
              <div className="h-1.5 bg-khoj-border rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all duration-500 ${scoreBarColor(val)}`}
                  style={{ width: `${(val / 10) * 100}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      </Section>

      {/* ── Strengths ───────────────────────────────────────────────────── */}
      <Section title="Strengths" icon="✅">
        <ul className="space-y-2">
          {strengths.map((s, i) => <ListItem key={i} text={s} bullet="✅" />)}
        </ul>
      </Section>

      {/* ── Weaknesses (owner only) ─────────────────────────────────────── */}
      {isOwner ? (
        <Section title="Weaknesses" icon="⚠️">
          <ul className="space-y-2">
            {weaknesses.map((w, i) => <ListItem key={i} text={w} bullet="⚠️" />)}
          </ul>
        </Section>
      ) : (
        <div className="bg-[#0d0d1a] border border-khoj-border rounded-xl p-5 flex items-center gap-3">
          <span className="text-2xl">🔒</span>
          <div>
            <p className="text-sm font-semibold text-khoj-text">Weaknesses &amp; Risks — Founder Only</p>
            <p className="text-xs text-khoj-subtle mt-0.5">Request access to view the full evaluation.</p>
          </div>
        </div>
      )}

      {/* ── Risks (owner only) ──────────────────────────────────────────── */}
      {isOwner && (
        <Section title="Risks" icon="🔴">
          <ul className="space-y-2">
            {risks.map((r, i) => <ListItem key={i} text={r} bullet="🔴" />)}
          </ul>
        </Section>
      )}

      {/* ── Next Steps ──────────────────────────────────────────────────── */}
      <Section title="Next Steps" icon="🚀">
        <ol className="space-y-2 list-none">
          {nextSteps.map((s, i) => (
            <li key={i} className="flex items-start gap-2 text-sm text-khoj-text/90 leading-relaxed">
              <span className="flex-shrink-0 w-5 h-5 rounded-full bg-khoj-accent/20 border border-khoj-accent/40 text-khoj-accent text-[10px] font-bold flex items-center justify-center">
                {i + 1}
              </span>
              {s}
            </li>
          ))}
        </ol>
      </Section>

      {/* ── Recommended Roles ───────────────────────────────────────────── */}
      <Section title="Recommended Roles to Recruit" icon="👥">
        <div className="flex flex-wrap gap-2">
          {recommendedRoles.map((role, i) => (
            <span
              key={i}
              className="text-xs px-3 py-1.5 rounded-full bg-khoj-accent/10 border border-khoj-accent/30 text-khoj-accent font-semibold"
            >
              {role}
            </span>
          ))}
        </div>
      </Section>

      {/* ── Suggested MVP ───────────────────────────────────────────────── */}
      <Section title="Suggested MVP" icon="🧪">
        <p className="text-sm text-khoj-text/90 leading-relaxed">{suggestedMVP}</p>
      </Section>

      {/* ── Investor Readiness ──────────────────────────────────────────── */}
      <Section title="Investor Readiness" icon="💰">
        <p className="text-sm text-khoj-text/90 leading-relaxed">{investorReadiness}</p>
      </Section>

      {/* ── Strategic Report Preview (owner only) ───────────────────────── */}
      {isOwner && (
        <Section title="Strategic Report" icon="📋">
          <button
            onClick={() => setShowStrategicReport((v) => !v)}
            className="text-xs text-khoj-accent hover:underline font-semibold"
          >
            {showStrategicReport ? 'Hide report ↑' : 'View full strategic report ↓'}
          </button>
          {showStrategicReport && (
            <pre className="mt-3 text-[12px] text-khoj-subtle/90 leading-relaxed whitespace-pre-wrap font-mono bg-[#080810] border border-khoj-border/60 rounded-lg p-4 overflow-x-auto max-h-96 overflow-y-auto">
              {strategicReport}
            </pre>
          )}
        </Section>
      )}

      {/* ── Action Buttons ──────────────────────────────────────────────── */}
      <div className="flex flex-wrap gap-3 pt-2">
        {onImprove && (
          <button
            onClick={onImprove}
            className="px-4 py-2.5 rounded-xl border border-khoj-accent/50 text-khoj-accent text-sm font-semibold hover:bg-khoj-accent/10 transition-colors"
          >
            ✏️ Improve Idea
          </button>
        )}
        {onCreateRoom && (
          <button
            onClick={onCreateRoom}
            className="px-4 py-2.5 rounded-xl bg-khoj-accent border border-khoj-accent text-white text-sm font-semibold hover:bg-orange-500 hover:shadow-[0_0_20px_rgba(255,77,0,0.3)] transition-all"
          >
            🚀 Create Startup Room
          </button>
        )}
        {onPublishToMarket && (
          <button
            onClick={onPublishToMarket}
            className="px-4 py-2.5 rounded-xl border border-khoj-border text-khoj-text text-sm font-semibold hover:border-khoj-accent/50 transition-colors"
          >
            🌐 Publish to Opportunity Market
          </button>
        )}
        <button
          onClick={handleExport}
          disabled={exportLoading}
          className="px-4 py-2.5 rounded-xl border border-khoj-border text-khoj-subtle text-sm font-semibold hover:text-khoj-text hover:border-khoj-accent/40 transition-colors disabled:opacity-50"
        >
          {exportLoading ? '⏳ Exporting…' : '📥 Export Report'}
        </button>
        {onRerun && (
          <button
            onClick={onRerun}
            className="px-4 py-2.5 rounded-xl border border-khoj-border text-khoj-subtle text-sm font-semibold hover:text-khoj-text hover:border-khoj-accent/40 transition-colors"
          >
            🔄 Re-run Evaluation
          </button>
        )}
      </div>

      {/* Disclaimer footer */}
      <p className="text-[11px] text-khoj-subtle/50 text-center pt-2 leading-relaxed">
        ⚠️ This AI evaluation is guidance only, not a guarantee of success. Validate with real users.
        {evaluationId && <span className="block mt-0.5 font-mono">ID: {evaluationId}</span>}
      </p>
    </div>
  )
}
