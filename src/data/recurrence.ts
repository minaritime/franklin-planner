import { addDays, dDay } from './logic'
import type { PlanEvent } from './types'

/** 달력에 그릴 일정 한 번. 반복 일정이면 날짜마다 하나씩 생긴다 */
export interface Occurrence {
  readonly event: PlanEvent
  /** 이번 회차의 첫 날 */
  readonly date: string
  /** 이번 회차의 끝 날 (포함) */
  readonly endDate: string
  /** 화면에서 겹치지 않는 열쇠 (일정 id + 회차 날짜) */
  readonly key: string
  readonly recurring: boolean
}

const weekday = (date: string): number => new Date(`${date}T00:00:00Z`).getUTCDay()
const spanDays = (e: PlanEvent): number => (e.endDate ? dDay(e.endDate, e.date) : 0)
/** 그 주의 일요일 */
const sundayOf = (date: string): string => addDays(date, -weekday(date))
const lastDayOfMonth = (date: string): number => {
  const [y, m] = date.split('-').map(Number)
  return new Date(Date.UTC(y, m, 0)).getUTCDate()
}
/** 첫 날부터 일주일 안에서 처음 맞는 요일의 날 (격주는 이 주를 기준으로 센다) */
const firstMatch = (start: string, days: readonly number[]): string => {
  for (let i = 0; i < 7; i++) if (days.includes(weekday(addDays(start, i)))) return addDays(start, i)
  return start
}

function matchesRule(e: PlanEvent, date: string): boolean {
  const repeat = e.repeat
  if (!repeat) return date === e.date
  switch (repeat.freq) {
    case 'daily':
      return true
    case 'weekly':
    case 'biweekly': {
      const days = repeat.weekdays && repeat.weekdays.length > 0 ? repeat.weekdays : [weekday(e.date)]
      if (!days.includes(weekday(date))) return false
      if (repeat.freq === 'weekly') return true
      const weeks = dDay(sundayOf(date), sundayOf(firstMatch(e.date, days))) / 7
      return weeks % 2 === 0
    }
    case 'monthly': {
      // 31일 반복은 짧은 달에 그 달 마지막 날로
      const want = Number(e.date.slice(8))
      return Number(date.slice(8)) === Math.min(want, lastDayOfMonth(date))
    }
  }
}

/** 이 날 시작하는 회차가 있는지 */
export function occursOn(e: PlanEvent, date: string): boolean {
  if (e.deleted || date < e.date) return false
  if (e.repeat?.until && date > e.repeat.until) return false
  if (e.skipDates?.includes(date)) return false
  return matchesRule(e, date)
}

/** from~to (포함) 와 겹치는 모든 회차. 여러 날 일정은 범위 앞에서 시작했어도 걸치면 넣는다 */
export function expandEvents(events: readonly PlanEvent[], from: string, to: string): Occurrence[] {
  return events.flatMap((e) => {
    if (e.deleted) return []
    const span = spanDays(e)
    const first = e.date > addDays(from, -span) ? e.date : addDays(from, -span)
    const result: Occurrence[] = []
    for (let d = first; d <= to; d = addDays(d, 1)) {
      if (!occursOn(e, d)) continue
      result.push({ event: e, date: d, endDate: addDays(d, span), key: `${e.id}:${d}`, recurring: e.repeat !== undefined })
      if (!e.repeat) break
    }
    return result
  })
}
