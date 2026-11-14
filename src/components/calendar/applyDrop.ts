import { moveTask, updateEvent } from '../../data/actions'
import type { CalItem } from '../../data/calendarItems'
import { movedFields, type SeriesScope } from '../../data/eventOps'
import { dDay } from '../../data/logic'
import type { DragPreview } from './dragPreview'
import { formatMinutes } from './gridMetrics'

type AskScope = () => Promise<SeriesScope | null>

/**
 * 끌어서 놓은 결과를 저장한다.
 * keepTimeOnDate: 월 보기 날짜 칸에 놓으면 시간은 그대로 두고, 주·일 보기 '종일' 줄에 놓으면 시간을 뺀다.
 */
export async function applyMove(item: CalItem, to: DragPreview, keepTimeOnDate: boolean, askScope: AskScope): Promise<void> {
  const timed = to.start !== undefined && to.end !== undefined
  const start = timed ? formatMinutes(to.start!) : undefined
  const end = timed ? formatMinutes(to.end!) : undefined

  if (item.kind === 'task') {
    const delta = dDay(to.date, item.date)
    const longTask = item.endDate > item.date
    const time = longTask ? undefined : timed ? { start: start!, end: end! } : keepTimeOnDate ? undefined : null
    if (delta === 0 && (time === undefined || (time && time.start === item.start && time.end === item.end))) return
    if (delta === 0 && time === null && item.allDay) return
    moveTask(item.id, delta, time)
    return
  }

  const event = item.event
  if (!event) return
  const fields = timed
    ? movedFields(event, item.occDate, { date: to.date, start, end, allDay: false })
    : movedFields(event, item.occDate, keepTimeOnDate ? { date: to.date } : { date: to.date, allDay: true })
  const unchanged = fields.date === item.occDate && fields.start === event.start && fields.end === event.end && fields.allDay === event.allDay
  if (unchanged) return
  const scope = item.recurring ? await askScope() : 'all'
  if (scope) updateEvent(event.id, item.occDate, fields, scope)
}

export async function applyResize(item: CalItem, to: DragPreview, askScope: AskScope): Promise<void> {
  if (to.end === undefined) return
  const end = formatMinutes(to.end)
  if (end === item.end) return
  if (item.kind === 'task') {
    moveTask(item.id, 0, { start: item.start!, end })
    return
  }
  if (!item.event) return
  const scope = item.recurring ? await askScope() : 'all'
  if (scope) updateEvent(item.event.id, item.occDate, movedFields(item.event, item.occDate, { end }), scope)
}
