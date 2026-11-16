import { useCallback, useEffect, useRef, useState, type PointerEvent as ReactPointerEvent } from 'react'
import { dragSpan, type Span, type TimelineDragMode } from '../data/timelineDrag'
import { lockTextSelect } from './calendar/selectLock'

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
      set({ ...d, started: true, current: latest.current.minutesAt(e.clientY) })
    }
    const up = (): void => {
      const d = ref.current
      if (!d) return
      set(null)
      lockTextSelect(false)
      const { limits, onCreate, onChange } = latest.current
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

  const begin = useCallback((e: ReactPointerEvent, mode: TimelineDragMode, block?: { key: string; start: number; end: number }) => {
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
