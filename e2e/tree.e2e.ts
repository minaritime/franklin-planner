import { expect, test, type Page } from '@playwright/test'

const NOW = new Date('2026-11-14T10:00:00')

test.beforeEach(async ({ page }) => {
  await page.clock.setFixedTime(NOW)
  await page.setViewportSize({ width: 1440, height: 900 })
  await page.goto('./')
  await page.evaluate(() => localStorage.clear())
  await page.goto('./#/calendar/month/2026-11-14')
})

const drawer = (page: Page) => page.locator('.ant-drawer-open')
const tree = (page: Page) => page.getByLabel('프로젝트 트리')

async function addChild(page: Page, parent: string, title: string): Promise<void> {
  await page.getByRole('button', { name: `${parent} 아래에 세부 할일 추가` }).click()
  await expect(drawer(page).getByText('세부 할일 추가')).toBeVisible()
  await drawer(page).getByRole('textbox', { name: '할일' }).fill(title)
  await drawer(page).getByRole('button', { name: '저장' }).click()
  await expect(drawer(page)).toHaveCount(0)
}

test('새 프로젝트에 세부·그 아래 할일을 더하고, 진행률과 계획 화면 표시가 따라온다', async ({ page }) => {
  // 새 프로젝트 = 마감일이 꼭 있는 장기 할일
  await page.getByRole('button', { name: '새 프로젝트' }).click()
  await expect(drawer(page).getByText('새 프로젝트')).toBeVisible()
  await drawer(page).getByRole('textbox', { name: '할일' }).fill('게임 만들기')
  await drawer(page).getByRole('button', { name: '저장' }).click()
  await expect(drawer(page).getByText('마감일을 골라주세요')).toBeVisible()
  await drawer(page).getByLabel('마감일').click()
  await page.locator('.ant-picker-dropdown .ant-picker-cell[title="2026-11-28"]').click()
  await drawer(page).getByRole('button', { name: '저장' }).click()
  await expect(tree(page).getByText('게임 만들기')).toBeVisible()

  // 세부 할일은 날짜 미정으로 먼저 적힌다
  await addChild(page, '게임 만들기', '기획')
  await addChild(page, '기획', '캐릭터 기획')
  await addChild(page, '기획', '세계관 기획')
  await expect(tree(page).getByText('세계관 기획')).toBeVisible()
  await expect(tree(page).getByText('날짜 미정')).toHaveCount(3)
  // 3단째에는 + 가 없다
  await expect(page.getByRole('button', { name: '캐릭터 기획 아래에 세부 할일 추가' })).toHaveCount(0)
  await expect(tree(page).getByText('0/2').first()).toBeVisible()

  // 날짜 미정은 달력에 안 나온다
  await expect(page.locator('[data-calendar-main]').getByText('캐릭터 기획')).toHaveCount(0)

  // 캐릭터 기획에 날짜를 정하고 끝내면 진행률이 오른다
  await tree(page).getByText('캐릭터 기획').click()
  await drawer(page).getByRole('button', { name: '수정' }).click()
  await drawer(page).getByRole('checkbox', { name: '날짜 미정' }).uncheck()
  await drawer(page).getByRole('button', { name: '저장' }).click()
  await expect(page.locator('[data-calendar-main]').getByText('캐릭터 기획')).toBeVisible()
  await tree(page).getByText('캐릭터 기획').click()
  await drawer(page).getByRole('button', { name: '완료', exact: true }).click()
  await page.keyboard.press('Escape')
  await expect(tree(page).getByText('1/2').first()).toBeVisible()

  // 계획 화면: 그날 목록에 상위 할일 이름이 붙는다
  await page.goto('./#/day/2026-11-14')
  await expect(page.getByLabel('상위 할일 기획')).toBeVisible()
  // 날짜 미정 할일은 그날 목록엔 없고, 아래 프로젝트 칸에만 보인다
  await expect(page.locator('.ant-card', { hasText: '우선 업무' }).getByText('세계관 기획')).toHaveCount(0)
  await expect(page.getByRole('tree', { name: '프로젝트 트리' }).getByText('세계관 기획')).toBeVisible()
})

test('마감 미정 프로젝트는 마감 있는 것 아래에 놓이고 마감 일정·달력에는 안 나온다', async ({ page }) => {
  await page.getByRole('button', { name: '새 프로젝트' }).click()
  await drawer(page).getByRole('textbox', { name: '할일' }).fill('책 쓰기')
  await drawer(page).getByRole('checkbox', { name: '마감 미정' }).check()
  await expect(drawer(page).getByLabel('마감일')).toHaveCount(0)
  await drawer(page).getByRole('button', { name: '저장' }).click()
  await expect(drawer(page)).toHaveCount(0)

  await page.getByRole('button', { name: '새 프로젝트' }).click()
  await drawer(page).getByRole('textbox', { name: '할일' }).fill('발표 준비')
  await drawer(page).getByLabel('마감일').click()
  await page.locator('.ant-picker-dropdown .ant-picker-cell[title="2026-11-20"]').click()
  await drawer(page).getByRole('button', { name: '저장' }).click()
  await expect(drawer(page)).toHaveCount(0)

  const titles = tree(page).locator('.ant-tree-treenode')
  await expect(titles.nth(0)).toContainText('발표 준비')
  await expect(titles.nth(1)).toContainText('책 쓰기')
  await expect(titles.nth(1)).toContainText('마감 미정')
  const deadline = page.locator('.ant-card').filter({ has: page.getByText('마감 일정', { exact: true }) })
  await expect(deadline.getByText('책 쓰기')).toHaveCount(0)
  await expect(page.locator('[data-calendar-main]').getByText('책 쓰기')).toHaveCount(0)

  // 세부 할일을 더해도 그대로 프로젝트로 남는다
  await addChild(page, '책 쓰기', '목차 잡기')
  await expect(tree(page).getByText('0/1')).toBeVisible()
})

test('세부 할일이 있는 할일을 지울 때 남길지 같이 지울지 묻는다', async ({ page }) => {
  await page.getByRole('button', { name: '새 프로젝트' }).click()
  await drawer(page).getByRole('textbox', { name: '할일' }).fill('이사 준비')
  await drawer(page).getByLabel('마감일').click()
  await page.locator('.ant-picker-dropdown .ant-picker-cell[title="2026-11-28"]').click()
  await drawer(page).getByRole('button', { name: '저장' }).click()
  await addChild(page, '이사 준비', '짐 싸기')
  await addChild(page, '짐 싸기', '책 정리')

  // 중간 단계를 지우고 세부 할일은 남기면 한 단계 위로 올라간다
  await tree(page).getByText('짐 싸기').click()
  await drawer(page).getByRole('button', { name: '삭제' }).click()
  await expect(page.getByText('세부 할일이 있어요')).toBeVisible()
  await page.getByRole('button', { name: '세부 할일은 남기기' }).click()
  await expect(tree(page).getByText('짐 싸기')).toHaveCount(0)
  await expect(tree(page).getByText('책 정리')).toBeVisible()
  await expect(page.getByRole('button', { name: '책 정리 아래에 세부 할일 추가' })).toBeVisible()

  // 프로젝트를 모두 지우면 트리가 빈다
  await tree(page).getByText('이사 준비').click()
  await drawer(page).getByRole('button', { name: '삭제' }).click()
  await page.getByRole('button', { name: '모두 지우기' }).click()
  await expect(page.getByText('프로젝트 없음')).toBeVisible()
})
