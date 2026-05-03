// app/api/ai/khoj-assistant/route.ts
// KHOJ AI backend route — uses OpenAI if OPENAI_API_KEY is set, otherwise falls back to mock.
// SECURITY: OpenAI API key is server-only. Never expose to client or use NEXT_PUBLIC_ prefix.

import { NextRequest, NextResponse } from 'next/server'
import { getAdminAuth } from '@/lib/firebase/admin'
import { getMockKhojAssistantReply } from '@/lib/ai/mockKhojAssistant'
import { createKhojChatCompletion } from '@/lib/ai/openaiClient'
import { getSystemPrompt, type KhojMode } from '@/lib/ai/khojSystemPrompt'
import { khojFeatureKnowledge } from '@/lib/ai/khojFeatureKnowledge'
import { toolPromptPlaceholder, toolPrompts, type ToolPromptType, toolSchemas } from '@/lib/ai/toolPrompts'
import { getKhojUserContext } from '@/lib/ai/getKhojUserContext'
import { getNextStepSuggestions } from '@/lib/ai/nextStepEngine'
import { retrieveKhojKnowledgeSnippets, type RetrievedKhojSnippet } from '@/lib/ai/khojKnowledgeSearch'

// TODO: Add free/premium usage limits later.
// TODO: Add saved chat history to Firestore (users/{uid}/khojAiChats/{chatId}).
// TODO: Add document upload analysis for premium users.
// TODO: Add web search tool for Research mode (premium).

const MAX_MESSAGE_LENGTH = 6000
const MAX_HISTORY_MESSAGES = 6
const FALLBACK_NOTICE = 'Using fallback response because OpenAI is temporarily unavailable.'

type ChatRole = 'user' | 'assistant'
type OpenAIErrorType = 'rate_limit' | 'quota' | 'auth' | 'model' | 'unknown'

interface HistoryMessage {
  role: ChatRole
  content: string
}

interface RoomContextPayload {
  roomId?: string
  roomName?: string
  roomGoal?: string
}

const VALID_MODES: KhojMode[] = ['startup', 'profile', 'opportunities', 'investor', 'research', 'general']
const VALID_TOOL_TYPES = new Set<string>(Object.keys(toolPrompts))

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

function getErrorField(error: unknown, field: 'status' | 'code' | 'type'): string {
  if (typeof error !== 'object' || error === null || !(field in error)) return ''
  return String((error as Record<string, unknown>)[field] ?? '')
}

function classifyOpenAIError(error: unknown): OpenAIErrorType {
  const status = Number(getErrorField(error, 'status'))
  const code = getErrorField(error, 'code').toLowerCase()
  const type = getErrorField(error, 'type').toLowerCase()
  const message = error instanceof Error ? error.message.toLowerCase() : ''
  const text = `${code} ${type} ${message}`

  if (status === 401) return 'auth'
  if (status === 429 && text.includes('insufficient_quota')) return 'quota'
  if (status === 429) return 'rate_limit'
  if (text.includes('insufficient_quota') || text.includes('billing') || text.includes('credit')) return 'quota'
  if (text.includes('model_not_found') || text.includes('model not found') || text.includes('does not exist')) return 'model'
  return 'unknown'
}

function friendlyOpenAIMessage(type: OpenAIErrorType): string {
  if (type === 'auth') return 'OpenAI API key is invalid. Check your .env.local file.'
  if (type === 'rate_limit') return 'OpenAI is busy or rate-limited right now. I\'m using fallback mode for this answer.'
  if (type === 'quota') return 'OpenAI billing or credits are not active. Please check OpenAI Platform Billing.'
  if (type === 'model') return 'Selected AI model is not available. Try KHOJ_AI_MODEL=gpt-5-mini.'
  return 'OpenAI request failed. I\'m using fallback mode for now.'
}

function logOpenAIError(error: unknown, model: string) {
  console.error('KHOJ AI OpenAI error', {
    status: getErrorField(error, 'status') || undefined,
    code: getErrorField(error, 'code') || undefined,
    type: getErrorField(error, 'type') || undefined,
    model,
  })
}

function getIntent(message: string, mode: KhojMode, toolType?: ToolPromptType | 'general'): string {
  const text = message.toLowerCase()
  if (toolType && toolType !== 'general') return toolType
  if (/^\s*(what|who|when|where|why|how)\b/.test(text)) return 'direct_answer'
  if (text.includes('evaluate') || text.includes('validation') || text.includes('score')) return 'startup_evaluation'
  if (text.includes('market')) return 'market_analysis'
  if (text.includes('competitor')) return 'competitor_analysis'
  if (text.includes('valuation')) return 'valuation_estimate'
  if (text.includes('roadmap')) return 'roadmap_builder'
  if (text.includes('task') || text.includes('todo') || text.includes('to-do')) return 'task_generator'
  return mode
}

async function getUidFromRequest(req: NextRequest): Promise<string | null> {
  const authHeader = req.headers.get('Authorization')
  if (!authHeader?.startsWith('Bearer ')) return null
  const token = authHeader.slice(7)
  try {
    const adminAuth = getAdminAuth()
    const decoded = await adminAuth.verifyIdToken(token)
    return decoded.uid
  } catch {
    return null
  }
}

export async function POST(req: NextRequest) {
  // ── Auth ──────────────────────────────────────────────────────────────────
  const uid = await getUidFromRequest(req)
  if (!uid) {
    return NextResponse.json({ ok: false, error: 'Unauthorized. Sign in to use KHOJ AI.' }, { status: 401 })
  }

  // ── Parse body ────────────────────────────────────────────────────────────
  let body: {
    message?: unknown
    mode?: unknown
    toolType?: unknown
    history?: unknown
    roomContext?: unknown
  } = {}
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ ok: false, error: 'Invalid JSON body.' }, { status: 400 })
  }

  const message = String(body.message ?? '').trim()
  if (!message) {
    return NextResponse.json({ ok: false, error: 'Message is required.' }, { status: 400 })
  }
  if (message.length > MAX_MESSAGE_LENGTH) {
    return NextResponse.json({ ok: false, error: `Message too long. Max ${MAX_MESSAGE_LENGTH} characters.` }, { status: 400 })
  }

  const rawMode = String(body.mode ?? 'general')
  const mode: KhojMode = VALID_MODES.includes(rawMode as KhojMode) ? (rawMode as KhojMode) : 'general'

  const rawToolType = String(body.toolType ?? '').trim()
  const toolType: ToolPromptType | undefined = VALID_TOOL_TYPES.has(rawToolType)
    ? (rawToolType as ToolPromptType)
    : undefined

  const roomContextRaw = typeof body.roomContext === 'object' && body.roomContext !== null
    ? (body.roomContext as RoomContextPayload)
    : undefined

  const roomContext = roomContextRaw
    ? {
        roomId: String(roomContextRaw.roomId ?? '').trim(),
        roomName: String(roomContextRaw.roomName ?? '').trim(),
        roomGoal: String(roomContextRaw.roomGoal ?? '').trim(),
      }
    : undefined

  // Sanitize and cap history
  const rawHistory = Array.isArray(body.history) ? (body.history as unknown[]) : []
  const history: HistoryMessage[] = rawHistory
    .filter(
      (m): m is HistoryMessage =>
        typeof m === 'object' &&
        m !== null &&
        ((m as HistoryMessage).role === 'user' || (m as HistoryMessage).role === 'assistant') &&
        typeof (m as HistoryMessage).content === 'string'
    )
    .slice(-MAX_HISTORY_MESSAGES)
    .map((m) => ({ role: m.role, content: String(m.content).slice(0, 1200) }))

  // Retrieval: use the local KHOJ knowledge index/Markdown docs as a lightweight
  // vector-store stand-in until an external embeddings database is connected.
  const retrievedSnippets: RetrievedKhojSnippet[] = await retrieveKhojKnowledgeSnippets(
    `${mode} ${message} ${toolType ?? ''} ${roomContext?.roomName ?? ''} ${roomContext?.roomGoal ?? ''}`
  )
  const retrievedKnowledgeBlock = retrievedSnippets.length > 0
    ? retrievedSnippets
        .map((snippet, index) => `${index + 1}. ${snippet.title} (${snippet.path})\n${snippet.excerpt}`)
        .join('\n\n')
    : ''

  const userContext = await getKhojUserContext(uid)
  const systemPrompt = getSystemPrompt({
    mode,
    featureKnowledge: [
      khojFeatureKnowledge,
      retrievedKnowledgeBlock ? `RETRIEVED KHOJ DOCS:\n${retrievedKnowledgeBlock}` : '',
      roomContext?.roomName
        ? `STARTUP ROOM CONTEXT:\nRoom: ${roomContext.roomName}\nGoal: ${roomContext.roomGoal || 'Not provided'}`
        : '',
    ].filter(Boolean).join('\n\n'),
    toolPrompt: toolType ? toolPrompts[toolType] : toolPromptPlaceholder,
    userContext,
  })

  const hasOpenAIKey = Boolean(process.env.OPENAI_API_KEY?.trim())
  const model = process.env.KHOJ_AI_MODEL || 'gpt-5-mini'
  const intent = getIntent(message, mode, toolType ?? 'general')

  // ── Mock fallback only when key is missing ───────────────────────────────
  if (!hasOpenAIKey) {
    const mockResult = getMockKhojAssistantReply(message, {
      mode,
      toolType,
      userContext,
    })

    const nextSteps = getNextStepSuggestions({
      mode,
      userMessage: message,
      assistantMessage: mockResult.reply,
      roomContext,
    })

    return NextResponse.json({
      ok: true,
      message: mockResult.reply,
      source: 'mock' as const,
      toolType: mockResult.toolType,
      intent,
      nextSteps,
      citations: retrievedSnippets.map((snippet) => ({ title: snippet.title, path: snippet.path })),
    })
  }

  // ── Try OpenAI ────────────────────────────────────────────────────────────
  try {
    const inputMessages = [
      { role: 'system' as const, content: systemPrompt },
      ...history.map((h) => ({ role: h.role as 'user' | 'assistant', content: h.content })),
      { role: 'user' as const, content: message },
    ]

    const completion = await createKhojChatCompletion({
      messages: inputMessages,
      model,
      tools: toolSchemas
        .filter((schema) => schema.enabled)
        .map((schema) => ({
          type: 'function' as const,
          function: {
            name: schema.name,
            description: schema.description,
            parameters: schema.inputSchema,
          },
        })),
      temperature: 0.7,
      maxTokens: 1000,
    })

    const aiMessage = completion.text
    if (!aiMessage) throw new Error('Empty response from OpenAI')

    const nextSteps = getNextStepSuggestions({
      mode,
      userMessage: message,
      assistantMessage: aiMessage,
      roomContext,
    })

    return NextResponse.json({
      ok: true,
      message: aiMessage,
      source: 'openai' as const,
      toolType: toolType ?? 'general',
      intent,
      nextSteps,
      citations: retrievedSnippets.map((snippet) => ({ title: snippet.title, path: snippet.path })),
    })
  } catch (err) {
    let errorType = classifyOpenAIError(err)

    if (errorType === 'rate_limit') {
      await sleep(1500)
      try {
        const retryMessages = [
          { role: 'system' as const, content: systemPrompt },
          ...history.map((h) => ({ role: h.role as 'user' | 'assistant', content: h.content })),
          { role: 'user' as const, content: message },
        ]

        const retryCompletion = await createKhojChatCompletion({
          messages: retryMessages,
          model,
          tools: toolSchemas
            .filter((schema) => schema.enabled)
            .map((schema) => ({
              type: 'function' as const,
              function: {
                name: schema.name,
                description: schema.description,
                parameters: schema.inputSchema,
              },
            })),
          temperature: 0.7,
          maxTokens: 1000,
        })

        const retryMessage = retryCompletion.text
        if (!retryMessage) throw new Error('Empty response from OpenAI')

        return NextResponse.json({
          ok: true,
          message: retryMessage,
          source: 'openai' as const,
          toolType: toolType ?? 'general',
          intent,
          nextSteps: getNextStepSuggestions({
            mode,
            userMessage: message,
            assistantMessage: retryMessage,
            roomContext,
          }),
          citations: retrievedSnippets.map((snippet) => ({ title: snippet.title, path: snippet.path })),
        })
      } catch (retryError) {
        errorType = classifyOpenAIError(retryError)
        logOpenAIError(retryError, model)
      }
    } else {
      logOpenAIError(err, model)
    }

    const mockResult = getMockKhojAssistantReply(message, {
      mode,
      toolType: toolType ?? 'general',
      userContext,
    })

    return NextResponse.json({
      ok: true,
      message: mockResult.reply,
      source: 'mock' as const,
      openaiError: errorType,
      openaiMessage: friendlyOpenAIMessage(errorType),
      notice: FALLBACK_NOTICE,
      intent,
      toolType: mockResult.toolType,
      nextSteps: getNextStepSuggestions({
        mode,
        userMessage: message,
        assistantMessage: mockResult.reply,
        roomContext,
      }),
      citations: retrievedSnippets.map((snippet) => ({ title: snippet.title, path: snippet.path })),
    })
  }
}
