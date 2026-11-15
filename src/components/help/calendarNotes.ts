import type { CalView } from '../../data/calendarItems'
import { byButton, byCard, byLabel, type Finder, type ScreenNote } from './finders'

/** 큰 달력 안 (왼쪽 칸에도 같은 할일 칩·날짜 이름이 있어 그쪽이 먼저 잡히지 않게) */
const mainOf = (root: ParentNode): ParentNode => root.querySelector('[data-calendar-main]') ?? root

/** 안쪽 스크롤 칸에 지금 보이는 것만 고른다 (주·일 보기 시간표는 따로 스크롤된다) */
function firstVisibleIn(container: Element | null, elements: readonly Element[]): Element | null {
  if (!container) return elements[0] ?? null
  const box = container.getBoundingClientRect()
  return (
    elements.find((el) => {
      const r = el.getBoundingClientRect()
      return r.top >= box.top && r.bottom <= box.bottom
    }) ?? null
  )
}

const firstChip: Finder = (root) => {
  const main = mainOf(root)
  return main.querySelector('[data-item-key^="task:"]') ?? main.querySelector('[data-item-key]')
}

/** 주·일 보기 머리줄의 요일 단추 */
const dayHeaders: Finder = (root) => [...mainOf(root).querySelectorAll('button[aria-label$=" 하루 보기"]')]

/** 주·일 보기 '종일' 줄 (단추 → 날짜 칸 → 칸 묶음 → 줄) */
const allDayRow: Finder = (root) => mainOf(root).querySelector('[aria-label$=" 종일 추가"]')?.parentElement?.parentElement?.parentElement ?? null

/** 주·일 보기 시간표 스크롤 칸 */
const timeGrid: Finder = (root) => mainOf(root).querySelector('[data-drop-col]')?.parentElement?.parentElement ?? null

const timeBlock: Finder = (root) => {
  const grid = timeGrid(root, '')
  const container = grid && !Array.isArray(grid) ? (grid as Element) : null
  return firstVisibleIn(container, [...mainOf(root).querySelectorAll('[data-drop-col] [data-item-key]')])
}

const CHIP_DESC = '왼쪽 줄 색은 분류, 앞 글자는 할일의 우선순위입니다. 누르면 오른쪽에 자세히 나옵니다.'

/** 오늘 칸 (오늘이 안 보이는 달이면 첫 칸) */
const todayCell: Finder = (root, today) => byLabel(today)(mainOf(root)) ?? mainOf(root).querySelector('[role="gridcell"]')

const MONTH_NOTES: readonly ScreenNote[] = [
  {
    title: '날짜 칸',
    desc: '빈 곳을 누르면 그날로 새로 만들고, 날짜 숫자를 누르면 그날 하루 보기로 갑니다. 하루에 많으면 "+몇 개 더"로 접힙니다.',
    find: todayCell,
    wideOnly: true,
  },
  { title: '할일·일정', desc: `${CHIP_DESC} 끌어서 다른 날로 옮깁니다.`, find: firstChip, wideOnly: true },
  // 휴대폰 월 보기는 칩 대신 점만 보인다
  {
    title: '날짜 칸',
    desc: '점은 그날 있는 할일·일정이고, 점 색은 분류입니다. 날짜 칸을 누르면 그날 하루 보기로 가서 자세히 봅니다.',
    find: todayCell,
    narrowOnly: true,
  },
]

const WEEK_NOTES: readonly ScreenNote[] = [
  { title: '요일', desc: '요일과 날짜를 누르면 그날 하루 보기로 갑니다. 오늘은 파란 글자입니다.', find: dayHeaders },
  {
    title: '종일 칸',
    desc: '시간 없는 할일과 종일 일정, 여러 날에 걸친 일정이 여기 나옵니다. + 를 누르면 그날 종일 일정을 만듭니다.',
    find: allDayRow,
  },
  {
    title: '시간표',
    desc: '빈 시간을 위아래로 끌면 그 시간만큼 일정이 만들어집니다. 오늘 칸에는 지금 시각이 빨간 줄로 보입니다. 이 칸 안에서만 위아래로 스크롤됩니다.',
    find: timeGrid,
  },
  {
    title: '시간 있는 할일·일정',
    desc: `${CHIP_DESC} 끌어서 다른 날이나 다른 시각으로 옮기고, 아래 끝을 끌어 길이를 바꿉니다.`,
    find: timeBlock,
  },
]

const DAY_VIEW_NOTES: readonly ScreenNote[] = [
  {
    title: '종일 칸',
    desc: '그날의 시간 없는 할일과 종일 일정이 나옵니다. + 를 누르면 종일 일정을 만듭니다.',
    find: allDayRow,
  },
  {
    title: '시간표',
    desc: '하루를 넓게 봅니다. 빈 시간을 위아래로 끌면 그 시간만큼 일정이 만들어집니다. 앞뒤 날은 위쪽 화살표나 ←, → 로 넘깁니다.',
    find: timeGrid,
  },
  {
    title: '시간 있는 할일·일정',
    desc: `${CHIP_DESC} 끌어서 다른 시각으로 옮기고, 아래 끝을 끌어 길이를 바꿉니다.`,
    find: timeBlock,
  },
]

const AGENDA_NOTES: readonly ScreenNote[] = [
  {
    title: '날짜별 목록',
    desc: '앞으로 몇 주 동안의 할일·일정을 날짜 순서로 모아 봅니다. 아무것도 없는 날은 빠집니다. 휴대폰에서 보기 좋습니다.',
    find: (root) => mainOf(root).querySelector('section[aria-label]'),
  },
  {
    title: '할일·일정 줄',
    desc: '왼쪽은 시간, 제목 앞 글자는 할일의 우선순위, 아래 작은 글자는 분류와 할일·일정 구분입니다. 누르면 오른쪽에 자세히 나옵니다.',
    find: (root) => mainOf(root).querySelector('section[aria-label] button'),
  },
]

export const CALENDAR_VIEW_NOTES: Readonly<Record<CalView, readonly ScreenNote[]>> = {
  month: MONTH_NOTES,
  week: WEEK_NOTES,
  day: DAY_VIEW_NOTES,
  agenda: AGENDA_NOTES,
}

/** 어느 보기에서나 같은 부분 (위쪽 도구 줄, 분류, 왼쪽 칸) */
export const CALENDAR_COMMON_NOTES: readonly ScreenNote[] = [
  {
    title: '기간 옮기기',
    desc: '오늘로 돌아오거나 앞뒤 달(주, 날)로 넘깁니다. 키보드 T, ←, → 로도 됩니다.',
    find: (root) => [byButton('오늘')(root, ''), byLabel('이전')(root), byLabel('다음')(root)].flat().filter((el): el is Element => el !== null),
  },
  { title: '검색', desc: '쓰는 대로 제목이 맞는 할일·일정만 남습니다. / 키를 누르면 바로 씁니다.', find: byLabel('검색') },
  {
    title: '보기 바꾸기',
    desc: '월, 주, 일, 목록으로 바꿉니다. 키보드 M, W, D, A 로도 됩니다. 마지막에 고른 보기를 기억합니다.',
    find: byLabel('보기'),
  },
  { title: '추가', desc: '할일이나 일정을 새로 만듭니다. "내일 4시 상담 30분"처럼 한 줄로 쓰고 칸 채우기를 눌러도 됩니다.', find: byButton('추가') },
  { title: '더보기 메뉴', desc: '주 시작 요일(일요일·월요일)을 바꾸고 단축키를 봅니다.', find: byLabel('더보기') },
  {
    title: '분류 목록',
    desc: '체크를 끄면 그 분류의 할일·일정이 달력에서 숨습니다. 분류 관리에서 분류를 만들고 색과 이름을 바꿉니다.',
    find: byLabel('분류 목록'),
  },
  {
    title: '작은 달력',
    desc: '날짜를 누르면 큰 달력이 그날로 갑니다. 점이 있는 날은 할일·일정이 있는 날입니다.',
    find: (root) => root.querySelector('[aria-label="작은 달력 이전 달"]')?.closest('.ant-card') ?? null,
  },
  {
    title: '마감 일정',
    desc: '마감일이 있는 할일이 가까운 순서로 모입니다. 이틀 안으로 남으면 색이 바뀝니다.',
    find: byCard('마감 일정'),
  },
  {
    title: '그날 계획',
    desc: '달력에서 고른 날의 할일·일정입니다. "계획 화면"을 누르면 그날 계획 페이지로 갑니다.',
    find: (root) => {
      const link = byButton('계획 화면')(root, '')
      return link && !Array.isArray(link) ? (link as Element).closest('.ant-card') : null
    },
  },
  {
    title: '프로젝트',
    desc: '장기 할일과 그 아래 세부 할일을 단계별로 봅니다. 마감 미정 프로젝트는 맨 아래에 놓입니다. 왼쪽 네모(⊞·⊟)로 접고 펼치고, 줄 끝 + 로 세부 할일을 더합니다(3단까지). 막대는 맨 아래 할일이 끝난 만큼 찹니다. 날짜 미정 할일은 여기에만 보입니다.',
    find: byCard('프로젝트'),
  },
]
