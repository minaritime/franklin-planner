import { isMultiDay, taskStart } from './calendar'
import { addDays } from './logic'
import { expandEvents } from './recurrence'
import type { Category, PlanEvent, PlannerData, Priority, Task, TaskStatus } from './types'
import { PRIORITIES } from './types'

export type CalView = 'month' | 'week' | 'day' | 'agenda'
export const CAL_VIEWS: readonly CalView[] = ['month', 'week', 'day', 'agenda']

/** 0=일요일 시작, 1=월요일 시작 */
export type WeekStart = 0 | 1

/** 분류 켜고 끄기에서 '분류 없음' 묶음을 가리키는 열쇠 */
export const NO_CATEGORY = '__none__'

/** 목록 보기가 보여 주는 날 수 */
export const AGENDA_DAYS = 42

/** 달력에 그리는 것 하나. 할일과 일정(반복이면 회차 하나)을 같은 모양으로 맞춘다 */
export interface CalItem {
  readonly key: string
  readonly kind: 'task' | 'event'
  readonly id: string
  readonly title: string
  /** 첫 날 */
  readonly date: string
  /** 끝 날 (포함) */
  readonly endDate: string
  /** 시간 없이 그 날(들) 전체 */
  readonly allDay: boolean
  readonly start?: string
  readonly end?: string
  /** 살아 있는 분류일 때만 */
  readonly categoryId?: string
  readonly priority?: Priority
  readonly status?: TaskStatus
  /** 일정 회차의 날짜 (반복 일정 고칠 때 씀) */
  readonly occDate: string
  readonly recurring: boolean
  readonly task?: Task
  readonly event?: PlanEvent
}

export interface ItemFilter {
  readonly hidden: ReadonlySet<string>
  readonly query: string
}

const isShownTask = (t: Task): boolean => !t.deleted && t.status !== 'forwarded'

function taskItem(t: Task, categoryId: string | undefined): CalItem {
  const long = isMultiDay(t)
  const timed = !long && t.startTime !== undefined && t.endTime !== undefined
  return {
    key: `task:${t.id}`,
    kind: 'task',
    id: t.id,
    title: t.title,
    date: long ? taskStart(t) : t.date,
    endDate: long ? t.dueDate! : t.date,
    allDay: !timed,
    start: timed ? t.startTime : undefined,
    end: timed ? t.endTime : undefined,
    categoryId,
    priority: t.priority,
    status: t.status,
    occDate: t.date,
    recurring: false,
    task: t,
  }
}

/** 마감 목록처럼 달력 밖에서 할일 하나를 열 때 */
export function itemOfTask(t: Task, categories: readonly Category[]): CalItem {
  const live = categories.some((c) => c.id === t.categoryId && !c.deleted)
  return taskItem(t, live ? t.categoryId : undefined)
}

export function buildItems(data: PlannerData, from: string, to: string, filter: ItemFilter): CalItem[] {
  const live = new Set(data.categories.filter((c) => !c.deleted).map((c) => c.id))
  const validCategory = (id: string | undefined): string | undefined => (id && live.has(id) ? id : undefined)
  const query = filter.query.trim().toLowerCase()

  const tasks = data.tasks
    .filter(isShownTask)
    .map((t) => taskItem(t, validCategory(t.categoryId)))
    .filter((i) => i.date <= to && i.endDate >= from)

  const events = expandEvents(data.events, from, to).map<CalItem>((o) => ({
    key: `event:${o.key}`,
    kind: 'event',
    id: o.event.id,
    title: o.event.title,
    date: o.date,
    endDate: o.endDate,
    allDay: o.event.allDay === true || o.endDate > o.date,
    start: o.event.allDay ? undefined : o.event.start,
    end: o.event.allDay ? undefined : o.event.end,
    categoryId: validCategory(o.event.categoryId),
    occDate: o.date,
    recurring: o.recurring,
    event: o.event,
  }))

  return [...tasks, ...events].filter(
    (i) => !filter.hidden.has(i.categoryId ?? NO_CATEGORY) && (query === '' || i.title.toLowerCase().includes(query)),
  )
}

const weekday = (date: string): number => new Date(`${date}T00:00:00Z`).getUTCDay()

export function startOfWeek(date: string, weekStart: WeekStart): string {
  return addDays(date, -((weekday(date) - weekStart + 7) % 7))
}

const weekOf = (date: string, weekStart: WeekStart): string[] => {
  const first = startOfWeek(date, weekStart)
  return Array.from({ length: 7 }, (_, i) => addDays(first, i))
}

/** 그 달을 덮는 주들 (앞뒤 달 날짜로 빈칸을 채운다) */
export function weeksOfMonth(date: string, weekStart: WeekStart): string[][] {
  const first = `${date.slice(0, 7)}-01`
  const weeks: string[][] = []
  for (let d = startOfWeek(first, weekStart); d.slice(0, 7) <= date.slice(0, 7); d = addDays(d, 7)) {
    weeks.push(weekOf(d, weekStart))
  }
  return weeks
}

export function rangeFor(view: CalView, date: string, weekStart: WeekStart): { from: string; to: string } {
  if (view === 'day') return { from: date, to: date }
  if (view === 'agenda') return { from: date, to: addDays(date, AGENDA_DAYS - 1) }
  if (view === 'week') {
    const week = weekOf(date, weekStart)
    return { from: week[0], to: week[6] }
  }
  const weeks = weeksOfMonth(date, weekStart)
  return { from: weeks[0][0], to: weeks[weeks.length - 1][6] }
}

/** 이전·다음 버튼으로 옮겨 갈 날짜 */
export function stepDate(view: CalView, date: string, dir: 1 | -1): string {
  if (view === 'day') return addDays(date, dir)
  if (view === 'week') return addDays(date, 7 * dir)
  if (view === 'agenda') return addDays(date, AGENDA_DAYS * dir)
  const [y, m] = date.split('-').map(Number)
  const total = y * 12 + (m - 1) + dir
  return `${Math.floor(total / 12)}-${String((total % 12) + 1).padStart(2, '0')}-01`
}

export interface PlacedBar {
  readonly item: CalItem
  readonly startCol: number
  readonly endCol: number
  readonly lane: number
  readonly continuesBefore: boolean
  readonly continuesAfter: boolean
}

/** 여러 날에 걸친 것만 골라 한 줄(주)에 겹치지 않게 놓는다 */
export function placeBars(items: readonly CalItem[], days: readonly string[]): PlacedBar[] {
  const first = days[0]
  const last = days[days.length - 1]
  const spanning = items
    .filter((i) => i.endDate > i.date && i.date <= last && i.endDate >= first)
    .sort((a, b) => a.date.localeCompare(b.date) || b.endDate.localeCompare(a.endDate))
  const laneEnds: number[] = []
  return spanning.map((item) => {
    const startCol = item.date < first ? 0 : days.indexOf(item.date)
    const endCol = item.endDate > last ? days.length - 1 : days.indexOf(item.endDate)
    let lane = laneEnds.findIndex((end) => end < startCol)
    if (lane === -1) lane = laneEnds.length
    laneEnds[lane] = endCol
    return { item, startCol, endCol, lane, continuesBefore: item.date < first, continuesAfter: item.endDate > last }
  })
}

/** 하루짜리만, 그 날 것만 */
export const singleDayItems = (items: readonly CalItem[], date: string): CalItem[] =>
  items.filter((i) => i.date === date && i.endDate === date)

const isFinished = (i: CalItem): boolean => i.kind === 'task' && i.status !== 'todo'

/** 시간 없는 것 먼저(우선순위 순), 그다음 시간 순, 끝낸 할일은 맨 뒤 */
export function sortForDay(items: readonly CalItem[]): CalItem[] {
  const rank = (i: CalItem): number => (i.priority ? PRIORITIES.indexOf(i.priority) : PRIORITIES.length)
  return [...items].sort(
    (a, b) =>
      Number(isFinished(a)) - Number(isFinished(b)) ||
      Number(!a.allDay) - Number(!b.allDay) ||
      (a.start ?? '').localeCompare(b.start ?? '') ||
      rank(a) - rank(b) ||
      (a.task?.order ?? 0) - (b.task?.order ?? 0),
  )
}

/** 화면 제목: 2026년 11월 / 11-08 – 11-14 / 2026-11-14 */
export function titleFor(view: CalView, date: string, weekStart: WeekStart): string {
  if (view === 'month') return `${date.slice(0, 4)}년 ${Number(date.slice(5, 7))}월`
  if (view === 'day') return date
  const { from, to } = rangeFor(view, date, weekStart)
  return `${from.slice(5)} – ${to.slice(5)}`
}
