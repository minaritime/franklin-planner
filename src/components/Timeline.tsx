import { theme, Typography } from 'antd'
import { useEffect, useRef, useState, type CSSProperties } from 'react'
import { hourRange, layoutEvents, toMinutes } from '../data/timeline'
import { LAST_MINUTE, type Span } from '../data/timelineDrag'
import type { Priority } from '../data/types'
import { PRIORITY_COLOR_TOKEN } from '../theme'
import { formatHM, HOUR_HEIGHT, minutesIn } from './timelineGeometry'
import { spanOf, useTimelineDrag } from './useTimelineDrag'

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
  /** 끌어서 옮기거나 길이를 바꾸지 못하는 칸 (여러 날 일정) */
  readonly locked?: boolean
}

/** 목록에서 끌고 들어오는 할일이 놓일 자리 */
export interface IncomingBlock extends Span {
  readonly title: string
}

interface TimelineProps {
  readonly isToday: boolean
  readonly blocks: readonly TimelineBlock[]
  readonly onOpenBlock: (block: TimelineBlock) => void
  /** 빈 곳을 누르거나 끌어서 고른 시간 (HH:MM) */
  readonly onCreate: (start: string, end: string) => void
  /** 칸을 옮기거나 위·아래 끝을 끌어 바꾼 시간 (HH:MM) */
  readonly onChangeBlock: (block: TimelineBlock, start: string, end: string) => void
  readonly incoming?: IncomingBlock | null
}

const LABEL_WIDTH = 40
const MIN_HEIGHT = 20
const EDGE = 6

const keyOf = (block: TimelineBlock): string => `${block.kind}-${block.id}`

function useNowMinutes(enabled: boolean): number {
  const [now, setNow] = useState(() => new Date())
  useEffect(() => {
    if (!enabled) return
    const id = window.setInterval(() => setNow(new Date()), 60_000)
    return () => window.clearInterval(id)
  }, [enabled])
  return now.getHours() * 60 + now.getMinutes()
}

function Ghost({ span, label, top }: { span: Span; label: string; top: (m: number) => number }) {
  const { token } = theme.useToken()
  return (
    <div
      aria-hidden
      data-timeline-ghost
      className="num"
      style={{
        position: 'absolute',
        top: top(span.start) + 1,
        height: Math.max(MIN_HEIGHT, top(span.end) - top(span.start) - 2),
        left: LABEL_WIDTH,
        right: 2,
        borderRadius: token.borderRadiusSM,
        border: `2px dashed ${token.colorPrimary}`,
        background: token.colorPrimaryBg,
        color: token.colorPrimary,
        fontSize: 12,
        padding: '1px 8px',
        pointerEvents: 'none',
        zIndex: 3,
        overflow: 'hidden',
        whiteSpace: 'nowrap',
        textOverflow: 'ellipsis',
      }}
    >
      {formatHM(span.start)}–{formatHM(span.end)} {label}
    </div>
  )
}

export default function Timeline({ isToday, blocks, onOpenBlock, onCreate, onChangeBlock, incoming }: TimelineProps) {
  const { token } = theme.useToken()
  const range = hourRange(incoming ? [...blocks, { start: formatHM(incoming.start), end: formatHM(incoming.end) }] : blocks)
  const hours = Array.from({ length: range.end - range.start }, (_, i) => range.start + i)
  const nowMinutes = useNowMinutes(isToday)
  const top = (minutes: number): number => ((minutes - range.start * 60) / 60) * HOUR_HEIGHT
  const limits = { min: range.start * 60, max: Math.min(range.end * 60, LAST_MINUTE) }

  const gridRef = useRef<HTMLDivElement>(null)
  const minutesAt = (clientY: number): number => minutesIn(clientY - (gridRef.current?.getBoundingClientRect().top ?? 0), range.start, range.end)
  const drag = useTimelineDrag({
    minutesAt,
    limits,
    onCreate: (span) => onCreate(formatHM(span.start), formatHM(span.end)),
    onChange: (key, span) => {
      const block = blocks.find((b) => keyOf(b) === key)
      if (block) onChangeBlock(block, formatHM(span.start), formatHM(span.end))
    },
  })
  const active = drag.drag?.started ? drag.drag : null
  const activeBlock = active?.blockKey ? blocks.find((b) => keyOf(b) === active.blockKey) : undefined

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
        data-timeline-grid
        data-range-start={range.start}
        data-range-end={range.end}
        onPointerDown={(e) => drag.begin(e, 'create')}
        style={{ position: 'absolute', inset: `0 0 0 ${LABEL_WIDTH}px`, cursor: 'copy', touchAction: 'none' }}
      />

      {active && <Ghost span={spanOf(active, limits)} label={activeBlock?.title ?? ''} top={top} />}
      {incoming && <Ghost span={incoming} label={incoming.title} top={top} />}

      {layoutEvents(blocks).map(({ event: block, column, columns }) => {
        const start = toMinutes(block.start)
        const end = toMinutes(block.end)
        const height = Math.max(MIN_HEIGHT, top(end) - top(start) - 2)
        const key = keyOf(block)
        const grab = { key, start, end }
        const edge = (side: 'start' | 'end') => (
          <span
            role="separator"
            aria-label={side === 'start' ? `${block.title} 시작 시간 바꾸기` : `${block.title} 끝 시간 바꾸기`}
            onPointerDown={(e) => drag.begin(e, side === 'start' ? 'resize-start' : 'resize-end', grab)}
            style={{ position: 'absolute', left: 0, right: 0, [side === 'start' ? 'top' : 'bottom']: 0, height: EDGE, cursor: 'ns-resize', touchAction: 'none', zIndex: 1 }}
          />
        )
        return (
          <div
            key={key}
            data-timeline-block={key}
            style={{
              position: 'absolute',
              top: top(start) + 1,
              height,
              left: `calc(${LABEL_WIDTH}px + (100% - ${LABEL_WIDTH}px) * ${column / columns})`,
              width: `calc((100% - ${LABEL_WIDTH}px) / ${columns} - 2px)`,
              opacity: active?.blockKey === key ? 0.35 : 1,
            }}
          >
            <button
              type="button"
              aria-label={`${block.title} ${block.start}~${block.end}`}
              onPointerDown={block.locked ? undefined : (e) => drag.begin(e, 'move', grab)}
              onClick={() => {
                if (!drag.consumeClick()) onOpenBlock(block)
              }}
              style={{
                width: '100%',
                height: '100%',
                padding: '2px 8px',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'flex-start',
                border: 0,
                borderRadius: token.borderRadiusSM,
                color: block.finished ? token.colorTextTertiary : token.colorText,
                textAlign: 'left',
                overflow: 'hidden',
                cursor: block.locked ? 'pointer' : 'grab',
                touchAction: block.locked ? undefined : 'none',
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
            {!block.locked && edge('start')}
            {!block.locked && edge('end')}
          </div>
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
