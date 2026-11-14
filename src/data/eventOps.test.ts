import { describe, expect, it } from 'vitest'
import { deleteOccurrence, editOccurrence, eventFieldsOf, movedFields, moveTaskBy, nextCategoryColor } from './eventOps'
import type { PlanEvent, Task } from './types'

const series: PlanEvent = {
  id: 's',
  date: '2026-11-02',
  start: '13:30',
  end: '14:30',
  title: '회의',
  repeat: { freq: 'weekly', weekdays: [1] },
  updatedAt: 1,
}
const ids = (): (() => string) => {
  let n = 0
  return () => `new${++n}`
}

describe('editOccurrence', () => {
  it('changes a one-off event in place', () => {
    const one = { ...series, id: 'o', repeat: undefined }
    const [e] = editOccurrence([one], 'o', one.date, { ...eventFieldsOf(one), title: '바꿈' }, 'all', 5)
    expect(e).toMatchObject({ id: 'o', title: '바꿈', updatedAt: 5 })
  })

  it('splits one occurrence off a series and skips that date in the series', () => {
    const fields = { ...eventFieldsOf(series), date: '2026-11-10', start: '15:00', end: '16:00' }
    const result = editOccurrence([series], 's', '2026-11-09', fields, 'one', 5, ids())
    expect(result[0].skipDates).toEqual(['2026-11-09'])
    expect(result[1]).toMatchObject({ id: 'new1', date: '2026-11-10', start: '15:00', repeat: undefined, skipDates: undefined })
  })

  it('shifts the whole series by the same number of days when editing all', () => {
    const skipped = { ...series, skipDates: ['2026-11-16'] }
    const fields = { ...eventFieldsOf(skipped), date: '2026-11-10', repeat: { freq: 'weekly' as const, weekdays: [2] } }
    const [e] = editOccurrence([skipped], 's', '2026-11-09', fields, 'all', 5)
    expect(e).toMatchObject({ date: '2026-11-03', skipDates: ['2026-11-17'], repeat: { weekdays: [2] } })
  })
})

describe('deleteOccurrence', () => {
  it('skips just one date or deletes the whole series', () => {
    expect(deleteOccurrence([series], 's', '2026-11-09', 'one', 5)[0].skipDates).toEqual(['2026-11-09'])
    expect(deleteOccurrence([series], 's', '2026-11-09', 'all', 5)[0].deleted).toBe(true)
  })
})

describe('movedFields', () => {
  it('moves a weekly occurrence to another weekday and shifts the weekdays with it', () => {
    const f = movedFields(series, '2026-11-09', { date: '2026-11-11' })
    expect(f).toMatchObject({ date: '2026-11-11', repeat: { weekdays: [3] } })
  })

  it('keeps the length of a multi-day event and of a timed event', () => {
    const trip = { ...series, repeat: undefined, endDate: '2026-11-04' }
    expect(movedFields(trip, trip.date, { date: '2026-11-20' })).toMatchObject({ date: '2026-11-20', endDate: '2026-11-22' })
    expect(movedFields(series, '2026-11-09', { date: '2026-11-09', start: '09:00' })).toMatchObject({ start: '09:00', end: '10:00' })
  })

  it('moves the repeat end with the series', () => {
    const limited = { ...series, repeat: { freq: 'weekly' as const, weekdays: [1], until: '2026-11-30' } }
    expect(movedFields(limited, '2026-11-09', { date: '2026-11-11' }).repeat?.until).toBe('2026-12-02')
  })

  it('changes only the end when resizing', () => {
    expect(movedFields(series, '2026-11-09', { end: '15:15' })).toMatchObject({ start: '13:30', end: '15:15' })
  })
})

describe('moveTaskBy', () => {
  const task: Task = { id: 't', title: '할일', note: '', priority: 'B', order: 1, status: 'todo', date: '2026-11-02', updatedAt: 1 }

  it('moves a task to another day and puts it last in its group there', () => {
    const other = { ...task, id: 'x', date: '2026-11-05', order: 3 }
    const [moved] = moveTaskBy([task, other], 't', 3, undefined, 5)
    expect(moved).toMatchObject({ date: '2026-11-05', order: 4, updatedAt: 5 })
  })

  it('moves the whole period of a long task', () => {
    const long = { ...task, startDate: '2026-11-02', dueDate: '2026-11-06' }
    expect(moveTaskBy([long], 't', 2, undefined, 5)[0]).toMatchObject({ date: '2026-11-04', startDate: '2026-11-04', dueDate: '2026-11-08' })
  })

  it('sets or clears the time', () => {
    expect(moveTaskBy([task], 't', 0, { start: '09:00', end: '10:00' }, 5)[0]).toMatchObject({ startTime: '09:00', endTime: '10:00' })
    const timed = { ...task, startTime: '09:00', endTime: '10:00' }
    const cleared = moveTaskBy([timed], 't', 0, null, 5)[0]
    expect(cleared.startTime).toBeUndefined()
    expect(cleared.endTime).toBeUndefined()
  })
})

describe('nextCategoryColor', () => {
  it('picks the first color not used yet', () => {
    expect(nextCategoryColor([])).toBe('blue')
    expect(nextCategoryColor([{ id: 'a', name: 'a', color: 'blue', order: 1, updatedAt: 1 }])).toBe('green')
  })
})
