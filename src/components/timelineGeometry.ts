import { LAST_MINUTE } from '../data/timelineDrag'

export const HOUR_HEIGHT = 48
const SNAP = 15

export const formatHM = (m: number): string => `${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`

/** 일정표 맨 위에서 y px 아래의 시각 (15분 단위, 보이는 범위 안) */
export function minutesIn(y: number, rangeStart: number, rangeEnd: number): number {
  const raw = rangeStart * 60 + (y / HOUR_HEIGHT) * 60
  const snapped = Math.round(raw / SNAP) * SNAP
  return Math.max(rangeStart * 60, Math.min(Math.min(rangeEnd * 60, LAST_MINUTE), snapped))
}

/** 화면 좌표가 일정표 위면 그 시각(15분 단위), 아니면 null. 목록에서 할일을 끌어 올 때 쓴다 */
export function timelineMinutesAt(x: number, y: number): number | null {
  for (const el of document.elementsFromPoint(x, y)) {
    if (!(el instanceof HTMLElement) || el.dataset.timelineGrid === undefined) continue
    const rect = el.getBoundingClientRect()
    return minutesIn(y - rect.top, Number(el.dataset.rangeStart), Number(el.dataset.rangeEnd))
  }
  return null
}
