// app/api/streams/token/route.ts
// Generates a LiveKit token for stream participants.
// Host gets publish + subscribe. Viewers get subscribe only.
// LIVEKIT_API_SECRET is never exposed to the client.

import { NextRequest, NextResponse } from 'next/server'
import { AccessToken } from 'livekit-server-sdk'

export async function POST(request: NextRequest) {
  try {
    const hasAuthCookie = request.cookies.get('khoj-auth')?.value === '1'
    if (!hasAuthCookie) {
      return NextResponse.json(
        { error: 'Login required to join a stream' },
        { status: 401 }
      )
    }

    const body = await request.json()
    const { roomName, identity, name, role } = body as {
      roomName: string
      identity: string
      name: string
      role: 'host' | 'guest' | 'viewer'
    }

    if (!roomName || !identity || !name) {
      return NextResponse.json(
        { error: 'roomName, identity, and name are required' },
        { status: 400 }
      )
    }

    const apiKey = process.env.LIVEKIT_API_KEY
    const apiSecret = process.env.LIVEKIT_API_SECRET

    if (!apiKey || !apiSecret) {
      return NextResponse.json(
        { error: 'LiveKit credentials are not configured on the server' },
        { status: 500 }
      )
    }

    // host and guest both publish; viewers only subscribe
    const canPublish = role === 'host' || role === 'guest'

    const token = new AccessToken(apiKey, apiSecret, {
      identity,
      name,
      ttl: '4h',
    })

    token.addGrant({
      room: roomName,
      roomJoin: true,
      canPublish: canPublish,
      canPublishData: true,
      canSubscribe: true,
    })

    return NextResponse.json({
      token: await token.toJwt(),
      url: process.env.NEXT_PUBLIC_LIVEKIT_URL,
    })
  } catch (error) {
    console.error('[streams/token] Error:', error)
    return NextResponse.json(
      { error: 'Failed to generate stream token' },
      { status: 500 }
    )
  }
}
