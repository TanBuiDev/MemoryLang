import { expect, test } from '@playwright/test'

const email = process.env.E2E_EMAIL
const password = process.env.E2E_PASSWORD
const expectedB1SectionCount = 13

test.describe('B1 remote exam release flow', () => {
  test.skip(!email || !password, 'Set E2E_EMAIL and E2E_PASSWORD to run the authenticated B1 release smoke test')

  test('starts a remote attempt, renders every published B1 section, and opens result review after submit', async ({ page }) => {
    await page.goto('/login')
    await page.locator('input[type="email"]').fill(email!)
    await page.locator('input[type="password"]').fill(password!)
    await page.getByRole('button', { name: /login|đăng nhập/i }).first().click()
    await page.waitForURL(/\/app\/(dashboard|exams)/, { timeout: 20_000 })

    await page.goto('/app/exams')
    await page.waitForLoadState('networkidle')
    await page.getByRole('button', { name: 'Bắt đầu đề' }).click()
    await page.waitForURL(/\/app\/exams\/attempt\//, { timeout: 20_000 })

    const sectionButtons = page.locator('aside button').filter({ hasText: /^\d+\./ })
    await expect(sectionButtons).toHaveCount(expectedB1SectionCount)

    for (let index = 0; index < expectedB1SectionCount; index += 1) {
      await sectionButtons.nth(index).click()
      await expect(page.locator('header').getByText(`${index + 1}/${expectedB1SectionCount}`, { exact: false })).toBeVisible()
    }

    await page.getByRole('button', { name: 'Nộp bài & xem đáp án' }).click()
    await page.getByRole('button', { name: 'Nộp bài ngay' }).click()
    await page.waitForURL(/\/app\/exams\/attempt\/[^/]+\/result$/, { timeout: 20_000 })
    await expect(page.getByText(/kết quả|đáp án|điểm/i).first()).toBeVisible()
  })
})
