import { theme } from 'antd'
import type { GlobalToken } from 'antd'
import { placeBars, singleDayItems, sortForDay, type CalItem, type PlacedBar } from '../../data/calendarItems'
import type { Category } from '../../data/types'
import { categoryColor, chipColors } from './colors'
import ItemChip from './ItemChip'
import type { CalendarDrag } from './useCalendarDrag'

interface MonthViewProps {
  readonly weeks: readonly (readonly string[])[]
  readonly month: string
  readonly today: string
  readonly items: readonly CalItem[]
  readonly categories: readonly Category[]
  readonly compact: boolean
  readonly drag: CalendarDrag
  readonly onOpenItem: (item: CalItem) => void
  readonly onOpenDay: (date: string) => void
  readonly onCreate: (date: string) => void
}

const WEEKDAY_NAMES = ['일', '월', '화', '수', '목', '금', '토']
const DATE_ROW = 30
const LINE = 24
/** 한 칸에 보여 줄 줄 수 (여러 날 막대 포함). 넘치면 '+N개 더' */
const MAX_LINES = 4

const dayOfWeek = (date: string): number => new Date(`${date}T00:00:00Z`).getUTCDay()

function dateColor(date: string, inMonth: boolean, token: GlobalToken): string {
  if (!inMonth) return token.colorTextQuaternary
  const d = dayOfWeek(date)
  if (d === 0) return token.colorError
  if (d === 6) return token.colorPrimary
  return token.colorText
}

function Bar({ bar, props }: { bar: PlacedBar; props: MonthViewProps }) {
  const left = bar.continuesBefore ? 0 : 4
  const right = bar.continuesAfter ? 0 : 4
  return (
    <div
      style={{
        position: 'absolute',
        top: DATE_ROW + bar.lane * LINE,
        left: `calc(${(bar.startCol / 7) * 100}% + ${left}px)`,
        width: `calc(${((bar.endCol - bar.startCol + 1) / 7) * 100}% - ${left + right}px)`,
        zIndex: 1,
      }}
    >
      <ItemChip
        item={bar.item}
        color={categoryColor(props.categories, bar.item.categoryId)}
        onOpen={props.onOpenItem}
        onDragStart={props.drag.beginMove}
        style={{
          borderRadius: `${bar.continuesBefore ? 0 : 3}px ${bar.continuesAfter ? 0 : 3}px ${bar.continuesAfter ? 0 : 3}px ${bar.continuesBefore ? 0 : 3}px`,
          borderInlineStartWidth: bar.continuesBefore ? 0 : 3,
        }}
      />
    </div>
  )
}

function CompactDots({ items, categories }: { items: readonly CalItem[]; categories: readonly Category[] }) {
  const { token } = theme.useToken()
  return (
    <div style={{ display: 'flex', gap: 3, justifyContent: 'center', flexWrap: 'wrap' }}>
      {items.slice(0, 6).map((i) => (
        <span
          key={i.key}
          style={{ width: 5, height: 5, borderRadius: '50%', background: chipColors(token, categoryColor(categories, i.categoryId)).line }}
        />
      ))}
    </div>
  )
}

function DayCell({ date, col, lanes, props, highlight }: { date: string; col: number; lanes: number; props: MonthViewProps; highlight: boolean }) {
  const { token } = theme.useToken()
  const inMonth = date.startsWith(props.month)
  const isToday = date === props.today
  const singles = sortForDay(singleDayItems(props.items, date))
  const room = Math.max(0, MAX_LINES - lanes)
  const shown = singles.length > room ? singles.slice(0, Math.max(0, room - 1)) : singles
  const hiddenCount = singles.length - shown.length
  const border = `1px solid ${token.colorSplit}`

  return (
    <div
      data-drop-date={date}
      role="gridcell"
      aria-label={date}
      onClick={() => (props.compact ? props.onOpenDay(date) : props.onCreate(date))}
      style={{
        minHeight: props.compact ? 64 : DATE_ROW + MAX_LINES * LINE + 8,
        padding: props.compact ? '4px 2px' : '0 4px 4px',
        borderInlineEnd: col < 6 ? border : undefined,
        background: highlight ? token.colorPrimaryBgHover : isToday ? token.colorPrimaryBg : inMonth ? undefined : token.colorFillQuaternary,
        cursor: 'pointer',
        minWidth: 0,
      }}
    >
      <div style={{ height: DATE_ROW, display: 'flex', alignItems: 'center', justifyContent: props.compact ? 'center' : 'flex-start' }}>
        <button
          type="button"
          className="num"
          aria-label={`${date} 하루 보기`}
          onClick={(e) => {
            e.stopPropagation()
            props.onOpenDay(date)
          }}
          style={{
            minWidth: 24,
            height: 24,
            padding: '0 4px',
            border: 0,
            borderRadius: token.borderRadiusSM,
            cursor: 'pointer',
            fontSize: 13,
            fontWeight: isToday ? 600 : 500,
            color: isToday ? token.colorTextLightSolid : dateColor(date, inMonth, token),
            background: isToday ? token.colorPrimary : 'transparent',
          }}
        >
          {Number(date.slice(8))}
        </button>
      </div>
      {props.compact ? (
        <CompactDots items={props.items.filter((i) => i.date <= date && i.endDate >= date)} categories={props.categories} />
      ) : (
        <div style={{ marginTop: lanes * LINE, display: 'flex', flexDirection: 'column', gap: 2 }}>
          {shown.map((item) => (
            <ItemChip
              key={item.key}
              item={item}
              color={categoryColor(props.categories, item.categoryId)}
              onOpen={props.onOpenItem}
              onDragStart={props.drag.beginMove}
            />
          ))}
          {hiddenCount > 0 && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation()
                props.onOpenDay(date)
              }}
              style={{ border: 0, background: 'none', padding: 0, cursor: 'pointer', fontSize: 12, color: token.colorPrimary, textAlign: 'center' }}
            >
              +{hiddenCount}개 더
            </button>
          )}
        </div>
      )}
    </div>
  )
}

export default function MonthView(props: MonthViewProps) {
  const { token } = theme.useToken()
  const border = `1px solid ${token.colorSplit}`
  const dragTarget = props.drag.drag?.mode === 'move' ? props.drag.drag.target?.date : undefined

  return (
    <div role="grid" aria-label="월 달력">
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, minmax(0, 1fr))', borderBottom: border }}>
        {props.weeks[0].map((date) => (
          <div
            key={date}
            style={{ fontSize: 12, padding: '8px 0', textAlign: 'center', color: dateColor(date, true, token) === token.colorText ? token.colorTextSecondary : dateColor(date, true, token) }}
          >
            {WEEKDAY_NAMES[dayOfWeek(date)]}
          </div>
        ))}
      </div>
      {props.weeks.map((week) => {
        const bars = props.compact ? [] : placeBars(props.items, week)
        const lanes = bars.reduce((m, b) => Math.max(m, b.lane + 1), 0)
        return (
          <div key={week[0]} role="row" style={{ position: 'relative', display: 'grid', gridTemplateColumns: 'repeat(7, minmax(0, 1fr))', borderBottom: border }}>
            {week.map((date, col) => (
              <DayCell key={date} date={date} col={col} lanes={lanes} props={props} highlight={dragTarget === date} />
            ))}
            {bars.map((bar) => (
              <Bar key={bar.item.key} bar={bar} props={props} />
            ))}
          </div>
        )
      })}
    </div>
  )
}
