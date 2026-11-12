import { expect, test } from '@playwright/test'

test.beforeEach(async ({ page }) => {
  await page.goto('./')
  await page.evaluate(() => localStorage.clear())
  await page.reload()
})

test('사용 설명서는 예시 데이터로 진짜 화면을 그리고 번호를 붙이지만 저장된 할일은 건드리지 않는다', async ({ page }) => {
  await page.getByRole('button', { name: '사용 설명서' }).first().click()
  const dialog = page.getByRole('dialog')
  await expect(dialog.getByRole('button', { name: '5. 빠른 추가' })).toBeVisible()

  await dialog.getByRole('button', { name: '빠른 추가', exact: false }).last().click()
  await expect(dialog.getByText('5 / 13')).toBeVisible()

  for (const tab of ['달력', '목표', '설정']) {
    await dialog.locator('.ant-segmented').getByText(tab, { exact: true }).click()
    await expect(dialog.getByRole('button', { name: /^1\. / })).toBeVisible()
  }

  await page.keyboard.press('Escape')
  await expect(page.getByText('할일 없음')).toBeVisible()
  expect(await page.evaluate(() => localStorage.getItem('planner:data'))).toBeNull()
})
