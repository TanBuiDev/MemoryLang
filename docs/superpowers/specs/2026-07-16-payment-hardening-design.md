# Payment Hardening Design

## Goal

Make the existing PayOS subscription payment flow safe enough for the MVP by fixing the Edge Function routing, webhook handling, ownership checks, and idempotency rules without expanding into email, analytics, public pricing, or Team plans.

## Current State

The project already has the core subscription files:

- `supabase/functions/process-payment/index.ts`
- `supabase/migrations/20260715000000_add_subscriptions.sql`
- `src/services/supabase/subscription.service.ts`
- `src/stores/useSubscriptionStore.ts`
- `src/pages/subscription/UpgradePage.tsx`
- `src/components/subscription/PaymentQRModal.tsx`

The flow compiles with `pnpm tsc -b`, but the Edge Function has correctness and security gaps:

- `handleCreate()` reads `req.headers` without receiving `req`.
- PayOS webhooks arrive as `{ code, desc, success, data, signature }`, not `{ action: 'webhook', ... }`.
- `check-status` and `cancel` authenticate that a request has a token but do not prove the payment belongs to that user.
- Duplicate successful webhooks can extend the paid period more than once.
- Cancel only updates local state and does not define what happens if a real PayOS payment later succeeds.

## Scope

In scope:

- Harden the existing `process-payment` Edge Function.
- Preserve the current frontend contract where user actions call `process-payment` with an `action` field.
- Accept real PayOS webhook payloads on the same Edge Function endpoint.
- Add focused helper-level tests where logic can be isolated from Deno/Supabase runtime.
- Add manual verification steps for PayOS production testing.

Out of scope:

- Resend email notifications.
- `pg_cron` expiration reminders.
- Admin subscription management UI.
- Content gating and quota enforcement beyond any payment state dependencies.
- Public `/pricing` page.
- Team plan.

## Endpoint Design

`process-payment` remains the single Edge Function for the MVP.

Request classification:

- `OPTIONS` returns CORS preflight.
- JSON body with `action` is treated as an authenticated app request.
- JSON body with `data` and `signature` and no `action` is treated as a PayOS webhook.
- Anything else returns `400`.

Supported app actions:

- `create`
- `check-status`
- `cancel`
- `cancel-subscription`

Webhook handling does not require a user JWT. It must rely on PayOS signature verification and payment log lookup.

## Create Payment

`create` must:

- Require a valid authenticated Supabase user.
- Accept only `plan = 'pro'`.
- Accept only `cycle = 'monthly' | 'yearly'`.
- Compute amount from server constants only:
  - Monthly: `49000`
  - Yearly: `430000`
- Generate a numeric `orderCode` with low collision risk, for example timestamp plus a short random suffix.
- Generate `returnUrl` and `cancelUrl` from the request origin when available, with a safe fallback from an environment variable such as `SITE_URL`.
- Sign the PayOS create-payment request using `PAYOS_CHECKSUM_KEY`.
- Call PayOS create payment link API with `PAYOS_CLIENT_ID` and `PAYOS_API_KEY`.
- Store a pending row in `payment_logs`.
- Include PayOS identifiers returned by the API in `payment_logs.metadata`, especially `paymentLinkId` if present.
- Return only the fields the UI needs: `checkoutUrl`, `qrCode`, `orderCode`, and `amount`.

Errors must be explicit enough for debugging but must not leak keys or full secret-bearing request data.

## Webhook Processing

The webhook branch must:

- Require `PAYOS_CHECKSUM_KEY`.
- Verify the signature using HMAC-SHA256 over `body.data`, with keys sorted alphabetically and joined as `key=value`.
- Reject invalid signatures with `400` and make no database changes.
- Locate the matching `payment_logs` row by `payos_order_code`.
- Return success without changing subscription dates if the payment log is already `succeeded`.
- Treat the webhook as successful only when:
  - top-level `success === true`,
  - top-level `code === '00'`,
  - `data.code === '00'`.
- Validate the webhook amount against the expected amount derived from `payment_logs.metadata.cycle`.
- Mark `payment_logs.status` as `succeeded` or `failed`.
- Preserve webhook details in `payment_logs.metadata` without discarding existing metadata.
- Upsert `subscriptions` for successful payments:
  - `plan_type = 'pro'`
  - `status = 'active'`
  - `billing_cycle = cycle`
  - `payos_order_code = orderCode`
  - `current_period_start = now`
  - `current_period_end = now + 1 month` for monthly or `now + 12 months` for yearly
  - `cancel_at_period_end = false`
  - `canceled_at = null`
- Update `payment_logs.subscription_id` after the subscription row exists.

Idempotency is mandatory. A repeated successful webhook for the same `orderCode` must not extend the subscription again.

## Status And Cancel

`check-status` must:

- Require a valid authenticated Supabase user.
- Find `payment_logs` by `orderCode`.
- Return `404` if missing.
- Return `403` if the payment log belongs to another user.
- Return the payment status and, when succeeded, the user's subscription.

`cancel` must:

- Require a valid authenticated Supabase user.
- Find `payment_logs` by `orderCode`.
- Return `404` if missing.
- Return `403` if the payment log belongs to another user.
- Only cancel pending payments.
- Attempt to cancel the PayOS payment link when the stored metadata has enough PayOS identifier data and the PayOS API supports the operation.
- Mark local `payment_logs.status = 'cancelled'` only for pending payments.

If a PayOS webhook later reports a real successful payment for a locally cancelled payment, the webhook should prefer the bank-confirmed PayOS result and upgrade the user. This avoids taking money while denying access.

`cancel-subscription` must:

- Require a valid authenticated Supabase user.
- Update only that user's active subscription.
- Set `cancel_at_period_end = true` and `canceled_at = now`.
- Not immediately downgrade access while the current paid period is still valid.

## Data Ownership And Security

All app actions use the request JWT to identify the Supabase user. The Edge Function may use the service role client for database writes, but it must perform explicit ownership checks before returning or mutating user-specific payment rows.

The webhook path must not trust user-controlled fields. It trusts only:

- a valid PayOS signature,
- a known `payos_order_code`,
- an expected amount derived from server-side payment metadata.

No service role key, PayOS API key, or checksum key may be returned to the client or written to logs.

## Testing Strategy

Automated tests should focus on pure helpers extracted from the Edge Function where practical:

- classify request body as app action, webhook, or invalid.
- build PayOS signature payload strings with sorted keys.
- verify valid and invalid webhook signatures.
- compute expected amount from cycle.
- determine whether a webhook is successful.
- enforce idempotency decisions from an existing payment status.

Project verification:

- `pnpm tsc -b`
- `pnpm test` or targeted Vitest tests for new helper modules if added.

Manual verification:

- Missing PayOS env vars returns a controlled error from `create`.
- Authenticated `create` writes one pending `payment_logs` row.
- Webhook with bad signature returns `400` and leaves DB unchanged.
- Valid webhook sample marks payment succeeded and subscription Pro.
- Replaying the same valid webhook does not extend `current_period_end`.
- `check-status` cannot read another user's order.
- `cancel` cannot cancel another user's order.
- PayOS E2E test uses a small real transaction because PayOS has no separate sandbox environment.

## Implementation Boundaries

This hardening should not redesign the UI. `PaymentQRModal` may remain unchanged unless the hardened Edge Function response shape requires a small compatibility fix.

This hardening should not introduce a second Edge Function. A single endpoint keeps deployment and PayOS webhook configuration simple for the MVP.

After implementation, `CLAUDE.md` should be updated to document the subscription/payment system and the PayOS production-test caveat.
