import { expect, test } from '@playwright/test'

test.beforeEach(async ({ page }) => {
  await page.goto('./')
  await page.evaluate(() => localStorage.clear())
  await page.reload()
})

test('? 를 누르면 지금 화면 위에 번호를 달아 하나씩 설명하고, 할일은 건드리지 않는다', async ({ page }) => {
  const input = page.getByRole('textbox', { name: '새 할일' })
  await input.fill('보고서 쓰기')
  await input.press('Enter')
  const saved = await page.evaluate(() => localStorage.getItem('planner:data'))

  await page.getByRole('button', { name: '사용 설명서' }).first().click()
  const callout = page.getByRole('dialog', { name: '화면 바꾸기' })
  await expect(callout).toBeVisible()
  await expect(callout.getByText(/^1 \/ \d+$/)).toBeVisible()

  await callout.getByRole('button', { name: '다음' }).click()
  await expect(page.getByRole('dialog', { name: '날짜 옮기기' })).toBeVisible()

  await page.getByRole('button', { name: /\. 우선순위$/ }).click()
  await expect(page.getByRole('dialog', { name: '우선순위' })).toBeVisible()

  await page.keyboard.press('Escape')
  await expect(page.getByLabel('사용 설명', { exact: true })).toHaveCount(0)
  expect(await page.evaluate(() => localStorage.getItem('planner:data'))).toBe(saved)

  await page.getByRole('menuitem', { name: '달력' }).click()
  await page.getByRole('button', { name: '사용 설명서' }).first().click()
  await expect(page.getByRole('button', { name: /\. 마감 일정$/ })).toBeVisible()
})
