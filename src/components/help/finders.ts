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

export const byLabel =
  (label: string) =>
  (root: ParentNode): Element | null =>
    root.querySelector(`[aria-label="${label}"]`)

export const byCard =
  (title: string): Finder =>
  (root) => {
    const head = [...root.querySelectorAll('.ant-card-head-title')].find((el) => el.textContent?.trim() === title)
    return head?.closest('.ant-card') ?? null
  }

export const byButton =
  (text: string): Finder =>
  (root) =>
    [...root.querySelectorAll('button')].find((el) => el.textContent?.trim() === text) ?? null

const sideMenu: Finder = (root) => root.querySelector('.ant-layout-sider .ant-menu')
const bottomBar: Finder = byLabel('화면 이동')
/** 넓은 화면 왼쪽 아래 구석 (? 버튼과 저장 상태) */
export const corner: Finder = (root) => root.querySelector('.ant-layout-sider [aria-label="사용 설명서"]')?.parentElement ?? null

const MOVE_DESC = '계획, 달력, 목표, 설정 화면으로 옮겨 갑니다.'

export const NAV_NOTES: readonly ScreenNote[] = [
  { title: '화면 바꾸기', desc: MOVE_DESC, find: sideMenu, wideOnly: true },
  { title: '화면 바꾸기', desc: MOVE_DESC, find: bottomBar, narrowOnly: true },
]
