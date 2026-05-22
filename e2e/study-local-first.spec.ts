import { expect, test } from '@playwright/test'

const email = process.env.E2E_EMAIL
const password = process.env.E2E_PASSWORD

test.describe('Local-first study flow', () => {
  test.skip(!email || !password, 'Set E2E_EMAIL and E2E_PASSWORD to run authenticated study smoke tests')

  test('records review actions without blocking card navigation', async ({ page }) => {
    await page.goto('/login')
    await page.waitForLoadState('networkidle')

    await page.locator('input[type="email"]').fill(email!)
    await page.locator('input[type="password"]').fill(password!)
    await page.getByRole('button', { name: /login|đăng nhập/i }).first().click()
    await page.waitForURL(/\/app\/(dashboard|study|onboarding)/, { timeout: 15000 })

    if (/\/onboarding/.test(page.url())) {
      test.skip(true, 'The configured account has not completed onboarding')
    }

    await page.goto('/app/study')
    await page.waitForLoadState('networkidle')

    const resume = page.getByRole('link', { name: /resume|tiếp tục|học tiếp/i }).first()
    if (await resume.isVisible().catch(() => false)) {
      await resume.click()
    } else {
      await page.getByRole('button', { name: /start session|bắt đầu buổi học/i }).click()
    }
    await page.waitForURL(/\/app\/study\/session\//, { timeout: 15000 })

    const empty = page.getByText(/no vocabulary|chưa có từ|trống/i).first()
    if (await empty.isVisible().catch(() => false)) {
      test.skip(true, 'The configured account has no vocabulary to study')
    }

    await expect(page.getByTestId('study-action-toolbar')).toBeVisible()
    const firstProgress = await page.locator('text=/Thẻ|Card/').first().textContent()
    await page.getByRole('button', { name: /^nhớ$|^remember$/i }).click()

    await page.waitForURL(/\/app\/study(\/session\/.*)?$/, { timeout: 15000 })
    if (/\/app\/study\/session\//.test(page.url())) {
      await expect.poll(async () => page.locator('text=/Thẻ|Card/').first().textContent()).not.toBe(firstProgress)
    }

    if (/\/app\/study\/session\//.test(page.url())) {
      const endButton = page.getByRole('button', { name: /kết thúc|end/i }).first()
      await endButton.click()
      await page.getByRole('button', { name: /kết thúc phiên|end session/i }).click()
      await page.waitForURL(/\/app\/study$/, { timeout: 15000 })
    }

    await page.reload()
    await page.waitForLoadState('networkidle')
    await expect(page.getByRole('button', { name: /start session|bắt đầu buổi học/i })).toBeVisible()
  })
})
