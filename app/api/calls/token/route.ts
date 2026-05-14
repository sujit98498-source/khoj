// app/api/calls/token/route.ts
// LiveKit token endpoint for peer-to-peer gaming calls (voice + video).
// Used by the KHOJ mobile app. Authenticates via Firebase ID token in Authorization header.
// Separate from the streaming token API so call permissions remain independent.

import { NextRequest, NextResponse } from 'next/server'
import { AccessToken } from 'livekit-server-sdk'
import { getAdminApp } from '@/lib/firebase/admin'
import { getAuth } from 'firebase-admin/auth'

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: CORS_HEADERS })
}

export async function POST(request: NextRequest) {
  try {
    // ── Auth: accept either cookie (web) or Bearer token (mobile) ──────────
    const cookieAuth = request.cookies.get('khoj-auth')?.value === '1'
    const bearerToken = request.headers.get('authorization')?.replace(/^Bearer\s+/i, '').trim()

    let verifiedUid: string | null = null

    if (bearerToken) {
      try {
        const adminApp = getAdminApp()
        const decoded = await getAuth(adminApp).verifyIdToken(bearerToken)
        verifiedUid = decoded.uid
      } catch {
        return NextResponse.json(
          { error: 'Invalid or expired authentication token' },
          { status: 401, headers: CORS_HEADERS },
        )
      }
    } else if (!cookieAuth) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401, headers: CORS_HEADERS },
      )
    }

    // ── Payload ─────────────────────────────────────────────────────────────
    const body = await request.json() as {
      roomName?: unknown
      userId?: unknown
      userName?: unknown
      callType?: unknown
    }

    const roomName = typeof body.roomName === 'string' ? body.roomName.trim() : ''
    const userId   = typeof body.userId   === 'string' ? body.userId.trim()   : (verifiedUid ?? '')
    const userName = typeof body.userName === 'string' ? body.userName.trim() : 'Gamer'

    if (!roomName || !userId) {
      return NextResponse.json(
        { error: 'roomName and userId are required' },
        { status: 400, headers: CORS_HEADERS },
      )
    }

    // ── LiveKit config ───────────────────────────────────────────────────────
    const apiKey    = process.env.LIVEKIT_API_KEY?.trim()
    const apiSecret = process.env.LIVEKIT_API_SECRET?.trim()
    const lkUrl     = process.env.NEXT_PUBLIC_LIVEKIT_URL?.trim()

    if (!apiKey || !apiSecret || !lkUrl) {
      return NextResponse.json(
        { error: 'Voice/video calls are not configured on this server' },
        { status: 503, headers: CORS_HEADERS },
      )
    }

    // ── Generate token ───────────────────────────────────────────────────────
    const at = new AccessToken(apiKey, apiSecret, {
      identity: userId,
      name: userName,
      ttl: '1h',
    })

    at.addGrant({
      room: roomName,
      roomJoin: true,
      canPublish: true,
      canSubscribe: true,
      canPublishData: true,
    })

    return NextResponse.json(
      { token: await at.toJwt(), url: lkUrl },
      { headers: CORS_HEADERS },
    )
  } catch (err) {
    console.error('[calls/token] error:', err)
    return NextResponse.json(
      { error: 'Failed to generate call token' },
      { status: 500, headers: CORS_HEADERS },
    )
  }
}
