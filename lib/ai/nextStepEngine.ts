import type { KhojMode } from '@/lib/ai/khojSystemPrompt'

export interface NextStepInput {
  mode: KhojMode
  userMessage: string
  assistantMessage: string
  roomContext?: {
    roomName?: string
    roomGoal?: string
  }
}

export interface NextStepSuggestion {
  label: string
  khojFeature?: string
  reason: string
}

const DEFAULT_STEPS: Record<KhojMode, NextStepSuggestion[]> = {
  startup: [
    {
      label: 'Run 5 customer interviews this week',
      khojFeature: 'Startup Rooms',
      reason: 'Validation quality improves when assumptions are tested with real users.',
    },
    {
      label: 'Convert plan into 30-day board tasks',
      khojFeature: 'Progress Board',
      reason: 'Turning strategy into tasks reduces execution drift.',
    },
  ],
  profile: [
    {
      label: 'Publish one proof-backed project update',
      khojFeature: 'Profile/Portfolio',
      reason: 'Visible proof strengthens credibility for mentors and opportunities.',
    },
    {
      label: 'Attach one mission outcome to your profile',
      khojFeature: 'Proof Tracks',
      reason: 'Track outcomes provide concrete evidence of capability.',
    },
  ],
  opportunities: [
    {
      label: 'Apply to 3 relevant opportunities this week',
      khojFeature: 'Opportunity Market',
      reason: 'Consistent outreach increases match probability.',
    },
    {
      label: 'Tailor your pitch paragraph for each role',
      khojFeature: 'Profile/Portfolio',
      reason: 'Personalized applications perform better than generic submissions.',
    },
  ],
  investor: [
    {
      label: 'Prepare concise answers for top 5 investor questions',
      khojFeature: 'KHOJ AI Builder',
      reason: 'Prepared responses improve confidence and consistency.',
    },
    {
      label: 'Collect baseline traction metrics before outreach',
      khojFeature: 'Dashboard',
      reason: 'Data-backed conversations strengthen investor trust.',
    },
  ],
  research: [
    {
      label: 'Define top 3 hypotheses to validate this month',
      khojFeature: 'KHOJ AI Builder',
      reason: 'A focused hypothesis list keeps research actionable.',
    },
    {
      label: 'Track assumptions and outcomes in one board',
      khojFeature: 'Progress Board',
      reason: 'Clear tracking avoids repeating invalidated assumptions.',
    },
  ],
  general: [
    {
      label: 'Choose one concrete goal for this week',
      khojFeature: 'Dashboard',
      reason: 'Clear weekly goals improve execution momentum.',
    },
    {
      label: 'Publish one proof artifact after completing a task',
      khojFeature: 'Arena/Studio',
      reason: 'Public proof compounds trust and discovery.',
    },
  ],
}

export function getNextStepSuggestions(input: NextStepInput): NextStepSuggestion[] {
  const text = `${input.userMessage} ${input.assistantMessage}`.toLowerCase()
  const contextual: NextStepSuggestion[] = []

  if (text.includes('valuation')) {
    contextual.push({
      label: 'List valuation assumptions and validate one this week',
      khojFeature: 'KHOJ AI Builder',
      reason: 'Assumption-driven valuation becomes more credible with validation evidence.',
    })
  }

  if (text.includes('co-founder') || text.includes('team')) {
    contextual.push({
      label: 'Post one role requirement with clear outcomes',
      khojFeature: 'Startup Rooms',
      reason: 'Clear role scope helps attract better-fit collaborators.',
    })
  }

  if (text.includes('market') || text.includes('competitor')) {
    contextual.push({
      label: 'Run a competitor matrix with 5 alternatives',
      khojFeature: 'KHOJ AI Builder',
      reason: 'Structured competitor mapping highlights your differentiation gap.',
    })
  }

  if (input.roomContext?.roomName) {
    contextual.push({
      label: `Create a room task list for ${input.roomContext.roomName}`,
      khojFeature: 'Startup Rooms',
      reason: 'Team-level next steps keep everyone aligned on delivery.',
    })
  }

  return [...contextual, ...DEFAULT_STEPS[input.mode]].slice(0, 3)
}
