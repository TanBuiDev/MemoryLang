# Google OAuth + Password Creation Auth Flow

**Date:** 2026-05-22  
**Status:** Approved, pending implementation

## Summary

Replace dual login methods (email/password + Google OAuth) with a unified flow:  
Google OAuth is the only sign-up method. First-time users must create a password after Google login, enabling future email/password login. Returning users can login via either Google OAuth or email/password.

## Motivation

- Only Google OAuth for sign-up (no email/password registration)
- First-time OAuth users create a password → can later login with email + password
- Existing email/password users are unaffected
- Remove registration page entirely

## Auth Flow

```
NEW USER (first time):
  /login → Google OAuth → /create-password → /onboarding → /app/dashboard

RETURNING USER (has password):
  /login → Email/Password OR Google OAuth → /app/dashboard

RETURNING USER (OAuth only, hasn't set password yet):
  /login → Google OAuth → /create-password → /onboarding → /app/dashboard
```

## ProtectedRoute Decision Tree

```
loading                                    → AppLoading
!user (Supabase configured)                → /login
profile && !profile.onboarding_completed
       && !profile.password_set            → /create-password
profile && !profile.onboarding_completed   → /onboarding
                                           → Outlet (pass)
```

**Note:** `password_set` check only applies when `onboarding_completed == false`. This prevents existing users (who completed onboarding before this migration) from being forced to create a password, since their `password_set` will default to `false`.

## Implementation Plan

### 1. Database Migration

New migration file: `supabase/migrations/YYYYMMDDHHMMSS_add_password_set_to_profiles.sql`

```sql
alter table public.profiles
  add column if not exists password_set boolean not null default false;

create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, display_name, ui_language, password_set)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'name', split_part(new.email, '@', 1)),
    'vi',
    new.encrypted_password is not null
  );
  return new;
end;
$$ language plpgsql security definer set search_path = public;
```

**Logic:** `encrypted_password IS NOT NULL` → user signed up with email/password → `password_set = true`. OAuth users have NULL `encrypted_password` → `password_set = false`.

### 2. Types — `src/types/auth.types.ts`

Add field:
```ts
password_set: boolean
```

### 3. Auth Store — `src/stores/useAuthStore.ts`

No store changes needed. `password_set` is derived from `profile.password_set` directly in ProtectedRoute.

### 4. Auth Service — `src/services/supabase/auth.service.ts`

- **Remove:** `signUpWithPassword`
- **Add:** `setPassword(userId: string, password: string)` method:
  ```ts
  setPassword: async (password: string) => {
    // 1. Update Supabase Auth password
    const { error } = await supabase.auth.updateUser({ password })
    if (error) throw error
  },
  markPasswordSet: async (userId: string) => {
    // 2. Update profiles.password_set
    const { error } = await supabase.from('profiles').update({ password_set: true }).eq('id', userId)
    if (error) throw error
  }
  ```

### 5. Protected Route — `src/app/ProtectedRoute.tsx`

Add `password_set` check between user check and onboarding check:

```tsx
export function ProtectedRoute() {
  const { user, profile, loading } = useAuthStore()

  if (loading) return <AppLoading />
  if (isSupabaseConfigured && !user) return <Navigate to="/login" replace />
  if (profile && !profile.onboarding_completed && !profile.password_set)
    return <Navigate to="/create-password" replace />
  if (profile && !profile.onboarding_completed) return <Navigate to="/onboarding" replace />

  return <Outlet />
}
```

### 6. Routes — `src/app/routes.tsx`

- **Remove:** `/register` route + `RegisterPage` import
- **Add:** `/create-password` route:

```tsx
{ path: '/create-password', element: <CreatePasswordPage /> },
```

### 7. New Page — `src/pages/public/CreatePasswordPage.tsx`

- Form fields: `password` + `confirmPassword` (min 6 chars)
- Validate: passwords match, min length
- On submit: call `authService.setPassword(password)` then `authService.markPasswordSet(user.id)`
- On success: refetch profile into store, then navigate to `/onboarding`
- Error handling: display Supabase error messages (weak password, etc.)
- Styling: same `brand-grid-bg` card layout as LoginPage with BrandLogo/BrandMark
- **Edge case guards:**
  - If no user or not in Supabase mode → redirect to `/login`
  - If profile exists and `password_set == true` → redirect to `/onboarding` (or `/app/dashboard` if also `onboarding_completed`)

### 8. Login Page — `src/pages/public/LoginPage.tsx`

- Keep: email/password form + Google OAuth button
- Remove: "Create account" link (and `/register` reference)
- Keep: "Forgot password?" link

### 9. Delete — `src/pages/public/RegisterPage.tsx`

Remove the file entirely.

### 10. i18n — `src/i18n/index.ts`

Add keys:

```ts
'auth.createPassword': 'Create password',
'auth.createPasswordTitle': 'Set your password',
'auth.createPasswordDescription': 'Create a password so you can also sign in with email later.',
'auth.confirmPassword': 'Confirm password',
'auth.passwordMismatch': 'Passwords do not match',
'auth.passwordCreated': 'Password created',
```

Vietnamese:
```ts
'auth.createPassword': 'Tạo mật khẩu',
'auth.createPasswordTitle': 'Tạo mật khẩu của bạn',
'auth.createPasswordDescription': 'Tạo mật khẩu để sau này có thể đăng nhập bằng email.',
'auth.confirmPassword': 'Xác nhận mật khẩu',
'auth.passwordMismatch': 'Mật khẩu không khớp',
'auth.passwordCreated': 'Đã tạo mật khẩu',
```

Remove keys (no longer used):
```ts
'auth.registerTitle', 'auth.registerDescription', 'auth.register', 'auth.googleRegister', 'auth.registerSuccess', 'auth.alreadyHaveAccount', 'auth.createAccount'
```

### 11. Landing Page — `src/pages/public/LandingPage.tsx`

Check if landing page has any link to `/register` and update to `/login`.

### 12. Demo Mode

Demo mode is unchanged — `demoProfile` gets `password_set: true` so it bypasses the password creation step.

## Files Summary

| File | Action |
|---|---|
| `supabase/migrations/YYYYMMDDHHMMSS_add_password_set_to_profiles.sql` | Create |
| `src/types/auth.types.ts` | Edit (add `password_set`) |
| `src/services/supabase/auth.service.ts` | Edit (remove `signUpWithPassword`, add `setPassword` + `markPasswordSet`) |
| `src/app/ProtectedRoute.tsx` | Edit (add `password_set` check) |
| `src/app/routes.tsx` | Edit (remove `/register`, add `/create-password`) |
| `src/pages/public/CreatePasswordPage.tsx` | Create |
| `src/pages/public/LoginPage.tsx` | Edit (remove register link) |
| `src/pages/public/RegisterPage.tsx` | Delete |
| `src/i18n/index.ts` | Edit (add/remove keys) |
| `src/pages/public/LandingPage.tsx` | Edit (update register links, if any) |
| `src/app/providers.tsx` | Edit (add `password_set` to demoProfile) |

## Not Changed

- `ForgotPasswordPage` — remains unchanged (users with passwords can reset them)
- `OnboardingPage` — remains unchanged
- All other pages and services
- Supabase client config
