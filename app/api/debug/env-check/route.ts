import { NextRequest, NextResponse } from 'next/server'

function isPresent(name: string): boolean {
  const value = process.env[name]?.trim() ?? ''
  const normalized = value.toLowerCase()

  return Boolean(
    value &&
      normalized !== 'undefined' &&
      normalized !== 'null' &&
      !normalized.includes('your-') &&
      !normalized.includes('your_') &&
      !normalized.includes('replace-me')
  )
}

function isAuthorized(req: NextRequest): boolean {
  if (process.env.NODE_ENV !== 'production') {
    return true
  }

  const token = process.env.ENV_CHECK_TOKEN?.trim()
  if (!token) {
    return false
  }

  return req.nextUrl.searchParams.get('token') === token || req.headers.get('x-env-check-token') === token
}

export async function GET(req: NextRequest) {
  if (!isAuthorized(req)) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  return NextResponse.json({
    firebaseApiKey: isPresent('NEXT_PUBLIC_FIREBASE_API_KEY'),
    firebaseAuthDomain: isPresent('NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN'),
    firebaseProjectId: isPresent('NEXT_PUBLIC_FIREBASE_PROJECT_ID'),
    firebaseStorageBucket: isPresent('NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET'),
    firebaseMessagingSenderId: isPresent('NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID'),
    firebaseAppId: isPresent('NEXT_PUBLIC_FIREBASE_APP_ID'),
    firebaseAdminProjectId: isPresent('FIREBASE_PROJECT_ID'),
    firebaseAdminClientEmail: isPresent('FIREBASE_CLIENT_EMAIL'),
    firebaseAdminPrivateKey: isPresent('FIREBASE_PRIVATE_KEY'),
    openaiKey: isPresent('OPENAI_API_KEY'),
    khojAiModel: isPresent('KHOJ_AI_MODEL'),
    livekitUrl: isPresent('NEXT_PUBLIC_LIVEKIT_URL'),
    livekitApiKey: isPresent('LIVEKIT_API_KEY'),
    livekitApiSecret: isPresent('LIVEKIT_API_SECRET'),
    appUrl: isPresent('NEXT_PUBLIC_APP_URL'),
    esewaProductCode: isPresent('ESEWA_PRODUCT_CODE'),
    esewaSecretKey: isPresent('ESEWA_SECRET_KEY'),
    esewaGatewayUrl: isPresent('ESEWA_GATEWAY_URL'),
    esewaStatusCheckUrl: isPresent('ESEWA_STATUS_CHECK_URL'),
  })
}
