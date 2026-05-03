// lib/ai/openaiClient.ts
// SERVER-ONLY. Never import this file from client components.
// Provides a controlled OpenAI client that returns null when API key is missing.

import OpenAI from 'openai'

let _client: OpenAI | null = null

export interface KhojChatMessage {
  role: 'system' | 'user' | 'assistant'
  content: string
}

export interface KhojChatTool {
  type: 'function'
  function: {
    name: string
    description?: string
    parameters?: Record<string, unknown>
  }
}

export interface CreateKhojChatCompletionInput {
  messages: KhojChatMessage[]
  tools?: KhojChatTool[]
  model?: string
  temperature?: number
  maxTokens?: number
}

/**
 * Returns a shared OpenAI client if OPENAI_API_KEY is set.
 * Returns null if the key is missing — callers must fall back to mock.
 *
 * SECURITY: Only import this file in server-side code (API routes, Server Actions).
 * Never use NEXT_PUBLIC_ prefix for the API key.
 */
export function getOpenAIClient(): OpenAI | null {
  const apiKey = process.env.OPENAI_API_KEY
  if (!apiKey) return null

  if (!_client) {
    _client = new OpenAI({ apiKey })
  }
  return _client
}

export async function createKhojChatCompletion(input: CreateKhojChatCompletionInput): Promise<{
  text: string
  toolCalls?: Array<{ name: string; arguments: string }>
}> {
  const client = getOpenAIClient()
  if (!client) {
    throw new Error('OPENAI_API_KEY is missing on the server.')
  }

  const completion = await client.chat.completions.create({
    model: input.model ?? KHOJ_AI_MODEL,
    messages: input.messages,
    temperature: input.temperature ?? 0.7,
    max_tokens: input.maxTokens ?? 1000,
    tools: input.tools,
  })

  const choice = completion.choices[0]
  const text = choice?.message?.content ?? ''
  const toolCalls = choice?.message?.tool_calls
    ?.filter((tc) => tc.type === 'function')
    .map((tc) => ({
      name: tc.function.name,
      arguments: tc.function.arguments,
    }))

  return { text, toolCalls }
}

/**
 * The model to use for KHOJ AI responses.
 * Override via KHOJ_AI_MODEL env variable.
 */
export const KHOJ_AI_MODEL = process.env.KHOJ_AI_MODEL || 'gpt-5-mini'
