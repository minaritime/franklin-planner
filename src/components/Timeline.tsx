import { theme, Typography } from 'antd'
import { useEffect, useState, type MouseEvent } from 'react'
import { hourRange, layoutEvents, toMinutes } from '../data/timeline'
import type { PlanEvent } from '../data/types'
import type { EventDraft } from './EventModal'

interface TimelineProps {
  readonly date: string
  readonly isToday: boolean
  readonly events: readonly PlanEvent[]
  readonly onOpen: (draft: EventDraft) => void
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

export default function Timeline({ date, isToday, events, onOpen }: TimelineProps) {
  const { token } = theme.useToken()
  const range = hourRange(events)
  const hours = Array.from({ length: range.end - range.start }, (_, i) => range.start + i)
  const nowMinutes = useNowMinutes(isToday)
  const top = (minutes: number): number => ((minutes - range.start * 60) / 60) * HOUR_HEIGHT

  const onGridClick = (e: MouseEvent<HTMLDivElement>): void => {
    const y = e.clientY - e.currentTarget.getBoundingClientRect().top
    onOpen({ date, hour: Math.min(range.end - 1, range.start + Math.floor(y / HOUR_HEIGHT)) })
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

      {layoutEvents(events).map(({ event, column, columns }) => {
        const start = toMinutes(event.start)
        const end = toMinutes(event.end)
        const height = Math.max(20, top(end) - top(start) - 2)
        return (
          <button
            key={event.id}
            type="button"
            onClick={() => onOpen({ event })}
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
              borderInlineStart: `2px solid ${token.colorPrimary}`,
              borderRadius: token.borderRadiusSM,
              background: token.colorPrimaryBg,
              color: token.colorText,
              textAlign: 'left',
              overflow: 'hidden',
              cursor: 'pointer',
              fontSize: 12,
              lineHeight: '18px',
            }}
          >
            <div style={{ fontWeight: 500, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{event.title}</div>
            {height >= 40 && (
              <div className="num" style={{ color: token.colorTextSecondary }}>
                {event.start}~{event.end}
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
