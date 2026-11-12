import { expect, test } from '@playwright/test'

test.beforeEach(async ({ page }) => {
  await page.goto('./')
  await page.evaluate(() => localStorage.clear())
  await page.reload()
})

test('설명서를 켠 동안만 예시 할일로 화면을 채워 설명하고, 끄면 내 할일이 그대로 돌아온다', async ({ page }) => {
  const input = page.getByRole('textbox', { name: '새 할일' })
  await input.fill('보고서 쓰기')
  await input.press('Enter')
  await page.getByRole('textbox', { name: '메모' }).fill('내 메모')
  await page.getByRole('textbox', { name: '메모' }).blur()
  const saved = await page.evaluate(() => localStorage.getItem('planner:data'))

  await page.getByRole('button', { name: '사용 설명서' }).first().click()
  await expect(page.getByText('학부모 상담').first()).toBeVisible()
  await expect(page.getByText('보고서 쓰기')).toHaveCount(0)
  await expect(page.getByRole('dialog', { name: '화면 바꾸기' })).toBeVisible()
  await expect(page.getByRole('button', { name: /^13\. / })).toBeVisible()

  const bar = page.getByRole('toolbar', { name: '설명 넘기기' })
  await expect(bar.getByText('1 / 13')).toBeVisible()
  await bar.getByRole('button', { name: '다음' }).click()
  await expect(page.getByRole('dialog', { name: '날짜 옮기기' })).toBeVisible()
  await page.getByRole('button', { name: /\. 우선순위$/ }).click()
  await expect(page.getByRole('dialog', { name: '우선순위' })).toBeVisible()

  // 화면 아래쪽 부분으로 넘어가면 애니메이션 없이 바로 스크롤되고 틀도 같이 옮겨 간다
  // 메모 칸은 화면 아래쪽이라 번호가 화면 밖에 있다. 고정된 '다음' 막대로 넘어간다
  for (let i = 0; i < 13 && !(await page.getByRole('dialog', { name: '메모' }).isVisible()); i++) {
    await bar.getByRole('button', { name: '다음' }).click()
  }
  const memo = page.getByRole('textbox', { name: '메모' })
  await expect(page.getByRole('dialog', { name: '메모' })).toBeVisible()
  const view = page.viewportSize()!
  const memoBox = (await memo.boundingBox())!
  expect(memoBox.y + memoBox.height).toBeLessThanOrEqual(view.height)

  // 마지막 번호에서는 '다음'이 꺼지고, 닫기는 옆의 ✕ 로 한다
  await page.getByRole('button', { name: /^13\. / }).click()
  await expect(bar.getByText('13 / 13')).toBeVisible()
  await expect(bar.getByRole('button', { name: '다음' })).toBeDisabled()
  await bar.getByRole('button', { name: '설명 끝내기' }).click()
  await expect(page.getByLabel('사용 설명', { exact: true })).toHaveCount(0)
  await expect(page.getByText('보고서 쓰기')).toBeVisible()
  await expect(page.getByText('학부모 상담')).toHaveCount(0)
  await expect(page.getByRole('textbox', { name: '메모' })).toHaveValue('내 메모')
  expect(await page.evaluate(() => localStorage.getItem('planner:data'))).toBe(saved)

  await page.getByRole('menuitem', { name: '달력' }).click()
  await page.getByRole('button', { name: '사용 설명서' }).first().click()
  await expect(page.getByRole('button', { name: /\. 장기 할일 막대$/ })).toBeVisible()
  await expect(page.getByRole('button', { name: /\. 마감 일정$/ })).toBeVisible()
  await page.keyboard.press('Escape')
  expect(await page.evaluate(() => localStorage.getItem('planner:data'))).toBe(saved)
})
