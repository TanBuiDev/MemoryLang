# Payment Hardening Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Harden the existing PayOS subscription payment flow so app actions, PayOS webhooks, status checks, cancellation, and idempotency are safe for the MVP.

**Architecture:** Keep one Supabase Edge Function, `process-payment`, and add a small pure helper module for request classification, PayOS signatures, amount checks, URL building, and idempotency decisions. The Edge Function remains responsible for Supabase auth, service-role database writes, PayOS API calls, and response formatting; tests cover helper behavior with Vitest, while database/payment API behavior is verified manually against Supabase and PayOS.

**Tech Stack:** Supabase Edge Functions (Deno), Supabase JS v2, PayOS payment API, React/Vite caller contract, TypeScript, Vitest, GitNexus.

---

## Source Spec

Design spec: `docs/superpowers/specs/2026-07-16-payment-hardening-design.md`

## File Structure

- Create: `supabase/functions/process-payment/payment-helpers.ts`
  - Pure helper functions shared by the Edge Function and Vitest tests.
  - Must not import Supabase, Deno std, or app aliases.
- Create: `src/test/processPayment.helpers.test.ts`
  - Vitest tests for request classification, signature payloads, signature verification, amount validation, webhook success detection, order code generation, URL fallback, and idempotency rules.
- Create: `supabase/migrations/<generated>_add_payos_webhook_processing_rpc.sql`
  - Atomic Postgres RPC for processing PayOS webhook outcomes without double-extending subscriptions under concurrent webhook delivery.
- Modify: `supabase/functions/process-payment/index.ts`
  - Wire helper functions into the existing Edge Function.
  - Fix request routing, auth ownership checks, webhook idempotency, amount validation, and cancellation behavior.
  - This file is outside `src`, so `pnpm tsc -b` does not fully type-check it unless a `src` test imports the exact module. Use the Edge Function verification step below before claiming it is ready to deploy.
- Modify: `CLAUDE.md`
  - Document the existing subscription/payment system and PayOS production-test caveat after implementation is verified.

No frontend UI redesign is planned. Touch `src/components/subscription/PaymentQRModal.tsx` only if the hardened Edge Function response shape forces a compatibility fix.

## Chunk 1: Helper Extraction And Unit Tests

### Task 1: Add Payment Helper Tests First

**Files:**
- Create: `src/test/processPayment.helpers.test.ts`
- Create later in Task 2: `supabase/functions/process-payment/payment-helpers.ts`

- [ ] **Step 1: Write failing tests for request classification**

Create `src/test/processPayment.helpers.test.ts` with these initial tests:

```ts
import { describe, expect, it } from 'vitest'
import {
  buildPayOSSignaturePayload,
  classifyPaymentRequest,
  getExpectedAmount,
  getPaymentStatusFromWebhook,
  isAlreadySucceeded,
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

  it('computes server-side subscription amounts', () => {
    expect(getExpectedAmount('monthly')).toBe(49000)
    expect(getExpectedAmount('yearly')).toBe(430000)
    expect(getExpectedAmount('weekly')).toBeNull()
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
})
```

- [ ] **Step 2: Run the helper test to verify it fails**

Run:

```powershell
pnpm vitest run src/test/processPayment.helpers.test.ts
```

Expected: FAIL because `payment-helpers.ts` does not exist.

### Task 2: Implement Pure Payment Helpers

**Files:**
- Create: `supabase/functions/process-payment/payment-helpers.ts`
- Test: `src/test/processPayment.helpers.test.ts`

- [ ] **Step 1: Create helper module**

Create `supabase/functions/process-payment/payment-helpers.ts`:

```ts
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
```

- [ ] **Step 2: Run helper tests**

Run:

```powershell
pnpm vitest run src/test/processPayment.helpers.test.ts
```

Expected: PASS for the tests from Task 1.

- [ ] **Step 3: Add signature, URL, and metadata tests**

Append tests:

```ts
import {
  buildPaymentUrls,
  createPayOSSignature,
  generateOrderCode,
  mergePaymentMetadata,
  verifyPayOSSignature,
} from '../../supabase/functions/process-payment/payment-helpers'

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
```

- [ ] **Step 4: Run expanded helper tests**

Run:

```powershell
pnpm vitest run src/test/processPayment.helpers.test.ts
```

Expected: PASS.

- [ ] **Step 5: Commit helper tests and helper module**

Before committing, run:

```powershell
git status --short
git diff -- src/test/processPayment.helpers.test.ts supabase/functions/process-payment/payment-helpers.ts
```

Run GitNexus detect changes before the commit:

```text
detect_changes scope: all, repo: MemoryLang
```

Then:

```powershell
git add -- src/test/processPayment.helpers.test.ts supabase/functions/process-payment/payment-helpers.ts
git commit -m "test: add payment helper coverage"
```

## Chunk 2: Atomic Webhook Database Processing

### Task 3: Add PayOS Webhook Processing RPC

**Files:**
- Create: `supabase/migrations/<generated>_add_payos_webhook_processing_rpc.sql`
- Modify later: `supabase/functions/process-payment/index.ts`

- [ ] **Step 1: Create a migration with the Supabase CLI**

Run:

```powershell
npx supabase migration new add_payos_webhook_processing_rpc
```

Expected: Supabase creates a timestamped SQL file under `supabase/migrations/`. Use that generated filename in the remaining steps.

- [ ] **Step 2: Write the atomic RPC**

In the generated migration, add:

```sql
CREATE UNIQUE INDEX IF NOT EXISTS payment_logs_payos_order_unique_idx
  ON public.payment_logs(payos_order_code)
  WHERE payos_order_code IS NOT NULL;

CREATE OR REPLACE FUNCTION public.process_payos_webhook_payment(
  p_order_code text,
  p_payment_status text,
  p_expected_amount integer,
  p_cycle text,
  p_metadata jsonb,
  p_period_start timestamptz,
  p_period_end timestamptz
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_payment public.payment_logs%ROWTYPE;
  v_subscription_id uuid;
BEGIN
  IF p_payment_status NOT IN ('succeeded', 'failed') THEN
    RAISE EXCEPTION 'Invalid payment status: %', p_payment_status;
  END IF;

  IF p_cycle NOT IN ('monthly', 'yearly') THEN
    RAISE EXCEPTION 'Invalid billing cycle: %', p_cycle;
  END IF;

  SELECT *
  INTO v_payment
  FROM public.payment_logs
  WHERE payos_order_code = p_order_code
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('processed', false, 'reason', 'not_found');
  END IF;

  IF v_payment.status = 'succeeded' THEN
    RETURN jsonb_build_object(
      'processed', false,
      'idempotent', true,
      'subscription_id', v_payment.subscription_id
    );
  END IF;

  IF v_payment.amount <> p_expected_amount THEN
    RETURN jsonb_build_object(
      'processed', false,
      'reason', 'amount_mismatch',
      'expected_amount', v_payment.amount,
      'received_amount', p_expected_amount
    );
  END IF;

  IF p_payment_status = 'failed' THEN
    UPDATE public.payment_logs
    SET status = 'failed',
        metadata = p_metadata
    WHERE id = v_payment.id;

    RETURN jsonb_build_object('processed', true, 'status', 'failed');
  END IF;

  INSERT INTO public.subscriptions (
    user_id,
    plan_type,
    status,
    billing_cycle,
    payos_order_code,
    current_period_start,
    current_period_end,
    cancel_at_period_end,
    canceled_at
  ) VALUES (
    v_payment.user_id,
    'pro',
    'active',
    p_cycle,
    p_order_code,
    p_period_start,
    p_period_end,
    false,
    null
  )
  ON CONFLICT (user_id) DO UPDATE SET
    plan_type = EXCLUDED.plan_type,
    status = EXCLUDED.status,
    billing_cycle = EXCLUDED.billing_cycle,
    payos_order_code = EXCLUDED.payos_order_code,
    current_period_start = EXCLUDED.current_period_start,
    current_period_end = EXCLUDED.current_period_end,
    cancel_at_period_end = EXCLUDED.cancel_at_period_end,
    canceled_at = EXCLUDED.canceled_at;

  SELECT id
  INTO v_subscription_id
  FROM public.subscriptions
  WHERE user_id = v_payment.user_id;

  UPDATE public.payment_logs
  SET status = 'succeeded',
      subscription_id = v_subscription_id,
      metadata = p_metadata
  WHERE id = v_payment.id;

  RETURN jsonb_build_object(
    'processed', true,
    'status', 'succeeded',
    'subscription_id', v_subscription_id
  );
END;
$$;

REVOKE ALL ON FUNCTION public.process_payos_webhook_payment(
  text, text, integer, text, jsonb, timestamptz, timestamptz
) FROM PUBLIC;

GRANT EXECUTE ON FUNCTION public.process_payos_webhook_payment(
  text, text, integer, text, jsonb, timestamptz, timestamptz
) TO service_role;
```

- [ ] **Step 3: Review the migration for security**

Check:

```powershell
git diff -- supabase/migrations
```

Expected:

- Unique partial index enforces one payment row per non-null PayOS order code.
- Function uses `SECURITY DEFINER SET search_path = public`.
- Public execute is revoked.
- Execute is granted only to `service_role`.
- No user-controlled SQL identifiers or dynamic SQL.

- [ ] **Step 4: Commit migration**

Run GitNexus detect changes before commit:

```text
detect_changes scope: all, repo: MemoryLang
```

Then:

```powershell
git add -- supabase/migrations/<generated>_add_payos_webhook_processing_rpc.sql
git commit -m "fix: add atomic PayOS webhook processing"
```

## Chunk 3: Edge Function Routing And Create Payment

### Task 4: Add Pre-Edit Impact Checks

**Files:**
- Inspect: `supabase/functions/process-payment/index.ts`

- [ ] **Step 1: Run GitNexus impact for affected symbols**

Run GitNexus impact before editing the Edge Function symbols:

```text
impact target: handleCreate, file_path: supabase/functions/process-payment/index.ts, direction: upstream
impact target: handleWebhook, file_path: supabase/functions/process-payment/index.ts, direction: upstream
impact target: handleCheckStatus, file_path: supabase/functions/process-payment/index.ts, direction: upstream
impact target: handleCancel, file_path: supabase/functions/process-payment/index.ts, direction: upstream
```

Expected: LOW/UNKNOWN risk is acceptable for this isolated Edge Function. If GitNexus returns HIGH or CRITICAL, pause and report the blast radius before editing.

- [ ] **Step 2: Verify current PayOS and Supabase Edge Function docs**

Before editing payment behavior, check the current primary documentation:

```text
PayOS API docs: https://payos.vn/docs/api/
PayOS webhook docs: https://payos.vn/docs/tich-hop-webhook/
Supabase changelog, Edge Functions tag: https://supabase.com/changelog?tags=edge+functions
```

Expected: confirm the create-payment signature fields, webhook payload shape, cancel endpoint, and whether recent Supabase Edge Function changes affect local verification or deployment. If docs contradict this plan, update the plan or implementation notes before editing.

### Task 5: Wire Request Classification Into `process-payment`

**Files:**
- Modify: `supabase/functions/process-payment/index.ts`
- Use: `supabase/functions/process-payment/payment-helpers.ts`

- [ ] **Step 1: Replace inline pricing/signature code imports**

At the top of `index.ts`, remove:

```ts
import { createHmac } from 'https://deno.land/std@0.168.0/crypto/mod.ts'
```

Add:

```ts
import {
  buildPaymentUrls,
  classifyPaymentRequest,
  createPayOSSignature,
  generateOrderCode,
  getExpectedAmount,
  getPaymentStatusFromWebhook,
  isAlreadySucceeded,
  mergePaymentMetadata,
  verifyPayOSSignature,
} from './payment-helpers.ts'
```

Remove the local `PRICING` constant and `verifyPayOSChecksum()` function from `index.ts`.

- [ ] **Step 2: Route app actions and webhook bodies separately**

Replace the existing `const { action } = body` plus `switch (action)` block with:

```ts
const requestKind = classifyPaymentRequest(body)

if (requestKind === 'payos-webhook') {
  return await handleWebhook(body, supabaseAdmin)
}

if (requestKind !== 'app-action') {
  return jsonResponse({ error: 'Invalid payment request' }, 400)
}

const authHeader = req.headers.get('Authorization')
const origin = req.headers.get('origin')

switch (body.action) {
  case 'create':
    return await handleCreate(body, supabaseAdmin, authHeader, origin)
  case 'check-status':
    return await handleCheckStatus(body, supabaseAdmin, authHeader)
  case 'cancel':
    return await handleCancel(body, supabaseAdmin, authHeader)
  case 'cancel-subscription':
    return await handleCancelSubscription(supabaseAdmin, authHeader)
  default:
    return jsonResponse({ error: `Unknown action: ${body.action}` }, 400)
}
```

- [ ] **Step 3: Run TypeScript build for app/test coverage**

Run:

```powershell
pnpm tsc -b
```

Expected: PASS. Note: this does not fully validate `supabase/functions/process-payment/index.ts` because Edge Functions live outside `src`.

- [ ] **Step 4: Discover the current Supabase function verification command**

Run:

```powershell
npx supabase functions deploy --help
```

Expected: CLI help prints current deploy flags. If a dry-run/bundle/check flag exists, use it later in Task 9. If not, rely on `pnpm tsc -b`, helper tests, careful review, and the real deploy command in Deployment Notes.

### Task 6: Harden `create`

**Files:**
- Modify: `supabase/functions/process-payment/index.ts`

- [ ] **Step 1: Change `handleCreate` signature**

Change:

```ts
async function handleCreate(
  body: { plan: string; cycle: string },
  supabaseAdmin: ReturnType<typeof createClient>,
  authHeader: string | null
)
```

To:

```ts
async function handleCreate(
  body: { plan: string; cycle: string },
  supabaseAdmin: ReturnType<typeof createClient>,
  authHeader: string | null,
  origin: string | null,
)
```

- [ ] **Step 2: Compute amount and URLs through helpers**

Replace the amount/order URL block with:

```ts
const amount = getExpectedAmount(cycle)
if (plan !== 'pro' || amount === null) {
  return jsonResponse({ error: 'Invalid plan or cycle' }, 400)
}

const orderCode = generateOrderCode()
const description = `MLP${String(orderCode).slice(-6)}`
const { returnUrl, cancelUrl } = buildPaymentUrls(origin, Deno.env.get('SITE_URL'))
```

The PayOS `description` is intentionally short and does not include user IDs because PayOS production constraints can be stricter for some bank-account setups. Store full user/plan details only in `payment_logs.metadata`.

- [ ] **Step 3: Sign PayOS request through helper**

Replace the manual HMAC block with:

```ts
const checksumData = {
  amount,
  cancelUrl,
  description,
  orderCode,
  returnUrl,
}
const signature = await createPayOSSignature(checksumData, payosChecksumKey)
```

- [ ] **Step 4: Include PayOS identifiers in metadata**

When inserting `payment_logs`, use:

```ts
const paymentLinkId = payosData.data?.paymentLinkId ?? null

const { error: insertError } = await supabaseAdmin.from('payment_logs').insert({
  user_id: user.id,
  amount,
  payment_method: 'payos',
  payos_order_code: String(orderCode),
  status: 'pending',
  metadata: {
    plan,
    cycle,
    description,
    paymentLinkId,
    checkoutUrl: payosData.data?.checkoutUrl ?? null,
  },
})

if (insertError) {
  console.error('Failed to insert payment log:', insertError.message)
  return jsonResponse({ error: 'Failed to create payment record' }, 500)
}
```

- [ ] **Step 5: Return the existing frontend response shape**

Keep:

```ts
return jsonResponse({
  checkoutUrl: payosData.data.checkoutUrl,
  qrCode: payosData.data.qrCode,
  orderCode: String(orderCode),
  amount,
})
```

- [ ] **Step 6: Run verification**

Run:

```powershell
pnpm vitest run src/test/processPayment.helpers.test.ts
pnpm tsc -b
```

Expected: PASS.

- [ ] **Step 7: Commit routing/create hardening**

Before committing:

```powershell
git status --short
git diff -- supabase/functions/process-payment/index.ts
```

Run GitNexus detect changes before the commit:

```text
detect_changes scope: all, repo: MemoryLang
```

Then:

```powershell
git add -- supabase/functions/process-payment/index.ts
git commit -m "fix: harden PayOS payment creation"
```

## Chunk 4: Webhook Idempotency And Ownership Checks

### Task 7: Harden PayOS Webhook Handling

**Files:**
- Modify: `supabase/functions/process-payment/index.ts`

- [ ] **Step 1: Change webhook signature verification**

Replace:

```ts
if (!verifyPayOSChecksum(body.data, checksumKey, body.signature)) {
```

With:

```ts
if (!await verifyPayOSSignature(body.data, checksumKey, body.signature)) {
```

- [ ] **Step 2: Fetch payment log before updating**

Use:

```ts
const orderCode = String(body.data.orderCode)
const { data: paymentLog, error: paymentLogError } = await supabaseAdmin
  .from('payment_logs')
  .select('id, user_id, subscription_id, amount, status, metadata')
  .eq('payos_order_code', orderCode)
  .maybeSingle()

if (paymentLogError) {
  console.error('Failed to load payment log:', paymentLogError.message)
  return jsonResponse({ error: 'Failed to load payment' }, 500)
}

if (!paymentLog) {
  return jsonResponse({ success: true, ignored: true, reason: 'unknown_order' })
}

if (isAlreadySucceeded(paymentLog.status)) {
  return jsonResponse({ success: true, idempotent: true })
}
```

PayOS sends signed sample webhooks when confirming a webhook URL. Unknown signed orders must be treated as a no-op 2xx response so webhook setup can succeed, while still making no database changes.

- [ ] **Step 3: Validate status and amount**

Use:

```ts
const paymentStatus = getPaymentStatusFromWebhook(body)
const metadata = paymentLog.metadata as Record<string, unknown> | null
const cycle = metadata?.cycle
const expectedAmount = getExpectedAmount(cycle)

if (expectedAmount === null || Number(body.data.amount) !== expectedAmount) {
  console.error('PayOS webhook amount mismatch:', {
    orderCode,
    expectedAmount,
    receivedAmount: body.data.amount,
  })
  return jsonResponse({ error: 'Invalid payment amount' }, 400)
}
```

- [ ] **Step 4: Preserve webhook metadata**

Use:

```ts
const nextMetadata = mergePaymentMetadata(paymentLog.metadata, {
  webhook: body,
  webhook_received_at: new Date().toISOString(),
})
```

- [ ] **Step 5: Process webhook through the atomic RPC**

Use the RPC from Task 3 for both failed and successful webhook outcomes:

```ts
const periodMonths = cycle === 'yearly' ? 12 : 1
const now = new Date()
const periodEnd = new Date(now)
periodEnd.setMonth(periodEnd.getMonth() + periodMonths)

const { data: processResult, error: processError } = await supabaseAdmin.rpc(
  'process_payos_webhook_payment',
  {
    p_order_code: orderCode,
    p_payment_status: paymentStatus,
    p_expected_amount: expectedAmount,
    p_cycle: cycle,
    p_metadata: nextMetadata,
    p_period_start: now.toISOString(),
    p_period_end: periodEnd.toISOString(),
  },
)

if (processError) {
  console.error('Failed to process PayOS webhook:', processError.message)
  return jsonResponse({ error: 'Failed to process webhook' }, 500)
}

if (processResult?.reason === 'amount_mismatch') {
  return jsonResponse({ error: 'Invalid payment amount' }, 400)
}

return jsonResponse({ success: true, result: processResult })
```

- [ ] **Step 6: Run verification**

Run:

```powershell
pnpm vitest run src/test/processPayment.helpers.test.ts
pnpm tsc -b
```

Expected: PASS.

### Task 8: Harden `check-status`, `cancel`, And `cancel-subscription`

**Files:**
- Modify: `supabase/functions/process-payment/index.ts`

- [ ] **Step 1: Add reusable authenticated user helper**

Near the bottom of `index.ts`, add:

```ts
async function getAuthenticatedUser(authHeader: string | null) {
  if (!authHeader) return null

  const userClient = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_ANON_KEY') ?? '',
    { global: { headers: { Authorization: authHeader } } },
  )

  const { data: { user }, error } = await userClient.auth.getUser()
  if (error || !user) return null
  return user
}
```

Refactor `handleCreate` and `handleCancelSubscription` to use this helper instead of duplicating auth client setup.

- [ ] **Step 2: Enforce ownership in `check-status`**

At the start of `handleCheckStatus`, load user:

```ts
const user = await getAuthenticatedUser(authHeader)
if (!user) return jsonResponse({ error: 'Unauthorized' }, 401)
```

After loading `paymentLog`:

```ts
if (paymentLog.user_id !== user.id) {
  return jsonResponse({ error: 'Forbidden' }, 403)
}
```

- [ ] **Step 3: Enforce ownership in `cancel`**

At the start of `handleCancel`, load user, fetch payment log with `id, user_id, status, metadata`, and return:

```ts
if (!paymentLog) return jsonResponse({ error: 'Payment not found' }, 404)
if (paymentLog.user_id !== user.id) return jsonResponse({ error: 'Forbidden' }, 403)
if (paymentLog.status !== 'pending') return jsonResponse({ success: true, status: paymentLog.status })
```

- [ ] **Step 4: Attempt PayOS cancellation best-effort**

If metadata has `paymentLinkId` or `orderCode`, call PayOS cancel endpoint according to the current PayOS docs discovered during implementation. Keep this best-effort:

```ts
try {
  await cancelPayOSPayment(paymentLog.metadata, body.orderCode)
} catch (err) {
  console.warn('PayOS cancel failed; marking local payment cancelled only:', (err as Error).message)
}
```

Add helper in `index.ts`:

```ts
async function cancelPayOSPayment(metadata: unknown, orderCode: string) {
  const payosClientId = Deno.env.get('PAYOS_CLIENT_ID')
  const payosApiKey = Deno.env.get('PAYOS_API_KEY')
  if (!payosClientId || !payosApiKey) return

  const targetId =
    metadata &&
    typeof metadata === 'object' &&
    typeof (metadata as Record<string, unknown>).paymentLinkId === 'string'
      ? (metadata as Record<string, string>).paymentLinkId
      : orderCode

  await fetch(`https://api-merchant.payos.vn/v2/payment-requests/${targetId}/cancel`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-client-id': payosClientId,
      'x-api-key': payosApiKey,
    },
    body: JSON.stringify({
      cancellationReason: 'User requested cancellation',
    }),
  })
}
```

Parse the response. If PayOS returns a JSON body with `code !== '00'`, log the code and desc without secrets, then continue with local pending-cancel handling. If PayOS docs show a different method/path, use the official current method and record that in the implementation notes.

- [ ] **Step 5: Mark local payment cancelled only if pending**

Use:

```ts
await supabaseAdmin
  .from('payment_logs')
  .update({ status: 'cancelled' })
  .eq('id', paymentLog.id)
  .eq('status', 'pending')
```

- [ ] **Step 6: Keep cancel-subscription scoped to the authenticated user**

Ensure `handleCancelSubscription` uses `getAuthenticatedUser()` and keeps:

```ts
.eq('user_id', user.id)
.eq('status', 'active')
```

- [ ] **Step 7: Run verification**

Run:

```powershell
pnpm vitest run src/test/processPayment.helpers.test.ts
pnpm tsc -b
```

Expected: PASS.

- [ ] **Step 8: Commit webhook and ownership hardening**

Before committing:

```powershell
git status --short
git diff -- supabase/functions/process-payment/index.ts
```

Run GitNexus detect changes before the commit:

```text
detect_changes scope: all, repo: MemoryLang
```

Then:

```powershell
git add -- supabase/functions/process-payment/index.ts
git commit -m "fix: harden PayOS webhook ownership checks"
```

## Chunk 5: Documentation, Verification, And Deployment Notes

### Task 9: Update Project Context

**Files:**
- Modify: `CLAUDE.md`

- [ ] **Step 1: Add subscription/payment context**

Add a concise section to `CLAUDE.md` documenting:

```md
### Subscription & Payment
MemoryLang has a Free/Pro subscription system backed by `subscriptions` and `payment_logs`. The MVP PayOS flow uses one Edge Function, `process-payment`, for authenticated app actions and PayOS webhooks. User actions send an `action` field; PayOS webhooks are detected by `{ data, signature }` and verified with `PAYOS_CHECKSUM_KEY`. PayOS does not provide a separate sandbox, so end-to-end payment verification must use a small real transaction.
```

- [ ] **Step 2: Run docs diff**

Run:

```powershell
git diff -- CLAUDE.md
```

Expected: Only the new concise project context section.

### Task 10: Final Automated Verification

**Files:**
- Verify all changed files.

- [ ] **Step 1: Run focused tests**

Run:

```powershell
pnpm vitest run src/test/processPayment.helpers.test.ts
```

Expected: PASS.

- [ ] **Step 2: Run project type-check**

Run:

```powershell
pnpm tsc -b
```

Expected: PASS.

- [ ] **Step 3: Verify Edge Function runtime syntax**

Run:

```powershell
Get-Command deno -ErrorAction SilentlyContinue
```

If Deno is available, run:

```powershell
deno check supabase/functions/process-payment/index.ts
```

Expected: PASS.

If Deno is not available, run:

```powershell
npx supabase functions deploy --help
```

If the help output includes a dry-run or bundle-only verification flag, run the documented command for `process-payment`.

Expected: the function bundles/checks without errors. If neither Deno nor a local Supabase bundle/dry-run command is available, record that local Edge Function runtime verification could not be completed and do not claim the function is deploy-ready until the real deploy command succeeds.

- [ ] **Step 4: Run full test suite if time allows**

Run:

```powershell
pnpm test
```

Expected: PASS. If unrelated existing tests fail, capture exact failing test names and errors before final reporting.

- [ ] **Step 5: Run GitNexus detect changes before final commit**

Run:

```text
detect_changes scope: all, repo: MemoryLang
```

Expected: affected scope is limited to `process-payment`, helper tests, and `CLAUDE.md`. If risk is HIGH or CRITICAL, inspect affected processes before committing.

### Task 11: Commit Documentation And Final State

**Files:**
- Modify: `CLAUDE.md`
- Possibly modified: `supabase/functions/process-payment/index.ts`
- Created: `supabase/functions/process-payment/payment-helpers.ts`
- Created: `src/test/processPayment.helpers.test.ts`

- [ ] **Step 1: Inspect git state and diffs**

Run:

```powershell
git status --short
git diff -- CLAUDE.md supabase/functions/process-payment/index.ts supabase/functions/process-payment/payment-helpers.ts src/test/processPayment.helpers.test.ts
```

- [ ] **Step 2: Commit final docs if previous commits already captured code**

If only `CLAUDE.md` remains:

```powershell
git add -- CLAUDE.md
git commit -m "docs: document PayOS payment flow"
```

If code changes remain because earlier commits were intentionally delayed, split commits by purpose:

```powershell
git add -- supabase/functions/process-payment/index.ts supabase/functions/process-payment/payment-helpers.ts src/test/processPayment.helpers.test.ts
git commit -m "fix: harden PayOS payment processing"

git add -- CLAUDE.md
git commit -m "docs: document PayOS payment flow"
```

## Manual Verification Checklist

Run these after deploying the Edge Function and setting PayOS secrets:

- [ ] Missing `PAYOS_CLIENT_ID`, `PAYOS_API_KEY`, or `PAYOS_CHECKSUM_KEY` returns a controlled `500` from `create`.
- [ ] Authenticated `create` returns `checkoutUrl`, `qrCode`, `orderCode`, and `amount`.
- [ ] Authenticated `create` writes one pending `payment_logs` row for the current user.
- [ ] PayOS webhook with invalid signature returns `400` and leaves `payment_logs` and `subscriptions` unchanged.
- [ ] Valid PayOS webhook sample sets `payment_logs.status = 'succeeded'`.
- [ ] Valid PayOS webhook sample upserts `subscriptions.plan_type = 'pro'`, `status = 'active'`, and a correct `current_period_end`.
- [ ] Replaying the same valid webhook returns success and does not extend `current_period_end`.
- [ ] User A cannot `check-status` for User B's `orderCode`.
- [ ] User A cannot `cancel` User B's `orderCode`.
- [ ] Locally cancelled payment can still upgrade the user if PayOS later sends a valid successful webhook.
- [ ] A small real PayOS payment completes end-to-end; PayOS has no sandbox, so use the smallest acceptable production transaction.

## Deployment Notes

- Apply the RPC migration to the remote production database before deploying the Edge Function. The hardened `process-payment` function calls `process_payos_webhook_payment`, so deploying function code before the migration can break real webhooks.

- Preferred migration order:

```powershell
npx supabase migration list --linked --project-ref brwvbpkgimhamivmaflu
npx supabase db push --project-ref brwvbpkgimhamivmaflu
npx supabase migration list --linked --project-ref brwvbpkgimhamivmaflu
```

- If CLI auth/linking is unavailable, apply the generated SQL migration through the Supabase Dashboard SQL editor or Supabase MCP, then verify the RPC exists before function deployment:

```sql
select to_regprocedure(
  'public.process_payos_webhook_payment(text,text,integer,text,jsonb,timestamptz,timestamptz)'
) is not null as rpc_exists;
```

- Deploy function after code verification:

```powershell
npx supabase functions deploy process-payment --project-ref brwvbpkgimhamivmaflu
```

- Sync secrets after filling `.env`:

```powershell
pnpm sync:secrets
```

- Configure the PayOS webhook URL to the deployed `process-payment` endpoint.
- Do not push automatically after commits; report commit hashes and verification results to the user.
