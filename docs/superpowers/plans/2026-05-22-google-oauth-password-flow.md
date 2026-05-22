# Google OAuth + Password Creation Auth Flow Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace email/password registration with Google OAuth-only signup; add mandatory password creation step for first-time OAuth users so they can later login with email+password.

**Architecture:** Add `password_set` column to `profiles` table with DB trigger auto-detecting signup method. ProtectedRoute checks `password_set` (only when onboarding not completed) to redirect new OAuth users to password creation before onboarding. A new `CreatePasswordPage` handles password setup via Supabase Auth `updateUser`.

**Tech Stack:** Supabase (Postgres + Auth), React 19, TypeScript, react-router-dom v7, Zustand

---

### Task 1: Database Migration

**Files:**
- Create: `supabase/migrations/20260522080000_add_password_set_to_profiles.sql`

- [ ] **Step 1: Create migration file**

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

- [ ] **Step 2: Apply migration to local Supabase**

Run: `npx supabase db push --local`
Expected: Migration applied without errors.

- [ ] **Step 3: Verify column exists**

Run: `npx supabase db dump --local --data-only 2>$null | Select-String "password_set"`
Expected: Shows `password_set` in profiles table definition.

- [ ] **Step 4: Commit**

```bash
git add supabase/migrations/20260522080000_add_password_set_to_profiles.sql
git commit -m "feat: add password_set column to profiles and update handle_new_user trigger"
```

---

### Task 2: Update Profile type

**Files:**
- Modify: `src/types/auth.types.ts`

- [ ] **Step 1: Add password_set to Profile interface**

```ts
import type { LanguageCode } from '@/types/language.types'
import type { StudyMode } from '@/types/study.types'

export type UiLanguageCode = 'vi' | 'en'

export interface Profile {
  id: string
  display_name: string | null
  native_language: LanguageCode
  current_target_language: LanguageCode
  ui_language: UiLanguageCode
  onboarding_completed: boolean
  password_set: boolean
  daily_goal?: number
  default_study_mode?: StudyMode
  created_at: string
  updated_at: string
}
```

- [ ] **Step 2: Verify types compile**

Run: `pnpm exec tsc --noEmit`
Expected: No new type errors from this change (pre-existing errors unrelated to `password_set` may exist).

- [ ] **Step 3: Commit**

```bash
git add src/types/auth.types.ts
git commit -m "feat: add password_set field to Profile type"
```

---

### Task 3: Update Auth Service

**Files:**
- Modify: `src/services/supabase/auth.service.ts:23-24`

- [ ] **Step 1: Remove signUpWithPassword, add setPassword and markPasswordSet**

Remove line 24 (`signUpWithPassword`). Add two new methods:

```ts
setPassword: async (password: string) => {
  const { error } = await supabase.auth.updateUser({ password })
  if (error) throw error
},
markPasswordSet: async (userId: string) => {
  const { error } = await supabase
    .from('profiles')
    .update({ password_set: true })
    .eq('id', userId)
  if (error) throw error
},
```

- [ ] **Step 2: Remove unused `signUpWithPassword` export**

The full `authService` object after changes:

```ts
export const authService = {
  getSession: () => supabase.auth.getSession(),
  onAuthStateChange: (callback: (event: AuthChangeEvent, session: Session | null) => void) =>
    supabase.auth.onAuthStateChange((event, session) => {
      callback(event, session)
      return Promise.resolve()
    }),
  signInWithPassword: (email: string, password: string) => supabase.auth.signInWithPassword({ email, password }),
  signInWithGoogle: () =>
    supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: `${window.location.origin}/app/dashboard` },
    }),
  resetPassword: (email: string) =>
    supabase.auth.resetPasswordForEmail(email, { redirectTo: `${window.location.origin}/login` }),
  signOut: () => supabase.auth.signOut(),
  setPassword: async (password: string) => {
    const { error } = await supabase.auth.updateUser({ password })
    if (error) throw error
  },
  markPasswordSet: async (userId: string) => {
    const { error } = await supabase
      .from('profiles')
      .update({ password_set: true })
      .eq('id', userId)
    if (error) throw error
  },
  async getProfile(userId: string): Promise<Profile | null> {
    const { data, error } = await supabase.from('profiles').select('*').eq('id', userId).maybeSingle()
    if (error) throw error
    return data as Profile | null
  },
  // ... completeOnboarding and updateProfile unchanged
}
```

- [ ] **Step 3: Commit**

```bash
git add src/services/supabase/auth.service.ts
git commit -m "feat: replace signUpWithPassword with setPassword and markPasswordSet"
```

---

### Task 4: Update ProtectedRoute

**Files:**
- Modify: `src/app/ProtectedRoute.tsx`

- [ ] **Step 1: Add password_set check**

```tsx
import { Navigate, Outlet } from 'react-router-dom'
import { AppLoading } from '@/components/common/AppLoading'
import { isSupabaseConfigured } from '@/services/supabase/client'
import { useAuthStore } from '@/stores/useAuthStore'

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

- [ ] **Step 2: Verify TypeScript compiles**

Run: `pnpm exec tsc --noEmit`
Expected: No errors related to ProtectedRoute.

- [ ] **Step 3: Commit**

```bash
git add src/app/ProtectedRoute.tsx
git commit -m "feat: add password_set gate to ProtectedRoute before onboarding"
```

---

### Task 5: Update Routes

**Files:**
- Modify: `src/app/routes.tsx`

- [ ] **Step 1: Remove RegisterPage import, add CreatePasswordPage import**

```tsx
import { Navigate, createBrowserRouter } from 'react-router-dom'
import { AppLayout } from '@/components/layout/AppLayout'
import { ProtectedRoute } from '@/app/ProtectedRoute'
import { DashboardPage } from '@/pages/dashboard/DashboardPage'
import { DeckDetailPage } from '@/pages/decks/DeckDetailPage'
import { DeckListPage } from '@/pages/decks/DeckListPage'
import { OnboardingPage } from '@/pages/onboarding/OnboardingPage'
import { ForgotPasswordPage } from '@/pages/public/ForgotPasswordPage'
import { LandingPage } from '@/pages/public/LandingPage'
import { LoginPage } from '@/pages/public/LoginPage'
import { CreatePasswordPage } from '@/pages/public/CreatePasswordPage'
import { QuizResultPage } from '@/pages/quiz/QuizResultPage'
// ... rest of imports unchanged
```

Also remove line 11: `import { RegisterPage } from '@/pages/public/RegisterPage'`

- [ ] **Step 2: Update route definitions**

Remove the `/register` route and add `/create-password`:

```tsx
export const router = createBrowserRouter([
  { path: '/', element: <LandingPage /> },
  { path: '/login', element: <LoginPage /> },
  { path: '/forgot-password', element: <ForgotPasswordPage /> },
  { path: '/create-password', element: <CreatePasswordPage /> },
  { path: '/onboarding', element: <OnboardingPage /> },
  {
    element: <ProtectedRoute />,
    children: [
      // ... all protected routes unchanged
    ],
  },
])
```

- [ ] **Step 3: Commit**

```bash
git add src/app/routes.tsx
git commit -m "feat: add /create-password route, remove /register route"
```

---

### Task 6: Create CreatePasswordPage

**Files:**
- Create: `src/pages/public/CreatePasswordPage.tsx`

- [ ] **Step 1: Write the page**

```tsx
import { useState, type FormEvent } from 'react'
import { useNavigate, Navigate } from 'react-router-dom'
import { BrandLogo, BrandMark } from '@/components/common/BrandLogo'
import { Button } from '@/components/ui/button'
import { Card, CardDescription, CardTitle } from '@/components/ui/card'
import { Input, Label } from '@/components/ui/input'
import { useI18n } from '@/i18n'
import { authService } from '@/services/supabase/auth.service'
import { isSupabaseConfigured } from '@/services/supabase/client'
import { useAuthStore } from '@/stores/useAuthStore'

export function CreatePasswordPage() {
  const navigate = useNavigate()
  const { t } = useI18n()
  const user = useAuthStore((state) => state.user)
  const profile = useAuthStore((state) => state.profile)
  const setProfile = useAuthStore((state) => state.setProfile)
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [message, setMessage] = useState('')
  const [isError, setIsError] = useState(false)

  if (!isSupabaseConfigured || !user) return <Navigate to="/login" replace />
  if (profile?.password_set && profile?.onboarding_completed) return <Navigate to="/app/dashboard" replace />
  if (profile?.password_set) return <Navigate to="/onboarding" replace />

  async function submit(event: FormEvent) {
    event.preventDefault()
    setMessage('')

    if (password.length < 6) {
      setMessage(t('auth.passwordMinLength'))
      setIsError(true)
      return
    }
    if (password !== confirmPassword) {
      setMessage(t('auth.passwordMismatch'))
      setIsError(true)
      return
    }

    try {
      await authService.setPassword(password)
      await authService.markPasswordSet(user!.id)
      const updated = await authService.getProfile(user!.id)
      if (updated) setProfile(updated)
      navigate('/onboarding')
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Failed to set password')
      setIsError(true)
    }
  }

  return (
    <main className="brand-grid-bg grid min-h-screen place-items-center bg-background px-4 py-8">
      <Card className="relative w-full max-w-md overflow-hidden p-6">
        <div className="absolute -right-10 -top-10 opacity-10">
          <BrandMark size="xl" label="" className="h-36 w-36" />
        </div>
        <BrandLogo variant="compact" size="lg" className="relative mb-6 h-12" />
        <CardTitle>{t('auth.createPasswordTitle')}</CardTitle>
        <CardDescription className="mt-2">{t('auth.createPasswordDescription')}</CardDescription>
        <form className="mt-6 grid gap-4" onSubmit={submit}>
          <div>
            <Label>{t('auth.password')}</Label>
            <Input
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              type="password"
              minLength={6}
            />
          </div>
          <div>
            <Label>{t('auth.confirmPassword')}</Label>
            <Input
              value={confirmPassword}
              onChange={(event) => setConfirmPassword(event.target.value)}
              type="password"
              minLength={6}
            />
          </div>
          <Button type="submit">{t('auth.createPassword')}</Button>
        </form>
        {message ? (
          <p className={`mt-3 text-sm font-bold ${isError ? 'text-danger' : ''}`}>{message}</p>
        ) : null}
      </Card>
    </main>
  )
}
```

- [ ] **Step 2: Verify TypeScript compiles**

Run: `pnpm exec tsc --noEmit`
Expected: No errors from CreatePasswordPage.

- [ ] **Step 3: Commit**

```bash
git add src/pages/public/CreatePasswordPage.tsx
git commit -m "feat: add CreatePasswordPage for first-time OAuth password setup"
```

---

### Task 7: Remove register link from LoginPage

**Files:**
- Modify: `src/pages/public/LoginPage.tsx:48`

- [ ] **Step 1: Remove "Create account" link**

Change line 48 from:
```tsx
<Link className="underline" to="/forgot-password">{t('auth.forgotPassword')}</Link> · <Link className="underline" to="/register">{t('auth.createAccount')}</Link>
```
To:
```tsx
<Link className="underline" to="/forgot-password">{t('auth.forgotPassword')}</Link>
```

- [ ] **Step 2: Commit**

```bash
git add src/pages/public/LoginPage.tsx
git commit -m "feat: remove create-account link from login page"
```

---

### Task 8: Delete RegisterPage

**Files:**
- Delete: `src/pages/public/RegisterPage.tsx`

- [ ] **Step 1: Delete the file**

```bash
Remove-Item -LiteralPath "src/pages/public/RegisterPage.tsx"
```

- [ ] **Step 2: Verify no remaining imports of RegisterPage**

Run: `rg "RegisterPage" src/`
Expected: No matches (except possibly in test files or other non-import contexts — verify each remaining match is not an import).

- [ ] **Step 3: Commit**

```bash
git add src/pages/public/RegisterPage.tsx
git commit -m "feat: remove RegisterPage"
```

---

### Task 9: Update LandingPage links

**Files:**
- Modify: `src/pages/public/LandingPage.tsx`

- [ ] **Step 1: Replace all /register links with /login**

There are 4 occurrences of `<Link to="/register">` at lines 77, 106, 280 (plus possibly a nav link). Replace each:
- `<Link to="/register">` → `<Link to="/login">`

The lines will change from:
```tsx
<Button asChild><Link to="/register">{t('landing.getStarted')}</Link></Button>
```
To:
```tsx
<Button asChild><Link to="/login">{t('landing.getStarted')}</Link></Button>
```

And:
```tsx
<Button asChild><Link to="/register">{t('landing.startLearning')} <ArrowRight size={18} /></Link></Button>
```
To:
```tsx
<Button asChild><Link to="/login">{t('landing.startLearning')} <ArrowRight size={18} /></Link></Button>
```

- [ ] **Step 2: Verify no remaining /register links**

Run: `Select-String -Path "src/pages/public/LandingPage.tsx" -Pattern "/register"`
Expected: No matches.

- [ ] **Step 3: Commit**

```bash
git add src/pages/public/LandingPage.tsx
git commit -m "feat: update landing page register links to login"
```

---

### Task 10: Update i18n translations

**Files:**
- Modify: `src/i18n/index.ts`

- [ ] **Step 1: Add new keys to both `en` and `vi` sections**

Add to `en` block:
```ts
'auth.createPasswordTitle': 'Set your password',
'auth.createPasswordDescription': 'Create a password so you can also sign in with email later.',
'auth.confirmPassword': 'Confirm password',
'auth.passwordMismatch': 'Passwords do not match',
'auth.passwordMinLength': 'Password must be at least 6 characters',
```

Add to `vi` block:
```ts
'auth.createPasswordTitle': 'Tạo mật khẩu của bạn',
'auth.createPasswordDescription': 'Tạo mật khẩu để sau này có thể đăng nhập bằng email.',
'auth.confirmPassword': 'Xác nhận mật khẩu',
'auth.passwordMismatch': 'Mật khẩu không khớp',
'auth.passwordMinLength': 'Mật khẩu phải có ít nhất 6 ký tự',
```

- [ ] **Step 2: Remove unused register keys from both sections**

Remove from both `en` and `vi` blocks:
```ts
'auth.registerTitle'
'auth.registerDescription'
'auth.register'
'auth.googleRegister'
'auth.registerSuccess'
'auth.alreadyHaveAccount'
'auth.createAccount'
```

- [ ] **Step 3: Verify no remaining references to removed i18n keys**

Run: `rg "auth\.registerTitle|auth\.registerDescription|auth\.register[^T]|auth\.googleRegister|auth\.registerSuccess|auth\.alreadyHaveAccount|auth\.createAccount" src/`
Expected: No matches.

- [ ] **Step 4: Commit**

```bash
git add src/i18n/index.ts
git commit -m "feat: add create-password i18n keys, remove register keys"
```

---

### Task 11: Update demoProfile in providers

**Files:**
- Modify: `src/app/providers.tsx:8-19`

- [ ] **Step 1: Add password_set to demoProfile**

Change the `demoProfile` object:
```ts
const demoProfile: Profile = {
  id: 'demo-user',
  display_name: 'MemoryLang Learner',
  native_language: 'vi',
  current_target_language: 'en',
  ui_language: 'vi',
  onboarding_completed: true,
  password_set: true,
  daily_goal: 10,
  default_study_mode: 'two_side',
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
}
```

- [ ] **Step 2: Commit**

```bash
git add src/app/providers.tsx
git commit -m "feat: add password_set to demo profile"
```

---

### Task 12: Final verification

- [ ] **Step 1: TypeScript check**

Run: `pnpm exec tsc --noEmit`
Expected: No new type errors.

- [ ] **Step 2: Lint check**

Run: `pnpm lint`
Expected: No new lint errors.

- [ ] **Step 3: Build check**

Run: `pnpm build`
Expected: Build succeeds.

- [ ] **Step 4: Test run**

Run: `pnpm test`
Expected: All tests pass.

