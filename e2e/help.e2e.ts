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
  await expect(page.getByRole('button', { name: /^12\. / })).toBeVisible()

  const bar = page.getByRole('toolbar', { name: '설명 넘기기' })
  await expect(bar.getByText('1 / 12')).toBeVisible()
  await bar.getByRole('button', { name: '다음' }).click()
  await expect(page.getByRole('dialog', { name: '날짜 옮기기' })).toBeVisible()
  await page.getByRole('button', { name: /\. 우선순위$/ }).click()
  await expect(page.getByRole('dialog', { name: '우선순위' })).toBeVisible()

  // 화면 아래쪽 부분으로 넘어가면 애니메이션 없이 바로 스크롤되고 틀도 같이 옮겨 간다
  // 메모 칸은 화면 아래쪽이라 번호가 화면 밖에 있다. 고정된 '다음' 막대로 넘어간다
  for (let i = 0; i < 12 && !(await page.getByRole('dialog', { name: '메모' }).isVisible()); i++) {
    await bar.getByRole('button', { name: '다음' }).click()
  }
  const memo = page.getByRole('textbox', { name: '메모' })
  await expect(page.getByRole('dialog', { name: '메모' })).toBeVisible()
  const view = page.viewportSize()!
  const memoBox = (await memo.boundingBox())!
  expect(memoBox.y + memoBox.height).toBeLessThanOrEqual(view.height)

  // 마지막 번호에서는 '다음'이 꺼지고, 닫기는 옆의 ✕ 로 한다
  await page.getByRole('button', { name: /^12\. / }).click()
  await expect(bar.getByText('12 / 12')).toBeVisible()
  await expect(bar.getByRole('button', { name: '다음' })).toBeDisabled()
  await bar.getByRole('button', { name: '설명 끝내기' }).click()
  await expect(page.getByLabel('사용 설명', { exact: true })).toHaveCount(0)
  await expect(page.getByText('보고서 쓰기')).toBeVisible()
  await expect(page.getByText('학부모 상담')).toHaveCount(0)
  await expect(page.getByRole('textbox', { name: '메모' })).toHaveValue('내 메모')
  expect(await page.evaluate(() => localStorage.getItem('planner:data'))).toBe(saved)

  await page.getByRole('menuitem', { name: '달력' }).click()
  await page.getByRole('button', { name: '사용 설명서' }).first().click()
  // 하루 화면에서 아래로 내린 채 넘어와 위쪽 번호는 화면 밖일 수 있다. '다음'으로 넘겨서 찾는다
  for (let i = 0; i < 10 && !(await page.getByRole('dialog', { name: '분류 목록' }).isVisible()); i++) {
    await bar.getByRole('button', { name: '다음' }).click()
  }
  await expect(page.getByRole('dialog', { name: '분류 목록' })).toBeVisible()
  await expect(page.getByRole('button', { name: /\. 할일·일정$/ })).toBeVisible()
  await expect(page.getByRole('button', { name: /\. 마감 일정$/ })).toBeVisible()
  await page.keyboard.press('Escape')
  expect(await page.evaluate(() => localStorage.getItem('planner:data'))).toBe(saved)
})

test('달력 설명서 번호는 월 보기 기준으로 고정이고, 주 보기에서 켜면 주 설명 번호부터 시작한다', async ({ page }) => {
  await page.goto('./#/calendar/week/2026-11-18')
  await page.getByRole('button', { name: '사용 설명서' }).first().click()
  const bar = page.getByRole('toolbar', { name: '설명 넘기기' })
  // 월 보기 묶음(월 2 + 공통 11) 다음이 주 보기 첫 설명
  await expect(page.getByRole('dialog', { name: '요일' })).toBeVisible()
  await expect(bar).toContainText('14 / 22')
  await expect(page.getByRole('button', { name: '14. 요일' })).toBeVisible()

  // 다음으로 끝까지: 일, 목록 순
  const views: string[] = []
  for (let i = 0; i < 40 && !(await bar.getByRole('button', { name: '다음' }).isDisabled()); i++) {
    await bar.getByRole('button', { name: '다음' }).click()
    const view = page.url().match(/#\/calendar\/(\w+)\//)?.[1]
    if (view && views.at(-1) !== view) views.push(view)
  }
  expect(views).toEqual(['week', 'day', 'agenda'])
  await expect(bar).toContainText('22 / 22')

  // 이전으로 처음까지: 월 보기로 바뀌고 1번이 나온다
  for (let i = 0; i < 40 && !(await bar.getByRole('button', { name: '이전' }).isDisabled()); i++) {
    await bar.getByRole('button', { name: '이전' }).click()
  }
  await expect(page).toHaveURL(/#\/calendar\/month\/2026-11-18$/)
  await expect(bar).toContainText('1 / 22')
  await expect(page.getByRole('dialog', { name: '날짜 칸' })).toBeVisible()

  await bar.getByRole('button', { name: '설명 끝내기' }).click()
  await expect(page).toHaveURL(/#\/calendar\/week\/2026-11-18$/)
})

test('달력 설명서를 일·목록 보기에서 켜면 그 보기 설명 번호부터 시작한다', async ({ page }) => {
  const bar = page.getByRole('toolbar', { name: '설명 넘기기' })
  await page.goto('./#/calendar/day/2026-11-18')
  await page.getByRole('button', { name: '사용 설명서' }).first().click()
  await expect(page.getByRole('dialog', { name: '종일 칸' })).toBeVisible()
  await expect(bar).toContainText('18 / 22')
  await bar.getByRole('button', { name: '설명 끝내기' }).click()

  await page.goto('./#/calendar/agenda/2026-11-18')
  await page.getByRole('button', { name: '사용 설명서' }).first().click()
  await expect(page.getByRole('dialog', { name: '날짜별 목록' })).toBeVisible()
  await expect(bar).toContainText('21 / 22')
})

test('설명서에서 점선 칸을 누르면 그 칸 설명으로 바로 간다 (안쪽 작은 칸이 먼저 눌린다)', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 860 })
  // 월 보기: 작은 달력 칸 가운데를 누른다
  await page.goto('./#/calendar/month/2026-11-18')
  await page.getByRole('button', { name: '사용 설명서' }).first().click()
  await expect(page.getByRole('dialog', { name: '날짜 칸' })).toBeVisible()
  const mini = await page.locator('.ant-card', { has: page.getByLabel('작은 달력 이전 달') }).boundingBox()
  if (!mini) throw new Error('작은 달력이 안 보임')
  await page.mouse.click(mini.x + mini.width / 2, mini.y + mini.height / 2)
  await expect(page.getByRole('dialog', { name: '작은 달력' })).toBeVisible()
  await page.getByRole('toolbar', { name: '설명 넘기기' }).getByRole('button', { name: '설명 끝내기' }).click()

  // 주 보기
  await page.goto('./#/calendar/week/2026-11-18')
  await page.getByRole('button', { name: '사용 설명서' }).first().click()
  await expect(page.getByRole('dialog', { name: '요일' })).toBeVisible()

  // 시간표 안의 일정 블록은 시간표보다 먼저 눌린다
  const block = page.locator('[data-calendar-main] [data-drop-col] [data-item-key]').first()
  const b = await block.boundingBox()
  if (!b) throw new Error('일정 블록이 안 보임')
  await page.mouse.click(b.x + b.width / 2, b.y + b.height / 2)
  await expect(page.getByRole('dialog', { name: '시간 있는 할일·일정' })).toBeVisible()

  // 지금 설명 중인 칸을 다시 눌러도 그대로다
  await page.mouse.click(b.x + b.width / 2, b.y + b.height / 2)
  await expect(page.getByRole('dialog', { name: '시간 있는 할일·일정' })).toBeVisible()
})
