// app/api/seed/route.ts
// One-time seed route for development — creates sample tournaments and jobs
// REMOVE or secure this route before production deployment!

import { NextResponse } from 'next/server'
import { getAdminDb } from '@/lib/firebase/admin'
import { COLLECTIONS } from '@/lib/firebase/collections'
import { DEFAULT_JOBS } from '@/services/jobService'

const SAMPLE_TOURNAMENTS = [
  {
    title: 'Web Dev Championship',
    description: 'Build a real-world web application in 48 hours. Judged on code quality, UX, and performance.',
    status: 'active',
    maxPlayers: 32,
    currentPlayers: 0,
    participants: [],
    startDate: new Date().toISOString(),
    endDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
    prizeXP: 200,
    createdBy: 'admin',
    createdAt: new Date().toISOString(),
    category: 'Web Dev',
  },
  {
    title: 'DSA Grind Series',
    description: 'Competitive programming challenge. Solve algorithmic problems under time pressure.',
    status: 'upcoming',
    maxPlayers: 64,
    currentPlayers: 0,
    participants: [],
    startDate: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString(),
    endDate: new Date(Date.now() + 10 * 24 * 60 * 60 * 1000).toISOString(),
    prizeXP: 300,
    createdBy: 'admin',
    createdAt: new Date().toISOString(),
    category: 'DSA',
  },
  {
    title: 'UI/UX Design Clash',
    description: 'Design a complete mobile app from scratch. Figma files required. Judged by industry designers.',
    status: 'upcoming',
    maxPlayers: 24,
    currentPlayers: 0,
    participants: [],
    startDate: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString(),
    endDate: new Date(Date.now() + 12 * 24 * 60 * 60 * 1000).toISOString(),
    prizeXP: 250,
    createdBy: 'admin',
    createdAt: new Date().toISOString(),
    category: 'Design',
  },
  {
    title: 'DevOps Battle',
    description: 'Deploy and manage scalable infrastructure. Kubernetes, CI/CD, and cloud-native tools.',
    status: 'active',
    maxPlayers: 16,
    currentPlayers: 0,
    participants: [],
    startDate: new Date().toISOString(),
    endDate: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString(),
    prizeXP: 180,
    createdBy: 'admin',
    createdAt: new Date().toISOString(),
    category: 'DevOps',
  },
]

export async function POST() {
  try {
    const adminDb = getAdminDb()

    // Check for a secret header in production-ish environments
    const batch = adminDb.batch()

    // Seed tournaments
    let tournamentCount = 0
    for (const tournament of SAMPLE_TOURNAMENTS) {
      const ref = adminDb.collection(COLLECTIONS.TOURNAMENTS).doc()
      batch.set(ref, tournament)
      tournamentCount++
    }

    // Seed jobs
    let jobCount = 0
    for (const job of DEFAULT_JOBS) {
      const ref = adminDb.collection(COLLECTIONS.JOBS).doc()
      batch.set(ref, job)
      jobCount++
    }

    await batch.commit()

    return NextResponse.json({
      success: true,
      message: `Seeded ${tournamentCount} tournaments and ${jobCount} jobs`,
    })
  } catch (error) {
    console.error('Seed error:', error)
    return NextResponse.json({ error: 'Seed failed' }, { status: 500 })
  }
}

export async function GET() {
  return NextResponse.json({
    message: 'Send a POST request to this endpoint to seed data. Remove in production!',
  })
}
