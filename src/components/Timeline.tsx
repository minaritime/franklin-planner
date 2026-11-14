import { theme, Typography } from 'antd'
import { useEffect, useRef, useState, type CSSProperties, type PointerEvent as ReactPointerEvent } from 'react'
import { lockTextSelect } from './calendar/selectLock'
import { hourRange, layoutEvents, toMinutes } from '../data/timeline'
import type { Priority } from '../data/types'
import { PRIORITY_COLOR_TOKEN } from '../theme'

/** 시간표 한 칸: 일정이거나, 시간이 붙은 할일 */
export interface TimelineBlock {
  readonly id: string
  readonly kind: 'event' | 'task'
  readonly start: string
  readonly end: string
  readonly title: string
  readonly priority?: Priority
  readonly finished?: boolean
  /** 일정의 분류 색 */
  readonly lineColor?: string
}

interface TimelineProps {
  readonly isToday: boolean
  readonly blocks: readonly TimelineBlock[]
  readonly onOpenBlock: (block: TimelineBlock) => void
  /** 빈 곳을 누르거나 끌어서 고른 시간 (HH:MM) */
  readonly onCreate: (start: string, end: string) => void
}

const HOUR_HEIGHT = 48
const LABEL_WIDTH = 40
const SNAP = 15
const DEFAULT_LENGTH = 60
const LAST_MINUTE = 24 * 60 - 1

export const formatHM = (m: number): string => `${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`

/** 누른 곳과 지금 곳으로 만든 시간. 그냥 누르면 1시간 */
export function createSpan(a: number, b: number): { start: number; end: number } {
  if (a === b) return { start: a, end: Math.min(a + DEFAULT_LENGTH, LAST_MINUTE) }
  return { start: Math.min(a, b), end: Math.min(Math.max(a, b), LAST_MINUTE) }
}

interface CreateDrag {
  readonly anchor: number
  readonly current: number
}

/** 시간표 빈 곳을 끌어서 시간 고르기 (달력 주·일 보기와 같은 방식) */
function useCreateDrag(minutesAt: (clientY: number) => number, onCreate: (start: string, end: string) => void) {
  const [drag, setDrag] = useState<CreateDrag | null>(null)
  const ref = useRef<CreateDrag | null>(null)
  const latest = useRef({ minutesAt, onCreate })
  useEffect(() => {
    latest.current = { minutesAt, onCreate }
  })

  useEffect(() => {
    const set = (next: CreateDrag | null): void => {
      ref.current = next
      setDrag(next)
    }
    const move = (e: PointerEvent): void => {
      if (ref.current) set({ ...ref.current, current: latest.current.minutesAt(e.clientY) })
    }
    const up = (): void => {
      const d = ref.current
      if (!d) return
      set(null)
      lockTextSelect(false)
      const span = createSpan(d.anchor, d.current)
      latest.current.onCreate(formatHM(span.start), formatHM(span.end))
    }
    const abort = (): void => {
      if (!ref.current) return
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

  const begin = (e: ReactPointerEvent): void => {
    if (e.button !== 0) return
    if (e.pointerType === 'mouse') e.preventDefault()
    lockTextSelect(true)
    const m = latest.current.minutesAt(e.clientY)
    ref.current = { anchor: m, current: m }
    setDrag(ref.current)
  }
  return { drag, begin }
}

function useNowMinutes(enabled: boolean): number {
  const [now, setNow] = useState(() => new Date())
  useEffect(() => {
    if (!enabled) return
    const id = window.setInterval(() => setNow(new Date()), 60_000)
    return () => window.clearInterval(id)
  }, [enabled])
  return now.getHours() * 60 + now.getMinutes()
}

export default function Timeline({ isToday, blocks, onOpenBlock, onCreate }: TimelineProps) {
  const { token } = theme.useToken()
  const range = hourRange(blocks)
  const hours = Array.from({ length: range.end - range.start }, (_, i) => range.start + i)
  const nowMinutes = useNowMinutes(isToday)
  const top = (minutes: number): number => ((minutes - range.start * 60) / 60) * HOUR_HEIGHT

  const gridRef = useRef<HTMLDivElement>(null)
  const minutesAt = (clientY: number): number => {
    const rect = gridRef.current?.getBoundingClientRect()
    const y = rect ? clientY - rect.top : 0
    const raw = range.start * 60 + (y / HOUR_HEIGHT) * 60
    const snapped = Math.round(raw / SNAP) * SNAP
    return Math.max(range.start * 60, Math.min(range.end * 60 - SNAP, snapped))
  }
  const create = useCreateDrag(minutesAt, onCreate)
  const ghost = create.drag ? createSpan(create.drag.anchor, create.drag.current) : null

  /** 일정은 파란 바탕, 할일은 우선순위 색 테두리의 흰 바탕으로 구분한다 */
  const blockStyle = (block: TimelineBlock): CSSProperties => {
    if (block.kind === 'event') {
      return { background: token.colorPrimaryBg, borderInlineStart: `2px solid ${block.lineColor ?? token.colorPrimary}` }
    }
    const color = block.finished ? token.colorBorder : token[PRIORITY_COLOR_TOKEN[block.priority ?? 'B']]
    return {
      background: token.colorBgContainer,
      border: `1px solid ${token.colorBorderSecondary}`,
      borderInlineStart: `2px solid ${color}`,
    }
  }

  return (
    <div style={{ position: 'relative', height: hours.length * HOUR_HEIGHT, marginTop: 8, userSelect: 'none' }}>
      {hours.map((h, i) => (
        <div key={h} style={{ position: 'absolute', top: i * HOUR_HEIGHT, left: 0, right: 0, display: 'flex' }}>
          <Typography.Text
            type="secondary"
            className="num"
            style={{ width: LABEL_WIDTH, fontSize: 12, lineHeight: '12px', transform: 'translateY(-6px)' }}
          >
            {String(h).padStart(2, '0')}
          </Typography.Text>
          <div style={{ flex: 1, borderTop: `1px solid ${token.colorSplit}` }} />
        </div>
      ))}

      <div
        ref={gridRef}
        role="button"
        aria-label="시간표 빈 곳"
        onPointerDown={create.begin}
        style={{ position: 'absolute', inset: `0 0 0 ${LABEL_WIDTH}px`, cursor: 'copy', touchAction: 'none' }}
      />

      {ghost && (
        <div
          aria-hidden
          className="num"
          style={{
            position: 'absolute',
            top: top(ghost.start) + 1,
            height: Math.max(20, top(ghost.end) - top(ghost.start) - 2),
            left: LABEL_WIDTH,
            right: 2,
            borderRadius: token.borderRadiusSM,
            border: `2px dashed ${token.colorPrimary}`,
            background: token.colorPrimaryBg,
            color: token.colorPrimary,
            fontSize: 12,
            padding: '1px 8px',
            pointerEvents: 'none',
            zIndex: 2,
          }}
        >
          {formatHM(ghost.start)}–{formatHM(ghost.end)}
        </div>
      )}

      {layoutEvents(blocks).map(({ event: block, column, columns }) => {
        const start = toMinutes(block.start)
        const end = toMinutes(block.end)
        const height = Math.max(20, top(end) - top(start) - 2)
        return (
          <button
            key={`${block.kind}-${block.id}`}
            type="button"
            onClick={() => onOpenBlock(block)}
            style={{
              position: 'absolute',
              top: top(start) + 1,
              height,
              left: `calc(${LABEL_WIDTH}px + (100% - ${LABEL_WIDTH}px) * ${column / columns})`,
              width: `calc((100% - ${LABEL_WIDTH}px) / ${columns} - 2px)`,
              padding: '2px 8px',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'flex-start',
              border: 0,
              borderRadius: token.borderRadiusSM,
              color: block.finished ? token.colorTextTertiary : token.colorText,
              textAlign: 'left',
              overflow: 'hidden',
              cursor: 'pointer',
              fontSize: 12,
              lineHeight: '18px',
              ...blockStyle(block),
            }}
          >
            <div
              style={{
                fontWeight: 500,
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                textDecoration: block.finished ? 'line-through' : undefined,
              }}
            >
              {block.title}
            </div>
            {height >= 40 && (
              <div className="num" style={{ color: token.colorTextSecondary }}>
                {block.start}~{block.end}
              </div>
            )}
          </button>
        )
      })}

      {isToday && nowMinutes >= range.start * 60 && nowMinutes <= range.end * 60 && (
        <div
          style={{
            position: 'absolute',
            top: top(nowMinutes),
            left: LABEL_WIDTH - 4,
            right: 0,
            height: 0,
            borderTop: `1px solid ${token.colorError}`,
            pointerEvents: 'none',
          }}
        >
          <span style={{ position: 'absolute', left: 0, top: -4, width: 7, height: 7, borderRadius: '50%', background: token.colorError }} />
        </div>
      )}
    </div>
  )
}
