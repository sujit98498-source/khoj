import type { KhojMode } from '@/lib/ai/khojSystemPrompt'
import type { ToolPromptType } from '@/lib/ai/toolPrompts'

export interface KhojAssistantResponse {
  reply: string
  suggestions: string[]
  mode: KhojMode
  toolType: ToolPromptType | 'general'
}

interface MockOptions {
  mode?: KhojMode
  toolType?: string
  userContext?: {
    name?: string
    role?: string
    xp?: number | null
    rank?: number | null
  }
}

const STARTER_PROMPTS = [
  'Improve my KHOJ profile',
  'Evaluate my startup idea',
  'Analyze market potential for my startup',
  'Estimate valuation for my startup',
  'Build a 30-day roadmap',
  'Help me prepare investor Q&A',
  'Explain a Korean notice',
  'Generate startup tasks by role',
]

function detectMode(message: string): KhojMode {
  const text = message.toLowerCase()
  if (text.includes('profile') || text.includes('bio') || text.includes('portfolio')) return 'profile'
  if (text.includes('opportunit') || text.includes('internship') || text.includes('competition') || text.includes('mentor')) return 'opportunities'
  if (text.includes('investor') || text.includes('pitch') || text.includes('funding') || text.includes('deck')) return 'investor'
  if (text.includes('research')) return 'research'
  if (text.includes('startup') || text.includes('mvp') || text.includes('valuation') || text.includes('market')) return 'startup'
  return 'general'
}

function detectToolType(message: string, mode: KhojMode): ToolPromptType | 'general' {
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

  if (mode === 'profile') return 'profile_coach'
  if (mode === 'investor') return 'investor_qna'
  if (mode === 'research' || mode === 'opportunities') return 'market_analysis'
  if (mode === 'startup') return 'startup_evaluation'
  return 'general'
}

function buildReply(toolType: ToolPromptType | 'general', message: string, mode: KhojMode): string {
  const lower = message.toLowerCase()

  if (/\bicp\b/.test(lower) || lower.includes('ideal customer profile')) {
    return [
      '## ICP',
      '',
      'ICP means Ideal Customer Profile.',
      '',
      'It describes the specific type of customer most likely to feel the problem strongly, use your product repeatedly, and become a credible early adopter.',
      '',
      'A good ICP usually includes:',
      '- customer type',
      '- pain point',
      '- current workaround',
      '- urgency',
      '- budget or ability to act',
      '- where you can reach them',
      '',
      '### Next Step',
      'Write one sentence: "Our ICP is [specific user] who struggles with [pain] and currently solves it by [workaround]."',
    ].join('\n')
  }

  if (lower.includes('annual leave')) {
    return [
      '## Annual Leave Guidance (Mock)',
      '',
      '- KHOJ does not define a universal annual leave policy for all organizations.',
      '- Check the specific program, company, or competition policy you are applying under.',
      '- If this is for your startup team, document leave rules clearly in your Startup Room notes.',
      '',
      '### Next Step',
      'Create a simple leave policy template and share it with your team for alignment.',
    ].join('\n')
  }

  if (toolType === 'startup_evaluation') {
    return [
      '## Startup Evaluation (Mock)',
      '',
      '- **Validation Readiness Score:** 7.4/10',
      '- **Problem clarity:** Strong',
      '- **Target customer clarity:** Medium (needs tighter ICP)',
      '- **Market potential:** High if student-founder segment validates conversion',
      '- **Solution strength:** Good integration across proof + team + opportunity',
      '- **Differentiation:** Platform loop (Learn -> Prove -> Connect -> Build -> Opportunity)',
      '- **Business model:** Needs clearer paid conversion triggers',
      '- **Execution feasibility:** Medium-high',
      '- **Team readiness:** Requires product + growth + community roles',
      '- **Traction/validation:** Early; gather user behavior evidence quickly',
      '- **Funding readiness:** Not yet; validate retention first',
      '',
      '### Strengths',
      '- Clear founder pain point around proof-to-opportunity gap',
      '- Community and execution layers can create stickiness',
      '',
      '### Weaknesses',
      '- Revenue assumptions not explicit yet',
      '- Need measurable wedge segment and activation metric',
      '',
      '### Risks',
      '- Feature breadth before core loop retention',
      '- Marketplace cold start for opportunities',
      '',
      '### MVP Recommendation',
      '- Ship one narrow workflow: startup room -> AI roadmap -> role fill -> launch checklist',
      '',
      '### Recommended Team Roles',
      '- Founder/CEO, Full-stack Developer, Product Designer, Growth Operator',
      '',
      '### Next 30 Days',
      '1. Interview 20 users and validate core pain frequency.',
      '2. Define one activation event and track weekly.',
      '3. Run a single niche cohort through KHOJ AI Builder.',
      '4. Publish proof outcomes in Profile + Arena/Studio.',
      '',
      '_This is a validation-oriented assessment, not a success guarantee._',
    ].join('\n')
  }

  if (toolType === 'market_analysis') {
    return [
      '## Market Potential Analysis (Mock)',
      '',
      '- **Market Potential Score:** 7.8/10',
      '- **Target customer:** Students, early founders, and builders seeking proof + opportunities',
      '- **Market trend:** Rising demand for portfolio-first hiring and startup collaboration tools',
      '- **Market size assumption:** Mid-to-large education + creator + startup productivity overlap',
      '- **Demand drivers:** Skills proof gap, founder matching friction, internship/competition pressure',
      '- **Competitor categories:** Learning platforms, portfolio builders, founder matching communities',
      '- **Revenue opportunity:** Premium AI tools, startup workspace tiers, recruiter/mentor features',
      '- **Risks:** User churn if proof artifacts do not convert to outcomes quickly',
      '- **Validation tests:** ICP landing page test, cohort retention test, conversion to opportunity action',
      '- **Next steps:** Validate one segment and one monetizable workflow in 4 weeks',
      '',
      '_Analysis is based on user input and AI reasoning, not live web data._',
    ].join('\n')
  }

  if (toolType === 'competitor_analysis') {
    return [
      '## Competitor Analysis (Mock)',
      '',
      '- **Direct competitors:** Startup collaboration tools with role matching',
      '- **Indirect competitors:** Generic portfolio builders, community platforms, learning LMS apps',
      '- **Existing alternatives:** Discord groups, spreadsheets, LinkedIn + Notion stacks',
      '- **Differentiation gap:** Most tools do not unify proof, startup execution, and opportunities',
      '- **How KHOJ can win:** Own the proof-to-opportunity operating loop',
      '- **Positioning strategy:** "Performance + startup execution OS for student founders"',
      '- **Features to avoid copying:** Broad social-feed-only behavior',
      '- **Features to build uniquely:** Validation Readiness workflows + launch readiness board',
    ].join('\n')
  }

  if (toolType === 'valuation_estimate') {
    return [
      '## Early-Stage Valuation Estimate (Mock)',
      '',
      '- **Valuation Readiness Score:** 6.6/10',
      '- **Startup stage:** Early MVP / pre-strong traction',
      '- **Assumptions used:** active cohort growth, retention trend, founder capability, TAM narrative',
      '- **Estimated valuation range:** **$1.5M-$4.0M** (pre-seed style range, based on assumptions)',
      '- **Factors increasing valuation:** repeat usage, strong retention, active opportunity conversions',
      '- **Factors reducing valuation:** weak monetization signal, broad scope without sharp wedge',
      '- **Data needed for better estimate:** weekly active retention, conversion to paid, growth CAC',
      '- **Funding recommendation:** improve traction evidence before aggressive raise',
      '- **Disclaimer:** This is general guidance, not financial advice.',
      '',
      '_Valuation depends on traction, market, team, revenue, and investor demand._',
    ].join('\n')
  }

  if (toolType === 'roadmap_builder') {
    return [
      '## Startup Roadmap (Mock)',
      '',
      '### 30-Day Roadmap',
      '1. Define ICP and one flagship problem statement.',
      '2. Launch MVP workflow inside Startup Rooms + KHOJ AI Builder.',
      '3. Recruit 10-20 pilot users and track activation + retention.',
      '4. Publish proof artifacts to Profile, Arena, and Studio.',
      '',
      '### 90-Day Roadmap',
      '1. Improve onboarding and role-matching conversion.',
      '2. Add monetization test for premium workflows.',
      '3. Build cohort-based opportunity outcomes dashboard.',
      '',
      '### Launch Checklists',
      '- **Beta:** stable core loop, tracked activation, feedback logs',
      '- **MVP:** consistent weekly retention and top 3 use cases',
      '- **Public:** clear pricing and support playbook',
      '- **Funding-ready:** traction metrics + defensible narrative',
    ].join('\n')
  }

  if (toolType === 'task_generator') {
    return [
      '## Startup Tasks by Role (Mock)',
      '',
      '### Founder/CEO',
      '- **Title:** Validate ICP Interviews\n  **Description:** Conduct 15 interviews and summarize pain patterns\n  **Priority:** High\n  **Suggested deadline:** 7 days\n  **Related milestone:** Beta Ready',
      '',
      '### Developer',
      '- **Title:** Build Core Workflow\n  **Description:** Implement Startup Room -> AI Builder -> Progress Board flow\n  **Priority:** High\n  **Suggested deadline:** 14 days\n  **Related milestone:** MVP Ready',
      '',
      '### Designer',
      '- **Title:** Optimize User Onboarding\n  **Description:** Create first-run guidance and role card templates\n  **Priority:** Medium\n  **Suggested deadline:** 10 days\n  **Related milestone:** Beta Ready',
      '',
      '### Marketer',
      '- **Title:** Cohort Launch Campaign\n  **Description:** Run targeted campaign for student founders\n  **Priority:** Medium\n  **Suggested deadline:** 14 days\n  **Related milestone:** Public Launch Ready',
      '',
      '### Business Development',
      '- **Title:** Mentor/Partner Outreach\n  **Description:** Contact mentors and startup clubs for pilot collaborations\n  **Priority:** Medium\n  **Suggested deadline:** 21 days\n  **Related milestone:** Funding Ready',
      '',
      '### Researcher',
      '- **Title:** Competitor Evidence Pack\n  **Description:** Build structured matrix of 10 alternatives and positioning gaps\n  **Priority:** Medium\n  **Suggested deadline:** 10 days\n  **Related milestone:** MVP Ready',
    ].join('\n')
  }

  if (toolType === 'profile_coach') {
    return [
      '## Profile Upgrade (Mock)',
      '',
      '- **Headline:** Founder-builder turning learning into proof and proof into startup outcomes',
      '- **Bio:** I build execution-first startup systems that help students and early founders validate ideas, form teams, and reach real opportunities through measurable proof.',
      '- **Project Description:** Built KHOJ, a proof-to-opportunity startup OS integrating Startup Rooms, AI Builder, and Opportunity Market workflows for fast validation cycles.',
      '- **Proof Story:** Led product strategy, shipped MVP modules, and used iterative user feedback to improve activation and execution consistency.',
      '- **Skills Section:** Startup Validation, Product Strategy, Growth Systems, Full-stack Collaboration, Pitch Readiness',
      '- **Achievements Wording:** Designed and shipped cross-feature workflow linking idea validation to launch readiness execution milestones.',
      '- **Portfolio Tips:** Add 3 proof artifacts: demo, workflow screenshots, and validation outcomes chart.',
    ].join('\n')
  }

  if (toolType === 'korean_notice_helper') {
    return [
      '## Korean Notice Summary (Mock)',
      '',
      '- **Simple summary:** This notice announces an application process and timeline requirements.',
      '- **Deadline:** Check exact date/time in KST and submit at least 24 hours early.',
      '- **Eligibility:** Confirm student/startup stage and required profile criteria.',
      '- **Required documents:** Application form, portfolio/proof links, ID or enrollment proof (if requested).',
      '- **Important warnings:** Late submissions and missing attachments are commonly rejected.',
      '- **What to do next:** Prepare documents now, verify checklist, and submit early.',
      '',
      '_Paste the exact Korean text for a precise, line-by-line explanation._',
    ].join('\n')
  }

  if (toolType === 'investor_qna') {
    return [
      '## Investor Q&A Prep (Mock)',
      '',
      '### Likely Questions',
      '1. Why does this problem matter now?',
      '2. Why your team?',
      '3. What proof of demand do you have?',
      '4. What is your monetization path?',
      '5. What is your moat?',
      '',
      '### Strong Answer Style',
      '- Context -> Evidence -> Action -> Next Milestone',
      '',
      '### Weak Points To Prepare',
      '- Clear retention evidence',
      '- Narrow wedge focus',
      '- Conversion to paid behavior',
      '',
      '### Numbers To Know',
      '- Activation rate, weekly retention, CAC (if available), revenue assumptions',
      '',
      '### Confident Closing',
      '- We are building a validation-first operating loop and can show measurable progression from proof to opportunity outcomes.',
    ].join('\n')
  }

  return `KHOJ AI is ready to help in ${mode} mode. I read: "${message.slice(0, 180)}".\n\nShare your goal and I will produce a practical next-step plan.`
}

export function getMockKhojAssistantReply(message: string, options: MockOptions = {}): KhojAssistantResponse {
  const safeMessage = (message || 'Help me grow on KHOJ').trim()
  const mode = options.mode ?? detectMode(safeMessage)
  const toolType = (options.toolType as ToolPromptType | undefined) ?? detectToolType(safeMessage, mode)
  const reply = buildReply(toolType, safeMessage, mode)

  const suggestions = toolType === 'general'
    ? STARTER_PROMPTS.slice(0, 4)
    : [
        'Turn this into a weekly execution checklist',
        'Map this plan to Startup Rooms tasks',
        'Show what to publish in Profile/Portfolio next',
      ]

  return {
    reply,
    suggestions,
    mode,
    toolType,
  }
}

export const KHOJ_AI_STARTER_PROMPTS = STARTER_PROMPTS
