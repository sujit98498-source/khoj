// lib/ai/startupEvaluation.ts
// KHOJ AI Startup Evaluator — mock evaluator (MVP)
// Replace the mock body with a real AI provider call in evaluateWithRealAI().
// Disclaimer: This evaluation is guidance only, not a guarantee of success.

export interface StartupEvaluationInput {
  startupName: string
  oneLiner: string
  category: string
  stage: 'idea' | 'mvp' | 'growth'
  targetMarket: string
  problem: string
  targetCustomer: string
  currentAlternatives: string
  solution: string
  whyNow: string
  competitors: string
  differentiation: string
  revenueModel: string
  teamStatus: string
  rolesNeeded: string
  fundingNeeded: string
  currentTraction: string
  mvpPlan: string
}

export interface EvaluationScores {
  problemClarity: number
  customerClarity: number
  marketPotential: number
  solutionStrength: number
  differentiation: number
  businessModel: number
  executionFeasibility: number
  teamReadiness: number
  tractionValidation: number
  fundingReadiness: number
}

export interface StartupEvaluationResult {
  overallScore: number
  ratingLabel: string
  confidenceLevel: 'low' | 'medium' | 'high'
  summary: string
  scores: EvaluationScores
  strengths: string[]
  weaknesses: string[]
  risks: string[]
  nextSteps: string[]
  recommendedRoles: string[]
  suggestedMVP: string
  investorReadiness: string
  strategicReport: string
}

// ── Scoring weights ───────────────────────────────────────────────────────────
const WEIGHTS: Record<keyof EvaluationScores, number> = {
  problemClarity:      0.15,
  customerClarity:     0.10,
  marketPotential:     0.15,
  solutionStrength:    0.10,
  differentiation:     0.10,
  businessModel:       0.10,
  executionFeasibility:0.10,
  teamReadiness:       0.10,
  tractionValidation:  0.05,
  fundingReadiness:    0.05,
}

// ── Rating labels ─────────────────────────────────────────────────────────────
export function getRatingLabel(score: number): string {
  if (score < 5)   return 'Needs Validation'
  if (score < 7)   return 'Promising but Risky'
  if (score < 8.5) return 'Strong Potential'
  return 'High Potential — Still needs validation'
}

// ── Text quality scorer (0-10) ────────────────────────────────────────────────
function scoreText(text: string, minWords = 5, maxWords = 80): number {
  const words = text.trim().split(/\s+/).filter(Boolean).length
  if (words < 2) return 1
  if (words < minWords) return 3
  if (words <= maxWords) return Math.min(10, 5 + Math.floor(words / (maxWords / 5)))
  return 8 // penalise rambling slightly
}

// ── Mock evaluator ─────────────────────────────────────────────────────────────
// This function produces realistic structured output without calling an AI API.
// All logic is deterministic and explainable so you can verify correct behaviour
// during development and integration testing.
function mockEvaluate(input: StartupEvaluationInput): StartupEvaluationResult {
  const scores: EvaluationScores = {
    problemClarity:       Math.min(10, scoreText(input.problem, 10, 100)),
    customerClarity:      Math.min(10, scoreText(input.targetCustomer, 5, 60)),
    marketPotential:      Math.min(10, scoreText(input.targetMarket, 3, 50) + (input.targetMarket.length > 10 ? 1 : 0)),
    solutionStrength:     Math.min(10, scoreText(input.solution, 10, 100)),
    differentiation:      Math.min(10, scoreText(input.differentiation, 8, 80)),
    businessModel:        Math.min(10, scoreText(input.revenueModel, 5, 60)),
    executionFeasibility: Math.min(10, scoreText(input.mvpPlan, 8, 80) + (input.stage !== 'idea' ? 1 : 0)),
    teamReadiness:        Math.min(10, scoreText(input.teamStatus, 5, 60) + (input.teamStatus.toLowerCase().includes('cofounder') ? 1 : 0)),
    tractionValidation:   Math.min(10, scoreText(input.currentTraction, 3, 60) + (input.stage === 'growth' ? 2 : input.stage === 'mvp' ? 1 : 0)),
    fundingReadiness:     Math.min(10, scoreText(input.fundingNeeded, 3, 40)),
  }

  // Weighted overall score
  const overallScore = parseFloat(
    (Object.entries(scores) as [keyof EvaluationScores, number][])
      .reduce((acc, [key, val]) => acc + val * WEIGHTS[key], 0)
      .toFixed(1)
  )

  const ratingLabel = getRatingLabel(overallScore)

  // Confidence level based on input completeness
  const filledFields = Object.values(input).filter((v) => typeof v === 'string' && v.trim().length > 5).length
  const totalFields = Object.keys(input).length
  const completeness = filledFields / totalFields
  const confidenceLevel: 'low' | 'medium' | 'high' =
    completeness > 0.8 ? 'high' : completeness > 0.5 ? 'medium' : 'low'

  // Derive strengths / weaknesses from scores
  const strengths: string[] = []
  const weaknesses: string[] = []

  if (scores.problemClarity >= 7)       strengths.push(`Clear problem statement for ${input.targetMarket} market.`)
  if (scores.customerClarity >= 7)      strengths.push(`Well-defined target customer: "${input.targetCustomer.slice(0, 60)}".`)
  if (scores.solutionStrength >= 7)     strengths.push('Solution description is concrete and detailed.')
  if (scores.differentiation >= 7)      strengths.push('Differentiation from competitors is articulated.')
  if (scores.businessModel >= 7)        strengths.push('Revenue model is clearly defined.')
  if (scores.teamReadiness >= 7)        strengths.push('Team composition shows execution capability.')
  if (scores.tractionValidation >= 6)   strengths.push('Early traction signals reduce market risk.')
  if (scores.executionFeasibility >= 7) strengths.push('MVP plan is actionable and scoped.')

  if (scores.problemClarity < 5)       weaknesses.push('Problem statement lacks depth — add real-world evidence or user pain points.')
  if (scores.customerClarity < 5)      weaknesses.push('Target customer is vague — specify demographics, behaviours, and needs.')
  if (scores.marketPotential < 5)      weaknesses.push('Market context is thin — add market size, TAM/SAM, or growth data.')
  if (scores.solutionStrength < 5)     weaknesses.push('Solution needs more technical or product clarity.')
  if (scores.differentiation < 5)      weaknesses.push('Differentiation is weak — explain the "10x better" angle over alternatives.')
  if (scores.businessModel < 5)        weaknesses.push('Revenue model is underspecified — define pricing, unit economics, or monetisation path.')
  if (scores.executionFeasibility < 5) weaknesses.push('MVP plan is missing — outline minimum feature set and timeline.')
  if (scores.teamReadiness < 5)        weaknesses.push('Team gaps identified — critical roles are unfilled.')
  if (scores.tractionValidation < 4)   weaknesses.push('No traction data — validate assumptions with real users before scaling.')

  if (strengths.length === 0) strengths.push('You have a startup concept — that is the first step.')
  if (weaknesses.length === 0) weaknesses.push('No critical weaknesses detected at this stage.')

  // Risks
  const risks: string[] = [
    'Market may not be large enough to sustain a venture-scale business without further validation.',
    overallScore < 6 ? 'High execution risk due to unclear problem-solution fit.' : 'Competitive landscape may intensify before product-market fit is achieved.',
    scores.tractionValidation < 5 ? 'Unvalidated assumptions may lead to building a product nobody wants.' : 'Scaling risk if unit economics are not positive at early stage.',
    'Funding timeline may be longer than expected — maintain financial runway planning.',
  ]

  // Next steps
  const nextSteps: string[] = []
  if (scores.tractionValidation < 5)   nextSteps.push('Conduct 10+ user interviews to validate the core problem.')
  if (scores.customerClarity < 6)      nextSteps.push('Define a primary customer persona with job-to-be-done framework.')
  if (scores.businessModel < 6)        nextSteps.push('Test a revenue hypothesis — charge early adopters or run a landing page experiment.')
  if (scores.executionFeasibility < 6) nextSteps.push('Write a one-page MVP scope: 3 core features, 6-week timeline.')
  if (scores.differentiation < 6)      nextSteps.push('Create a competitive matrix and define your unique value proposition in one sentence.')
  if (scores.teamReadiness < 6)        nextSteps.push('Identify critical founding team gaps and post roles on KHOJ Opportunity Market.')
  nextSteps.push('Publish your startup room to KHOJ and gather community feedback.')
  nextSteps.push('Re-run this evaluation after completing user interviews and MVP iteration.')

  // Recommended roles based on team gaps
  const recommendedRoles: string[] = []
  const teamLower = input.teamStatus.toLowerCase()
  const rolesLower = input.rolesNeeded.toLowerCase()
  if (!teamLower.includes('tech') && !teamLower.includes('engineer') && !teamLower.includes('developer'))
    recommendedRoles.push('Full-Stack Engineer')
  if (!teamLower.includes('design') && !teamLower.includes('ux'))
    recommendedRoles.push('Product Designer / UX')
  if (!teamLower.includes('market') && !teamLower.includes('growth'))
    recommendedRoles.push('Growth Marketer')
  if (rolesLower.includes('ai') || rolesLower.includes('ml') || input.category.toLowerCase().includes('ai'))
    recommendedRoles.push('ML / AI Engineer')
  if (recommendedRoles.length === 0)
    recommendedRoles.push('Operations Lead', 'Community Manager')

  // Suggested MVP
  const suggestedMVP = `Build a no-code or low-code prototype of "${input.oneLiner}" that solves the core problem for your top 10 target customers. Focus on: (1) onboarding flow, (2) the key value-delivering action, and (3) a simple way to capture feedback. Skip everything else for the first 6 weeks.`

  // Investor readiness
  let investorReadiness: string
  if (overallScore >= 8.5)
    investorReadiness = 'Ready for angel / pre-seed conversations with a polished deck and early traction.'
  else if (overallScore >= 7)
    investorReadiness = 'Approaching investor-ready. Strengthen traction, unit economics, and team to qualify for pre-seed.'
  else if (overallScore >= 5)
    investorReadiness = 'Not yet investor-ready. Focus on problem-solution fit and early revenue signals first.'
  else
    investorReadiness = 'Too early for investors. Validate the core problem with real users before seeking funding.'

  // Strategic report
  const strategicReport = `
## KHOJ AI Strategic Report — ${input.startupName}

**Overall Validation Readiness Score: ${overallScore}/10 — ${ratingLabel}**

> ⚠️ This AI evaluation is guidance only, not a guarantee of success. Validate with real users.

### Executive Summary
${input.oneLiner}. Operating in ${input.targetMarket}, targeting ${input.targetCustomer}. Currently at ${input.stage} stage.

### Problem & Opportunity
${input.problem}

The current landscape includes alternatives like: ${input.currentAlternatives}. Your differentiation: ${input.differentiation}.

### Solution & "Why Now"
${input.solution}

Why now: ${input.whyNow}

### Business Model
${input.revenueModel}

Funding needed: ${input.fundingNeeded}

### Team Assessment
${input.teamStatus}. Roles needed: ${input.rolesNeeded}.

### Score Breakdown
| Dimension | Score | Weight |
|---|---|---|
| Problem Clarity | ${scores.problemClarity}/10 | 15% |
| Customer Clarity | ${scores.customerClarity}/10 | 10% |
| Market Potential | ${scores.marketPotential}/10 | 15% |
| Solution Strength | ${scores.solutionStrength}/10 | 10% |
| Differentiation | ${scores.differentiation}/10 | 10% |
| Business Model | ${scores.businessModel}/10 | 10% |
| Execution Feasibility | ${scores.executionFeasibility}/10 | 10% |
| Team Readiness | ${scores.teamReadiness}/10 | 10% |
| Traction / Validation | ${scores.tractionValidation}/10 | 5% |
| Funding Readiness | ${scores.fundingReadiness}/10 | 5% |

### Investor Readiness
${investorReadiness}

### Recommended MVP
${suggestedMVP}
`.trim()

  const summary = `${input.startupName} scores ${overallScore}/10 (${ratingLabel}). ${strengths[0] ?? ''} ${weaknesses[0] ?? ''} Focus on ${nextSteps[0]?.toLowerCase() ?? 'validating with real users'}.`

  return {
    overallScore,
    ratingLabel,
    confidenceLevel,
    summary,
    scores,
    strengths,
    weaknesses,
    risks,
    nextSteps,
    recommendedRoles,
    suggestedMVP,
    investorReadiness,
    strategicReport,
  }
}

// ── Real AI evaluator (placeholder) ──────────────────────────────────────────
// HOW TO REPLACE WITH REAL AI:
// 1. Set OPENAI_API_KEY (or ANTHROPIC_API_KEY) in your .env.local
// 2. Install the SDK: npm install openai
// 3. Uncomment evaluateWithRealAI() and call it from evaluateStartupIdea()
// 4. Pass a structured prompt + JSON schema enforcement for reliable output
//
// async function evaluateWithRealAI(input: StartupEvaluationInput): Promise<StartupEvaluationResult> {
//   const { OpenAI } = await import('openai')
//   const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })
//   const prompt = buildPrompt(input)
//   const response = await client.chat.completions.create({
//     model: 'gpt-4o',
//     response_format: { type: 'json_object' },
//     messages: [{ role: 'user', content: prompt }],
//   })
//   const raw = JSON.parse(response.choices[0].message.content ?? '{}')
//   return validateAndNormalise(raw)
// }

// ── Public entry point ────────────────────────────────────────────────────────
export async function evaluateStartupIdea(
  input: StartupEvaluationInput
): Promise<StartupEvaluationResult> {
  // When OPENAI_API_KEY is set, swap this to: return evaluateWithRealAI(input)
  return mockEvaluate(input)
}
