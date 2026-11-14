import type { PageKey } from '../SideNav'

/** 지금 화면에서 설명할 부분을 찾는다. 여러 개를 주면 전부 감싸는 상자를 그린다 */
export type Finder = (root: ParentNode, today: string) => Element | readonly Element[] | null

export interface ScreenNote {
  readonly title: string
  readonly desc: string
  readonly find: Finder
  /** 넓은 화면에만 있는 부분 (왼쪽 메뉴 등) */
  readonly wideOnly?: boolean
  /** 좁은 화면에만 있는 부분 (아래 탭 막대) */
  readonly narrowOnly?: boolean
}

const byLabel =
  (label: string) =>
  (root: ParentNode): Element | null =>
    root.querySelector(`[aria-label="${label}"]`)

const byCard =
  (title: string): Finder =>
  (root) => {
    const head = [...root.querySelectorAll('.ant-card-head-title')].find((el) => el.textContent?.trim() === title)
    return head?.closest('.ant-card') ?? null
  }

const byButton =
  (text: string): Finder =>
  (root) =>
    [...root.querySelectorAll('button')].find((el) => el.textContent?.trim() === text) ?? null

const sideMenu: Finder = (root) => root.querySelector('.ant-layout-sider .ant-menu')
const bottomBar: Finder = byLabel('화면 이동')
/** 넓은 화면 왼쪽 아래 구석 (? 버튼과 저장 상태) */
const corner: Finder = (root) => root.querySelector('.ant-layout-sider [aria-label="사용 설명서"]')?.parentElement ?? null

/** 목록 첫 줄의 할일 글자 */
const firstTaskTitle: Finder = (root) => root.querySelector('[aria-label^="우선순위 "]')?.nextElementSibling?.firstElementChild ?? null

const MOVE_DESC = '하루, 달력, 목표, 설정 화면으로 옮겨 갑니다.'

const NAV_NOTES: readonly ScreenNote[] = [
  { title: '화면 바꾸기', desc: MOVE_DESC, find: sideMenu, wideOnly: true },
  { title: '화면 바꾸기', desc: MOVE_DESC, find: bottomBar, narrowOnly: true },
]

const DAY_NOTES: readonly ScreenNote[] = [
  ...NAV_NOTES,
  {
    title: '날짜 옮기기',
    desc: '전날, 오늘, 다음날로 넘기거나 달력에서 날짜를 골라 그날 페이지를 엽니다.',
    find: (root) => {
      const row = byLabel('전날')(root)?.parentElement
      return row ? [...row.children].filter((el) => el.textContent?.trim() !== '장기 할일 추가') : null
    },
  },
  {
    title: '장기 할일 추가',
    desc: '며칠에 걸쳐 하는 일을 시작일과 마감일을 정해 넣습니다. 마감일까지 매일 우선 업무 목록에 "장기" 표시와 함께 나옵니다.',
    find: byButton('장기 할일 추가'),
  },
  {
    title: '못 끝낸 할일',
    desc: '지난 날에 체크하지 않은 할일이 모입니다. "오늘로 가져오기"를 누르면 한 번에 오늘로 옮겨집니다.',
    find: (root) => root.querySelector('.ant-alert-warning'),
  },
  {
    title: '빠른 추가',
    desc: 'A, B, C와 분류를 고르고 할일을 쓴 뒤 Enter. "3시 상담", "10시반~12시 수업"처럼 쓰면 시간도 붙어서 일정표에 같이 나옵니다. 고른 분류는 다음에도 그대로 남습니다.',
    find: (root) => root.querySelector('[aria-label="새 할일"]')?.closest('.ant-flex') ?? null,
  },
  {
    title: '완료 칸',
    desc: '누르면 ✓ 완료, 다시 누르면 되돌아갑니다. ● 는 맡긴 일, → 는 미룬 일, ✕ 는 취소한 일입니다.',
    find: (root) => root.querySelector('[aria-label^="우선순위 "]')?.previousElementSibling ?? null,
  },
  {
    title: '우선순위',
    desc: 'A 반드시, B 중요, C 여유되면. 같은 글자 안에서는 번호 순서대로 합니다. 글자를 누르면 A, B, C 순서로 바뀝니다.',
    find: (root) => root.querySelector('[aria-label^="우선순위 "]'),
  },
  {
    title: '할일 고치기',
    desc: '할일 글자를 누르면 수정 창이 열립니다. 시간, 마감일, 연결할 목표, 메모를 여기서 정합니다.',
    find: firstTaskTitle,
  },
  {
    title: '더보기 메뉴',
    desc: '미루기(다른 날로 옮김), 맡기기(다른 사람에게 넘김), 취소, 삭제를 고릅니다.',
    find: byLabel('더보기'),
  },
  {
    title: '일정표',
    desc: '빈 시간을 누르면 그 시간에 일정을 넣습니다. 색 바탕 칸은 일정(줄 색이 분류), 흰 칸에 색 테두리는 시간이 붙은 할일입니다. 오늘 화면에는 지금 시각이 빨간 줄로 보입니다.',
    find: byCard('일정'),
  },
  { title: '메모', desc: '그날 있었던 일을 적어 둡니다. 쓰는 대로 자동 저장됩니다.', find: byCard('메모') },
  {
    title: '설명서와 저장 상태',
    desc: '? 를 누르면 이 설명이 나옵니다. 옆 글자는 저장 상태로, "동기화됨"이면 계정에 올라간 것입니다.',
    find: corner,
    wideOnly: true,
  },
]

const CALENDAR_NOTES: readonly ScreenNote[] = [
  ...NAV_NOTES,
  {
    title: '기간 옮기기',
    desc: '오늘로 돌아오거나 앞뒤 달(주, 날)로 넘깁니다. 키보드 T, ←, → 로도 됩니다.',
    find: (root) => [byButton('오늘')(root, ''), byLabel('이전')(root), byLabel('다음')(root)].flat().filter((el): el is Element => el !== null),
  },
  { title: '검색', desc: '쓰는 대로 제목이 맞는 할일·일정만 남습니다. / 키를 누르면 바로 씁니다.', find: byLabel('검색') },
  { title: '보기 바꾸기', desc: '월, 주, 일, 목록으로 바꿉니다. 키보드 M, W, D, A 로도 됩니다.', find: byLabel('보기') },
  { title: '추가', desc: '할일이나 일정을 새로 만듭니다. "내일 4시 상담 30분"처럼 한 줄로 쓰고 칸 채우기를 눌러도 됩니다.', find: byButton('추가') },
  { title: '더보기 메뉴', desc: '주 시작 요일(일요일·월요일)을 바꾸고 단축키를 봅니다.', find: byLabel('더보기') },
  {
    title: '분류 목록',
    desc: '체크를 끄면 그 분류의 할일·일정이 달력에서 숨습니다. 분류 관리에서 분류를 만들고 색과 이름을 바꿉니다.',
    find: byLabel('분류 목록'),
  },
  {
    title: '날짜 칸',
    desc: '빈 곳을 누르면 그날로 새로 만들고, 날짜 숫자를 누르면 그날 하루 보기로 갑니다.',
    find: (root, today) => byLabel(today)(root),
  },
  {
    title: '할일·일정',
    desc: '왼쪽 줄 색은 분류, 앞 글자는 할일의 우선순위입니다. 누르면 오른쪽에 자세히 나오고, 끌어서 다른 날(주·일 보기에서는 다른 시각)로 옮깁니다.',
    find: (root) => root.querySelector('[data-item-key^="task:"]') ?? root.querySelector('[data-item-key]'),
  },
  {
    title: '마감 일정',
    desc: '마감일이 있는 할일이 가까운 순서로 모입니다. 이틀 안으로 남으면 색이 바뀝니다.',
    find: byCard('마감 일정'),
  },
]

const GOAL_NOTES: readonly ScreenNote[] = [
  ...NAV_NOTES,
  {
    title: '목표 추가',
    desc: '"올해 안에 학생 50명"처럼 길게 보고 이룰 목표를 적습니다. 목표일을 정하면 D-day가 붙습니다.',
    find: byButton('목표 추가'),
  },
  {
    title: '목표 카드',
    desc: '할일 수정 창에서 이 목표를 고른 할일이 여기 모입니다. 끝낸 만큼 막대가 찹니다.',
    find: (root) => root.querySelector('.ant-progress')?.closest('.ant-card') ?? null,
  },
  { title: '나의 가치', desc: '내가 중요하게 여기는 것을 적어 둡니다. 할일을 고를 때 기준이 됩니다.', find: byCard('나의 가치') },
]

const SETTINGS_NOTES: readonly ScreenNote[] = [
  ...NAV_NOTES,
  {
    title: '동기화',
    desc: 'Google로 로그인하면 PC와 휴대폰에서 같은 내용이 보입니다. 로그인한 뒤에는 이 자리에 로그아웃 버튼이 생기고, 남의 컴퓨터에서 썼다면 "로그아웃하고 이 기기에서 지우기"를 누릅니다.',
    find: byCard('동기화'),
  },
  {
    title: '백업 파일',
    desc: '내보내기로 지금 내용을 파일로 받아 둡니다. 가져오기는 파일 내용을 지금 내용에 합칩니다.',
    find: byCard('백업 파일'),
  },
  {
    title: '저장 상태',
    desc: '"동기화됨"이면 계정에 저장된 것, "이 기기에만 저장"이면 로그인 전입니다.',
    find: corner,
    wideOnly: true,
  },
]

export const SCREEN_NOTES: Readonly<Record<PageKey, readonly ScreenNote[]>> = {
  day: DAY_NOTES,
  calendar: CALENDAR_NOTES,
  goals: GOAL_NOTES,
  settings: SETTINGS_NOTES,
}
