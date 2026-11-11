import { expect, test } from '@playwright/test'

test.beforeEach(async ({ page }) => {
  await page.goto('./')
  await page.evaluate(() => localStorage.clear())
  await page.reload()
})

test('할일을 추가하고 완료 표시한 뒤 다른 날로 미룬다', async ({ page }) => {
  await page.getByRole('button', { name: '할일 추가' }).click()
  const dialog = page.getByRole('dialog')
  await dialog.getByLabel('할일').fill('보고서 쓰기')
  await dialog.getByText('A 반드시').click()
  await dialog.getByRole('button', { name: '저장' }).click()

  const row = page.getByText('보고서 쓰기')
  await expect(row).toBeVisible()
  await expect(page.getByText('A1', { exact: true })).toBeVisible()

  await page.getByRole('button', { name: '완료로 표시' }).click()
  await expect(page.getByText('완료 1 / 1')).toBeVisible()
  await page.getByRole('button', { name: '완료', exact: true }).click()
  await expect(page.getByText('완료 0 / 1')).toBeVisible()

  await page.getByRole('button', { name: '더보기' }).click()
  await page.getByText('미루기 →').click()
  await page.getByRole('dialog').getByRole('button', { name: '내일' }).click()
  await page.getByRole('dialog').getByRole('button', { name: '미루기' }).click()
  await expect(page.getByLabel(/로 미룸$/)).toBeVisible()

  await page.getByRole('button', { name: '다음날' }).click()
  await expect(page.getByText('보고서 쓰기')).toBeVisible()
  await expect(page.getByText(/에서 넘어옴$/)).toBeVisible()
})

test('일정을 추가하고 메모가 새로고침 뒤에도 남는다', async ({ page }) => {
  await page.getByRole('button', { name: '일정 추가' }).first().click()
  const dialog = page.getByRole('dialog')
  await dialog.getByLabel('일정').fill('수업')
  await dialog.getByRole('button', { name: '저장' }).click()
  await expect(page.getByRole('button', { name: /수업/ })).toBeVisible()

  await page.getByRole('textbox', { name: '메모' }).fill('잊지 말 것')
  await page.getByRole('textbox', { name: '메모' }).blur()
  await page.reload()
  await expect(page.getByRole('textbox', { name: '메모' })).toHaveValue('잊지 말 것')
  await expect(page.getByRole('button', { name: /수업/ })).toBeVisible()
})
