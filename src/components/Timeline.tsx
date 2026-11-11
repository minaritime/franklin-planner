import { theme, Typography } from 'antd'
import { useEffect, useState, type CSSProperties, type MouseEvent } from 'react'
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
}

interface TimelineProps {
  readonly isToday: boolean
  readonly blocks: readonly TimelineBlock[]
  readonly onOpenBlock: (block: TimelineBlock) => void
  readonly onOpenEmpty: (hour: number) => void
}

const HOUR_HEIGHT = 48
const LABEL_WIDTH = 40

function useNowMinutes(enabled: boolean): number {
  const [now, setNow] = useState(() => new Date())
  useEffect(() => {
    if (!enabled) return
    const id = window.setInterval(() => setNow(new Date()), 60_000)
    return () => window.clearInterval(id)
  }, [enabled])
  return now.getHours() * 60 + now.getMinutes()
}

export default function Timeline({ isToday, blocks, onOpenBlock, onOpenEmpty }: TimelineProps) {
  const { token } = theme.useToken()
  const range = hourRange(blocks)
  const hours = Array.from({ length: range.end - range.start }, (_, i) => range.start + i)
  const nowMinutes = useNowMinutes(isToday)
  const top = (minutes: number): number => ((minutes - range.start * 60) / 60) * HOUR_HEIGHT

  const onGridClick = (e: MouseEvent<HTMLDivElement>): void => {
    const y = e.clientY - e.currentTarget.getBoundingClientRect().top
    onOpenEmpty(Math.min(range.end - 1, range.start + Math.floor(y / HOUR_HEIGHT)))
  }

  /** 일정은 파란 바탕, 할일은 우선순위 색 테두리의 흰 바탕으로 구분한다 */
  const blockStyle = (block: TimelineBlock): CSSProperties => {
    if (block.kind === 'event') {
      return { background: token.colorPrimaryBg, borderInlineStart: `2px solid ${token.colorPrimary}` }
    }
    const color = block.finished ? token.colorBorder : token[PRIORITY_COLOR_TOKEN[block.priority ?? 'B']]
    return {
      background: token.colorBgContainer,
      border: `1px solid ${token.colorBorderSecondary}`,
      borderInlineStart: `2px solid ${color}`,
    }
  }

  return (
    <div style={{ position: 'relative', height: hours.length * HOUR_HEIGHT, marginTop: 8 }}>
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
        role="button"
        aria-label="일정 추가"
        onClick={onGridClick}
        style={{ position: 'absolute', inset: `0 0 0 ${LABEL_WIDTH}px`, cursor: 'copy' }}
      />

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
