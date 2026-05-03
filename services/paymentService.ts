import { PaymentStatus } from '@/lib/types'

interface CreatePendingPaymentResponse {
  paymentId: string
  userId: string
  tournamentId: string
  amount: number
  status: PaymentStatus
  transactionUuid: string
  productCode: string
  createdAt: string
  signature: string
  totalAmount: string
  esewaBaseUrl: string
  successUrl: string
  failureUrl: string
}

interface VerifyPaymentResponse {
  success: boolean
  message: string
  paymentId?: string
  tournamentId?: string
  alreadyJoined?: boolean
}

interface StartTournamentPaymentInput {
  userId: string
  tournamentId: string
  amount: number
}

function buildHiddenInput(name: string, value: string) {
  const input = document.createElement('input')
  input.type = 'hidden'
  input.name = name
  input.value = value
  return input
}

export async function createPendingPayment(
  userId: string,
  tournamentId: string,
  amount: number
): Promise<CreatePendingPaymentResponse> {
  const response = await fetch('/api/payments/initiate', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      userId,
      tournamentId,
      amount,
    }),
  })

  const payload = await response.json().catch(() => null)

  if (!response.ok) {
    throw new Error(typeof payload?.error === 'string' ? payload.error : 'Unable to initialize payment')
  }

  return payload as CreatePendingPaymentResponse
}

export async function generateEsewaSignature(
  totalAmount: string,
  transactionUuid: string,
  productCode: string,
  secretKey: string
): Promise<string> {
  const message = `total_amount=${totalAmount},transaction_uuid=${transactionUuid},product_code=${productCode}`

  if (typeof window === 'undefined') {
    const { createHmac } = await import('crypto')
    return createHmac('sha256', secretKey).update(message).digest('base64')
  }

  const encoder = new TextEncoder()
  const key = await window.crypto.subtle.importKey(
    'raw',
    encoder.encode(secretKey),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  )
  const signature = await window.crypto.subtle.sign('HMAC', key, encoder.encode(message))
  const bytes = Array.from(new Uint8Array(signature), (byte) => String.fromCharCode(byte)).join('')

  return window.btoa(bytes)
}

export async function verifyEsewaPayment(
  transactionUuid: string,
  productCode: string,
  totalAmount: string,
  paymentId?: string
): Promise<VerifyPaymentResponse> {
  const response = await fetch('/api/payments/verify', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      paymentId,
      transactionUuid,
      productCode,
      totalAmount,
    }),
  })

  const payload = await response.json().catch(() => null)

  if (!response.ok) {
    throw new Error(typeof payload?.message === 'string' ? payload.message : 'Payment verification failed')
  }

  return payload as VerifyPaymentResponse
}

export async function markPaymentStatus(paymentId: string, status: PaymentStatus): Promise<void> {
  const response = await fetch('/api/payments/mark-status', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ paymentId, status }),
  })

  if (!response.ok) {
    const payload = await response.json().catch(() => null)
    throw new Error(typeof payload?.error === 'string' ? payload.error : 'Unable to update payment status')
  }
}

export function decodeEsewaSuccessData(encodedData: string | null): Record<string, string> | null {
  if (!encodedData) return null

  try {
    const jsonString = typeof window === 'undefined'
      ? Buffer.from(encodedData, 'base64').toString('utf-8')
      : window.atob(encodedData)

    const parsed = JSON.parse(jsonString)
    return parsed && typeof parsed === 'object' ? parsed as Record<string, string> : null
  } catch (error) {
    console.error('Unable to decode eSewa success payload', error)
    return null
  }
}

export function redirectToEsewaGateway(payment: CreatePendingPaymentResponse) {
  if (typeof document === 'undefined') {
    throw new Error('Payment redirect is only available in the browser')
  }

  const form = document.createElement('form')
  form.method = 'POST'
  form.action = payment.esewaBaseUrl

  const fields: Record<string, string> = {
    amount: payment.totalAmount,
    tax_amount: '0',
    total_amount: payment.totalAmount,
    transaction_uuid: payment.transactionUuid,
    product_code: payment.productCode,
    product_service_charge: '0',
    product_delivery_charge: '0',
    success_url: payment.successUrl,
    failure_url: payment.failureUrl,
    signed_field_names: 'total_amount,transaction_uuid,product_code',
    signature: payment.signature,
  }

  Object.entries(fields).forEach(([name, value]) => {
    form.appendChild(buildHiddenInput(name, value))
  })

  document.body.appendChild(form)
  form.submit()
}

export async function startTournamentEsewaPayment({
  userId,
  tournamentId,
  amount,
}: StartTournamentPaymentInput): Promise<void> {
  if (!userId) {
    throw new Error('Please sign in to continue')
  }

  if (!Number.isFinite(amount) || amount <= 0) {
    throw new Error('Entry fee is not configured for this tournament')
  }

  const payment = await createPendingPayment(userId, tournamentId, amount)
  redirectToEsewaGateway(payment)
}
