import { useCallback, useEffect, useRef, useState, type PointerEvent as ReactPointerEvent } from 'react'
import type { CalItem } from '../../data/calendarItems'
import { toMinutes } from '../../data/timeline'
import { lockTextSelect } from './selectLock'

/** 놓을 자리: 날짜 칸(종일) 또는 시간 칸의 몇 분 */
export interface DropTarget {
  readonly date: string
  readonly minutes?: number
}

export type DragMode = 'move' | 'resize' | 'create'

export interface DragState {
  readonly mode: DragMode
  readonly item?: CalItem
  /** 집은 칸의 날짜 (여러 날 막대는 집은 곳 기준으로 옮긴다) */
  readonly grabDate: string
  /** 시간 칸에서 집은 곳이 시작 시각보다 몇 분 아래인지 */
  readonly grabOffset: number
  /** 새로 만들기: 처음 누른 시각 */
  readonly anchorMinutes?: number
  readonly target: DropTarget | null
}

export const SNAP_MINUTES = 15
const DAY_MINUTES = 24 * 60
/** 이만큼 움직여야 끌기로 본다 (그 전에는 누르기) */
const DRAG_THRESHOLD = 5

const snap = (m: number): number => Math.max(0, Math.min(DAY_MINUTES - SNAP_MINUTES, Math.round(m / SNAP_MINUTES) * SNAP_MINUTES))

/** 화면 좌표 아래의 놓을 자리 */
export function targetAt(x: number, y: number): DropTarget | null {
  for (const el of document.elementsFromPoint(x, y)) {
    if (!(el instanceof HTMLElement)) continue
    const col = el.dataset.dropCol
    if (col) {
      const rect = el.getBoundingClientRect()
      return { date: col, minutes: snap(((y - rect.top) / rect.height) * DAY_MINUTES) }
    }
    const date = el.dataset.dropDate
    if (date) return { date }
  }
  return null
}

/** 누르는 동안만 쓰는 임시 상태 (ref 안에서만 바꾼다) */
interface Pending {
  readonly startX: number
  readonly startY: number
  state: DragState
  started: boolean
}

export function useCalendarDrag(onDrop: (state: DragState) => void) {
  const [drag, setDrag] = useState<DragState | null>(null)
  const pending = useRef<Pending | null>(null)
  const justDragged = useRef(false)
  const dropRef = useRef(onDrop)
  useEffect(() => {
    dropRef.current = onDrop
  }, [onDrop])

  useEffect(() => {
    const move = (e: PointerEvent): void => {
      const p = pending.current
      if (!p) return
      if (!p.started && Math.hypot(e.clientX - p.startX, e.clientY - p.startY) < DRAG_THRESHOLD) return
      p.started = true
      const next = { ...p.state, target: targetAt(e.clientX, e.clientY) }
      p.state = next
      setDrag(next)
    }
    const up = (): void => {
      const p = pending.current
      pending.current = null
      if (!p) return
      lockTextSelect(false)
      // 만들기는 그냥 눌러도 된다 (1시간짜리). 옮기기·길이는 움직였을 때만
      if (p.started || p.state.mode === 'create') {
        justDragged.current = p.started
        // 놓은 곳이 다른 칸이면 click 이 안 따라온다. 다음 진짜 누르기를 막지 않게 곧 푼다
        window.setTimeout(() => {
          justDragged.current = false
        }, 0)
        if (p.state.target) dropRef.current(p.state)
      }
      setDrag(null)
    }
    // 터치 중 스크롤 등으로 브라우저가 끌기를 끊으면 아무것도 바꾸지 않고 끝낸다
    const abort = (): void => {
      pending.current = null
      lockTextSelect(false)
      setDrag(null)
    }
    const cancel = (e: KeyboardEvent): void => {
      if (e.key !== 'Escape' || !pending.current) return
      // Esc 뒤 같은 칸에서 손을 떼도 상세 창이 열리지 않게
      justDragged.current = pending.current.started
      abort()
    }
    window.addEventListener('pointermove', move)
    window.addEventListener('pointerup', up)
    window.addEventListener('pointercancel', abort)
    window.addEventListener('keydown', cancel)
    return () => {
      lockTextSelect(false)
      window.removeEventListener('pointermove', move)
      window.removeEventListener('pointerup', up)
      window.removeEventListener('pointercancel', abort)
      window.removeEventListener('keydown', cancel)
    }
  }, [])

  const begin = useCallback((e: ReactPointerEvent, state: Omit<DragState, 'target'>) => {
    if (e.button !== 0) return
    e.stopPropagation()
    // 마우스로 누른 곳에서 글자 선택이 시작되지 않게
    if (e.pointerType === 'mouse') e.preventDefault()
    lockTextSelect(true)
    const target = targetAt(e.clientX, e.clientY)
    pending.current = { startX: e.clientX, startY: e.clientY, state: { ...state, target }, started: false }
    if (state.mode === 'create') setDrag({ ...state, target })
  }, [])

  const beginMove = useCallback(
    (e: ReactPointerEvent, item: CalItem) => {
      const at = targetAt(e.clientX, e.clientY)
      const grabOffset = at?.minutes !== undefined && item.start ? at.minutes - toMinutes(item.start) : 0
      begin(e, { mode: 'move', item, grabDate: at?.date ?? item.date, grabOffset })
    },
    [begin],
  )

  const beginResize = useCallback(
    (e: ReactPointerEvent, item: CalItem) => begin(e, { mode: 'resize', item, grabDate: item.date, grabOffset: 0 }),
    [begin],
  )

  const beginCreate = useCallback(
    (e: ReactPointerEvent) => {
      const at = targetAt(e.clientX, e.clientY)
      if (!at || at.minutes === undefined) return
      begin(e, { mode: 'create', grabDate: at.date, grabOffset: 0, anchorMinutes: at.minutes })
    },
    [begin],
  )

  /** 끌기 직후 따라오는 click 은 무시해야 상세 창이 열리지 않는다 */
  const consumeClick = useCallback((): boolean => {
    const was = justDragged.current
    justDragged.current = false
    return was
  }, [])

  return { drag, beginMove, beginResize, beginCreate, consumeClick }
}

export type CalendarDrag = ReturnType<typeof useCalendarDrag>
