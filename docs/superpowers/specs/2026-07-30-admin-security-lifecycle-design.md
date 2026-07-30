# Admin Security Lifecycle Design

## Goal

Require every effective administrator to use a linked Google identity and TOTP MFA, record privileged sessions and anomalous sign-ins, notify the affected administrator plus active security recipients, and provide an audited recovery flow.

## Decisions approved by the product owner

- A role can be granted only to an existing MemoryLang user account.
- A user without a verified, linked Google identity or an active TOTP factor receives a pending administrative grant; the grant is not effective until the prerequisites are met.
- Administrative access requires Google OAuth plus MFA AAL2. Password authentication must not establish an effective administrative session.
- A new privileged device/session produces a private security event and transactional email to the affected administrator and every distinct active `super_admin` or `security_admin` recipient.
- One other `super_admin` at AAL2 may reset an administrator's MFA immediately. A super administrator cannot reset their own MFA through this flow.
- Security messages are transactional: they never use reminder preferences or unsubscribe headers.
- Sender: `MemoryLang Security <security@notify.builehoangtan.id.vn>` through the verified Resend domain.

## Architecture

The database owns the authorization state. `admin_role_assignments` gains an explicit activation state derived from account prerequisites, while guarded server-side RPCs ensure the target account exists before a mutation can be staged or activated. Existing permissions continue to derive from active role assignments only.

An Edge Function validates the authenticated Supabase user, Google identity, AAL2 assurance and server-side role/session state before an administrative action. It records a privacy-preserving privileged-session fingerprint and writes append-only security events. Email delivery is queued through a server-only dispatcher; recipients are calculated from active role assignments at event time and deduplicated.

The frontend presents setup-required status without identifying accounts as administrators on public authentication screens. Administrative settings lets a user link Google and enroll TOTP, while the role console displays pending versus active grants and exposes a guarded reset-MFA action only to eligible super administrators.

## Data handling and retention

- Store Supabase `session_id`, a keyed hash of the source IP, and a normalized user-agent/device label; do not persist browser fingerprinting data.
- Show only a masked IP in the administrator UI.
- Keep security events and privileged-session records for 90 days, then purge through a scheduled server-side job.
- Do not place raw IP addresses, secrets, MFA seeds, or reset tokens in email, audit details, or client-visible database rows.

## Error and recovery behavior

- A missing Google link or TOTP factor denies effective administrative access and directs the signed-in user to safe setup steps.
- A password-authenticated session may retain normal learner capabilities but cannot create or use an administrative session.
- MFA reset revokes all Supabase sessions for the target before deleting/enrolling factors, marks the user as MFA-setup-required, emits an audit event and sends private alerts.
- If email dispatch fails, the durable outbox remains pending and retries; the security event and audit record are still retained.

## Verification

- Contract tests prove server-side role activation, MFA reset protections, recipient deduplication, and security-email rendering.
- Browser tests prove pending grants cannot reach admin routes and active Google+AAL2 users can.
- Linked Supabase verification proves migrations, RLS, Edge Function authorization, and Resend delivery with a test-only recipient.
