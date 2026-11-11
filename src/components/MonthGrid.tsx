import { theme, Typography } from 'antd'
import type { GlobalToken } from 'antd'
import type { CSSProperties } from 'react'
import { dayItems, weekBars, type WeekBar } from '../data/calendar'
import type { PlanEvent, Task } from '../data/types'
import { PRIORITY_COLOR_TOKEN } from '../theme'

interface MonthGridProps {
  readonly weeks: readonly (readonly string[])[]
  readonly month: string
  readonly today: string
  readonly tasks: readonly Task[]
  readonly events: readonly PlanEvent[]
  readonly compact: boolean
  readonly onOpenDay: (date: string) => void
  readonly onOpenTask: (task: Task) => void
}

const WEEKDAYS = ['일', '월', '화', '수', '목', '금', '토']
const DATE_ROW = 32
const LANE = { full: 22, compact: 6 }
const BAR_HEIGHT = { full: 20, compact: 4 }
const MAX_ITEMS = 3

function dateColor(col: number, inMonth: boolean, token: GlobalToken): string {
  if (!inMonth) return token.colorTextQuaternary
  if (col === 0) return token.colorError
  if (col === 6) return token.colorPrimary
  return token.colorText
}

function Bar({ bar, compact, today, onOpen }: { bar: WeekBar; compact: boolean; today: string; onOpen: (t: Task) => void }) {
  const { token } = theme.useToken()
  const { task } = bar
  const finished = task.status !== 'todo'
  const overdue = !finished && task.dueDate! < today
  const lane = compact ? LANE.compact : LANE.full
  const radius = token.borderRadiusSM
  const style: CSSProperties = {
    position: 'absolute',
    top: DATE_ROW + bar.lane * lane,
    left: `calc(${(bar.startCol / 7) * 100}% + ${bar.continuesBefore ? 0 : 4}px)`,
    width: `calc(${((bar.endCol - bar.startCol + 1) / 7) * 100}% - ${(bar.continuesBefore ? 0 : 4) + (bar.continuesAfter ? 0 : 4)}px)`,
    height: compact ? BAR_HEIGHT.compact : BAR_HEIGHT.full,
    borderRadius: `${bar.continuesBefore ? 0 : radius}px ${bar.continuesAfter ? 0 : radius}px ${bar.continuesAfter ? 0 : radius}px ${bar.continuesBefore ? 0 : radius}px`,
    background: finished ? token.colorFillTertiary : compact ? token[PRIORITY_COLOR_TOKEN[task.priority]] : token.colorPrimaryBg,
    border: 0,
    padding: compact ? 0 : '0 8px',
    display: 'flex',
    alignItems: 'center',
    gap: 4,
    fontSize: 12,
    lineHeight: '20px',
    color: overdue ? token.colorError : finished ? token.colorTextTertiary : token.colorText,
    textDecoration: task.status === 'done' || task.status === 'cancelled' ? 'line-through' : undefined,
    cursor: 'pointer',
    overflow: 'hidden',
    whiteSpace: 'nowrap',
    zIndex: 1,
  }
  return (
    <button
      type="button"
      style={style}
      title={`${task.title} (~${task.dueDate!.slice(5).replace('-', '/')})`}
      onClick={(e) => {
        e.stopPropagation()
        onOpen(task)
      }}
    >
      {!compact && (
        <>
          <span style={{ color: token[PRIORITY_COLOR_TOKEN[task.priority]], fontWeight: 500 }}>{task.priority}</span>
          <span style={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>{task.title}</span>
        </>
      )}
    </button>
  )
}

function CellItems({ date, tasks, events }: { date: string; tasks: readonly Task[]; events: readonly PlanEvent[] }) {
  const { token } = theme.useToken()
  const items = [...dayItems(tasks, date)].sort((a, b) => Number(a.status !== 'todo') - Number(b.status !== 'todo'))
  const dayEvents = events.filter((e) => e.date === date && !e.deleted).sort((a, b) => a.start.localeCompare(b.start))
  const total = items.length + dayEvents.length
  const shownTasks = items.slice(0, MAX_ITEMS)
  const shownEvents = dayEvents.slice(0, MAX_ITEMS - shownTasks.length)
  const line: CSSProperties = { fontSize: 12, lineHeight: '20px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }

  return (
    <>
      {shownTasks.map((t) => {
        const finished = t.status !== 'todo'
        return (
          <div key={t.id} style={{ ...line, display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={{ width: 6, height: 6, flex: 'none', borderRadius: '50%', background: finished ? token.colorTextQuaternary : token[PRIORITY_COLOR_TOKEN[t.priority]] }} />
            <span
              style={{
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                color: finished ? token.colorTextTertiary : token.colorText,
                textDecoration: t.status === 'done' || t.status === 'cancelled' ? 'line-through' : undefined,
              }}
            >
              {t.startTime && <span className="num">{t.startTime} </span>}
              {t.title}
            </span>
          </div>
        )
      })}
      {shownEvents.map((e) => (
        <div key={e.id} style={{ ...line, color: token.colorTextSecondary }}>
          <span className="num">{e.start}</span> {e.title}
        </div>
      ))}
      {total > MAX_ITEMS && (
        <Typography.Text type="secondary" style={{ fontSize: 12, lineHeight: '20px' }}>
          +{total - MAX_ITEMS}개
        </Typography.Text>
      )}
    </>
  )
}

function CompactDots({ date, tasks }: { date: string; tasks: readonly Task[] }) {
  const { token } = theme.useToken()
  const items = dayItems(tasks, date).slice(0, 4)
  return (
    <div style={{ display: 'flex', gap: 3, justifyContent: 'center' }}>
      {items.map((t) => (
        <span
          key={t.id}
          style={{ width: 5, height: 5, borderRadius: '50%', background: t.status === 'todo' ? token[PRIORITY_COLOR_TOKEN[t.priority]] : token.colorTextQuaternary }}
        />
      ))}
    </div>
  )
}

export default function MonthGrid({ weeks, month, today, tasks, events, compact, onOpenDay, onOpenTask }: MonthGridProps) {
  const { token } = theme.useToken()
  const border = `1px solid ${token.colorSplit}`

  return (
    <div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', borderBottom: border }}>
        {WEEKDAYS.map((w, i) => (
          <Typography.Text
            key={w}
            type="secondary"
            style={{ fontSize: 12, padding: '8px 0', textAlign: 'center', color: i === 0 ? token.colorError : i === 6 ? token.colorPrimary : undefined }}
          >
            {w}
          </Typography.Text>
        ))}
      </div>
      {weeks.map((week) => {
        const bars = weekBars(tasks, week)
        const lanes = bars.reduce((m, b) => Math.max(m, b.lane + 1), 0)
        const laneSpace = lanes * (compact ? LANE.compact : LANE.full) + (lanes > 0 ? 2 : 0)
        return (
          <div key={week[0]} style={{ position: 'relative', display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', borderBottom: border }}>
            {week.map((date, col) => {
              const inMonth = date.startsWith(month)
              const isToday = date === today
              return (
                <div
                  key={date}
                  role="button"
                  aria-label={date}
                  onClick={() => onOpenDay(date)}
                  style={{
                    minHeight: compact ? 64 : 120,
                    padding: compact ? '4px 2px' : '4px 8px 8px',
                    borderInlineEnd: col < 6 ? border : undefined,
                    background: inMonth ? undefined : token.colorFillQuaternary,
                    cursor: 'pointer',
                    minWidth: 0,
                  }}
                >
                  <div style={{ height: DATE_ROW - 4, display: 'flex', justifyContent: compact ? 'center' : 'flex-start', alignItems: 'center' }}>
                    <span
                      className="num"
                      style={{
                        minWidth: 24,
                        height: 24,
                        padding: '0 4px',
                        borderRadius: 12,
                        display: 'inline-flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: 12,
                        fontWeight: isToday ? 500 : 400,
                        color: isToday ? token.colorTextLightSolid : dateColor(col, inMonth, token),
                        background: isToday ? token.colorPrimary : undefined,
                      }}
                    >
                      {Number(date.slice(8))}
                    </span>
                  </div>
                  <div style={{ marginTop: laneSpace }}>
                    {compact ? <CompactDots date={date} tasks={tasks} /> : <CellItems date={date} tasks={tasks} events={events} />}
                  </div>
                </div>
              )
            })}
            {bars.map((bar) => (
              <Bar key={bar.task.id} bar={bar} compact={compact} today={today} onOpen={onOpenTask} />
            ))}
          </div>
        )
      })}
    </div>
  )
}
