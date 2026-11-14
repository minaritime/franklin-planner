import { expect, test, type Page } from '@playwright/test'

// 2026-11-14 (토) 오전으로 고정
const NOW = new Date('2026-11-14T10:00:00')

test.beforeEach(async ({ page }) => {
  await page.clock.setFixedTime(NOW)
  await page.goto('./')
  await page.evaluate(() => localStorage.clear())
  await page.goto('./#/calendar/month/2026-11-14')
})

async function dragTo(page: Page, from: { x: number; y: number }, to: { x: number; y: number }): Promise<void> {
  await page.mouse.move(from.x, from.y)
  await page.mouse.down()
  await page.mouse.move(to.x, to.y, { steps: 12 })
  await page.mouse.up()
}

const center = async (page: Page, selector: string, dx = 0, dy = 0) => {
  const box = (await page.locator(selector).first().boundingBox())!
  return { x: box.x + box.width / 2 + dx, y: box.y + box.height / 2 + dy }
}

test('분류를 만들어 할일에 붙이고, 분류를 끄면 숨고, 끌어서 옮긴 것을 되돌린다', async ({ page }) => {
  await page.getByRole('button', { name: '분류 관리' }).click()
  await page.getByPlaceholder('새 분류 이름').fill('학원')
  await page.getByRole('dialog').getByRole('button', { name: '추가' }).click()
  await expect(page.getByRole('dialog').getByLabel('분류 이름')).toHaveValue('학원')
  await page.keyboard.press('Escape')

  // 빈 날짜 칸을 누르면 그날로 새로 만들기
  await page.locator('[aria-label="2026-11-18"]').click({ position: { x: 60, y: 110 } })
  const drawer = page.locator('.ant-drawer-open')
  await expect(drawer.getByText('새로 만들기')).toBeVisible()
  await drawer.getByRole('textbox', { name: '할일' }).fill('교재 주문')
  await drawer.getByLabel('분류').click()
  await page.locator('.ant-select-item-option').filter({ hasText: '학원' }).click()
  await drawer.getByRole('button', { name: '저장' }).click()

  const chip = page.locator('button[title*="교재 주문"]')
  await expect(chip).toBeVisible()
  await expect(page.getByRole('group', { name: '분류 목록' }).getByText('학원')).toBeVisible()

  // 분류를 끄면 숨고 다시 켜면 나온다
  await page.getByRole('group', { name: '분류 목록' }).getByText('학원').click()
  await expect(chip).toHaveCount(0)
  await page.getByRole('group', { name: '분류 목록' }).getByText('학원').click()
  await expect(chip).toBeVisible()

  // 다른 날로 끌어 옮기기
  await dragTo(page, await center(page, 'button[title*="교재 주문"]'), await center(page, '[aria-label="2026-11-20"]', 0, 30))
  await expect(page.locator('[aria-label="2026-11-20"] button[title*="교재 주문"]')).toBeVisible()

  // Ctrl+Z 로 되돌리기
  await page.locator('body').click({ position: { x: 5, y: 5 } })
  await page.keyboard.press('Control+z')
  await expect(page.locator('[aria-label="2026-11-18"] button[title*="교재 주문"]')).toBeVisible()
})

test('한 줄 입력으로 매주 일정을 만들고, 그중 하루만 지운다', async ({ page }) => {
  await page.keyboard.press('n')
  const drawer = page.locator('.ant-drawer-open')
  await drawer.getByText('일정', { exact: true }).click()
  await drawer.getByLabel('한 줄 입력').fill('매주 화 7시 학부모 미팅')
  await drawer.getByRole('button', { name: '칸 채우기' }).click()
  await expect(drawer.getByLabel('제목')).toHaveValue('학부모 미팅')
  await drawer.getByRole('button', { name: '저장' }).click()

  const meetings = page.locator('button[title*="학부모 미팅"]')
  await expect(meetings).toHaveCount(3) // 11/17, 11/24, 12/1

  await page.locator('[aria-label="2026-11-24"] button[title*="학부모 미팅"]').click()
  await page.locator('.ant-drawer-open').getByRole('button', { name: '삭제' }).click()
  await page.getByRole('dialog', { name: '반복 일정이에요' }).getByRole('button', { name: '이 일정만' }).click()
  await expect(meetings).toHaveCount(2)
  await expect(page.locator('[aria-label="2026-11-24"] button[title*="학부모 미팅"]')).toHaveCount(0)
})

test('보기를 바꾸면 주소에 남고, 주 보기에서 빈 시간을 끌어 일정을 만든다', async ({ page }) => {
  await page.keyboard.press('w')
  await expect(page).toHaveURL(/#\/calendar\/week\/2026-11-14$/)
  await expect(page.getByText('11-08 – 11-14')).toBeVisible()

  const col = (await page.locator('[data-drop-col="2026-11-12"]').boundingBox())!
  const hour = col.height / 24
  await dragTo(page, { x: col.x + 30, y: col.y + hour * 10 + 2 }, { x: col.x + 30, y: col.y + hour * 11.5 })
  const drawer = page.locator('.ant-drawer-open')
  await expect(drawer.getByText('새로 만들기')).toBeVisible()
  await expect(drawer.locator('input[value="10:00"]')).toBeVisible()
  await expect(drawer.locator('input[value="11:30"]')).toBeVisible()
})

test('작은 달력 날짜를 누르면 큰 달력이 그 달로 가고, 시간 없는 기간 일정은 시간 없이 보인다', async ({ page }) => {
  await page.getByRole('button', { name: '작은 달력 다음 달' }).click()
  await page.getByLabel('2026-12-10 큰 달력에서 보기').click()
  await expect(page).toHaveURL(/#\/calendar\/month\/2026-12-10$/)
  await expect(page.getByText('2026년 12월').first()).toBeVisible()

  await page.goto('./#/calendar/month/2026-11-14')
  await page.getByRole('button', { name: '추가' }).first().click()
  const drawer = page.locator('.ant-drawer-open')
  await drawer.getByText('일정', { exact: true }).click()
  await drawer.getByLabel('제목').fill('여행')
  await drawer.locator('.ant-picker').nth(1).click()
  await page.locator('.ant-picker-dropdown:visible td[title="2026-11-18"]').click()
  await drawer.getByRole('button', { name: '저장' }).click()
  const bar = page.locator('button[data-item-key^="event:"]').first()
  await expect(bar).toContainText('여행')
  await expect(bar).not.toContainText('09:00')
})
