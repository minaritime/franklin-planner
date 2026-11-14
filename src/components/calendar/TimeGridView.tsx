import { PlusOutlined } from '@ant-design/icons'
import { Button, theme, Typography } from 'antd'
import { useEffect, useRef } from 'react'
import { placeBars, singleDayItems, sortForDay, type CalItem } from '../../data/calendarItems'
import { layoutEvents } from '../../data/timeline'
import type { Category } from '../../data/types'
import { categoryColor } from './colors'
import { HOUR_HEIGHT } from './gridMetrics'
import ItemChip from './ItemChip'
import TimeBlock, { DragGhost } from './TimeBlock'
import { useNowMinutes } from './useNowMinutes'
import type { CalendarDrag } from './useCalendarDrag'

interface TimeGridViewProps {
  readonly days: readonly string[]
  readonly today: string
  readonly items: readonly CalItem[]
  readonly categories: readonly Category[]
  readonly drag: CalendarDrag
  readonly onOpenItem: (item: CalItem) => void
  readonly onOpenDay: (date: string) => void
  readonly onCreateAllDay: (date: string) => void
}

const LABEL_WIDTH = 52
const LINE = 24
const DEFAULT_SCROLL_HOUR = 8
const LABEL_TOP_ROOM = 12
const WEEKDAY_NAMES = ['일', '월', '화', '수', '목', '금', '토']
const HOURS = Array.from({ length: 24 }, (_, h) => h)

const dayOfWeek = (date: string): number => new Date(`${date}T00:00:00Z`).getUTCDay()

function DayHeaders({ days, today, onOpenDay }: Pick<TimeGridViewProps, 'days' | 'today' | 'onOpenDay'>) {
  const { token } = theme.useToken()
  return (
    <div style={{ display: 'flex', borderBottom: `1px solid ${token.colorSplit}` }}>
      <div style={{ width: LABEL_WIDTH, flex: 'none' }} />
      {days.map((date) => {
        const d = dayOfWeek(date)
        const isToday = date === today
        return (
          <button
            key={date}
            type="button"
            onClick={() => onOpenDay(date)}
            aria-label={`${date} 하루 보기`}
            style={{
              flex: 1,
              minWidth: 0,
              padding: '10px 0',
              border: 0,
              background: 'none',
              cursor: 'pointer',
              fontSize: 14,
              fontWeight: 600,
              color: isToday ? token.colorPrimary : d === 0 ? token.colorError : d === 6 ? token.colorPrimary : token.colorText,
            }}
          >
            {WEEKDAY_NAMES[d]}{' '}
            <span
              className="num"
              style={isToday ? { display: 'inline-block', padding: '0 6px', borderRadius: 4, color: token.colorTextLightSolid, background: token.colorPrimary } : undefined}
            >
              {Number(date.slice(8))}
            </span>
          </button>
        )
      })}
    </div>
  )
}

function AllDayRow(props: TimeGridViewProps) {
  const { token } = theme.useToken()
  const { days, items, categories, drag } = props
  const bars = placeBars(items, days)
  const lanes = bars.reduce((m, b) => Math.max(m, b.lane + 1), 0)
  const singles = days.map((d) => sortForDay(singleDayItems(items, d).filter((i) => i.allDay)))
  const rows = lanes + Math.max(0, ...singles.map((s) => s.length))
  const target = drag.drag?.mode === 'move' && drag.drag.target?.minutes === undefined ? drag.drag.target?.date : undefined

  return (
    <div style={{ display: 'flex', borderBottom: `1px solid ${token.colorSplit}` }}>
      <Typography.Text type="secondary" style={{ width: LABEL_WIDTH, flex: 'none', fontSize: 12, padding: '6px 0 0 8px' }}>
        종일
      </Typography.Text>
      <div style={{ flex: 1, position: 'relative', display: 'flex', minHeight: 28 + rows * LINE }}>
        {days.map((date, col) => (
          <div
            key={date}
            data-drop-date={date}
            style={{
              flex: 1,
              minWidth: 0,
              padding: `26px 3px 4px`,
              borderInlineStart: `1px solid ${token.colorSplit}`,
              background: target === date ? token.colorPrimaryBgHover : undefined,
            }}
          >
            <Button
              type="text"
              size="small"
              icon={<PlusOutlined />}
              aria-label={`${date} 종일 추가`}
              onClick={() => props.onCreateAllDay(date)}
              style={{ position: 'absolute', top: 2, left: `calc(${(col / days.length) * 100}% + 2px)`, width: 22, height: 22 }}
            />
            <div style={{ marginTop: lanes * LINE, display: 'flex', flexDirection: 'column', gap: 2 }}>
              {singles[col].map((item) => (
                <ItemChip key={item.key} item={item} color={categoryColor(categories, item.categoryId)} onOpen={props.onOpenItem} onDragStart={drag.beginMove} />
              ))}
            </div>
          </div>
        ))}
        {bars.map((bar) => (
          <div
            key={bar.item.key}
            style={{
              position: 'absolute',
              top: 26 + bar.lane * LINE,
              left: `calc(${(bar.startCol / days.length) * 100}% + 3px)`,
              width: `calc(${((bar.endCol - bar.startCol + 1) / days.length) * 100}% - 6px)`,
            }}
          >
            <ItemChip item={bar.item} color={categoryColor(categories, bar.item.categoryId)} onOpen={props.onOpenItem} onDragStart={drag.beginMove} />
          </div>
        ))}
      </div>
    </div>
  )
}

function DayColumn({ date, props, nowMinutes }: { date: string; props: TimeGridViewProps; nowMinutes: number }) {
  const { token } = theme.useToken()
  const { drag, categories } = props
  const timed = props.items.filter((i) => !i.allDay && i.date === date && i.start && i.end) as (CalItem & { start: string; end: string })[]
  const state = drag.drag
  const draggingKey = state && state.mode !== 'create' ? state.item?.key : undefined

  return (
    <div
      data-drop-col={date}
      onPointerDown={(e) => {
        if (e.target === e.currentTarget) drag.beginCreate(e)
      }}
      style={{
        position: 'relative',
        flex: 1,
        minWidth: 0,
        height: 24 * HOUR_HEIGHT,
        borderInlineStart: `1px solid ${token.colorSplit}`,
        backgroundImage: `repeating-linear-gradient(to bottom, ${token.colorSplit} 0 1px, transparent 1px ${HOUR_HEIGHT}px)`,
        cursor: 'copy',
        touchAction: 'none',
      }}
    >
      {layoutEvents(timed).map(({ event: item, column, columns }) => (
        <TimeBlock
          key={item.key}
          item={item}
          color={categoryColor(categories, item.categoryId)}
          column={column}
          columns={columns}
          dimmed={item.key === draggingKey}
          drag={drag}
          onOpen={props.onOpenItem}
        />
      ))}
      {state && <DragGhost state={state} date={date} />}
      {date === props.today && (
        <div style={{ position: 'absolute', top: (nowMinutes / 60) * HOUR_HEIGHT, left: 0, right: 0, borderTop: `2px solid ${token.colorError}`, pointerEvents: 'none', zIndex: 3 }} />
      )}
    </div>
  )
}

export default function TimeGridView(props: TimeGridViewProps) {
  const { token } = theme.useToken()
  const scrollRef = useRef<HTMLDivElement>(null)
  const nowMinutes = useNowMinutes(props.days.includes(props.today))
  const firstDay = props.days[0]
  const showsToday = props.days.includes(props.today)

  // 처음 열 때 아침 8시(오늘이 보이면 지금 시각 조금 위)부터 보이게
  useEffect(() => {
    const el = scrollRef.current
    if (!el) return
    const hour = showsToday ? Math.max(0, Math.min(DEFAULT_SCROLL_HOUR, Math.floor(new Date().getHours()) - 1)) : DEFAULT_SCROLL_HOUR
    // 맨 위 시각 글자가 잘리지 않게 조금 덜 내린다
    el.scrollTop = Math.max(0, hour * HOUR_HEIGHT - LABEL_TOP_ROOM)
  }, [firstDay, showsToday])

  return (
    <div>
      <DayHeaders days={props.days} today={props.today} onOpenDay={props.onOpenDay} />
      <AllDayRow {...props} />
      <div ref={scrollRef} style={{ height: 'max(420px, calc(100vh - 330px))', overflowY: 'auto', position: 'relative' }}>
        <div style={{ display: 'flex' }}>
          <div style={{ width: LABEL_WIDTH, flex: 'none', position: 'relative' }}>
            {HOURS.slice(1).map((h) => (
              <span
                key={h}
                className="num"
                style={{ position: 'absolute', top: h * HOUR_HEIGHT - 8, right: 8, fontSize: 11, color: token.colorTextTertiary }}
              >
                {String(h).padStart(2, '0')}:00
              </span>
            ))}
          </div>
          {props.days.map((date) => (
            <DayColumn key={date} date={date} props={props} nowMinutes={nowMinutes} />
          ))}
        </div>
      </div>
    </div>
  )
}

