'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { auth } from '@/lib/firebase/config'
import type { KhojMode } from '@/lib/ai/khojSystemPrompt'

type AssistantSource = 'openai' | 'mock'
type OpenAIErrorType = 'rate_limit' | 'quota' | 'auth' | 'model' | 'unknown'

interface Citation {
  title: string
  path: string
}

interface NextStep {
  label: string
  reason: string
  khojFeature?: string
}

interface ChatMessage {
  id: string
  role: 'user' | 'assistant'
  text: string
  source?: AssistantSource
  toolType?: string
  openaiError?: OpenAIErrorType
  notice?: string
  citations?: Citation[]
  nextSteps?: NextStep[]
}

interface RoomContext {
  roomId?: string
  roomName?: string
  roomGoal?: string
}

interface KhojAssistantChatProps {
  title?: string
  subtitle?: string
  initialMode?: KhojMode
  fixedMode?: boolean
  roomContext?: RoomContext
  defaultToolType?: string
  starterPrompts?: string[] | Partial<Record<KhojMode, string[]>>
  initialAssistantMessage?: string
  placeholder?: string
  className?: string
}

const MODE_TABS: Array<{ id: KhojMode; label: string }> = [
  { id: 'startup', label: 'Startup' },
  { id: 'profile', label: 'Profile' },
  { id: 'opportunities', label: 'Opportunities' },
  { id: 'investor', label: 'Investor Prep' },
  { id: 'research', label: 'Research' },
]

const DEFAULT_STARTERS: Record<KhojMode, string[]> = {
  startup: [
    'Evaluate my startup idea',
    'Build a 30-day MVP roadmap',
    'What team roles should I fill first?',
    'Turn my idea into validation tasks',
  ],
  profile: [
    'Improve my KHOJ profile bio',
    'Write a stronger profile headline',
    'Help me describe my project proof',
    'What should I publish next?',
  ],
  opportunities: [
    'How do I stand out in Opportunity Market?',
    'Help me find a co-founder',
    'Prepare an opportunity application pitch',
    'What competitions fit my profile?',
  ],
  investor: [
    'Prepare investor Q&A',
    'Help me explain my business model',
    'Improve my pitch deck outline',
    'What traction metrics should I show?',
  ],
  research: [
    'Create a market research plan',
    'Design user interview questions',
    'Identify competitor categories',
    'What data should I collect first?',
  ],
  general: [
    'Choose my best next step on KHOJ',
    'Help me plan this week',
    'Suggest what proof I should publish',
    'Explain how KHOJ features connect',
  ],
}

const DEFAULT_WELCOME: Record<KhojMode, string> = {
  startup:
    'Welcome to KHOJ AI Startup Mode. Share your idea, room goal, or execution blocker and I will turn it into a practical validation plan.',
  profile:
    'Welcome to KHOJ AI Profile Mode. I can help sharpen your headline, bio, projects, and proof story for KHOJ opportunities.',
  opportunities:
    'Welcome to KHOJ AI Opportunities Mode. Tell me your goals and background, and I will help you choose a focused opportunity strategy.',
  investor:
    'Welcome to KHOJ AI Investor Prep Mode. Share your startup and I will help you prepare concise pitch-ready answers.',
  research:
    'Welcome to KHOJ AI Research Mode. I can structure customer, market, and competitor research without pretending to run live web search.',
  general:
    'Welcome to KHOJ AI. Ask about startups, learning proof, teams, opportunities, or what to do next on KHOJ.',
}

function inferToolType(mode: KhojMode, message: string): string {
  const text = message.toLowerCase()
  if (text.includes('korean') || text.includes('notice')) return 'korean_notice_helper'
  if (text.includes('valuation')) return 'valuation_estimate'
  if (text.includes('competitor')) return 'competitor_analysis'
  if (text.includes('market')) return 'market_analysis'
  if (text.includes('roadmap') || text.includes('launch plan')) return 'roadmap_builder'
  if (text.includes('task') || text.includes('to-do') || text.includes('todo')) return 'task_generator'
  if (text.includes('investor') || text.includes('q&a') || text.includes('funding')) return 'investor_qna'
  if (text.includes('profile') || text.includes('headline') || text.includes('bio') || text.includes('portfolio')) return 'profile_coach'
  if (text.includes('evaluate') || text.includes('validation') || text.includes('idea')) return 'startup_evaluation'
  return 'general'
}

function getPromptList(starterPrompts: KhojAssistantChatProps['starterPrompts'], mode: KhojMode): string[] {
  if (Array.isArray(starterPrompts)) return starterPrompts
  return starterPrompts?.[mode] ?? DEFAULT_STARTERS[mode]
}

function renderInline(text: string) {
  const parts = text.split(/(\*\*[^*]+\*\*|`[^`]+`|\*[^*]+\*)/g)

  return parts.map((part, index) => {
    if (part.startsWith('**') && part.endsWith('**')) {
      return <strong key={`${part}-${index}`} className="font-semibold text-khoj-text">{part.slice(2, -2)}</strong>
    }
    if (part.startsWith('`') && part.endsWith('`')) {
      return <code key={`${part}-${index}`} className="rounded-sm bg-black/30 px-1 py-0.5 font-mono text-[12px] text-khoj-accent">{part.slice(1, -1)}</code>
    }
    if (part.startsWith('*') && part.endsWith('*')) {
      return <em key={`${part}-${index}`}>{part.slice(1, -1)}</em>
    }
    return <span key={`${part}-${index}`}>{part}</span>
  })
}

function MessageText({ text }: { text: string }) {
  const lines = text.split('\n')

  return (
    <div className="space-y-2">
      {lines.map((rawLine, index) => {
        const line = rawLine.trim()
        if (!line) return <div key={`spacer-${index}`} className="h-1" />

        if (line.startsWith('### ')) {
          return <h3 key={index} className="pt-1 text-sm font-bold text-khoj-text">{renderInline(line.slice(4))}</h3>
        }
        if (line.startsWith('## ')) {
          return <h2 key={index} className="pt-2 text-base font-bold text-khoj-text">{renderInline(line.slice(3))}</h2>
        }
        if (line.startsWith('# ')) {
          return <h1 key={index} className="pt-2 text-lg font-bold text-khoj-text">{renderInline(line.slice(2))}</h1>
        }

        const bullet = line.match(/^-\s+(.+)$/)
        if (bullet) {
          return (
            <div key={index} className="grid grid-cols-[1rem_1fr] gap-2">
              <span className="text-khoj-accent">-</span>
              <span>{renderInline(bullet[1])}</span>
            </div>
          )
        }

        const numbered = line.match(/^(\d+)\.\s+(.+)$/)
        if (numbered) {
          return (
            <div key={index} className="grid grid-cols-[1.75rem_1fr] gap-2">
              <span className="font-semibold text-khoj-accent">{numbered[1]}.</span>
              <span>{renderInline(numbered[2])}</span>
            </div>
          )
        }

        return <p key={index}>{renderInline(line)}</p>
      })}
    </div>
  )
}

export function KhojAssistantChat({
  title = 'KHOJ AI',
  subtitle = 'Startup coaching, profile guidance, opportunity strategy, and practical next steps.',
  initialMode = 'startup',
  fixedMode = false,
  roomContext,
  defaultToolType,
  starterPrompts,
  initialAssistantMessage,
  placeholder = 'Ask KHOJ AI about your startup, profile, opportunities, or strategy...',
  className = '',
}: KhojAssistantChatProps) {
  const [activeMode, setActiveMode] = useState<KhojMode>(initialMode)
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [copiedId, setCopiedId] = useState<string | null>(null)
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const endRef = useRef<HTMLDivElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  const welcomeText = useMemo(
    () => initialAssistantMessage ?? DEFAULT_WELCOME[activeMode],
    [activeMode, initialAssistantMessage]
  )

  useEffect(() => {
    setMessages([{ id: `welcome-${activeMode}`, role: 'assistant', text: welcomeText }])
    setInput('')
  }, [activeMode, welcomeText])

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, loading])

  function handleInputChange(event: React.ChangeEvent<HTMLTextAreaElement>) {
    setInput(event.target.value)
    event.target.style.height = 'auto'
    event.target.style.height = `${Math.min(event.target.scrollHeight, 150)}px`
  }

  async function sendMessage(rawMessage: string, selectedToolType?: string) {
    const message = rawMessage.trim()
    if (!message || loading) return

    const toolType = selectedToolType ?? defaultToolType ?? inferToolType(activeMode, message)
    const history = messages
      .filter((item) => !item.id.startsWith('welcome-'))
      .slice(-6)
      .map((item) => ({ role: item.role, content: item.text }))

    setMessages((prev) => [...prev, { id: `user-${Date.now()}`, role: 'user', text: message }])
    setInput('')
    if (textareaRef.current) textareaRef.current.style.height = 'auto'
    setLoading(true)

    try {
      const user = auth.currentUser
      if (!user) throw new Error('Please sign in to use KHOJ AI.')
      const token = await user.getIdToken()

      const response = await fetch('/api/ai/khoj-assistant', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          message,
          mode: activeMode,
          toolType,
          history,
          roomContext,
        }),
      })

      const data = await response.json() as {
        ok: boolean
        message?: string
        error?: string
        source?: AssistantSource
        toolType?: string
        openaiError?: OpenAIErrorType
        notice?: string
        citations?: Citation[]
        nextSteps?: NextStep[]
      }

      if (!response.ok || !data.ok) {
        throw new Error(data.error ?? 'KHOJ AI request failed.')
      }

      setMessages((prev) => [
        ...prev,
        {
          id: `assistant-${Date.now()}`,
          role: 'assistant',
          text: data.message ?? '',
          source: data.source,
          toolType: data.toolType,
          openaiError: data.openaiError,
          notice: data.notice,
          citations: data.citations,
          nextSteps: data.nextSteps,
        },
      ])
    } catch (err) {
      setMessages((prev) => [
        ...prev,
        {
          id: `error-${Date.now()}`,
          role: 'assistant',
          text: err instanceof Error ? err.message : 'KHOJ AI is temporarily unavailable. Please try again.',
        },
      ])
    } finally {
      setLoading(false)
    }
  }

  function handleKeyDown(event: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault()
      sendMessage(input)
    }
  }

  async function copyMessage(id: string, text: string) {
    await navigator.clipboard.writeText(text)
    setCopiedId(id)
    window.setTimeout(() => setCopiedId(null), 1800)
  }

  function clearChat() {
    setMessages([{ id: `welcome-${activeMode}`, role: 'assistant', text: welcomeText }])
  }

  const prompts = getPromptList(starterPrompts, activeMode)
  const canSend = input.trim().length > 0 && !loading

  return (
    <section className={`flex min-h-[680px] flex-col overflow-hidden rounded-sm border border-khoj-border bg-[#0d0e16] ${className}`}>
      <header className="border-b border-khoj-border bg-khoj-card px-5 py-4">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-khoj-accent">KHOJ AI</p>
            <h1 className="mt-1 text-2xl font-display font-bold text-khoj-text">{title}</h1>
            {subtitle && <p className="mt-1 max-w-3xl text-sm leading-6 text-khoj-subtle">{subtitle}</p>}
          </div>

          {roomContext?.roomName && (
            <div className="min-w-0 rounded-sm border border-khoj-border bg-[#0a0b12] px-3 py-2 text-xs">
              <p className="font-semibold text-khoj-text truncate">{roomContext.roomName}</p>
              {roomContext.roomGoal && <p className="mt-0.5 max-w-sm truncate text-khoj-subtle">{roomContext.roomGoal}</p>}
            </div>
          )}
        </div>

        {!fixedMode && (
          <div className="mt-4 flex gap-1 overflow-x-auto border-b border-khoj-border/70">
            {MODE_TABS.map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveMode(tab.id)}
                className={[
                  'relative flex-shrink-0 px-4 py-2 text-sm font-medium transition-colors',
                  activeMode === tab.id
                    ? 'text-khoj-accent'
                    : 'text-khoj-subtle hover:text-khoj-text',
                ].join(' ')}
              >
                {tab.label}
                {activeMode === tab.id && <span className="absolute inset-x-0 -bottom-px h-0.5 bg-khoj-accent" />}
              </button>
            ))}
          </div>
        )}
      </header>

      <div className="border-b border-khoj-border px-4 py-3">
        <div className="flex flex-wrap gap-2">
          {prompts.map((prompt) => (
            <button
              key={prompt}
              type="button"
              onClick={() => sendMessage(prompt)}
              disabled={loading}
              className="rounded-sm border border-khoj-border bg-[#11121e] px-3 py-1.5 text-xs text-khoj-subtle transition-colors hover:border-khoj-accent/50 hover:text-khoj-text disabled:opacity-50"
            >
              {prompt}
            </button>
          ))}
          <button
            type="button"
            onClick={clearChat}
            className="ml-auto rounded-sm border border-khoj-border px-3 py-1.5 text-xs text-khoj-subtle transition-colors hover:border-red-400/50 hover:text-red-300"
          >
            Clear
          </button>
        </div>
      </div>

      <div className="flex-1 space-y-4 overflow-y-auto px-4 py-5">
        {messages.map((message) => (
          <div
            key={message.id}
            className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            <div className={`max-w-[86%] space-y-1 ${message.role === 'user' ? 'items-end' : 'items-start'}`}>
              <p className="text-[10px] uppercase tracking-[0.16em] text-khoj-subtle/70">
                {message.role === 'user' ? 'You' : 'KHOJ AI'}
                {message.source ? <span className="ml-2 normal-case tracking-normal text-khoj-accent/70">{message.source}</span> : null}
              </p>

              <div
                className={[
                  'rounded-sm px-4 py-3 text-sm leading-6',
                  message.role === 'user'
                    ? 'bg-khoj-accent text-white'
                  : 'border border-khoj-border bg-[#11121e] text-khoj-text',
                ].join(' ')}
              >
                {message.source === 'mock' && message.openaiError && (
                  <div className="mb-3 inline-flex rounded-sm border border-yellow-500/30 bg-yellow-500/10 px-2.5 py-1 text-[11px] font-semibold text-yellow-300">
                    Fallback mode: OpenAI is temporarily unavailable.
                  </div>
                )}
                <MessageText text={message.text} />

                {message.citations && message.citations.length > 0 && (
                  <div className="mt-4 border-t border-khoj-border pt-3">
                    <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-khoj-subtle">Sources</p>
                    <div className="mt-2 space-y-1">
                      {message.citations.map((citation) => (
                        <p key={`${message.id}-${citation.path}`} className="text-xs text-khoj-subtle">
                          {citation.title} ({citation.path})
                        </p>
                      ))}
                    </div>
                  </div>
                )}

                {message.nextSteps && message.nextSteps.length > 0 && (
                  <div className="mt-4 border-t border-khoj-accent/25 pt-3">
                    <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-khoj-accent">Next Steps</p>
                    <div className="mt-2 space-y-2">
                      {message.nextSteps.map((step) => (
                        <div key={`${message.id}-${step.label}`} className="text-xs leading-5 text-khoj-subtle">
                          <p className="font-semibold text-khoj-text">{step.label}</p>
                          <p>
                            {step.reason}
                            {step.khojFeature ? ` Use ${step.khojFeature}.` : ''}
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {message.role === 'assistant' && !message.id.startsWith('welcome-') && (
                <button
                  type="button"
                  onClick={() => copyMessage(message.id, message.text)}
                  className="rounded-sm border border-khoj-border px-2 py-1 text-[11px] text-khoj-subtle transition-colors hover:text-khoj-text"
                >
                  {copiedId === message.id ? 'Copied' : 'Copy'}
                </button>
              )}
            </div>
          </div>
        ))}

        {loading && (
          <div className="flex justify-start">
            <div className="rounded-sm border border-khoj-border bg-[#11121e] px-4 py-3 text-sm text-khoj-subtle">
              KHOJ AI is thinking...
            </div>
          </div>
        )}
        <div ref={endRef} />
      </div>

      <footer className="border-t border-khoj-border bg-khoj-card px-4 py-3">
        <div className="flex items-end gap-2 rounded-sm border border-khoj-border bg-[#0a0b12] px-3 py-2 focus-within:border-khoj-accent/60">
          <textarea
            ref={textareaRef}
            value={input}
            rows={1}
            onChange={handleInputChange}
            onKeyDown={handleKeyDown}
            placeholder={placeholder}
            className="min-h-[28px] flex-1 resize-none bg-transparent py-1 text-sm leading-6 text-khoj-text outline-none placeholder:text-khoj-subtle/60"
          />
          <button
            type="button"
            onClick={() => sendMessage(input)}
            disabled={!canSend}
            className="h-9 rounded-sm bg-khoj-accent px-4 text-sm font-semibold text-white transition-colors hover:bg-orange-500 disabled:cursor-not-allowed disabled:opacity-40"
          >
            Send
          </button>
        </div>
        <p className="mt-2 text-center text-[11px] text-khoj-subtle/70">
          Verify important legal, financial, tax, visa, and investment decisions with qualified professionals.
        </p>
      </footer>
    </section>
  )
}
