import { expect, test } from '@playwright/test'

test.beforeEach(async ({ page }) => {
  await page.goto('./')
  await page.evaluate(() => localStorage.clear())
  await page.reload()
})

test('빠른 추가로 할일을 넣고 완료 표시한 뒤 다른 날로 미룬다', async ({ page }) => {
  await page.getByLabel('우선순위').getByText('A', { exact: true }).click()
  await page.getByRole('textbox', { name: '새 할일' }).fill('보고서 쓰기')
  await page.getByRole('textbox', { name: '새 할일' }).press('Enter')
  await expect(page.getByRole('textbox', { name: '새 할일' })).toHaveValue('')

  await page.getByRole('textbox', { name: '새 할일' }).fill('버튼으로 넣기')
  await page.getByRole('button', { name: '추가', exact: true }).click()
  await expect(page.getByText('버튼으로 넣기')).toBeVisible()
  await page.getByText('버튼으로 넣기').click()
  await page.getByRole('dialog').getByRole('button', { name: '취소' }).click()
  await page.getByRole('button', { name: '더보기' }).nth(1).click()
  await page.getByText('삭제').click()
  await expect(page.getByText('버튼으로 넣기')).toBeHidden()

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

test('장기 할일을 만들면 달력에 막대로 보이고 눌러서 고칠 수 있다', async ({ page }) => {
  await page.getByRole('button', { name: '장기 할일 추가' }).click()
  const dialog = page.getByRole('dialog')
  await dialog.getByLabel('할일').fill('발표 준비')
  await dialog.getByRole('button', { name: '저장' }).click()
  await expect(dialog.getByText('마감일을 골라주세요')).toBeVisible()

  await dialog.getByLabel('마감일').click()
  await page.locator('.ant-picker-dropdown:visible .ant-picker-cell-in-view.ant-picker-cell-today + td').click()
  await dialog.getByRole('button', { name: '저장' }).click()
  await expect(dialog).toBeHidden()

  await page.getByRole('menuitem', { name: '달력' }).click()
  const bar = page.getByRole('button', { name: /발표 준비/ })
  await expect(bar).toBeVisible()
  await expect(page.getByText('D-1')).toBeVisible()
  await bar.click()
  await expect(page.getByRole('dialog').getByLabel('할일')).toHaveValue('발표 준비')
})

test('메모를 쓰자마자 다른 날로 넘어가도 저장된다', async ({ page }) => {
  await page.getByRole('textbox', { name: '메모' }).fill('바로 넘김')
  await page.getByRole('button', { name: '다음날' }).click()
  await page.getByRole('button', { name: '전날' }).click()
  await expect(page.getByRole('textbox', { name: '메모' })).toHaveValue('바로 넘김')
})

test('망가진 저장값이 있어도 앱이 열리고 원본은 따로 보관된다', async ({ page }) => {
  await page.evaluate(() => localStorage.setItem('planner:data', '{"version":1,"tasks":[null'))
  await page.reload()
  await expect(page.getByRole('textbox', { name: '새 할일' })).toBeVisible()
  await page.reload()
  const kept = await page.evaluate(() => Object.keys(localStorage).filter((k) => k.startsWith('planner:data:corrupt-')).length)
  expect(kept).toBe(1)
})

test('목표를 만들고 할일을 연결하면 진행률에 잡힌다', async ({ page }) => {
  await page.getByRole('menuitem', { name: '목표' }).click()
  await page.getByRole('button', { name: '목표 추가' }).click()
  await page.getByRole('dialog').getByLabel('목표', { exact: true }).fill('책 한 권 쓰기')
  await page.getByRole('dialog').getByRole('button', { name: '저장' }).click()
  await expect(page.getByText('0 / 0')).toBeVisible()

  await page.getByRole('menuitem', { name: '하루' }).click()
  await page.getByRole('textbox', { name: '새 할일' }).fill('1장 쓰기')
  await page.getByRole('button', { name: '추가', exact: true }).click()
  await page.getByText('1장 쓰기').click()
  const dialog = page.getByRole('dialog')
  await dialog.getByLabel('목표').click()
  await page.getByTitle('책 한 권 쓰기').click()
  await dialog.getByRole('button', { name: '저장' }).click()
  await page.getByRole('button', { name: '완료로 표시' }).click()

  await page.getByRole('menuitem', { name: '목표' }).click()
  await expect(page.getByText('1 / 1')).toBeVisible()
})

test('빠른 추가에 시간을 쓰면 시간표에 블록이 생기고, A·B·C 를 누르면 우선순위가 바뀐다', async ({ page }) => {
  const input = page.getByRole('textbox', { name: '새 할일' })
  await input.fill('3시 김은우 상담')
  await expect(page.getByText('15:00~16:00 · 김은우 상담')).toBeVisible()
  await input.press('Enter')

  await expect(page.getByRole('button', { name: /김은우 상담.*15:00~16:00/ })).toBeVisible()
  const priority = page.getByRole('button', { name: /우선순위 . 바꾸기/ })
  await expect(priority).toHaveText('B1')
  await priority.click()
  await expect(priority).toHaveText('C1')
  await priority.click()
  await expect(priority).toHaveText('A1')

  // ✕ 를 누르면 시간 없이 들어간다
  await input.fill('4시 전화')
  await page.locator('.ant-tag .ant-tag-close-icon').click()
  await input.press('Enter')
  await expect(page.getByText('4시 전화')).toBeVisible()
})

test('수정 창에서 시간을 정하면 시간표에 올라가고 지우면 내려간다', async ({ page }) => {
  await page.getByRole('textbox', { name: '새 할일' }).fill('보고서')
  await page.getByRole('button', { name: '추가', exact: true }).click()
  await page.getByText('보고서').first().click()
  const dialog = page.getByRole('dialog')
  await dialog.getByPlaceholder('시작').click()
  await dialog.getByPlaceholder('시작').fill('16:00')
  await dialog.getByPlaceholder('끝').click()
  await dialog.getByPlaceholder('끝').fill('17:30')
  await dialog.getByPlaceholder('끝').press('Enter')
  await dialog.getByRole('button', { name: '저장' }).click()
  await expect(page.getByRole('button', { name: /보고서.*16:00~17:30/ })).toBeVisible()

  await page.getByRole('button', { name: /보고서.*16:00~17:30/ }).click()
  await page.getByRole('dialog').locator('.ant-picker-clear').click({ force: true })
  await page.getByRole('dialog').getByRole('button', { name: '저장' }).click()
  await expect(page.getByRole('button', { name: /보고서.*16:00~17:30/ })).toBeHidden()
})
