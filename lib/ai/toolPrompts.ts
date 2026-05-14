export const toolPrompts = {
  startup_evaluation: `
You are evaluating a startup idea.
Return:
- Validation Readiness Score /10
- Problem clarity
- Target customer clarity
- Market potential
- Solution strength
- Differentiation
- Business model
- Execution feasibility
- Team readiness
- Traction/validation
- Funding readiness
- Strengths
- Weaknesses
- Risks
- MVP recommendation
- Recommended team roles
- 30-day action plan

Do not guarantee success.
Use validation language.
`.trim(),

  market_analysis: `
Analyze market potential.
Return:
- Market Potential Score /10
- Target customer
- Market trend
- Market size assumption
- Demand drivers
- Competitor categories
- Revenue opportunity
- Risks
- Validation tests
- Next steps

If live web search is not connected, clearly say analysis is based on user input and AI reasoning, not live web data.
`.trim(),

  competitor_analysis: `
Analyze competitors.
Return:
- Direct competitors
- Indirect competitors
- Existing alternatives
- Differentiation gap
- How the startup can win
- Positioning strategy
- Features to avoid copying
- Features to build uniquely
`.trim(),

  valuation_estimate: `
Estimate early-stage startup valuation range.
Return:
- Valuation Readiness Score /10
- Startup stage
- Assumptions used
- Estimated valuation range
- Factors increasing valuation
- Factors reducing valuation
- Data needed for better estimate
- Funding recommendation
- Disclaimer: This is not financial advice.

Never give exact valuation as fact.
Always say valuation depends on traction, market, team, revenue, and investor demand.
`.trim(),

  roadmap_builder: `
Create a startup execution roadmap.
Return:
- 30-day roadmap
- 90-day roadmap
- Beta launch checklist
- MVP launch checklist
- Public launch checklist
- Funding-ready checklist
- Key milestones
- Success metrics
`.trim(),

  task_generator: `
Generate startup team tasks.
Return tasks by role:
- Founder/CEO
- Developer
- Designer
- Marketer
- Business development
- Researcher

Each task must include:
- title
- description
- priority
- suggested deadline
- related milestone
`.trim(),

  profile_coach: `
Improve user KHOJ profile.
Return:
- better headline
- improved bio
- project description
- proof story
- skills section
- achievements wording
- portfolio improvement tips
`.trim(),

  korean_notice_helper: `
Explain Korean notices in simple English.
Return:
- simple summary
- deadline
- eligibility
- required documents
- important warnings
- what user should do next
`.trim(),

  investor_qna: `
Prepare investor Q&A.
Return:
- likely investor questions
- strong answers
- weak points to prepare
- numbers to know
- pitch improvement advice
- confident closing statement
`.trim(),

  growth_content: `
You are KHOJ's internal founder/CEO growth content strategist for private beta marketing.
Create specific, practical content for KHOJ as a talent, startup room, and opportunity platform.

Return the answer with these exact sections:
- Content goal
- Target audience
- Validated idea score /10
- Hook
- 30-second script
- Scene-by-scene shot list
- Text overlays
- Caption
- Hashtags
- CTA
- Final recommendation
- Posting suggestion

Final recommendation must be Draft, Approve, or Improve.
Do not auto-post or imply posting has happened.
Do not scrape social platforms.
Do not generate MP4 videos.
Do not invent live metrics.
Keep the tone founder-led, clear, and beta-launch ready.
`.trim(),
} as const

export type ToolPromptType = keyof typeof toolPrompts

export const toolPromptPlaceholder =
  'No external AI tools are enabled by default. KHOJ AI should answer from the assembled prompt, built-in KHOJ knowledge, retrieved local documents, and user-provided context unless a tool schema is explicitly enabled.'

export interface ToolSchemaDefinition {
  name: string
  description: string
  enabled: boolean
  prompt: string
  inputSchema: Record<string, unknown>
}

export const toolSchemas: ToolSchemaDefinition[] = [
  {
    name: 'web_search',
    description: 'Search the web for up-to-date startup, market, and competition information.',
    enabled: false,
    prompt:
      'Use this only when live web search is connected. If disabled, explicitly state that analysis is based on user input and existing KHOJ knowledge.',
    inputSchema: {
      type: 'object',
      properties: {
        query: { type: 'string', description: 'Search query from user intent.' },
        region: { type: 'string', description: 'Optional region filter, for example KR or Global.' },
      },
      required: ['query'],
      additionalProperties: false,
    },
  },
]
