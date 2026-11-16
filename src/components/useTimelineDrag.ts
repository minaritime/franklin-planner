import { useCallback, useEffect, useRef, useState, type PointerEvent as ReactPointerEvent } from 'react'
import { dragSpan, type Span, type TimelineDragMode } from '../data/timelineDrag'
import { lockTextSelect } from './calendar/selectLock'

/** 손이 있는 곳: 일정표 위, 시간 빼기 칸 위, 그 밖 */
export type DragPlace = 'grid' | 'zone' | 'out'

/** 화면 좌표 아래가 어디인지. 시간 빼기 칸은 data-unschedule-zone, 일정표는 data-timeline-grid */
export function placeAt(x: number, y: number): DragPlace {
  const els = document.elementsFromPoint(x, y)
  if (els.some((el) => el instanceof HTMLElement && el.dataset.unscheduleZone !== undefined)) return 'zone'
  if (els.some((el) => el instanceof HTMLElement && el.dataset.timelineGrid !== undefined)) return 'grid'
  return 'out'
}

export interface TimelineDragState {
  readonly mode: TimelineDragMode
  /** 옮기거나 길이를 바꾸는 칸 (만들기면 없음) */
  readonly blockKey?: string
  readonly anchor: number
  readonly current: number
  readonly start: number
  readonly end: number
  /** 조금이라도 움직였는지. 안 움직이고 떼면 그냥 누르기 */
  readonly started: boolean
  /** 옮기기에서 손이 있는 곳 (길이 바꾸기·만들기는 늘 grid) */
  readonly place: DragPlace
  /** 일정표 밖으로 빼서 시간을 없앨 수 있는 칸 (시간 붙은 할일) */
  readonly removable: boolean
  readonly x: number
  readonly y: number
}

interface Limits {
  readonly min: number
  readonly max: number
}

interface Handlers {
  readonly minutesAt: (clientY: number) => number
  readonly limits: Limits
  readonly onCreate: (span: Span) => void
  readonly onChange: (blockKey: string, span: Span) => void
  /** 시간 빼기 칸에 놓았을 때 */
  readonly onUnschedule: (blockKey: string) => void
}

/** 이만큼 움직여야 끌기로 본다 (그 전에는 누르기) */
const DRAG_THRESHOLD = 4

export const spanOf = (d: TimelineDragState, limits: Limits): Span => dragSpan({ ...d, ...limits })

/** 일정표 끌기: 빈 곳 끌어 만들기, 칸 옮기기, 칸 위·아래 끝 끌어 길이 바꾸기 */
export function useTimelineDrag(handlers: Handlers) {
  const [drag, setDrag] = useState<TimelineDragState | null>(null)
  const ref = useRef<(TimelineDragState & { readonly startY: number }) | null>(null)
  const justDragged = useRef(false)
  const latest = useRef(handlers)
  useEffect(() => {
    latest.current = handlers
  })

  useEffect(() => {
    const set = (next: (TimelineDragState & { readonly startY: number }) | null): void => {
      ref.current = next
      setDrag(next)
    }
    const move = (e: PointerEvent): void => {
      const d = ref.current
      if (!d) return
      if (!d.started && Math.abs(e.clientY - d.startY) < DRAG_THRESHOLD) return
      const place = d.mode === 'move' ? placeAt(e.clientX, e.clientY) : 'grid'
      set({
        ...d,
        started: true,
        current: latest.current.minutesAt(e.clientY),
        // 시간 빼기 칸은 할일만. 일정은 그 위에 놓아도 밖에 놓은 것과 같다
        place: place === 'zone' && !d.removable ? 'out' : place,
        x: e.clientX,
        y: e.clientY,
      })
    }
    const up = (): void => {
      const d = ref.current
      if (!d) return
      set(null)
      lockTextSelect(false)
      const { limits, onCreate, onChange, onUnschedule } = latest.current
      if (d.mode === 'create') {
        onCreate(spanOf(d, limits))
        return
      }
      if (!d.started || !d.blockKey) return
      // 끌기 직후 따라오는 click 으로 수정 창이 열리지 않게. 다른 곳에서 떼면 click 이 안 오니 곧 푼다
      justDragged.current = true
      window.setTimeout(() => {
        justDragged.current = false
      }, 0)
      if (d.place === 'zone') {
        onUnschedule(d.blockKey)
        return
      }
      // 일정표 밖(시간 빼기 칸 말고)에 놓으면 아무것도 바꾸지 않는다
      if (d.place === 'out') return
      const span = spanOf(d, limits)
      if (span.start !== d.start || span.end !== d.end) onChange(d.blockKey, span)
    }
    const abort = (): void => {
      if (!ref.current) return
      justDragged.current = ref.current.started
      set(null)
      lockTextSelect(false)
    }
    const key = (e: KeyboardEvent): void => {
      if (e.key === 'Escape') abort()
    }
    window.addEventListener('pointermove', move)
    window.addEventListener('pointerup', up)
    window.addEventListener('pointercancel', abort)
    window.addEventListener('keydown', key)
    return () => {
      lockTextSelect(false)
      window.removeEventListener('pointermove', move)
      window.removeEventListener('pointerup', up)
      window.removeEventListener('pointercancel', abort)
      window.removeEventListener('keydown', key)
    }
  }, [])

  const begin = useCallback((e: ReactPointerEvent, mode: TimelineDragMode, block?: { key: string; start: number; end: number; removable?: boolean }) => {
    if (e.button !== 0) return
    e.stopPropagation()
    if (e.pointerType === 'mouse') e.preventDefault()
    lockTextSelect(true)
    const m = latest.current.minutesAt(e.clientY)
    const next = {
      mode,
      blockKey: block?.key,
      anchor: m,
      current: m,
      start: block?.start ?? m,
      end: block?.end ?? m,
      started: mode === 'create',
      place: 'grid' as const,
      removable: block?.removable ?? false,
      x: e.clientX,
      y: e.clientY,
      startY: e.clientY,
    }
    ref.current = next
    // 만들기는 누르자마자 테두리를 보여 준다. 칸은 움직여야 보인다
    if (mode === 'create') setDrag(next)
  }, [])

  const consumeClick = useCallback((): boolean => {
    const was = justDragged.current
    justDragged.current = false
    return was
  }, [])

  return { drag, begin, consumeClick }
}
