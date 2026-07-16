import { describe, expect, it } from 'vitest'
import {
  buildPayOSSignaturePayload,
  buildPaymentUrls,
  classifyPaymentRequest,
  createPayOSSignature,
  generateOrderCode,
  getPaymentStatusFromWebhook,
  isSupportedBillingCycle,
  isAlreadySucceeded,
  mergePaymentMetadata,
  verifyPayOSSignature,
} from '../../supabase/functions/process-payment/payment-helpers'

describe('process-payment helpers', () => {
  it('classifies app action requests', () => {
    expect(classifyPaymentRequest({ action: 'create', plan: 'pro' })).toBe('app-action')
  })

  it('classifies PayOS webhook requests without action', () => {
    expect(classifyPaymentRequest({
      code: '00',
      desc: 'success',
      success: true,
      data: { orderCode: 123, amount: 49000, code: '00' },
      signature: 'abc',
    })).toBe('payos-webhook')
  })

  it('rejects ambiguous webhook requests that also include action', () => {
    expect(classifyPaymentRequest({
      action: 'webhook',
      data: { orderCode: 123 },
      signature: 'abc',
    })).toBe('invalid')
  })

  it('classifies unrecognized bodies as invalid', () => {
    expect(classifyPaymentRequest({ hello: 'world' })).toBe('invalid')
  })

  it('sorts PayOS signature payload keys alphabetically', () => {
    expect(buildPayOSSignaturePayload({
      orderCode: 123,
      amount: 49000,
      description: 'ML-PRO-M-abc',
    })).toBe('amount=49000&description=ML-PRO-M-abc&orderCode=123')
  })

  it('validates supported billing cycles without hardcoding plan amounts', () => {
    expect(isSupportedBillingCycle('monthly')).toBe(true)
    expect(isSupportedBillingCycle('yearly')).toBe(true)
    expect(isSupportedBillingCycle('weekly')).toBe(false)
  })

  it('maps PayOS webhook status using top-level and data-level success fields', () => {
    expect(getPaymentStatusFromWebhook({
      code: '00',
      success: true,
      data: { code: '00' },
    })).toBe('succeeded')

    expect(getPaymentStatusFromWebhook({
      code: '00',
      success: false,
      data: { code: '00' },
    })).toBe('failed')
  })

  it('detects already-succeeded payment logs for idempotency', () => {
    expect(isAlreadySucceeded('succeeded')).toBe(true)
    expect(isAlreadySucceeded('pending')).toBe(false)
  })

  it('creates and verifies PayOS HMAC signatures', async () => {
    const data = { orderCode: 123, amount: 49000, description: 'ML-PRO-M-abc' }
    const signature = await createPayOSSignature(data, 'secret')

    expect(await verifyPayOSSignature(data, 'secret', signature)).toBe(true)
    expect(await verifyPayOSSignature(data, 'wrong-secret', signature)).toBe(false)
  })

  it('generates numeric order codes with random suffixes', () => {
    expect(generateOrderCode(1721111111111, 0.123)).toBe(1721111111111123)
  })

  it('builds payment URLs from origin or SITE_URL fallback', () => {
    expect(buildPaymentUrls('https://app.example.com/', undefined)).toEqual({
      returnUrl: 'https://app.example.com/app/upgrade/success',
      cancelUrl: 'https://app.example.com/app/upgrade?cancelled=true',
    })

    expect(buildPaymentUrls(null, 'https://memorylang.com')).toEqual({
      returnUrl: 'https://memorylang.com/app/upgrade/success',
      cancelUrl: 'https://memorylang.com/app/upgrade?cancelled=true',
    })
  })

  it('requires an absolute payment URL base', () => {
    expect(() => buildPaymentUrls(null, undefined)).toThrow('SITE_URL must be configured')
    expect(() => buildPaymentUrls(null, '/relative')).toThrow('SITE_URL must be configured')
  })

  it('merges payment metadata without dropping existing fields', () => {
    expect(mergePaymentMetadata(
      { plan: 'pro', cycle: 'monthly' },
      { webhook: { code: '00' } },
    )).toEqual({
      plan: 'pro',
      cycle: 'monthly',
      webhook: { code: '00' },
    })
  })
})
