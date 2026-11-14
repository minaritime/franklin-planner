import { addDays, dDay, newId, nextOrder } from './logic'
import { toMinutes } from './timeline'
import type { Category, CategoryColor, PlanEvent, Repeat, Task } from './types'
import { CATEGORY_COLORS } from './types'

/** 일정에서 사용자가 고치는 칸 */
export type EventFields = Pick<
  PlanEvent,
  'date' | 'endDate' | 'allDay' | 'start' | 'end' | 'title' | 'categoryId' | 'place' | 'note' | 'repeat'
>

/** 반복 일정을 바꿀 때: 이 회차만, 또는 반복 전체 */
export type SeriesScope = 'one' | 'all'

export function eventFieldsOf(e: PlanEvent): EventFields {
  const { date, endDate, allDay, start, end, title, categoryId, place, note, repeat } = e
  return { date, endDate, allDay, start, end, title, categoryId, place, note, repeat }
}

const formatMinutes = (m: number): string =>
  `${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`

/** 끌어서 옮기면 요일과 반복 끝 날도 같이 옮긴다 */
const shiftRepeat = (repeat: Repeat | undefined, delta: number): Repeat | undefined => {
  if (!repeat || delta === 0) return repeat
  const shift = ((delta % 7) + 7) % 7
  return {
    ...repeat,
    ...(repeat.weekdays && shift !== 0 ? { weekdays: repeat.weekdays.map((w) => (w + shift) % 7) } : {}),
    ...(repeat.until ? { until: addDays(repeat.until, delta) } : {}),
  }
}

/**
 * 끌어서 옮기거나 길이를 바꿀 때의 새 칸. 날짜를 옮기면 여러 날 길이를 그대로 두고,
 * 시작 시각을 옮기면 걸리는 시간을 그대로 둔다. 매주 반복이면 요일도 같이 옮긴다.
 */
export function movedFields(
  e: PlanEvent,
  occDate: string,
  to: { readonly date?: string; readonly start?: string; readonly end?: string; readonly allDay?: boolean },
): EventFields {
  const fields = eventFieldsOf(e)
  const date = to.date ?? occDate
  const delta = dDay(date, occDate)
  const span = e.endDate ? dDay(e.endDate, e.date) : 0
  const length = toMinutes(e.end) - toMinutes(e.start)
  const start = to.start ?? fields.start
  const end = to.end ?? (to.start ? formatMinutes(Math.min(toMinutes(to.start) + length, 23 * 60 + 59)) : fields.end)
  return {
    ...fields,
    date,
    endDate: span > 0 ? addDays(date, span) : undefined,
    allDay: to.allDay ?? fields.allDay,
    start,
    end,
    repeat: shiftRepeat(fields.repeat, delta),
  }
}

export function editOccurrence(
  events: readonly PlanEvent[],
  id: string,
  occDate: string,
  fields: EventFields,
  scope: SeriesScope,
  now: number,
  makeId: () => string = newId,
): PlanEvent[] {
  const target = events.find((e) => e.id === id)
  if (!target) return [...events]
  if (!target.repeat) return events.map((e) => (e.id === id ? { ...e, ...fields, updatedAt: now } : e))

  if (scope === 'one') {
    const skipped = { ...target, skipDates: [...(target.skipDates ?? []), occDate], updatedAt: now }
    const single: PlanEvent = { ...fields, id: makeId(), repeat: undefined, skipDates: undefined, updatedAt: now }
    return [...events.map((e) => (e.id === id ? skipped : e)), single]
  }

  const delta = dDay(fields.date, occDate)
  const date = addDays(target.date, delta)
  const span = fields.endDate ? dDay(fields.endDate, fields.date) : 0
  const updated: PlanEvent = {
    ...target,
    ...fields,
    date,
    endDate: span > 0 ? addDays(date, span) : undefined,
    skipDates: target.skipDates?.map((d) => addDays(d, delta)),
    updatedAt: now,
  }
  return events.map((e) => (e.id === id ? updated : e))
}

export function deleteOccurrence(
  events: readonly PlanEvent[],
  id: string,
  occDate: string,
  scope: SeriesScope,
  now: number,
): PlanEvent[] {
  return events.map((e) => {
    if (e.id !== id) return e
    if (e.repeat && scope === 'one') return { ...e, skipDates: [...(e.skipDates ?? []), occDate], updatedAt: now }
    return { ...e, deleted: true, updatedAt: now }
  })
}

/** 할일 시간: undefined=그대로, null=시간 빼기 */
export type TaskTime = { readonly start: string; readonly end: string } | null | undefined

/** 할일을 delta 일만큼 옮긴다. 장기 할일은 시작·마감을 함께 옮긴다 */
export function moveTaskBy(tasks: readonly Task[], id: string, delta: number, time: TaskTime, now: number): Task[] {
  return tasks.map((t) => {
    if (t.id !== id) return t
    const date = addDays(t.date, delta)
    const timePatch =
      time === undefined ? {} : time === null ? { startTime: undefined, endTime: undefined } : { startTime: time.start, endTime: time.end }
    return {
      ...t,
      ...timePatch,
      date,
      startDate: t.startDate ? addDays(t.startDate, delta) : undefined,
      dueDate: t.dueDate ? addDays(t.dueDate, delta) : undefined,
      order: delta === 0 ? t.order : nextOrder(tasks, date, t.priority),
      updatedAt: now,
    }
  })
}

export function nextCategoryColor(categories: readonly Category[]): CategoryColor {
  const used = new Set(categories.filter((c) => !c.deleted).map((c) => c.color))
  return CATEGORY_COLORS.find((c) => !used.has(c)) ?? CATEGORY_COLORS[categories.length % CATEGORY_COLORS.length]
}
