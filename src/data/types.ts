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
  readonly delegatedTo?: string
  /** 미룬 날짜 (status 가 forwarded 일 때) */
  readonly forwardedTo?: string
  /** 어느 날에서 넘어왔는지 */
  readonly forwardedFrom?: string
  readonly updatedAt: number
  readonly deleted?: boolean
}

export interface PlanEvent {
  readonly id: string
  readonly date: string
  readonly start: string
  readonly end: string
  readonly title: string
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
}

export const EMPTY_DATA: PlannerData = {
  version: 1,
  tasks: [],
  events: [],
  notes: [],
  goals: [],
}

export const PRIORITIES: readonly Priority[] = ['A', 'B', 'C']
