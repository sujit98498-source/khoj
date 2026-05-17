// app/api/ai/mvp-builder/route.ts
// KHOJ AI MVP Build Engine — generates a full MVP Build Package using AI.
// Requires authenticated Firebase user.
// Saves result to Firestore khojBuilds collection (via Admin SDK).
// Returns the package even if Firestore save fails (with firestoreSaved: false).

import { NextRequest, NextResponse } from 'next/server'
import { getAdminDb, getAdminAuth } from '@/lib/firebase/admin'
import { createKhojChatCompletion } from '@/lib/ai/openaiClient'
import { toolPrompts } from '@/lib/ai/toolPrompts'

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

// ── Input types ───────────────────────────────────────────────────────────────
interface MvpBuilderInput {
  appName: string
  description: string
  requiresLogin: boolean
  requiresDatabase: boolean
  requiresPayment: boolean
  requiresAI: boolean
}

function validateInput(body: unknown): body is MvpBuilderInput {
  if (!body || typeof body !== 'object') return false
  const b = body as Record<string, unknown>
  return (
    typeof b.appName === 'string' && b.appName.trim().length > 0 &&
    typeof b.description === 'string' && b.description.trim().length > 0
  )
}

// ── Mock fallback (when OpenAI is not configured) ────────────────────────────
function getMockMvpPackage(input: MvpBuilderInput) {
  return {
    blueprint: {
      summary: `${input.appName} is an innovative platform that ${input.description.slice(0, 120)}.`,
      coreProblem: 'Founders lack fast, structured tools to prototype and validate ideas.',
      valueProposition: 'KHOJ AI generates a complete MVP package in seconds, validated by AI.',
      mvpScope: `Core: ${input.requiresLogin ? 'auth, ' : ''}${input.requiresDatabase ? 'database, ' : ''}${input.requiresPayment ? 'payments, ' : ''}${input.requiresAI ? 'AI features, ' : ''}landing page, dashboard.`,
      targetUser: 'Early-stage founders and solo developers who want to launch fast.',
    },
    pages: [
      { name: 'Landing Page', route: '/', description: 'Public homepage with hero, features, and CTA.', components: ['HeroSection', 'FeatureGrid', 'CTABanner'] },
      { name: 'Dashboard', route: '/dashboard', description: 'Main logged-in user workspace.', components: ['StatsCard', 'ActivityFeed', 'QuickActions'] },
      ...(input.requiresLogin ? [{ name: 'Auth', route: '/auth', description: 'Login and signup flows.', components: ['LoginForm', 'SignupForm', 'AuthGuard'] }] : []),
      ...(input.requiresPayment ? [{ name: 'Pricing', route: '/pricing', description: 'Plans and checkout page.', components: ['PricingCard', 'CheckoutButton'] }] : []),
      { name: 'Settings', route: '/settings', description: 'User profile and app configuration.', components: ['ProfileForm', 'SettingsNav'] },
    ],
    components: [
      { name: 'HeroSection', type: 'ui', description: 'Full-width hero with headline and CTA.', props: ['title', 'subtitle', 'ctaText', 'ctaHref'] },
      { name: 'FeatureGrid', type: 'ui', description: '3-column grid of feature cards.', props: ['features'] },
      { name: 'StatsCard', type: 'data', description: 'Metric display card with trend arrow.', props: ['label', 'value', 'trend'] },
      { name: 'ActivityFeed', type: 'data', description: 'Scrollable list of recent activity items.', props: ['items', 'loading'] },
      { name: 'PageLayout', type: 'layout', description: 'Sidebar + main content layout wrapper.', props: ['sidebar', 'children'] },
      { name: 'Button', type: 'ui', description: 'Primary / secondary / ghost button variants.', props: ['variant', 'size', 'onClick', 'disabled'] },
    ],
    firebase: {
      collections: [
        { name: 'users', fields: ['uid', 'email', 'displayName', 'photoURL', 'createdAt', 'role'], rules: 'Owner read/write only.' },
        ...(input.requiresDatabase ? [{ name: 'items', fields: ['id', 'userId', 'title', 'data', 'createdAt', 'updatedAt'], rules: 'Owner CRUD; public read if visible=true.' }] : []),
        ...(input.requiresPayment ? [{ name: 'subscriptions', fields: ['userId', 'plan', 'status', 'stripeCustomerId', 'currentPeriodEnd'], rules: 'Owner read; admin write.' }] : []),
      ],
      auth: input.requiresLogin ? 'Email/Password + Google OAuth.' : 'No auth required for MVP.',
      storage: 'Firebase Storage for user uploads (profile images, documents).',
    },
    generatedFiles: [
      {
        path: 'src/app/page.tsx',
        language: 'typescript',
        description: 'Landing page with hero section and CTA.',
        code: `// Landing Page\nimport Link from 'next/link'\n\nexport default function HomePage() {\n  return (\n    <main className="min-h-screen bg-white">\n      <section className="mx-auto max-w-4xl px-6 py-24 text-center">\n        <h1 className="text-5xl font-bold text-gray-900">${input.appName}</h1>\n        <p className="mt-4 text-xl text-gray-600">${input.description.slice(0, 100)}</p>\n        <Link href="/dashboard" className="mt-8 inline-block rounded bg-blue-600 px-8 py-3 text-white font-semibold hover:bg-blue-700">Get Started</Link>\n      </section>\n    </main>\n  )\n}`,
      },
      {
        path: 'src/app/dashboard/page.tsx',
        language: 'typescript',
        description: 'Main user dashboard page.',
        code: `// Dashboard Page\n'use client'\nimport { useEffect, useState } from 'react'\n\nexport default function DashboardPage() {\n  const [loading, setLoading] = useState(true)\n\n  useEffect(() => { setLoading(false) }, [])\n\n  if (loading) return <div className="p-8">Loading...</div>\n\n  return (\n    <div className="p-8">\n      <h1 className="text-2xl font-bold">Dashboard</h1>\n      <p className="mt-2 text-gray-600">Welcome to ${input.appName}</p>\n    </div>\n  )\n}`,
      },
      {
        path: 'src/lib/firebase/config.ts',
        language: 'typescript',
        description: 'Firebase client configuration.',
        code: `import { initializeApp, getApps } from 'firebase/app'\nimport { getFirestore } from 'firebase/firestore'\nimport { getAuth } from 'firebase/auth'\n\nconst firebaseConfig = {\n  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,\n  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,\n  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,\n}\n\nconst app = getApps().length ? getApps()[0] : initializeApp(firebaseConfig)\nexport const db = getFirestore(app)\nexport const auth = getAuth(app)`,
      },
    ],
    setup: {
      prerequisites: ['Node.js 18+', 'Firebase CLI (npm i -g firebase-tools)', 'Vercel CLI (npm i -g vercel)'],
      steps: [
        'Clone the repository and run `npm install`',
        'Copy `.env.example` to `.env.local` and fill in Firebase credentials',
        'Run `firebase init` to connect to your Firebase project',
        'Run `npm run dev` to start the local development server',
        ...(input.requiresPayment ? ['Set up a Stripe account and add STRIPE_SECRET_KEY to .env.local'] : []),
      ],
      envVars: [
        'NEXT_PUBLIC_FIREBASE_API_KEY',
        'NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN',
        'NEXT_PUBLIC_FIREBASE_PROJECT_ID',
        'FIREBASE_ADMIN_KEY (base64 service account JSON)',
        ...(input.requiresPayment ? ['STRIPE_SECRET_KEY', 'NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY'] : []),
        ...(input.requiresAI ? ['OPENAI_API_KEY'] : []),
      ],
    },
    testing: {
      unitTests: [
        'Test auth flow: sign up, login, logout, password reset.',
        'Test form validation on all input forms.',
        'Test Firestore CRUD operations for core collections.',
      ],
      integrationTests: [
        'End-to-end user registration and onboarding flow.',
        ...(input.requiresPayment ? ['Payment flow: create subscription, webhook handling, cancel.'] : []),
        'Dashboard loads correct data for authenticated user.',
      ],
      manualChecklist: [
        'Mobile responsive layout on iOS Safari and Android Chrome.',
        'Test with slow network (3G throttle in DevTools).',
        'Verify Firestore security rules block unauthorized access.',
        'Check all env vars are set in Vercel project settings.',
      ],
    },
    deploy: {
      platform: 'Vercel',
      steps: [
        'Push code to GitHub repository.',
        'Import project in Vercel dashboard or run `vercel --prod`.',
        'Add all environment variables in Vercel project settings.',
        'Run `firebase deploy --only firestore:rules` to deploy security rules.',
        'Run `firebase deploy --only hosting` if using Firebase Hosting.',
      ],
      checklist: [
        'All env vars set in Vercel project settings.',
        'Firebase Admin key added as FIREBASE_PRIVATE_KEY env var.',
        'Firestore security rules deployed.',
        'Custom domain configured (optional).',
        'Analytics enabled in Vercel dashboard.',
      ],
    },
    finalRecommendation: {
      verdict: 'READY TO BUILD MVP',
      score: 8,
      advice: `${input.appName} has a clear scope. Build the auth and core data model first, then iterate on UI. Launch with a waitlist to validate demand before investing in ${input.requiresPayment ? 'payment infrastructure' : 'advanced features'}.`,
      nextMilestone: 'Get 10 real users to complete the core user journey end-to-end.',
    },
  }
}

// ── POST /api/ai/mvp-builder ──────────────────────────────────────────────────
export async function POST(req: NextRequest) {
  // 1. Auth
  const uid = await getUidFromRequest(req)
  if (!uid) {
    return NextResponse.json({ error: 'Unauthorized. Sign in to generate an MVP package.' }, { status: 401 })
  }

  // 2. Parse + validate body
  let body: unknown
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body.' }, { status: 400 })
  }

  if (!validateInput(body)) {
    return NextResponse.json(
      { error: 'Missing required fields: appName and description are required.' },
      { status: 400 }
    )
  }

  const input = body as MvpBuilderInput

  // 3. Generate MVP package via AI
  let mvpPackage: ReturnType<typeof getMockMvpPackage>
  let modelUsed = 'mock-fallback'

  try {
    const userPrompt = `
App name: ${input.appName}
Description: ${input.description}
Requires login/auth: ${input.requiresLogin ? 'Yes' : 'No'}
Requires database: ${input.requiresDatabase ? 'Yes' : 'No'}
Requires payment: ${input.requiresPayment ? 'Yes' : 'No'}
Requires AI features: ${input.requiresAI ? 'Yes' : 'No'}

Generate a complete MVP Build Package JSON for this app. Follow the exact schema from the system prompt.
    `.trim()

    const result = await createKhojChatCompletion({
      messages: [
        { role: 'system', content: toolPrompts.mvp_builder },
        { role: 'user', content: userPrompt },
      ],
      model: process.env.KHOJ_AI_MODEL ?? 'gpt-4o-mini',
      temperature: 0.7,
      maxTokens: 4000,
    })

    // Extract JSON from the response (may be wrapped in ```json blocks)
    const raw = result.text.trim()
    const jsonMatch = raw.match(/```(?:json)?\s*([\s\S]*?)```/) ?? raw.match(/(\{[\s\S]*\})/)
    const jsonStr = jsonMatch ? jsonMatch[1].trim() : raw

    mvpPackage = JSON.parse(jsonStr)
    modelUsed = process.env.KHOJ_AI_MODEL ?? 'gpt-4o-mini'
  } catch (err) {
    // Fall back to structured mock on any AI or parse error
    console.warn('MVP Builder AI generation failed, using mock fallback:', err instanceof Error ? err.message : err)
    mvpPackage = getMockMvpPackage(input)
    modelUsed = 'mock-fallback'
  }

  // 4. Save to Firestore khojBuilds (via Admin SDK — bypasses client rules)
  let buildId: string | null = null
  let firestoreSaved = false

  try {
    const db = getAdminDb()
    const buildRef = db.collection('khojBuilds').doc()
    buildId = buildRef.id

    await buildRef.set({
      userId: uid,
      appName: input.appName,
      description: input.description,
      requiresLogin: input.requiresLogin ?? false,
      requiresDatabase: input.requiresDatabase ?? false,
      requiresPayment: input.requiresPayment ?? false,
      requiresAI: input.requiresAI ?? false,
      deploymentStatus: 'pending',
      approvalStatus: 'pending',
      buildLogs: '',
      errorLogs: '',
      filesInScope: mvpPackage.generatedFiles?.length ?? 0,
      buildAttempts: 0,
      githubRepo: '',
      branch: '',
      path: '',
      deploymentUrl: null,
      package: mvpPackage,
      modelUsed,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    })

    firestoreSaved = true
  } catch (err) {
    console.error('MVP Builder: Firestore save failed:', err instanceof Error ? err.message : err)
    firestoreSaved = false
  }

  // 5. Return result
  return NextResponse.json({
    ok: true,
    buildId,
    firestoreSaved,
    modelUsed,
    package: mvpPackage,
    warning: firestoreSaved ? null : 'Prototype package generated, but Firestore save failed. Please check rules.',
  })
}
