// app/api/ai/startup-evaluation/route.ts
// KHOJ AI Startup Evaluator — backend route
// Requires authenticated Firebase user.
// Calls evaluateStartupIdea(), validates output, saves to Firestore.

import { NextRequest, NextResponse } from 'next/server'
import { getAdminDb, getAdminAuth } from '@/lib/firebase/admin'
import { evaluateStartupIdea } from '@/lib/ai/startupEvaluation'
import type { StartupEvaluationInput, StartupEvaluationResult } from '@/lib/ai/startupEvaluation'

// ── Auth helper ───────────────────────────────────────────────────────────────
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

// ── Input validation ──────────────────────────────────────────────────────────
const REQUIRED_FIELDS: (keyof StartupEvaluationInput)[] = [
  'startupName',
  'oneLiner',
  'problem',
  'solution',
  'targetCustomer',
  'targetMarket',
]

function validateInput(body: unknown): body is StartupEvaluationInput {
  if (!body || typeof body !== 'object') return false
  const b = body as Record<string, unknown>
  return REQUIRED_FIELDS.every((f) => typeof b[f] === 'string' && (b[f] as string).trim().length > 0)
}

// ── Output validation ─────────────────────────────────────────────────────────
function isValidResult(result: unknown): result is StartupEvaluationResult {
  if (!result || typeof result !== 'object') return false
  const r = result as Record<string, unknown>
  return (
    typeof r.overallScore === 'number' &&
    typeof r.ratingLabel === 'string' &&
    typeof r.summary === 'string' &&
    typeof r.scores === 'object' &&
    Array.isArray(r.strengths) &&
    Array.isArray(r.weaknesses) &&
    Array.isArray(r.nextSteps)
  )
}

// ── POST /api/ai/startup-evaluation ──────────────────────────────────────────
export async function POST(req: NextRequest) {
  // 1. Auth
  const uid = await getUidFromRequest(req)
  if (!uid) {
    return NextResponse.json({ error: 'Unauthorized. Sign in to evaluate your startup.' }, { status: 401 })
  }

  // 2. Parse body
  let body: unknown
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body.' }, { status: 400 })
  }

  // 3. Validate input
  if (!validateInput(body)) {
    return NextResponse.json(
      { error: 'Missing required fields: startupName, oneLiner, problem, solution, targetCustomer, targetMarket.' },
      { status: 400 }
    )
  }

  const input = body as StartupEvaluationInput
  const { roomId, startupId } = (body as any)

  // 4. Evaluate
  let result: StartupEvaluationResult
  try {
    result = await evaluateStartupIdea(input)
  } catch (err: any) {
    console.error('[KHOJ AI] evaluateStartupIdea error:', err)
    return NextResponse.json(
      { error: 'Evaluation failed. Please try again or improve your input.' },
      { status: 500 }
    )
  }

  // 5. Validate output
  if (!isValidResult(result)) {
    return NextResponse.json(
      { error: 'Evaluation returned an unexpected format. Please try again.' },
      { status: 500 }
    )
  }

  // 6. Save to Firestore
  try {
    const db = getAdminDb()
    const now = new Date().toISOString()
    const evalRef = db.collection('startupEvaluations').doc()
    const evaluationId = evalRef.id

    const firestoreDoc = {
      evaluationId,
      userId: uid,
      roomId: roomId ?? null,
      startupId: startupId ?? null,
      // input fields
      startupName: input.startupName,
      oneLiner: input.oneLiner,
      category: input.category ?? '',
      stage: input.stage ?? '',
      targetMarket: input.targetMarket,
      problem: input.problem,
      targetCustomer: input.targetCustomer,
      currentAlternatives: input.currentAlternatives ?? '',
      solution: input.solution,
      whyNow: input.whyNow ?? '',
      competitors: input.competitors ?? '',
      differentiation: input.differentiation ?? '',
      revenueModel: input.revenueModel ?? '',
      teamStatus: input.teamStatus ?? '',
      rolesNeeded: input.rolesNeeded ?? '',
      fundingNeeded: input.fundingNeeded ?? '',
      currentTraction: input.currentTraction ?? '',
      mvpPlan: input.mvpPlan ?? '',
      // output fields
      overallScore: result.overallScore,
      ratingLabel: result.ratingLabel,
      confidenceLevel: result.confidenceLevel,
      summary: result.summary,
      scores: result.scores,
      strengths: result.strengths,
      weaknesses: result.weaknesses,
      risks: result.risks,
      nextSteps: result.nextSteps,
      recommendedRoles: result.recommendedRoles,
      suggestedMVP: result.suggestedMVP,
      investorReadiness: result.investorReadiness,
      strategicReport: result.strategicReport,
      visibility: 'private',
      createdAt: now,
      updatedAt: now,
    }

    await evalRef.set(firestoreDoc)

    // If a roomId is provided, also save a summary under rooms/{roomId}/aiEvaluations/{evaluationId}
    if (roomId) {
      await db
        .collection('rooms')
        .doc(String(roomId))
        .collection('aiEvaluations')
        .doc(evaluationId)
        .set({
          evaluationId,
          userId: uid,
          overallScore: result.overallScore,
          ratingLabel: result.ratingLabel,
          confidenceLevel: result.confidenceLevel,
          summary: result.summary,
          createdAt: now,
        })
    }

    return NextResponse.json({ evaluationId, result }, { status: 200 })
  } catch (err: any) {
    console.error('[KHOJ AI] Firestore save error:', err)
    // Return result even if save fails — don't block the founder
    return NextResponse.json({ evaluationId: null, result }, { status: 200 })
  }
}

// ── GET /api/ai/startup-evaluation?roomId=xxx ─────────────────────────────────
export async function GET(req: NextRequest) {
  const uid = await getUidFromRequest(req)
  if (!uid) {
    return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 })
  }

  const { searchParams } = new URL(req.url)
  const roomId = searchParams.get('roomId')
  const evaluationId = searchParams.get('evaluationId')

  try {
    const db = getAdminDb()

    if (evaluationId) {
      const snap = await db.collection('startupEvaluations').doc(evaluationId).get()
      if (!snap.exists) return NextResponse.json({ error: 'Not found.' }, { status: 404 })
      const data = snap.data()!
      // Only owner can read full evaluation
      if (data.userId !== uid) {
        return NextResponse.json({
          evaluationId,
          overallScore: data.overallScore,
          ratingLabel: data.ratingLabel,
          summary: data.summary,
          confidenceLevel: data.confidenceLevel,
          restricted: true,
        })
      }
      return NextResponse.json({ evaluationId, ...data })
    }

    if (roomId) {
      const snap = await db
        .collection('rooms')
        .doc(roomId)
        .collection('aiEvaluations')
        .orderBy('createdAt', 'desc')
        .limit(1)
        .get()
      if (snap.empty) return NextResponse.json({ evaluation: null })
      const doc = snap.docs[0]
      const summaryData = doc.data()

      // If caller is the owner, return full evaluation too
      const fullSnap = await db.collection('startupEvaluations').doc(doc.id).get()
      const fullData = fullSnap.exists ? fullSnap.data() : null
      if (fullData && fullData.userId === uid) {
        return NextResponse.json({ evaluation: { evaluationId: doc.id, ...fullData } })
      }
      return NextResponse.json({ evaluation: { ...summaryData, restricted: true } })
    }

    // Fetch all evaluations for this user
    const snap = await db
      .collection('startupEvaluations')
      .where('userId', '==', uid)
      .orderBy('createdAt', 'desc')
      .limit(20)
      .get()

    const evaluations = snap.docs.map((d) => ({ evaluationId: d.id, ...d.data() }))
    return NextResponse.json({ evaluations })
  } catch (err: any) {
    console.error('[KHOJ AI] GET evaluation error:', err)
    return NextResponse.json({ error: 'Failed to fetch evaluation.' }, { status: 500 })
  }
}
