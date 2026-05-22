import { expect, test } from '@playwright/test'

test.describe('Authentication flow', () => {
  test('login page shows Google OAuth and email/password form', async ({ page }) => {
    await page.goto('/login')
    await page.waitForLoadState('networkidle')

    await expect(page.getByRole('button', { name: /google/i })).toBeVisible()
    await expect(page.locator('input[type="email"]')).toBeVisible()
    await expect(page.locator('input[type="password"]')).toBeVisible()
    await expect(page.getByRole('button', { name: /login|đăng nhập/i }).first()).toBeVisible()
    await expect(page.getByRole('link', { name: /forgot|quên/i })).toBeVisible()
  })

  test('login page has no register link', async ({ page }) => {
    await page.goto('/login')
    await page.waitForLoadState('networkidle')

    await expect(page.getByRole('link', { name: /create account|tạo tài khoản/i })).not.toBeVisible()
  })

  test('/register redirects to /login', async ({ page }) => {
    await page.goto('/register')
    await page.waitForLoadState('networkidle')

    await expect(page).toHaveURL(/\/login/)
  })

  test('landing page CTAs point to login', async ({ page }) => {
    await page.goto('/')
    await page.waitForLoadState('networkidle')

    const startLinks = page.getByRole('link', { name: /bắt đầu|get started|start learning|bắt đầu học/i })
    const count = await startLinks.count()

    for (let i = 0; i < count; i++) {
      const href = await startLinks.nth(i).getAttribute('href')
      expect(href).toBe('/login')
    }
  })

  test('/create-password redirects to /login when not authenticated', async ({ page }) => {
    await page.goto('/create-password')
    await page.waitForLoadState('networkidle')

    await expect(page).toHaveURL(/\/login/)
  })

  test('protected routes redirect to /login when not authenticated', async ({ page }) => {
    await page.goto('/app/dashboard')
    await page.waitForLoadState('networkidle')

    await expect(page).toHaveURL(/\/login/)
  })
})
