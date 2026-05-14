'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import toast from 'react-hot-toast'
import { useAuth } from '@/hooks/useAuth'
import { useAdminUser } from '@/components/admin/AdminGate'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { Input, Select } from '@/components/ui/Input'
import {
  getGrowthContentIdeas,
  saveGrowthContentIdea,
  updateGrowthContentStatus,
  type GrowthContentIdea,
  type GrowthContentStatus,
} from '@/services/growthContentService'

type GrowthTab = 'overview' | 'pipeline' | 'reels' | 'ideas'
type PipelineAction = 'full' | 'research' | 'validate' | 'script' | 'hook'

type GrowthTask = {
  label: string
  prompt: string
  platform: string
  contentType: string
}

type GeneratedResult = {
  id: string
  title: string
  prompt: string
  output: string
  platform: string
  contentType: string
  source: 'openai' | 'mock' | null
  createdAt: string
}

type ChatMessage = {
  id: string
  role: 'user' | 'assistant'
  text: string
  source?: 'openai' | 'mock' | null
}

type KhojAiResponse = {
  ok: boolean
  message?: string
  error?: string
  source?: 'openai' | 'mock'
}

const GROWTH_ROLES = new Set(['admin', 'founder', 'ceo'])

const QUICK_TASKS: GrowthTask[] = [
  {
    label: 'Give me 5 reel ideas for this week',
    prompt: 'Give me 5 founder-led reel ideas for this week to grow the KHOJ private beta.',
    platform: 'Instagram Reels',
    contentType: 'Weekly reel ideas',
  },
  {
    label: 'Write 3 hooks for a KHOJ reel',
    prompt: 'Write 3 high-retention hooks for a KHOJ reel about finding serious startup teammates.',
    platform: 'Instagram Reels',
    contentType: 'Reel hooks',
  },
  {
    label: 'Create a content calendar for the next 7 days',
    prompt: 'Create a 7-day content calendar for KHOJ private beta growth across reels and founder posts.',
    platform: 'Multi-platform',
    contentType: '7-day content calendar',
  },
  {
    label: 'Write a caption for a before/after KHOJ story',
    prompt: 'Write a before/after caption showing life before KHOJ and after using KHOJ to find builders, rooms, and opportunities.',
    platform: 'LinkedIn',
    contentType: 'Before/after caption',
  },
  {
    label: 'Create a beta tester invitation message',
    prompt: 'Create a beta tester invitation message for founders, developers, designers, marketers, creators, and mentors.',
    platform: 'DM / Email',
    contentType: 'Beta tester invitation',
  },
]

const IDEA_PRESETS: GrowthTask[] = [
  {
    label: 'Create reel ideas',
    prompt: 'Create five short-form reel ideas for KHOJ private beta that make founders and builders want to join.',
    platform: 'Instagram Reels',
    contentType: 'Reel ideas',
  },
  {
    label: 'Write 30-second reel script',
    prompt: 'Write one sharp 30-second founder-led reel script for KHOJ private beta.',
    platform: 'Instagram Reels',
    contentType: '30-second reel script',
  },
  {
    label: 'Create beta launch post',
    prompt: 'Create a beta launch post announcing KHOJ to founders, builders, creators, and startup teammates.',
    platform: 'LinkedIn',
    contentType: 'Beta launch post',
  },
  {
    label: 'Write founder story post',
    prompt: 'Write a founder story post explaining why KHOJ exists and what private beta users can build with it.',
    platform: 'LinkedIn',
    contentType: 'Founder story post',
  },
]

const SECTION_HEADINGS = [
  'Content goal',
  'Target audience',
  'Validated idea score /10',
  'Hook',
  '30-second script',
  'Scene-by-scene shot list',
  'Text overlays',
  'Caption',
  'Hashtags',
  'CTA',
  'Call-to-action',
  'Final recommendation',
  'Posting suggestion',
]

const STATUS_OPTIONS: Array<{ value: GrowthContentStatus; label: string }> = [
  { value: 'draft', label: 'Draft' },
  { value: 'approved', label: 'Approved' },
  { value: 'posted', label: 'Posted' },
]

const TABS: Array<{ id: GrowthTab; label: string }> = [
  { id: 'overview', label: 'Overview' },
  { id: 'pipeline', label: 'Pipeline' },
  { id: 'reels', label: 'Reels' },
  { id: 'ideas', label: 'Ideas' },
]

const PIPELINE_AGENTS = [
  {
    name: 'Research Agent',
    description:
      'Finds content angles, target audience pain points, KHOJ positioning, and platform ideas.',
  },
  {
    name: 'Validation Agent',
    description:
      'Scores content ideas based on clarity, viral potential, target audience fit, KHOJ relevance, and CTA strength.',
  },
  {
    name: 'Script Writer Agent',
    description:
      'Turns approved ideas into reel scripts, captions, LinkedIn posts, beta invitation messages, and founder story content.',
  },
  {
    name: 'Hook Doctor Agent',
    description:
      'Improves hooks, first 3 seconds, titles, text overlays, CTAs, and retention structure.',
  },
]

const PIPELINE_ACTIONS: Record<PipelineAction, { label: string; contentType: string; instruction: string }> = {
  full: {
    label: 'Run Full Pipeline',
    contentType: '4-Agent content pipeline',
    instruction:
      'Run Research Agent, Validation Agent, Script Writer Agent, and Hook Doctor Agent in sequence.',
  },
  research: {
    label: 'Research Only',
    contentType: 'Research output',
    instruction:
      'Focus on the Research Agent. Find content angles, pain points, positioning, and platform ideas.',
  },
  validate: {
    label: 'Validate Idea',
    contentType: 'Idea validation',
    instruction:
      'Focus on the Validation Agent. Score the idea and explain what must improve before founder approval.',
  },
  script: {
    label: 'Write Script',
    contentType: 'Script draft',
    instruction:
      'Focus on the Script Writer Agent. Turn the raw idea into a usable reel script, caption, and post-ready draft.',
  },
  hook: {
    label: 'Improve Hook',
    contentType: 'Hook improvement',
    instruction:
      'Focus on the Hook Doctor Agent. Improve the opening hook, first 3 seconds, overlays, CTA, and retention structure.',
  },
}

function escapeRegex(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

function cleanSection(value: string): string {
  return value
    .replace(/^\s*[:\-]\s*/, '')
    .replace(/\n{3,}/g, '\n\n')
    .trim()
}

function extractSection(output: string, heading: string): string {
  const otherHeadings = SECTION_HEADINGS
    .filter((item) => item !== heading)
    .map(escapeRegex)
    .join('|')
  const headingPattern = escapeRegex(heading)
  const regex = new RegExp(
    `(?:^|\\n)\\s*(?:#{1,4}\\s*)?(?:[-*]\\s*)?(?:\\*\\*)?${headingPattern}(?:\\*\\*)?\\s*:?\\s*([\\s\\S]*?)(?=\\n\\s*(?:#{1,4}\\s*)?(?:[-*]\\s*)?(?:\\*\\*)?(?:${otherHeadings})(?:\\*\\*)?\\s*:?|$)`,
    'i'
  )
  const match = output.match(regex)
  return cleanSection(match?.[1] ?? '')
}

function extractHashtags(value: string): string[] {
  const tags = value.match(/#[a-z0-9_]+/gi)
  if (tags?.length) return Array.from(new Set(tags)).slice(0, 20)

  return value
    .split(/[\s,]+/)
    .map((tag) => tag.trim())
    .filter(Boolean)
    .map((tag) => (tag.startsWith('#') ? tag : `#${tag.replace(/^#+/, '')}`))
    .slice(0, 20)
}

function extractCta(output: string): string {
  return extractSection(output, 'CTA') || extractSection(output, 'Call-to-action')
}

function extractValidationScore(output: string): number | null {
  const scoreSection = extractSection(output, 'Validated idea score /10')
  const scoreMatch = (scoreSection || output).match(/(\d+(?:\.\d+)?)\s*\/\s*10/i)
  const rawScore = Number(scoreMatch?.[1] ?? NaN)

  if (!Number.isFinite(rawScore)) return null
  return Math.max(0, Math.min(10, rawScore))
}

function buildAiPrompt(task: Pick<GrowthTask, 'prompt' | 'platform' | 'contentType' | 'label'>) {
  return [
    'You are creating internal growth content for KHOJ private beta.',
    `Task: ${task.label}`,
    `Platform: ${task.platform}`,
    `Content type: ${task.contentType}`,
    `Founder/admin request: ${task.prompt}`,
    '',
    'Return the output with these exact headings:',
    SECTION_HEADINGS.join(', '),
    '',
    'Make it specific to KHOJ as a talent discovery, Startup Room, KHOJ AI, and Opportunity Market platform.',
    'Human approval is required before anything is posted.',
    'Do not auto-post to Instagram, TikTok, YouTube, LinkedIn, or any other social platform.',
    'Do not generate MP4 video.',
  ].join('\n')
}

function buildPipelinePrompt(action: PipelineAction, rawInput: string) {
  const actionConfig = PIPELINE_ACTIONS[action]

  return [
    'Run the KHOJ Growth Studio 4-Agent Content Pipeline as a guided AI workflow.',
    `Action: ${actionConfig.label}`,
    `Instruction: ${actionConfig.instruction}`,
    '',
    'Raw input:',
    rawInput,
    '',
    'Pipeline flow:',
    'Input idea or raw notes -> Research Agent -> Validation Agent -> Script Writer Agent -> Hook Doctor Agent -> Ready for founder approval',
    '',
    'Agent responsibilities:',
    '1. Research Agent: content angles, target audience pain points, KHOJ positioning, and platform ideas.',
    '2. Validation Agent: score clarity, viral potential, target audience fit, KHOJ relevance, and CTA strength.',
    '3. Script Writer Agent: turn approved ideas into reel scripts, captions, LinkedIn posts, beta invitations, and founder stories.',
    '4. Hook Doctor Agent: improve hooks, first 3 seconds, titles, text overlays, CTAs, and retention structure.',
    '',
    'Return the output with these exact headings:',
    '- Content goal',
    '- Target audience',
    '- Validated idea score /10',
    '- Hook',
    '- 30-second script',
    '- Scene-by-scene shot list',
    '- Text overlays',
    '- Caption',
    '- Hashtags',
    '- CTA',
    '- Final recommendation',
    '',
    'Final recommendation must be exactly one of: Draft, Approve, Improve.',
    'Do not add real Instagram scraping.',
    'Do not auto-post to social media.',
    'Do not generate MP4 videos.',
    'Keep this practical for KHOJ private beta growth.',
  ].join('\n')
}

function buildSavePayload(params: {
  output: string
  title: string
  platform: string
  contentType: string
  status: GrowthContentStatus
  createdBy: string
  rawInput?: string
  researchOutput?: string
  validationScore?: number | null
}) {
  const hook = extractSection(params.output, 'Hook')
  const script = extractSection(params.output, '30-second script') || params.output
  const caption = extractSection(params.output, 'Caption')
  const hashtags = extractHashtags(extractSection(params.output, 'Hashtags'))
  const cta = extractCta(params.output)

  return {
    title: params.title || `${params.contentType} for ${params.platform}`,
    platform: params.platform,
    contentType: params.contentType,
    hook: hook || 'Review generated output for hook.',
    script,
    caption,
    hashtags,
    cta: cta || 'Join the KHOJ private beta.',
    status: params.status,
    createdBy: params.createdBy,
    rawInput: params.rawInput,
    researchOutput:
      params.researchOutput ??
      [extractSection(params.output, 'Content goal'), extractSection(params.output, 'Target audience')]
        .filter(Boolean)
        .join('\n\n'),
    validationScore: params.validationScore ?? extractValidationScore(params.output),
    rawOutput: params.output,
  }
}

function getFriendlyError(error: unknown): string {
  const code = error && typeof error === 'object' && 'code' in error ? String(error.code) : ''
  const message = error instanceof Error ? error.message : ''

  if (code === 'firebase/not-configured') {
    return 'Firebase is not configured. Check Vercel environment variables.'
  }

  if (code === 'permission-denied' || message.includes('Missing or insufficient permissions')) {
    return 'Your account does not have admin/founder/ceo permission.'
  }

  return message || 'Growth Studio failed. Please try again.'
}

function statusClass(status: GrowthContentStatus): string {
  if (status === 'approved') return 'border-khoj-teal/30 bg-khoj-teal/10 text-khoj-teal'
  if (status === 'posted') return 'border-khoj-accent/30 bg-khoj-accent/10 text-khoj-accent'
  return 'border-khoj-border bg-khoj-bg text-khoj-subtle'
}

function StatTile({ label, value, sub }: { label: string; value: string | number; sub: string }) {
  return (
    <div className="rounded-sm border border-khoj-border bg-khoj-card p-4">
      <p className="text-[10px] uppercase tracking-[0.16em] text-khoj-subtle">{label}</p>
      <p className="mt-2 font-display text-3xl font-bold text-khoj-text">{value}</p>
      <p className="mt-1 text-xs text-khoj-muted">{sub}</p>
    </div>
  )
}

function OutputBlock({ output }: { output: string }) {
  return (
    <pre className="max-h-[520px] overflow-y-auto whitespace-pre-wrap break-words rounded-sm border border-khoj-border bg-[#0d0e16] p-4 font-body text-sm leading-6 text-khoj-text">
      {output}
    </pre>
  )
}

export default function AdminGrowthStudioPage() {
  const { firebaseUser, loading: authLoading } = useAuth()
  const adminUser = useAdminUser()
  const [activeTab, setActiveTab] = useState<GrowthTab>('overview')
  const [prompt, setPrompt] = useState(IDEA_PRESETS[0].prompt)
  const [taskTitle, setTaskTitle] = useState(IDEA_PRESETS[0].label)
  const [platform, setPlatform] = useState(IDEA_PRESETS[0].platform)
  const [contentType, setContentType] = useState(IDEA_PRESETS[0].contentType)
  const [saveStatus, setSaveStatus] = useState<GrowthContentStatus>('draft')
  const [generatedOutput, setGeneratedOutput] = useState('')
  const [generatedMeta, setGeneratedMeta] = useState<GrowthTask>(IDEA_PRESETS[0])
  const [source, setSource] = useState<'openai' | 'mock' | null>(null)
  const [generatedResults, setGeneratedResults] = useState<GeneratedResult[]>([])
  const [generating, setGenerating] = useState(false)
  const [saving, setSaving] = useState(false)
  const [ideas, setIdeas] = useState<GrowthContentIdea[]>([])
  const [loadingIdeas, setLoadingIdeas] = useState(true)
  const [updatingStatusId, setUpdatingStatusId] = useState<string | null>(null)
  const [selectedIdea, setSelectedIdea] = useState<GrowthContentIdea | null>(null)
  const [pipelineInput, setPipelineInput] = useState('')
  const [pipelineOutput, setPipelineOutput] = useState('')
  const [pipelineAction, setPipelineAction] = useState<PipelineAction>('full')
  const [pipelineSource, setPipelineSource] = useState<'openai' | 'mock' | null>(null)
  const [runningPipeline, setRunningPipeline] = useState<PipelineAction | null>(null)
  const [savingPipeline, setSavingPipeline] = useState(false)
  const [chatInput, setChatInput] = useState('')
  const [chatSending, setChatSending] = useState(false)
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([
    {
      id: 'welcome',
      role: 'assistant',
      text: 'Ask for KHOJ private beta reels, launch posts, hooks, calendars, or beta tester messages. I will keep outputs approval-ready and internal.',
    },
  ])

  const isAllowed = useMemo(
    () => Boolean(adminUser?.role && GROWTH_ROLES.has(adminUser.role)),
    [adminUser?.role]
  )

  useEffect(() => {
    console.log('Growth Studio role check', {
      uid: firebaseUser?.uid ?? adminUser?.uid ?? null,
      email: firebaseUser?.email ?? adminUser?.email ?? null,
      role: adminUser?.role ?? null,
      isAllowed,
    })
  }, [adminUser?.email, adminUser?.role, adminUser?.uid, firebaseUser?.email, firebaseUser?.uid, isAllowed])

  const stats = useMemo(() => {
    const now = new Date()
    const weekStart = new Date(now)
    weekStart.setDate(now.getDate() - 7)

    return {
      total: ideas.length,
      approved: ideas.filter((idea) => idea.status === 'approved').length,
      posted: ideas.filter((idea) => idea.status === 'posted').length,
      thisWeek: ideas.filter((idea) => new Date(idea.createdAt) >= weekStart).length,
    }
  }, [ideas])

  const loadIdeas = useCallback(async () => {
    try {
      setLoadingIdeas(true)
      const data = await getGrowthContentIdeas(40)
      setIdeas(data)
      setSelectedIdea((current) => {
        if (!current) return data[0] ?? null
        return data.find((idea) => idea.id === current.id) ?? data[0] ?? null
      })
    } catch (error) {
      console.error('Growth content load error:', error)
      toast.error(getFriendlyError(error))
    } finally {
      setLoadingIdeas(false)
    }
  }, [])

  useEffect(() => {
    if (!authLoading && isAllowed) {
      void loadIdeas()
    } else if (!authLoading) {
      setLoadingIdeas(false)
    }
  }, [authLoading, isAllowed, loadIdeas])

  function applyIdeaPreset(task: GrowthTask) {
    setTaskTitle(task.label)
    setPrompt(task.prompt)
    setPlatform(task.platform)
    setContentType(task.contentType)
    setGeneratedMeta(task)
  }

  async function requestGrowthOutput(task: GrowthTask): Promise<GeneratedResult> {
    if (!firebaseUser) {
      throw new Error('Please sign in to use Growth Studio.')
    }

    const token = await firebaseUser.getIdToken()
    const response = await fetch('/api/ai/khoj-assistant', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        message: buildAiPrompt(task),
        mode: 'general',
        toolType: 'growth_content',
      }),
    })

    const data = (await response.json()) as KhojAiResponse
    if (!response.ok || !data.ok) {
      throw new Error(data.error ?? 'KHOJ AI could not generate growth content.')
    }

    const result: GeneratedResult = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
      title: task.label,
      prompt: task.prompt,
      output: data.message ?? '',
      platform: task.platform,
      contentType: task.contentType,
      source: data.source ?? null,
      createdAt: new Date().toISOString(),
    }

    setGeneratedOutput(result.output)
    setGeneratedMeta(task)
    setTaskTitle(task.label)
    setPlatform(task.platform)
    setContentType(task.contentType)
    setSource(result.source)
    setGeneratedResults((prev) => [result, ...prev].slice(0, 8))

    return result
  }

  async function runTask(task: GrowthTask, nextTab?: GrowthTab) {
    try {
      setGenerating(true)
      if (nextTab) setActiveTab(nextTab)
      await requestGrowthOutput(task)
    } catch (error) {
      console.error('Growth content generation error:', error)
      toast.error(getFriendlyError(error))
    } finally {
      setGenerating(false)
    }
  }

  async function handleIdeaSubmit(event: React.FormEvent) {
    event.preventDefault()
    const trimmedPrompt = prompt.trim()
    if (!trimmedPrompt) {
      toast.error('Add a growth content request first.')
      return
    }

    await runTask(
      {
        label: taskTitle || 'Custom growth idea',
        prompt: trimmedPrompt,
        platform,
        contentType,
      },
      'ideas'
    )
  }

  async function handleSaveCurrent() {
    if (!generatedOutput.trim()) {
      toast.error('Generate content before saving.')
      return
    }
    if (!firebaseUser) {
      toast.error('Please sign in to save content.')
      return
    }

    try {
      setSaving(true)
      await saveGrowthContentIdea(
        buildSavePayload({
          output: generatedOutput,
          title: generatedMeta.label,
          platform: generatedMeta.platform,
          contentType: generatedMeta.contentType,
          status: saveStatus,
          createdBy: firebaseUser.uid,
        })
      )
      toast.success('Content idea saved')
      await loadIdeas()
      setActiveTab('reels')
    } catch (error) {
      console.error('Growth content save error:', error)
      toast.error(getFriendlyError(error))
    } finally {
      setSaving(false)
    }
  }

  async function handleStatusChange(ideaId: string, nextStatus: GrowthContentStatus) {
    try {
      setUpdatingStatusId(ideaId)
      await updateGrowthContentStatus(ideaId, nextStatus)
      setIdeas((prev) =>
        prev.map((idea) =>
          idea.id === ideaId
            ? { ...idea, status: nextStatus, updatedAt: new Date().toISOString() }
            : idea
        )
      )
      setSelectedIdea((current) =>
        current?.id === ideaId
          ? { ...current, status: nextStatus, updatedAt: new Date().toISOString() }
          : current
      )
      toast.success('Status updated')
    } catch (error) {
      console.error('Growth content status error:', error)
      toast.error(getFriendlyError(error))
    } finally {
      setUpdatingStatusId(null)
    }
  }

  async function runPipeline(action: PipelineAction) {
    const rawInput = pipelineInput.trim()
    if (!rawInput) {
      toast.error('Paste a raw idea, reel concept, or marketing goal first.')
      return
    }
    if (!firebaseUser) {
      toast.error('Please sign in to use Growth Studio.')
      return
    }

    try {
      setRunningPipeline(action)
      setPipelineAction(action)
      setPipelineOutput('')
      setPipelineSource(null)

      const token = await firebaseUser.getIdToken()
      const response = await fetch('/api/ai/khoj-assistant', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          message: buildPipelinePrompt(action, rawInput),
          mode: 'general',
          toolType: 'growth_content',
        }),
      })

      const data = (await response.json()) as KhojAiResponse
      if (!response.ok || !data.ok) {
        throw new Error(data.error ?? 'KHOJ AI could not run the growth pipeline.')
      }

      const output = data.message ?? ''
      const actionConfig = PIPELINE_ACTIONS[action]
      const result: GeneratedResult = {
        id: `pipeline-${Date.now()}-${Math.random().toString(36).slice(2)}`,
        title: actionConfig.label,
        prompt: rawInput,
        output,
        platform: 'Multi-platform',
        contentType: actionConfig.contentType,
        source: data.source ?? null,
        createdAt: new Date().toISOString(),
      }

      setPipelineOutput(output)
      setPipelineSource(result.source)
      setGeneratedOutput(output)
      setGeneratedMeta({
        label: actionConfig.label,
        prompt: rawInput,
        platform: 'Multi-platform',
        contentType: actionConfig.contentType,
      })
      setSource(result.source)
      setGeneratedResults((prev) => [result, ...prev].slice(0, 8))
    } catch (error) {
      console.error('Growth pipeline error:', error)
      toast.error(getFriendlyError(error))
    } finally {
      setRunningPipeline(null)
    }
  }

  async function handleSavePipeline() {
    if (!pipelineOutput.trim()) {
      toast.error('Run the pipeline before saving.')
      return
    }
    if (!firebaseUser) {
      toast.error('Please sign in to save content.')
      return
    }

    const actionConfig = PIPELINE_ACTIONS[pipelineAction]

    try {
      setSavingPipeline(true)
      await saveGrowthContentIdea(
        buildSavePayload({
          output: pipelineOutput,
          title: `${actionConfig.label}: ${pipelineInput.trim().slice(0, 72) || 'Growth idea'}`,
          platform: 'Multi-platform',
          contentType: actionConfig.contentType,
          status: 'draft',
          createdBy: firebaseUser.uid,
          rawInput: pipelineInput.trim(),
          researchOutput: [
            extractSection(pipelineOutput, 'Content goal'),
            extractSection(pipelineOutput, 'Target audience'),
          ]
            .filter(Boolean)
            .join('\n\n'),
          validationScore: extractValidationScore(pipelineOutput),
        })
      )
      toast.success('Pipeline result saved as draft')
      await loadIdeas()
      setActiveTab('reels')
    } catch (error) {
      console.error('Growth pipeline save error:', error)
      toast.error(getFriendlyError(error))
    } finally {
      setSavingPipeline(false)
    }
  }

  async function handleChatSubmit(event: React.FormEvent) {
    event.preventDefault()
    const trimmed = chatInput.trim()
    if (!trimmed || chatSending) return

    const userMessage: ChatMessage = {
      id: `user-${Date.now()}`,
      role: 'user',
      text: trimmed,
    }

    setChatMessages((prev) => [...prev, userMessage])
    setChatInput('')

    try {
      setChatSending(true)
      const result = await requestGrowthOutput({
        label: 'Growth Studio chat',
        prompt: trimmed,
        platform: 'Internal planning',
        contentType: 'Growth content',
      })

      setChatMessages((prev) => [
        ...prev,
        {
          id: `assistant-${Date.now()}`,
          role: 'assistant',
          text: result.output,
          source: result.source,
        },
      ])
    } catch (error) {
      console.error('Growth Studio chat error:', error)
      setChatMessages((prev) => [
        ...prev,
        {
          id: `assistant-error-${Date.now()}`,
          role: 'assistant',
          text: getFriendlyError(error),
        },
      ])
    } finally {
      setChatSending(false)
    }
  }

  if (!authLoading && !isAllowed) {
    return (
      <Card className="border-red-500/20 bg-red-500/5">
        <p className="font-display text-lg font-bold text-khoj-text">
          Your account does not have admin/founder/ceo permission.
        </p>
      </Card>
    )
  }

  return (
    <div className="animate-slide-up">
      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_380px]">
        <main className="min-w-0 space-y-6">
          <section className="rounded-sm border border-khoj-border bg-khoj-card p-6">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
              <div>
                <p className="text-[10px] uppercase tracking-[0.2em] text-khoj-accent font-body font-semibold">
                  Admin / Founder Growth OS
                </p>
                <h1 className="mt-2 font-display text-3xl font-bold text-khoj-text">
                  Growth Studio
                </h1>
                <p className="mt-2 max-w-2xl text-sm leading-6 text-khoj-subtle">
                  AI-powered marketing and content strategy for KHOJ private beta growth
                </p>
              </div>

              <div className="rounded-sm border border-khoj-accent/20 bg-khoj-accent/10 px-4 py-3 text-xs leading-5 text-khoj-subtle">
                <p className="font-semibold text-khoj-accent">Human approval required</p>
                <p>No auto-posting. No MP4 generation. Internal use only.</p>
              </div>
            </div>

            <div className="mt-6 flex gap-1 overflow-x-auto border-b border-khoj-border">
              {TABS.map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setActiveTab(tab.id)}
                  className={[
                    'relative flex-shrink-0 px-4 py-3 text-sm font-semibold transition-colors',
                    activeTab === tab.id
                      ? 'text-khoj-accent'
                      : 'text-khoj-subtle hover:text-khoj-text',
                  ].join(' ')}
                >
                  {tab.label}
                  {activeTab === tab.id && (
                    <span className="absolute inset-x-0 -bottom-px h-0.5 bg-khoj-accent" />
                  )}
                </button>
              ))}
            </div>
          </section>

          {activeTab === 'overview' && (
            <section className="space-y-6">
              <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                <StatTile label="Content Ideas" value={stats.total} sub="Saved in Firestore" />
                <StatTile label="Approved" value={stats.approved} sub="Ready for founder review" />
                <StatTile label="Posted" value={stats.posted} sub="Marked as published" />
                <StatTile label="This Week Plan" value={stats.thisWeek} sub="Created in the last 7 days" />
              </div>

              <Card className="space-y-4">
                <div>
                  <p className="text-[10px] uppercase tracking-[0.18em] text-khoj-accent font-body font-semibold">
                    Quick Tasks
                  </p>
                  <h2 className="mt-1 font-display text-xl font-bold text-khoj-text">
                    Run a growth task
                  </h2>
                </div>
                <div className="grid gap-2 md:grid-cols-2">
                  {QUICK_TASKS.map((task) => (
                    <button
                      key={task.label}
                      type="button"
                      disabled={generating || chatSending}
                      onClick={() => runTask(task)}
                      className="rounded-sm border border-khoj-border bg-khoj-bg px-4 py-3 text-left text-sm text-khoj-subtle transition-colors hover:border-khoj-accent/50 hover:text-khoj-text disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      {task.label}
                    </button>
                  ))}
                </div>
              </Card>

              <Card className="space-y-4">
                <div className="flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
                  <div>
                    <p className="text-[10px] uppercase tracking-[0.18em] text-khoj-accent font-body font-semibold">
                      Task Results
                    </p>
                    <h2 className="mt-1 font-display text-xl font-bold text-khoj-text">
                      Latest generated AI outputs
                    </h2>
                  </div>
                  {generatedOutput && (
                    <Button type="button" size="sm" variant="secondary" onClick={() => setActiveTab('ideas')}>
                      Open in Ideas
                    </Button>
                  )}
                </div>

                {generatedResults.length === 0 ? (
                  <div className="rounded-sm border border-khoj-border bg-khoj-bg px-4 py-8 text-center text-sm text-khoj-subtle">
                    Run a quick task or use the chat panel to see generated outputs here.
                  </div>
                ) : (
                  <div className="space-y-3">
                    {generatedResults.slice(0, 4).map((result) => (
                      <div key={result.id} className="rounded-sm border border-khoj-border bg-khoj-bg p-4">
                        <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                          <div>
                            <p className="text-sm font-semibold text-khoj-text">{result.title}</p>
                            <p className="mt-1 text-xs text-khoj-muted">
                              {result.platform} / {result.contentType}
                            </p>
                          </div>
                          {result.source && (
                            <span className="rounded-sm border border-khoj-accent/25 bg-khoj-accent/10 px-2 py-1 text-[10px] uppercase tracking-widest text-khoj-accent">
                              {result.source}
                            </span>
                          )}
                        </div>
                        <p className="mt-3 line-clamp-4 whitespace-pre-wrap text-sm leading-6 text-khoj-subtle">
                          {result.output}
                        </p>
                      </div>
                    ))}
                  </div>
                )}
              </Card>
            </section>
          )}

          {activeTab === 'pipeline' && (
            <section className="space-y-6">
              <Card className="space-y-5">
                <div className="flex flex-col gap-2">
                  <p className="text-[10px] uppercase tracking-[0.18em] text-khoj-accent font-body font-semibold">
                    4-Agent Content Pipeline
                  </p>
                  <h2 className="font-display text-xl font-bold text-khoj-text">
                    From raw notes to founder approval
                  </h2>
                  <p className="max-w-3xl text-sm leading-6 text-khoj-subtle">
                    Input idea or raw notes -&gt; Research Agent -&gt; Validation Agent -&gt; Script Writer Agent -&gt; Hook Doctor Agent -&gt; Ready for founder approval.
                  </p>
                </div>

                <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                  {PIPELINE_AGENTS.map((agent, index) => (
                    <div key={agent.name} className="relative">
                      <div className="h-full rounded-sm border border-khoj-border bg-khoj-bg p-4 transition-colors hover:border-khoj-accent/40">
                        <div className="mb-4 flex h-9 w-9 items-center justify-center rounded-sm border border-khoj-accent/30 bg-khoj-accent/10 font-display text-sm font-bold text-khoj-accent">
                          {index + 1}
                        </div>
                        <h3 className="font-display text-base font-bold text-khoj-text">{agent.name}</h3>
                        <p className="mt-2 text-xs leading-5 text-khoj-subtle">{agent.description}</p>
                      </div>
                      {index < PIPELINE_AGENTS.length - 1 && (
                        <span className="pointer-events-none absolute -right-5 top-1/2 z-10 hidden h-8 w-8 -translate-y-1/2 items-center justify-center rounded-sm border border-khoj-border bg-khoj-card text-xs font-bold text-khoj-accent xl:flex">
                          -&gt;
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              </Card>

              <section className="grid gap-5 lg:grid-cols-[minmax(0,420px)_1fr]">
                <Card className="space-y-5">
                  <div>
                    <p className="text-[10px] uppercase tracking-[0.18em] text-khoj-accent font-body font-semibold">
                      Pipeline Input
                    </p>
                    <h2 className="mt-1 font-display text-xl font-bold text-khoj-text">
                      Guide the agents
                    </h2>
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs uppercase tracking-[0.12em] text-khoj-subtle font-body font-semibold">
                      Raw idea
                    </label>
                    <textarea
                      value={pipelineInput}
                      onChange={(event) => setPipelineInput(event.target.value)}
                      rows={8}
                      className="w-full resize-none rounded-sm border border-khoj-border bg-khoj-bg px-4 py-3 text-sm leading-6 text-khoj-text outline-none transition-colors placeholder:text-khoj-muted focus:border-khoj-accent/60 focus:ring-1 focus:ring-khoj-accent/20"
                      placeholder="Paste your raw idea, reel concept, or marketing goal..."
                    />
                  </div>

                  <div className="grid gap-2">
                    {(Object.keys(PIPELINE_ACTIONS) as PipelineAction[]).map((action) => (
                      <Button
                        key={action}
                        type="button"
                        variant={action === 'full' ? 'primary' : 'secondary'}
                        loading={runningPipeline === action}
                        disabled={Boolean(runningPipeline) || !isAllowed}
                        onClick={() => runPipeline(action)}
                        className="w-full justify-center"
                      >
                        {PIPELINE_ACTIONS[action].label}
                      </Button>
                    ))}
                  </div>

                  <div className="rounded-sm border border-khoj-border bg-khoj-bg p-4 text-xs leading-5 text-khoj-subtle">
                    <p className="font-semibold text-khoj-text">Guardrails</p>
                    <p className="mt-1">No scraping, auto-posting, or video generation. This is a guided AI workflow for human approval.</p>
                  </div>
                </Card>

                <Card className="space-y-4">
                  <div className="flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
                    <div>
                      <p className="text-[10px] uppercase tracking-[0.18em] text-khoj-accent font-body font-semibold">
                        Pipeline Output
                      </p>
                      <h2 className="mt-1 font-display text-xl font-bold text-khoj-text">
                        Ready for founder review
                      </h2>
                    </div>
                    {pipelineSource && (
                      <span className="w-fit rounded-sm border border-khoj-accent/25 bg-khoj-accent/10 px-2 py-1 text-[10px] uppercase tracking-widest text-khoj-accent">
                        {pipelineSource}
                      </span>
                    )}
                  </div>

                  {pipelineOutput ? (
                    <>
                      <div className="grid gap-3 sm:grid-cols-3">
                        <div className="rounded-sm border border-khoj-border bg-khoj-bg p-3">
                          <p className="text-[10px] uppercase tracking-[0.14em] text-khoj-subtle">Score</p>
                          <p className="mt-1 font-display text-2xl font-bold text-khoj-accent">
                            {extractValidationScore(pipelineOutput) ?? '-'} / 10
                          </p>
                        </div>
                        <div className="rounded-sm border border-khoj-border bg-khoj-bg p-3 sm:col-span-2">
                          <p className="text-[10px] uppercase tracking-[0.14em] text-khoj-subtle">Recommendation</p>
                          <p className="mt-1 text-sm font-semibold text-khoj-text">
                            {extractSection(pipelineOutput, 'Final recommendation') || 'Review manually'}
                          </p>
                        </div>
                      </div>
                      <OutputBlock output={pipelineOutput} />
                      <div className="flex flex-col gap-2 sm:flex-row">
                        <Button
                          type="button"
                          loading={savingPipeline}
                          disabled={!pipelineOutput.trim() || !isAllowed}
                          onClick={handleSavePipeline}
                        >
                          Save Pipeline Result
                        </Button>
                        <Button type="button" variant="secondary" onClick={() => setActiveTab('ideas')}>
                          Open in Ideas
                        </Button>
                      </div>
                    </>
                  ) : (
                    <div className="rounded-sm border border-khoj-border bg-khoj-bg px-4 py-10 text-center text-sm text-khoj-subtle">
                      Paste a raw idea and run one pipeline action. The output will include goal, audience, score, hook, script, shot list, overlays, caption, hashtags, CTA, and recommendation.
                    </div>
                  )}
                </Card>
              </section>
            </section>
          )}

          {activeTab === 'reels' && (
            <section className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_340px]">
              <Card className="space-y-4">
                <div className="flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
                  <div>
                    <p className="text-[10px] uppercase tracking-[0.18em] text-khoj-accent font-body font-semibold">
                      Reels
                    </p>
                    <h2 className="mt-1 font-display text-xl font-bold text-khoj-text">
                      Saved reel and content ideas
                    </h2>
                  </div>
                  <Button type="button" variant="secondary" size="sm" onClick={loadIdeas} disabled={loadingIdeas}>
                    Refresh
                  </Button>
                </div>

                {loadingIdeas ? (
                  <div className="rounded-sm border border-khoj-border bg-khoj-bg px-4 py-8 text-center text-sm text-khoj-subtle">
                    Loading saved content ideas...
                  </div>
                ) : ideas.length === 0 ? (
                  <div className="rounded-sm border border-khoj-border bg-khoj-bg px-4 py-8 text-center text-sm text-khoj-subtle">
                    No saved growth content yet.
                  </div>
                ) : (
                  <div className="grid gap-3">
                    {ideas.map((idea) => (
                      <article key={idea.id} className="rounded-sm border border-khoj-border bg-khoj-bg p-4">
                        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                          <div className="min-w-0">
                            <h3 className="font-display text-lg font-bold text-khoj-text">{idea.title}</h3>
                            <p className="mt-1 text-xs text-khoj-muted">
                              {idea.platform} / {idea.contentType} / {new Date(idea.createdAt).toLocaleDateString()}
                            </p>
                          </div>
                          <span className={`w-fit rounded-sm border px-2 py-1 text-[10px] uppercase tracking-widest ${statusClass(idea.status)}`}>
                            {idea.status}
                          </span>
                        </div>

                        <p className="mt-3 line-clamp-3 text-sm leading-6 text-khoj-subtle">
                          {idea.hook}
                        </p>

                        <div className="mt-4 flex flex-wrap gap-2">
                          <Button
                            type="button"
                            size="sm"
                            variant="secondary"
                            onClick={() => setSelectedIdea(idea)}
                          >
                            View
                          </Button>
                          <Button
                            type="button"
                            size="sm"
                            variant="secondary"
                            disabled={idea.status === 'approved' || updatingStatusId === idea.id}
                            onClick={() => handleStatusChange(idea.id, 'approved')}
                          >
                            Approve
                          </Button>
                          <Button
                            type="button"
                            size="sm"
                            disabled={idea.status === 'posted' || updatingStatusId === idea.id}
                            onClick={() => handleStatusChange(idea.id, 'posted')}
                          >
                            Mark Posted
                          </Button>
                        </div>
                      </article>
                    ))}
                  </div>
                )}
              </Card>

              <aside className="min-w-0">
                <Card className="sticky top-6 space-y-4">
                  <div>
                    <p className="text-[10px] uppercase tracking-[0.18em] text-khoj-accent font-body font-semibold">
                      View
                    </p>
                    <h2 className="mt-1 font-display text-lg font-bold text-khoj-text">
                      {selectedIdea?.title ?? 'Select an idea'}
                    </h2>
                  </div>

                  {selectedIdea ? (
                    <div className="space-y-4">
                      {selectedIdea.validationScore !== undefined && selectedIdea.validationScore !== null && (
                        <div>
                          <p className="text-[10px] uppercase tracking-[0.14em] text-khoj-subtle">Validated Score</p>
                          <p className="mt-1 font-display text-2xl font-bold text-khoj-accent">
                            {selectedIdea.validationScore} / 10
                          </p>
                        </div>
                      )}
                      {selectedIdea.rawInput && (
                        <div>
                          <p className="text-[10px] uppercase tracking-[0.14em] text-khoj-subtle">Raw Input</p>
                          <p className="mt-1 text-sm leading-6 text-khoj-subtle">{selectedIdea.rawInput}</p>
                        </div>
                      )}
                      <div>
                        <p className="text-[10px] uppercase tracking-[0.14em] text-khoj-subtle">Hook</p>
                        <p className="mt-1 text-sm leading-6 text-khoj-text">{selectedIdea.hook}</p>
                      </div>
                      <div>
                        <p className="text-[10px] uppercase tracking-[0.14em] text-khoj-subtle">Caption</p>
                        <p className="mt-1 text-sm leading-6 text-khoj-subtle">{selectedIdea.caption || 'No caption saved.'}</p>
                      </div>
                      <div>
                        <p className="text-[10px] uppercase tracking-[0.14em] text-khoj-subtle">CTA</p>
                        <p className="mt-1 text-sm leading-6 text-khoj-subtle">{selectedIdea.cta}</p>
                      </div>
                      {selectedIdea.rawOutput && <OutputBlock output={selectedIdea.rawOutput} />}
                    </div>
                  ) : (
                    <p className="text-sm leading-6 text-khoj-subtle">
                      Choose View on a saved card to inspect the full generated script and caption.
                    </p>
                  )}
                </Card>
              </aside>
            </section>
          )}

          {activeTab === 'ideas' && (
            <section className="grid gap-5 lg:grid-cols-[minmax(0,440px)_1fr]">
              <Card className="space-y-5">
                <div>
                  <p className="text-[10px] uppercase tracking-[0.18em] text-khoj-accent font-body font-semibold">
                    Ideas
                  </p>
                  <h2 className="mt-1 font-display text-xl font-bold text-khoj-text">
                    Generate and save content
                  </h2>
                </div>

                <div className="grid gap-2">
                  {IDEA_PRESETS.map((task) => (
                    <button
                      key={task.label}
                      type="button"
                      onClick={() => applyIdeaPreset(task)}
                      className={[
                        'rounded-sm border px-4 py-3 text-left transition-colors',
                        taskTitle === task.label
                          ? 'border-khoj-accent bg-khoj-accent/10 text-khoj-text'
                          : 'border-khoj-border bg-khoj-bg text-khoj-subtle hover:border-khoj-accent/50 hover:text-khoj-text',
                      ].join(' ')}
                    >
                      <span className="text-sm font-semibold">{task.label}</span>
                      <span className="mt-1 block text-[11px] text-khoj-muted">{task.platform}</span>
                    </button>
                  ))}
                </div>

                <form onSubmit={handleIdeaSubmit} className="space-y-4">
                  <Input
                    label="Title"
                    value={taskTitle}
                    onChange={(event) => setTaskTitle(event.target.value)}
                    placeholder="Content idea title"
                  />
                  <div className="grid gap-3 sm:grid-cols-2">
                    <Input
                      label="Platform"
                      value={platform}
                      onChange={(event) => setPlatform(event.target.value)}
                      placeholder="Instagram Reels"
                    />
                    <Input
                      label="Content Type"
                      value={contentType}
                      onChange={(event) => setContentType(event.target.value)}
                      placeholder="30-second reel script"
                    />
                  </div>
                  <Select
                    label="Save Status"
                    value={saveStatus}
                    onChange={(event) => setSaveStatus(event.target.value as GrowthContentStatus)}
                    options={STATUS_OPTIONS}
                  />
                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs uppercase tracking-[0.12em] text-khoj-subtle font-body font-semibold">
                      Prompt
                    </label>
                    <textarea
                      value={prompt}
                      onChange={(event) => setPrompt(event.target.value)}
                      rows={6}
                      className="w-full resize-none rounded-sm border border-khoj-border bg-khoj-bg px-4 py-3 text-sm leading-6 text-khoj-text outline-none transition-colors placeholder:text-khoj-muted focus:border-khoj-accent/60 focus:ring-1 focus:ring-khoj-accent/20"
                      placeholder="Describe the content idea you want Growth Studio to generate..."
                    />
                  </div>
                  <div className="flex flex-col gap-2 sm:flex-row">
                    <Button type="submit" loading={generating} disabled={authLoading || !isAllowed}>
                      Generate
                    </Button>
                    <Button
                      type="button"
                      variant="secondary"
                      loading={saving}
                      disabled={!generatedOutput.trim() || !isAllowed}
                      onClick={handleSaveCurrent}
                    >
                      Save to Firestore
                    </Button>
                  </div>
                </form>
              </Card>

              <Card className="space-y-4">
                <div className="flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
                  <div>
                    <p className="text-[10px] uppercase tracking-[0.18em] text-khoj-accent font-body font-semibold">
                      Generated Idea
                    </p>
                    <h2 className="mt-1 font-display text-xl font-bold text-khoj-text">
                      AI-generated content idea
                    </h2>
                  </div>
                  {source && (
                    <span className="w-fit rounded-sm border border-khoj-accent/25 bg-khoj-accent/10 px-2 py-1 text-[10px] uppercase tracking-widest text-khoj-accent">
                      {source}
                    </span>
                  )}
                </div>

                {generatedOutput ? (
                  <OutputBlock output={generatedOutput} />
                ) : (
                  <div className="rounded-sm border border-khoj-border bg-khoj-bg px-4 py-10 text-center text-sm text-khoj-subtle">
                    Generate a content idea or ask the chat panel for help. Saved ideas appear in the Reels tab.
                  </div>
                )}
              </Card>
            </section>
          )}
        </main>

        <aside className="min-w-0">
          <section className="sticky top-6 flex max-h-[calc(100vh-4rem)] min-h-[680px] flex-col overflow-hidden rounded-sm border border-khoj-border bg-khoj-card">
            <header className="border-b border-khoj-border px-5 py-4">
              <p className="text-[10px] uppercase tracking-[0.2em] text-khoj-accent font-body font-semibold">
                Growth Chat
              </p>
              <h2 className="mt-1 font-display text-xl font-bold text-khoj-text">
                Chat with Growth Studio
              </h2>
              <p className="mt-1 text-xs leading-5 text-khoj-subtle">
                Uses the existing KHOJ AI backend with the growth_content tool.
              </p>
            </header>

            <div className="flex-1 space-y-4 overflow-y-auto px-4 py-5">
              {chatMessages.map((message) => (
                <div
                  key={message.id}
                  className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  <div
                    className={[
                      'max-w-[92%] rounded-sm px-4 py-3 text-sm leading-6',
                      message.role === 'user'
                        ? 'bg-khoj-accent text-white'
                        : 'border border-khoj-border bg-[#0d0e16] text-khoj-text',
                    ].join(' ')}
                  >
                    {message.source && (
                      <p className="mb-2 text-[10px] uppercase tracking-widest text-khoj-accent">
                        {message.source}
                      </p>
                    )}
                    <p className="whitespace-pre-wrap">{message.text}</p>
                  </div>
                </div>
              ))}

              {chatSending && (
                <div className="rounded-sm border border-khoj-border bg-[#0d0e16] px-4 py-3 text-sm text-khoj-subtle">
                  Growth Studio is thinking...
                </div>
              )}
            </div>

            <form onSubmit={handleChatSubmit} className="border-t border-khoj-border p-4">
              <textarea
                value={chatInput}
                onChange={(event) => setChatInput(event.target.value)}
                rows={4}
                placeholder="Ask for hooks, scripts, calendars, captions, or beta tester messages..."
                className="w-full resize-none rounded-sm border border-khoj-border bg-khoj-bg px-4 py-3 text-sm leading-6 text-khoj-text outline-none transition-colors placeholder:text-khoj-muted focus:border-khoj-accent/60"
              />
              <Button
                type="submit"
                className="mt-3 w-full"
                loading={chatSending}
                disabled={!chatInput.trim() || !isAllowed}
              >
                Send
              </Button>
            </form>
          </section>
        </aside>
      </div>
    </div>
  )
}
