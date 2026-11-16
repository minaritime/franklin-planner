/** 계획 화면 일정표에서 끌기로 시간을 정하는 계산 (분 단위) */

export type TimelineDragMode = 'create' | 'move' | 'resize-start' | 'resize-end'

export interface Span {
  readonly start: number
  readonly end: number
}

export interface DragInput {
  readonly mode: TimelineDragMode
  /** 처음 누른 시각 */
  readonly anchor: number
  /** 지금 손가락·마우스가 있는 시각 */
  readonly current: number
  /** 집은 칸의 원래 시간 (만들기에서는 안 씀) */
  readonly start: number
  readonly end: number
  /** 일정표에 보이는 첫 시각·마지막 시각 */
  readonly min: number
  readonly max: number
}

export const LAST_MINUTE = 24 * 60 - 1
export const DEFAULT_LENGTH = 60
export const MIN_LENGTH = 15

const clamp = (v: number, lo: number, hi: number): number => Math.max(lo, Math.min(hi, v))

/** 누른 곳과 지금 곳으로 만든 시간. 그냥 누르면 1시간 */
export function createSpan(a: number, b: number): Span {
  if (a === b) return { start: a, end: Math.min(a + DEFAULT_LENGTH, LAST_MINUTE) }
  return { start: Math.min(a, b), end: Math.min(Math.max(a, b), LAST_MINUTE) }
}

/** 끄는 동안·놓은 뒤의 시간 */
export function dragSpan(i: DragInput): Span {
  switch (i.mode) {
    case 'create':
      return createSpan(i.anchor, i.current)
    case 'move': {
      const length = i.end - i.start
      const start = clamp(i.start + (i.current - i.anchor), i.min, Math.max(i.min, i.max - length))
      return { start, end: Math.min(start + length, LAST_MINUTE) }
    }
    case 'resize-start':
      return { start: clamp(i.current, i.min, i.end - MIN_LENGTH), end: i.end }
    case 'resize-end':
      return { start: i.start, end: clamp(i.current, i.start + MIN_LENGTH, i.max) }
  }
}

/** 할일을 목록에서 끌어 놓은 시간. 이미 시간이 있으면 그 길이를, 없으면 1시간 */
export function dropSpan(at: number, length: number = DEFAULT_LENGTH): Span {
  const len = clamp(length, MIN_LENGTH, LAST_MINUTE)
  const start = clamp(at, 0, LAST_MINUTE - len)
  return { start, end: start + len }
}
