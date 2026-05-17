'use client'

import { useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { auth, db } from '@/lib/firebase/config'
import {
  collection,
  query,
  where,
  orderBy,
  onSnapshot,
  doc,
  updateDoc,
} from 'firebase/firestore'

// ── MVP Package types ──────────────────────────────────────────────────────────

interface MvpBlueprint {
  summary: string
  coreProblem: string
  valueProposition: string
  mvpScope: string
  targetUser: string
}

interface MvpPage {
  name: string
  route: string
  description: string
  components: string[]
}

interface MvpComponent {
  name: string
  type: string
  description: string
  props: string[]
}

interface MvpFirebaseCollection {
  name: string
  fields: string[]
  rules: string
}

interface MvpFirebase {
  collections: MvpFirebaseCollection[]
  auth: string
  storage: string
}

interface MvpGeneratedFile {
  path: string
  language: string
  description: string
  code: string
}

interface MvpSetup {
  prerequisites: string[]
  steps: string[]
  envVars: string[]
}

interface MvpTesting {
  unitTests: string[]
  integrationTests: string[]
  manualChecklist: string[]
}

interface MvpDeploy {
  platform: string
  steps: string[]
  checklist: string[]
}

interface MvpFinalRecommendation {
  verdict: string
  score: number
  advice: string
  nextMilestone: string
}

interface MvpPackage {
  blueprint: MvpBlueprint
  pages: MvpPage[]
  components: MvpComponent[]
  firebase: MvpFirebase
  generatedFiles: MvpGeneratedFile[]
  setup: MvpSetup
  testing: MvpTesting
  deploy: MvpDeploy
  finalRecommendation: MvpFinalRecommendation
}

// ── KhojBuild type ─────────────────────────────────────────────────────────────

type DeploymentStatus = 'pending' | 'building' | 'deploying' | 'deployed' | 'failed' | 'rejected'
type ApprovalStatus = 'pending' | 'approved' | 'rejected'

interface KhojBuild {
  id: string
  userId: string
  appName: string
  description?: string
  deploymentStatus: DeploymentStatus
  approvalStatus: ApprovalStatus
  buildLogs: string
  errorLogs: string
  filesInScope: number
  buildAttempts: number
  githubRepo: string
  branch: string
  path: string
  deploymentUrl?: string
  package?: MvpPackage
  modelUsed?: string
  createdAt: string
  updatedAt: string
  deployedAt?: string
}

// ── Tab definitions ────────────────────────────────────────────────────────────

const MVP_TABS = [
  'Blueprint',
  'Pages',
  'Components',
  'Firebase',
  'Generated Files',
  'Setup',
  'Testing',
  'Deploy',
  'Final Recommendation',
] as const

type MvpTab = (typeof MVP_TABS)[number]

// ── Status helpers ─────────────────────────────────────────────────────────────

function statusLabel(s: DeploymentStatus): string {
  if (s === 'pending') return 'Pending'
  if (s === 'building') return 'Building'
  if (s === 'deploying') return 'Deploying\u2026'
  if (s === 'deployed') return 'Deployed'
  if (s === 'failed') return 'Failed'
  if (s === 'rejected') return 'Rejected'
  return s
}

function statusColor(s: DeploymentStatus): string {
  if (s === 'deployed') return 'text-green-400'
  if (s === 'deploying' || s === 'building') return 'text-yellow-400'
  if (s === 'failed' || s === 'rejected') return 'text-red-400'
  return 'text-khoj-subtle'
}

// ── Sub-components ─────────────────────────────────────────────────────────────

function Toggle({
  label,
  description,
  checked,
  onChange,
}: {
  label: string
  description: string
  checked: boolean
  onChange: (v: boolean) => void
}) {
  return (
    <button
      type="button"
      onClick={() => onChange(!checked)}
      className="flex w-full items-center justify-between rounded-sm border border-khoj-border bg-khoj-card px-4 py-3 text-left transition-colors hover:border-khoj-accent/40"
    >
      <div>
        <p className="text-sm font-medium text-khoj-text">{label}</p>
        <p className="text-xs text-khoj-subtle">{description}</p>
      </div>
      <div
        className={[
          'relative h-5 w-9 flex-shrink-0 rounded-full transition-colors',
          checked ? 'bg-khoj-accent' : 'bg-khoj-border',
        ].join(' ')}
      >
        <span
          className={[
            'absolute top-0.5 h-4 w-4 rounded-full bg-white shadow transition-transform',
            checked ? 'translate-x-4' : 'translate-x-0.5',
          ].join(' ')}
        />
      </div>
    </button>
  )
}

function TabButton({ tab, active, onClick }: { tab: string; active: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={[
        'whitespace-nowrap rounded-sm px-3 py-1.5 text-xs font-medium transition-colors',
        active
          ? 'bg-khoj-accent text-white'
          : 'border border-khoj-border text-khoj-subtle hover:border-khoj-accent/40 hover:text-khoj-text',
      ].join(' ')}
    >
      {tab}
    </button>
  )
}

function SectionCard({ title, children }: { title?: string; children: React.ReactNode }) {
  return (
    <div className="rounded-sm border border-khoj-border bg-khoj-card p-5">
      {title && <h3 className="mb-3 text-sm font-semibold text-khoj-text">{title}</h3>}
      {children}
    </div>
  )
}

function BlueprintTab({ bp }: { bp: MvpBlueprint }) {
  return (
    <SectionCard title="Product Blueprint">
      <dl className="space-y-4">
        {[
          { label: 'Summary', value: bp.summary },
          { label: 'Core problem', value: bp.coreProblem },
          { label: 'Value proposition', value: bp.valueProposition },
          { label: 'MVP scope', value: bp.mvpScope },
          { label: 'Target user', value: bp.targetUser },
        ].map(({ label, value }) => (
          <div key={label}>
            <dt className="text-[10px] font-semibold uppercase tracking-widest text-khoj-subtle">{label}</dt>
            <dd className="mt-1 text-sm leading-6 text-khoj-text">{value ?? '\u2014'}</dd>
          </div>
        ))}
      </dl>
    </SectionCard>
  )
}

function PagesTab({ pages }: { pages: MvpPage[] }) {
  return (
    <div className="space-y-3">
      {pages?.map((p, i) => (
        <SectionCard key={i}>
          <p className="text-sm font-semibold text-khoj-text">{p.name}</p>
          <p className="mt-0.5 font-mono text-xs text-khoj-accent">{p.route}</p>
          <p className="mt-1 text-sm text-khoj-subtle">{p.description}</p>
          {p.components?.length > 0 && (
            <div className="mt-3 flex flex-wrap gap-1.5">
              {p.components.map((c) => (
                <span key={c} className="rounded-sm border border-khoj-border px-2 py-0.5 text-[10px] text-khoj-subtle">{c}</span>
              ))}
            </div>
          )}
        </SectionCard>
      ))}
    </div>
  )
}

function ComponentsTab({ components }: { components: MvpComponent[] }) {
  return (
    <div className="grid gap-3 md:grid-cols-2">
      {components?.map((c, i) => (
        <SectionCard key={i}>
          <div className="flex items-start justify-between">
            <p className="text-sm font-semibold text-khoj-text">{c.name}</p>
            <span className="rounded-sm border border-khoj-border px-2 py-0.5 text-[10px] text-khoj-subtle">{c.type}</span>
          </div>
          <p className="mt-1 text-sm text-khoj-subtle">{c.description}</p>
          {c.props?.length > 0 && (
            <div className="mt-2 flex flex-wrap gap-1">
              {c.props.map((p) => (
                <span key={p} className="font-mono text-[10px] text-khoj-accent">{p}</span>
              ))}
            </div>
          )}
        </SectionCard>
      ))}
    </div>
  )
}

function FirebaseTab({ firebase }: { firebase: MvpFirebase }) {
  return (
    <div className="space-y-4">
      <SectionCard title="Auth"><p className="text-sm text-khoj-text">{firebase?.auth ?? '\u2014'}</p></SectionCard>
      <SectionCard title="Storage"><p className="text-sm text-khoj-text">{firebase?.storage ?? '\u2014'}</p></SectionCard>
      <SectionCard title="Collections">
        <div className="space-y-3">
          {firebase?.collections?.map((col, i) => (
            <div key={i} className="rounded-sm border border-khoj-border p-3">
              <p className="font-mono text-sm font-semibold text-khoj-accent">{col.name}</p>
              <p className="mt-1 text-xs text-khoj-subtle">Rules: {col.rules}</p>
              <div className="mt-2 flex flex-wrap gap-1">
                {col.fields?.map((f) => (
                  <span key={f} className="rounded-sm bg-black/30 px-1.5 py-0.5 font-mono text-[10px] text-khoj-text">{f}</span>
                ))}
              </div>
            </div>
          ))}
        </div>
      </SectionCard>
    </div>
  )
}

function GeneratedFilesTab({ files }: { files: MvpGeneratedFile[] }) {
  const [openIdx, setOpenIdx] = useState<number | null>(0)
  return (
    <div className="space-y-2">
      {files?.map((file, i) => (
        <div key={i} className="rounded-sm border border-khoj-border bg-khoj-card">
          <button
            type="button"
            onClick={() => setOpenIdx(openIdx === i ? null : i)}
            className="flex w-full items-center justify-between px-4 py-3 text-left"
          >
            <div>
              <p className="font-mono text-xs font-semibold text-khoj-accent">{file.path}</p>
              <p className="mt-0.5 text-xs text-khoj-subtle">{file.description}</p>
            </div>
            <span className="text-xs text-khoj-subtle">{openIdx === i ? '▲' : '▼'}</span>
          </button>
          {openIdx === i && (
            <pre className="overflow-x-auto border-t border-khoj-border bg-black/30 px-4 py-3 text-xs leading-5 text-khoj-text">
              {file.code}
            </pre>
          )}
        </div>
      ))}
    </div>
  )
}

function SetupTab({ setup }: { setup: MvpSetup }) {
  return (
    <div className="space-y-4">
      <SectionCard title="Prerequisites">
        <ul className="space-y-1">
          {setup?.prerequisites?.map((p, i) => (
            <li key={i} className="flex gap-2 text-sm text-khoj-text"><span className="text-khoj-accent">•</span> {p}</li>
          ))}
        </ul>
      </SectionCard>
      <SectionCard title="Setup steps">
        <ol className="space-y-1.5">
          {setup?.steps?.map((s, i) => (
            <li key={i} className="flex gap-2 text-sm text-khoj-text"><span className="flex-shrink-0 text-khoj-accent">{i + 1}.</span> {s}</li>
          ))}
        </ol>
      </SectionCard>
      <SectionCard title="Required env vars">
        <div className="flex flex-wrap gap-1.5">
          {setup?.envVars?.map((e) => (
            <span key={e} className="rounded-sm bg-black/30 px-2 py-0.5 font-mono text-xs text-khoj-accent">{e}</span>
          ))}
        </div>
      </SectionCard>
    </div>
  )
}

function TestingTab({ testing }: { testing: MvpTesting }) {
  return (
    <div className="space-y-4">
      {[
        { title: 'Unit tests', items: testing?.unitTests },
        { title: 'Integration tests', items: testing?.integrationTests },
        { title: 'Manual checklist', items: testing?.manualChecklist },
      ].map(({ title, items }) => (
        <SectionCard key={title} title={title}>
          <ul className="space-y-1.5">
            {items?.map((item, i) => (
              <li key={i} className="flex gap-2 text-sm text-khoj-text">
                <span className="mt-1 h-3 w-3 flex-shrink-0 rounded-sm border border-khoj-border" />
                {item}
              </li>
            ))}
          </ul>
        </SectionCard>
      ))}
    </div>
  )
}

function DeployTab({
  deploy,
  buildId,
  deploymentUrl,
  deploymentStatus,
  approvalStatus,
  onDeploy,
  deploying,
  deployError,
  deploySuccess,
}: {
  deploy: MvpDeploy
  buildId: string | null
  deploymentUrl?: string
  deploymentStatus: DeploymentStatus
  approvalStatus: ApprovalStatus
  onDeploy: () => void
  deploying: boolean
  deployError: string | null
  deploySuccess: string | null
}) {
  return (
    <div className="space-y-4">
      <SectionCard title={`Deploy to ${deploy?.platform ?? 'Vercel'}`}>
        <ol className="space-y-1.5">
          {deploy?.steps?.map((s, i) => (
            <li key={i} className="flex gap-2 text-sm text-khoj-text"><span className="flex-shrink-0 text-khoj-accent">{i + 1}.</span> {s}</li>
          ))}
        </ol>
      </SectionCard>
      <SectionCard title="Deploy checklist">
        <ul className="space-y-1.5">
          {deploy?.checklist?.map((item, i) => (
            <li key={i} className="flex gap-2 text-sm text-khoj-text">
              <span className="mt-1 h-3 w-3 flex-shrink-0 rounded-sm border border-khoj-border" />
              {item}
            </li>
          ))}
        </ul>
      </SectionCard>
      {buildId && (
        <SectionCard title="One-click deploy">
          <p className="mb-3 text-xs text-khoj-subtle">
            Once approved, KHOJ can deploy this build directly to Vercel using your server tokens.
          </p>
          {deployError && (
            <div className="mb-3 rounded-sm border border-red-500/30 bg-red-500/10 px-4 py-2 text-sm text-red-300">{deployError}</div>
          )}
          {deploySuccess && (
            <div className="mb-3 rounded-sm border border-green-500/30 bg-green-500/10 px-4 py-2 text-sm text-green-300">{deploySuccess}</div>
          )}
          <div className="flex flex-wrap gap-3">
            <button
              type="button"
              onClick={onDeploy}
              disabled={deploying || approvalStatus !== 'approved' || deploymentStatus === 'deployed' || deploymentStatus === 'deploying'}
              className="rounded-sm bg-khoj-accent px-4 py-2 text-sm font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-40"
            >
              {deploying ? 'Deploying\u2026' : 'Deploy to Vercel'}
            </button>
            {approvalStatus !== 'approved' && (
              <p className="self-center text-xs text-khoj-subtle">Build requires admin approval before deployment.</p>
            )}
            {deploymentUrl && (
              <a href={deploymentUrl} target="_blank" rel="noreferrer" className="rounded-sm border border-green-500/40 px-4 py-2 text-sm text-green-400 transition-colors hover:border-green-400">
                View live \u2197
              </a>
            )}
          </div>
        </SectionCard>
      )}
    </div>
  )
}

function FinalRecommendationTab({ rec }: { rec: MvpFinalRecommendation }) {
  return (
    <SectionCard>
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-widest text-khoj-subtle">Verdict</p>
          <p className="mt-1 text-xl font-bold text-khoj-accent">{rec?.verdict ?? '\u2014'}</p>
        </div>
        <div className="text-right">
          <p className="text-xs font-semibold uppercase tracking-widest text-khoj-subtle">Score</p>
          <p className="mt-1 text-2xl font-bold text-khoj-text">{rec?.score ?? '\u2014'}<span className="text-sm text-khoj-subtle">/10</span></p>
        </div>
      </div>
      <div className="mt-5 space-y-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-widest text-khoj-subtle">Advice</p>
          <p className="mt-1 text-sm leading-6 text-khoj-text">{rec?.advice ?? '\u2014'}</p>
        </div>
        <div>
          <p className="text-xs font-semibold uppercase tracking-widest text-khoj-subtle">Next milestone</p>
          <p className="mt-1 text-sm leading-6 text-khoj-text">{rec?.nextMilestone ?? '\u2014'}</p>
        </div>
      </div>
    </SectionCard>
  )
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function KhojAIPage() {
  const router = useRouter()

  // ── MVP Builder state ───────────────────────────────────────────────────────
  const [appName, setAppName] = useState('')
  const [description, setDescription] = useState('')
  const [requiresLogin, setRequiresLogin] = useState(true)
  const [requiresDatabase, setRequiresDatabase] = useState(true)
  const [requiresPayment, setRequiresPayment] = useState(false)
  const [requiresAI, setRequiresAI] = useState(false)

  const [generating, setGenerating] = useState(false)
  const [generateError, setGenerateError] = useState<string | null>(null)
  const [firestoreWarning, setFirestoreWarning] = useState<string | null>(null)
  const [modelUsed, setModelUsed] = useState<string | null>(null)
  const [mvpPackage, setMvpPackage] = useState<MvpPackage | null>(null)
  const [generatedBuildId, setGeneratedBuildId] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<MvpTab>('Blueprint')

  // ── Build history state ─────────────────────────────────────────────────────
  const [builds, setBuilds] = useState<KhojBuild[]>([])
  const [selectedBuildId, setSelectedBuildId] = useState<string | null>(null)
  const [historyLoading, setHistoryLoading] = useState(true)

  // ── Deploy state ────────────────────────────────────────────────────────────
  const [deploying, setDeploying] = useState(false)
  const [deployError, setDeployError] = useState<string | null>(null)
  const [deploySuccess, setDeploySuccess] = useState<string | null>(null)

  // ── View mode ──────────────────────────────────────────────────────────────
  const [view, setView] = useState<'builder' | 'history'>('builder')

  // Auth guard
  useEffect(() => {
    const unsub = auth?.onAuthStateChanged?.((user) => {
      if (!user) router.replace('/auth/login?redirect=/khoj-ai')
    })
    return () => unsub?.()
  }, [router])

  // Subscribe to user's builds
  useEffect(() => {
    const user = auth?.currentUser
    if (!user || !db) return

    const q = query(
      collection(db, 'khojBuilds'),
      where('userId', '==', user.uid),
      orderBy('createdAt', 'desc')
    )

    const unsub = onSnapshot(
      q,
      (snap) => {
        setBuilds(snap.docs.map((d) => ({ id: d.id, ...d.data() } as KhojBuild)))
        setHistoryLoading(false)
      },
      () => setHistoryLoading(false)
    )

    return () => unsub()
  }, [])

  const selectedBuild = builds.find((b) => b.id === selectedBuildId) ?? null

  // ── Generate MVP package ────────────────────────────────────────────────────
  const handleGenerate = useCallback(async () => {
    if (generating || !appName.trim() || !description.trim()) return
    setGenerateError(null)
    setFirestoreWarning(null)
    setMvpPackage(null)
    setGeneratedBuildId(null)
    setModelUsed(null)
    setGenerating(true)

    try {
      const user = auth?.currentUser
      if (!user) throw new Error('Not signed in.')
      const token = await user.getIdToken()

      const res = await fetch('/api/ai/mvp-builder', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ appName: appName.trim(), description: description.trim(), requiresLogin, requiresDatabase, requiresPayment, requiresAI }),
      })

      const data = await res.json() as {
        ok?: boolean; error?: string; buildId?: string
        firestoreSaved?: boolean; modelUsed?: string; package?: MvpPackage; warning?: string
      }

      if (!res.ok || !data.ok) throw new Error(data.error ?? 'Generation failed.')

      setMvpPackage(data.package ?? null)
      setGeneratedBuildId(data.buildId ?? null)
      setModelUsed(data.modelUsed ?? null)
      setActiveTab('Blueprint')
      if (data.warning) setFirestoreWarning(data.warning)
    } catch (err) {
      setGenerateError(err instanceof Error ? err.message : 'Generation failed.')
    } finally {
      setGenerating(false)
    }
  }, [generating, appName, description, requiresLogin, requiresDatabase, requiresPayment, requiresAI])

  // ── Deploy ──────────────────────────────────────────────────────────────────
  const handleDeploy = useCallback(async () => {
    const buildId = generatedBuildId ?? selectedBuild?.id
    if (!buildId || deploying) return
    setDeployError(null)
    setDeploySuccess(null)
    setDeploying(true)

    try {
      const user = auth?.currentUser
      if (!user) throw new Error('Not signed in.')
      const token = await user.getIdToken()

      const res = await fetch('/api/ai/deploy', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ buildId }),
      })

      const data = await res.json() as { ok?: boolean; error?: string; deploymentUrl?: string }
      if (!res.ok || !data.ok) throw new Error(data.error ?? 'Deployment failed.')
      setDeploySuccess(data.deploymentUrl ? `Deployed! Live at ${data.deploymentUrl}` : 'Deployment started.')
    } catch (err) {
      setDeployError(err instanceof Error ? err.message : 'Deployment failed.')
    } finally {
      setDeploying(false)
    }
  }, [generatedBuildId, selectedBuild, deploying])

  // ── Reject ──────────────────────────────────────────────────────────────────
  const handleReject = useCallback(async () => {
    if (!selectedBuild || !db) return
    try {
      await updateDoc(doc(db, 'khojBuilds', selectedBuild.id), {
        approvalStatus: 'rejected',
        deploymentStatus: 'rejected',
        updatedAt: new Date().toISOString(),
      })
    } catch { /* silently ignore */ }
  }, [selectedBuild])

  // ── Render ───────────────────────────────────────────────────────────────────

  const currentDeployStatus = selectedBuild?.deploymentStatus ?? 'pending'
  const currentApprovalStatus = selectedBuild?.approvalStatus ?? 'pending'

  return (
    <div className="min-h-screen bg-[#080910] px-4 py-8 md:px-8">
      <div className="mx-auto max-w-5xl">
        {/* Header */}
        <div className="mb-8">
          <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-khoj-accent">KHOJ AI</p>
          <h1 className="mt-1 text-3xl font-display font-bold text-khoj-text">MVP Build Engine</h1>
          <p className="mt-1 text-sm text-khoj-subtle">Describe your startup idea. KHOJ AI generates a complete MVP Build Package in seconds.</p>
        </div>

        {/* View switcher */}
        <div className="mb-6 flex gap-2">
          {(['builder', 'history'] as const).map((v) => (
            <button
              key={v}
              type="button"
              onClick={() => setView(v)}
              className={[
                'rounded-sm px-4 py-1.5 text-sm font-medium transition-colors capitalize',
                view === v ? 'bg-khoj-accent text-white' : 'border border-khoj-border text-khoj-subtle hover:text-khoj-text',
              ].join(' ')}
            >
              {v === 'history' ? `My builds${builds.length > 0 ? ` (${builds.length})` : ''}` : 'Build new'}
            </button>
          ))}
        </div>

        {/* ── BUILDER VIEW ── */}
        {view === 'builder' && (
          <div className="space-y-6">
            {/* Input form */}
            <div className="rounded-sm border border-khoj-border bg-khoj-card p-5">
              <h2 className="mb-4 text-sm font-semibold text-khoj-text">App details</h2>
              <div className="space-y-3">
                <div>
                  <label className="mb-1 block text-xs font-medium text-khoj-subtle" htmlFor="appName">App name</label>
                  <input
                    id="appName"
                    type="text"
                    value={appName}
                    onChange={(e) => setAppName(e.target.value)}
                    placeholder="e.g. SkillShare Pro"
                    maxLength={80}
                    className="w-full rounded-sm border border-khoj-border bg-[#0d0e16] px-3 py-2 text-sm text-khoj-text placeholder:text-khoj-muted focus:border-khoj-accent/60 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-khoj-subtle" htmlFor="description">What does it do?</label>
                  <textarea
                    id="description"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="An AI skill-sharing marketplace connecting companies with skilled engineers..."
                    rows={3}
                    maxLength={500}
                    className="w-full resize-none rounded-sm border border-khoj-border bg-[#0d0e16] px-3 py-2 text-sm text-khoj-text placeholder:text-khoj-muted focus:border-khoj-accent/60 focus:outline-none"
                  />
                </div>
              </div>
            </div>

            {/* Feature toggles */}
            <div className="rounded-sm border border-khoj-border bg-khoj-card p-5">
              <h2 className="mb-4 text-sm font-semibold text-khoj-text">Feature requirements</h2>
              <div className="grid gap-2 sm:grid-cols-2">
                <Toggle label="Login required?" description="User authentication and accounts" checked={requiresLogin} onChange={setRequiresLogin} />
                <Toggle label="Database needed?" description="Firestore / persistent data storage" checked={requiresDatabase} onChange={setRequiresDatabase} />
                <Toggle label="Payment needed?" description="Stripe subscriptions or one-time payments" checked={requiresPayment} onChange={setRequiresPayment} />
                <Toggle label="AI feature needed?" description="OpenAI / Gemini powered features" checked={requiresAI} onChange={setRequiresAI} />
              </div>
            </div>

            {/* Generate button */}
            <button
              type="button"
              onClick={handleGenerate}
              disabled={generating || !appName.trim() || !description.trim()}
              className="w-full rounded-sm bg-khoj-accent py-3 text-sm font-bold tracking-wide text-white transition-opacity hover:opacity-90 disabled:opacity-40"
            >
              {generating ? 'Generating MVP Build Package\u2026' : 'Generate MVP Build Package'}
            </button>

            {generateError && (
              <div className="rounded-sm border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300">{generateError}</div>
            )}

            {/* MVP Result */}
            {mvpPackage && (
              <div className="space-y-4">
                {/* Result header */}
                <div className="rounded-sm border border-khoj-border bg-khoj-card px-5 py-4">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <p className="text-[10px] font-semibold uppercase tracking-widest text-khoj-subtle">MVP BUILD PACKAGE</p>
                      <p className="mt-0.5 text-lg font-bold text-khoj-text">{appName}</p>
                    </div>
                    <span className="rounded-sm border border-khoj-accent/40 bg-khoj-accent/10 px-3 py-1 text-xs font-bold uppercase tracking-widest text-khoj-accent">
                      {mvpPackage.finalRecommendation?.verdict ?? 'READY TO BUILD MVP'}
                    </span>
                  </div>
                  {modelUsed && <p className="mt-2 text-[10px] text-khoj-muted">Generated with KHOJ AI / {modelUsed}</p>}
                </div>

                {firestoreWarning && (
                  <div className="rounded-sm border border-yellow-500/30 bg-yellow-500/10 px-4 py-3 text-sm text-yellow-300">{firestoreWarning}</div>
                )}

                <div className="rounded-sm border border-khoj-border px-4 py-2.5 text-xs text-khoj-subtle">
                  Engine safety: generated MVP files are returned as text only. KHOJ did not write to disk or deploy anything.
                </div>

                {/* Tab bar */}
                <div className="flex flex-wrap gap-1.5">
                  {MVP_TABS.map((tab) => (
                    <TabButton key={tab} tab={tab} active={activeTab === tab} onClick={() => setActiveTab(tab)} />
                  ))}
                </div>

                {/* Tab content */}
                {activeTab === 'Blueprint' && <BlueprintTab bp={mvpPackage.blueprint} />}
                {activeTab === 'Pages' && <PagesTab pages={mvpPackage.pages} />}
                {activeTab === 'Components' && <ComponentsTab components={mvpPackage.components} />}
                {activeTab === 'Firebase' && <FirebaseTab firebase={mvpPackage.firebase} />}
                {activeTab === 'Generated Files' && <GeneratedFilesTab files={mvpPackage.generatedFiles} />}
                {activeTab === 'Setup' && <SetupTab setup={mvpPackage.setup} />}
                {activeTab === 'Testing' && <TestingTab testing={mvpPackage.testing} />}
                {activeTab === 'Deploy' && (
                  <DeployTab
                    deploy={mvpPackage.deploy}
                    buildId={generatedBuildId}
                    deploymentUrl={undefined}
                    deploymentStatus={currentDeployStatus}
                    approvalStatus={currentApprovalStatus}
                    onDeploy={handleDeploy}
                    deploying={deploying}
                    deployError={deployError}
                    deploySuccess={deploySuccess}
                  />
                )}
                {activeTab === 'Final Recommendation' && <FinalRecommendationTab rec={mvpPackage.finalRecommendation} />}
              </div>
            )}
          </div>
        )}

        {/* ── HISTORY VIEW ── */}
        {view === 'history' && (
          <div>
            {historyLoading ? (
              <p className="text-sm text-khoj-subtle">Loading builds\u2026</p>
            ) : builds.length === 0 ? (
              <div className="rounded-sm border border-khoj-border bg-khoj-card px-6 py-12 text-center">
                <p className="text-khoj-subtle">
                  No builds yet.{' '}
                  <button type="button" onClick={() => setView('builder')} className="text-khoj-accent underline">
                    Generate your first MVP
                  </button>
                </p>
              </div>
            ) : (
              <div className="grid gap-4 lg:grid-cols-[240px_1fr]">
                {/* Build list sidebar */}
                <div className="space-y-2">
                  {builds.map((b) => (
                    <button
                      key={b.id}
                      type="button"
                      onClick={() => { setSelectedBuildId(b.id); setDeployError(null); setDeploySuccess(null); setActiveTab('Blueprint') }}
                      className={[
                        'w-full rounded-sm border px-4 py-3 text-left transition-colors',
                        selectedBuildId === b.id ? 'border-khoj-accent/60 bg-khoj-card' : 'border-khoj-border bg-[#0d0e16] hover:border-khoj-border/80',
                      ].join(' ')}
                    >
                      <p className="truncate text-sm font-medium text-khoj-text">{b.appName}</p>
                      <p className={`mt-0.5 text-xs font-medium ${statusColor(b.deploymentStatus)}`}>{statusLabel(b.deploymentStatus)}</p>
                      <p className="mt-0.5 text-[10px] text-khoj-muted">{new Date(b.createdAt).toLocaleDateString()}</p>
                    </button>
                  ))}
                </div>

                {/* Build detail */}
                {selectedBuild ? (
                  <div className="space-y-4">
                    <div className="rounded-sm border border-khoj-border bg-khoj-card px-5 py-4">
                      <div className="flex flex-wrap items-center justify-between gap-3">
                        <div>
                          <p className="text-[10px] font-semibold uppercase tracking-widest text-khoj-subtle">MVP BUILD PACKAGE</p>
                          <p className="mt-0.5 text-lg font-bold text-khoj-text">{selectedBuild.appName}</p>
                        </div>
                        <span className={`rounded-sm border px-3 py-1 text-xs font-bold uppercase tracking-widest ${selectedBuild.deploymentStatus === 'deployed' ? 'border-green-500/40 text-green-400' : 'border-khoj-border text-khoj-subtle'}`}>
                          {statusLabel(selectedBuild.deploymentStatus)}
                        </span>
                      </div>
                      {selectedBuild.modelUsed && <p className="mt-2 text-[10px] text-khoj-muted">Generated with KHOJ AI / {selectedBuild.modelUsed}</p>}
                      <div className="mt-3 flex flex-wrap gap-2">
                        <button
                          type="button"
                          onClick={handleReject}
                          disabled={selectedBuild.deploymentStatus === 'rejected' || selectedBuild.deploymentStatus === 'deployed'}
                          className="rounded-sm border border-khoj-border px-3 py-1.5 text-xs text-khoj-subtle transition-colors hover:border-red-400/50 hover:text-red-300 disabled:opacity-40"
                        >
                          Reject
                        </button>
                        {selectedBuild.deploymentUrl && (
                          <a href={selectedBuild.deploymentUrl} target="_blank" rel="noreferrer" className="rounded-sm border border-green-500/40 px-3 py-1.5 text-xs text-green-400 transition-colors hover:border-green-400">
                            View live \u2197
                          </a>
                        )}
                      </div>
                    </div>

                    {selectedBuild.package && (
                      <>
                        <div className="flex flex-wrap gap-1.5">
                          {MVP_TABS.map((tab) => (
                            <TabButton key={tab} tab={tab} active={activeTab === tab} onClick={() => setActiveTab(tab)} />
                          ))}
                        </div>
                        {activeTab === 'Blueprint' && <BlueprintTab bp={selectedBuild.package.blueprint} />}
                        {activeTab === 'Pages' && <PagesTab pages={selectedBuild.package.pages} />}
                        {activeTab === 'Components' && <ComponentsTab components={selectedBuild.package.components} />}
                        {activeTab === 'Firebase' && <FirebaseTab firebase={selectedBuild.package.firebase} />}
                        {activeTab === 'Generated Files' && <GeneratedFilesTab files={selectedBuild.package.generatedFiles} />}
                        {activeTab === 'Setup' && <SetupTab setup={selectedBuild.package.setup} />}
                        {activeTab === 'Testing' && <TestingTab testing={selectedBuild.package.testing} />}
                        {activeTab === 'Deploy' && (
                          <DeployTab
                            deploy={selectedBuild.package.deploy}
                            buildId={selectedBuild.id}
                            deploymentUrl={selectedBuild.deploymentUrl}
                            deploymentStatus={selectedBuild.deploymentStatus}
                            approvalStatus={selectedBuild.approvalStatus}
                            onDeploy={handleDeploy}
                            deploying={deploying}
                            deployError={deployError}
                            deploySuccess={deploySuccess}
                          />
                        )}
                        {activeTab === 'Final Recommendation' && <FinalRecommendationTab rec={selectedBuild.package.finalRecommendation} />}
                      </>
                    )}
                  </div>
                ) : (
                  <p className="text-sm text-khoj-subtle">Select a build to view details.</p>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
