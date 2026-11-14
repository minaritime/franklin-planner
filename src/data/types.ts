export type Priority = 'A' | 'B' | 'C'

export type TaskStatus = 'todo' | 'done' | 'forwarded' | 'delegated' | 'cancelled'

/** 날짜는 모두 'YYYY-MM-DD' 문자열, 시각은 'HH:mm' 문자열 */
export interface Task {
  readonly id: string
  readonly title: string
  readonly note: string
  readonly priority: Priority
  readonly order: number
  readonly status: TaskStatus
  /** 이 할일을 하는 날 (하루 페이지에 나오는 날) */
  readonly date: string
  /** 기간 시작. 마감일이 있을 때만 의미가 있고, 미뤄도 바뀌지 않는다 */
  readonly startDate?: string
  readonly dueDate?: string
  /** 그날 하는 시간 (선택). 있으면 하루 시간표에도 블록으로 나온다 */
  readonly startTime?: string
  readonly endTime?: string
  readonly goalId?: string
  /** 사용자가 만든 분류. 없거나 지운 분류면 '분류 없음' */
  readonly categoryId?: string
  readonly delegatedTo?: string
  /** 미룬 날짜 (status 가 forwarded 일 때) */
  readonly forwardedTo?: string
  /** 어느 날에서 넘어왔는지 */
  readonly forwardedFrom?: string
  readonly updatedAt: number
  readonly deleted?: boolean
}

export type RepeatFreq = 'daily' | 'weekly' | 'biweekly' | 'monthly'

export interface Repeat {
  readonly freq: RepeatFreq
  /** 매주·격주일 때 요일 (0=일 ~ 6=토). 없으면 첫 날의 요일 */
  readonly weekdays?: readonly number[]
  /** 이 날까지만 반복 (포함) */
  readonly until?: string
}

export interface PlanEvent {
  readonly id: string
  /** 첫 날. 반복 일정이면 반복이 시작하는 날 */
  readonly date: string
  /** 여러 날 일정의 끝 날 (포함). 없으면 하루짜리 */
  readonly endDate?: string
  /** 종일이면 start·end 는 무시한다 */
  readonly allDay?: boolean
  readonly start: string
  readonly end: string
  readonly title: string
  readonly categoryId?: string
  readonly place?: string
  readonly note?: string
  readonly repeat?: Repeat
  /** 반복 중 빼거나 따로 떼어 낸 날 */
  readonly skipDates?: readonly string[]
  readonly updatedAt: number
  readonly deleted?: boolean
}

/** antd 기본 색 이름. 화면에서는 테마 토큰(blue6 등)으로 바꿔 그린다 */
export const CATEGORY_COLORS = [
  'blue',
  'green',
  'orange',
  'purple',
  'cyan',
  'magenta',
  'red',
  'gold',
  'geekblue',
  'lime',
  'volcano',
] as const

export type CategoryColor = (typeof CATEGORY_COLORS)[number]

export interface Category {
  readonly id: string
  readonly name: string
  readonly color: CategoryColor
  readonly order: number
  readonly updatedAt: number
  readonly deleted?: boolean
}

export interface DayNote {
  /** 날짜가 곧 id */
  readonly date: string
  readonly text: string
  readonly updatedAt: number
}

export type GoalKind = 'value' | 'goal'

export interface Goal {
  readonly id: string
  readonly title: string
  readonly kind: GoalKind
  readonly description: string
  readonly targetDate?: string
  readonly updatedAt: number
  readonly deleted?: boolean
}

export interface PlannerData {
  readonly version: 1
  readonly tasks: readonly Task[]
  readonly events: readonly PlanEvent[]
  readonly notes: readonly DayNote[]
  readonly goals: readonly Goal[]
  readonly categories: readonly Category[]
}

export const EMPTY_DATA: PlannerData = {
  version: 1,
  tasks: [],
  events: [],
  notes: [],
  goals: [],
  categories: [],
}

export const PRIORITIES: readonly Priority[] = ['A', 'B', 'C']
