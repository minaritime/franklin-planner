import { addDays, dDay } from '../../data/logic'
import { toMinutes } from '../../data/timeline'
import type { DragState } from './useCalendarDrag'

/** 끌기가 끝나면 어디로 가는지. start·end 가 없으면 종일 */
export interface DragPreview {
  readonly date: string
  readonly start?: number
  readonly end?: number
}

const LAST_MINUTE = 24 * 60 - 1
const MIN_LENGTH = 15
const DEFAULT_LENGTH = 60

const clamp = (v: number, lo: number, hi: number): number => Math.max(lo, Math.min(hi, v))

export function dragPreview(state: DragState): DragPreview | null {
  const { target, item } = state
  if (state.mode === 'create') {
    const a = state.anchorMinutes ?? 0
    const b = target && target.date === state.grabDate && target.minutes !== undefined ? target.minutes : a
    if (a === b) return { date: state.grabDate, start: a, end: Math.min(a + DEFAULT_LENGTH, LAST_MINUTE) }
    return { date: state.grabDate, start: Math.min(a, b), end: Math.min(Math.max(a, b), LAST_MINUTE) }
  }
  if (!target || !item) return null

  if (state.mode === 'resize') {
    if (target.minutes === undefined || !item.start || target.date !== item.date) return null
    const start = toMinutes(item.start)
    return { date: item.date, start, end: clamp(target.minutes, start + MIN_LENGTH, LAST_MINUTE) }
  }

  // 옮기기: 날짜 칸(종일)에 놓으면 날짜만, 시간 칸에 놓으면 시각까지
  if (target.minutes === undefined) return { date: addDays(item.date, dDay(target.date, state.grabDate)) }
  const length = item.start && item.end ? toMinutes(item.end) - toMinutes(item.start) : DEFAULT_LENGTH
  const start = clamp(target.minutes - state.grabOffset, 0, LAST_MINUTE + 1 - length)
  return { date: target.date, start, end: Math.min(start + length, LAST_MINUTE) }
}
