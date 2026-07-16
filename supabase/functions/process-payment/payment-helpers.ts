export type BillingCycle = 'monthly' | 'yearly'
export type PaymentRequestKind = 'app-action' | 'payos-webhook' | 'invalid'
export type PaymentStatus = 'pending' | 'succeeded' | 'failed' | 'cancelled'

export const PRICING = {
  pro: {
    monthly: 49_000,
    yearly: 430_000,
  },
} as const

export function classifyPaymentRequest(body: unknown): PaymentRequestKind {
  if (!body || typeof body !== 'object') return 'invalid'
  const value = body as Record<string, unknown>
  const hasAction = typeof value.action === 'string'
  const hasWebhookShape =
    value.data !== null &&
    typeof value.data === 'object' &&
    typeof value.signature === 'string'

  if (hasAction && !hasWebhookShape) return 'app-action'
  if (!hasAction && hasWebhookShape) return 'payos-webhook'
  return 'invalid'
}

export function getExpectedAmount(cycle: unknown): number | null {
  if (cycle === 'monthly') return PRICING.pro.monthly
  if (cycle === 'yearly') return PRICING.pro.yearly
  return null
}

export function buildPayOSSignaturePayload(data: Record<string, unknown>): string {
  return Object.keys(data)
    .sort()
    .map((key) => `${key}=${formatSignatureValue(data[key])}`)
    .join('&')
}

function formatSignatureValue(value: unknown): string {
  if (value === null || value === undefined) return ''
  return String(value)
}

export async function createPayOSSignature(
  data: Record<string, unknown>,
  checksumKey: string,
): Promise<string> {
  const encoder = new TextEncoder()
  const cryptoKey = await crypto.subtle.importKey(
    'raw',
    encoder.encode(checksumKey),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  )
  const signature = await crypto.subtle.sign(
    'HMAC',
    cryptoKey,
    encoder.encode(buildPayOSSignaturePayload(data)),
  )
  return Array.from(new Uint8Array(signature))
    .map((byte) => byte.toString(16).padStart(2, '0'))
    .join('')
}

export async function verifyPayOSSignature(
  data: Record<string, unknown>,
  checksumKey: string,
  receivedSignature: string,
): Promise<boolean> {
  const expected = await createPayOSSignature(data, checksumKey)
  return timingSafeEqual(expected, receivedSignature)
}

function timingSafeEqual(left: string, right: string): boolean {
  if (left.length !== right.length) return false
  let result = 0
  for (let i = 0; i < left.length; i += 1) {
    result |= left.charCodeAt(i) ^ right.charCodeAt(i)
  }
  return result === 0
}

export function getPaymentStatusFromWebhook(body: {
  code?: unknown
  success?: unknown
  data?: { code?: unknown } | Record<string, unknown>
}): 'succeeded' | 'failed' {
  return body.success === true &&
    body.code === '00' &&
    body.data &&
    typeof body.data === 'object' &&
    (body.data as Record<string, unknown>).code === '00'
    ? 'succeeded'
    : 'failed'
}

export function isAlreadySucceeded(status: unknown): boolean {
  return status === 'succeeded'
}

export function generateOrderCode(
  now = Date.now(),
  random = Math.random(),
): number {
  const suffix = Math.floor(random * 1000).toString().padStart(3, '0')
  return Number(`${now}${suffix}`)
}

export function buildPaymentUrls(origin: string | null, siteUrl: string | undefined) {
  const baseUrl = trimTrailingSlash(origin || siteUrl || '')
  if (!baseUrl || !/^https?:\/\//.test(baseUrl)) {
    throw new Error('SITE_URL must be configured as an absolute URL when request origin is unavailable')
  }
  return {
    returnUrl: `${baseUrl}/app/upgrade/success`,
    cancelUrl: `${baseUrl}/app/upgrade?cancelled=true`,
  }
}

function trimTrailingSlash(value: string) {
  return value.replace(/\/+$/, '')
}

export function mergePaymentMetadata(
  existing: unknown,
  patch: Record<string, unknown>,
): Record<string, unknown> {
  const base =
    existing && typeof existing === 'object' && !Array.isArray(existing)
      ? existing as Record<string, unknown>
      : {}
  return { ...base, ...patch }
}
