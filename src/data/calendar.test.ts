import { describe, expect, it } from 'vitest'
import { dayItems, isMultiDay, monthGrid, weekBars } from './calendar'
import type { Task } from './types'

function task(partial: Partial<Task> & Pick<Task, 'id'>): Task {
  return { title: partial.id, note: '', priority: 'A', order: 1, status: 'todo', date: '2026-11-11', updatedAt: 1, ...partial }
}

describe('monthGrid', () => {
  it('starts on Sunday and covers whole weeks', () => {
    const weeks = monthGrid(2026, 11)
    expect(weeks[0][0]).toBe('2026-11-01')
    expect(weeks.every((w) => w.length === 7)).toBe(true)
    expect(weeks.at(-1)!.at(-1)).toBe('2026-12-05')
  })

  it('pads the first week with previous month days', () => {
    expect(monthGrid(2026, 12)[0][0]).toBe('2026-11-29')
  })
})

describe('isMultiDay', () => {
  it('needs a due date after the start', () => {
    expect(isMultiDay(task({ id: 'a', startDate: '2026-11-11', dueDate: '2026-11-13' }))).toBe(true)
    expect(isMultiDay(task({ id: 'b', dueDate: '2026-11-11' }))).toBe(false)
    expect(isMultiDay(task({ id: 'c' }))).toBe(false)
  })
})

describe('weekBars', () => {
  const week = ['2026-11-08', '2026-11-09', '2026-11-10', '2026-11-11', '2026-11-12', '2026-11-13', '2026-11-14']

  it('clips bars to the week and marks whether they continue', () => {
    const bars = weekBars([task({ id: 'a', startDate: '2026-11-01', dueDate: '2026-11-10' })], week)
    expect(bars).toEqual([{ task: expect.objectContaining({ id: 'a' }), startCol: 0, endCol: 2, lane: 0, continuesBefore: true, continuesAfter: false }])
  })

  it('stacks overlapping bars into separate lanes and reuses free lanes', () => {
    const bars = weekBars(
      [
        task({ id: 'a', startDate: '2026-11-08', dueDate: '2026-11-10' }),
        task({ id: 'b', startDate: '2026-11-09', dueDate: '2026-11-12' }),
        task({ id: 'c', startDate: '2026-11-11', dueDate: '2026-11-14' }),
      ],
      week,
    )
    expect(Object.fromEntries(bars.map((b) => [b.task.id, b.lane]))).toEqual({ a: 0, b: 1, c: 0 })
  })

  it('skips forwarded copies, single-day tasks and tasks outside the week', () => {
    const bars = weekBars(
      [
        task({ id: 'fwd', startDate: '2026-11-08', dueDate: '2026-11-10', status: 'forwarded' }),
        task({ id: 'single' }),
        task({ id: 'later', startDate: '2026-11-20', dueDate: '2026-11-22' }),
      ],
      week,
    )
    expect(bars).toEqual([])
  })
})

describe('dayItems', () => {
  it('lists single-day tasks for the date sorted by priority, excluding forwarded and multi-day', () => {
    const items = dayItems(
      [
        task({ id: 'c', priority: 'C' }),
        task({ id: 'a', priority: 'A' }),
        task({ id: 'fwd', status: 'forwarded' }),
        task({ id: 'multi', startDate: '2026-11-11', dueDate: '2026-11-15' }),
        task({ id: 'gone', deleted: true }),
      ],
      '2026-11-11',
    )
    expect(items.map((t) => t.id)).toEqual(['a', 'c'])
  })
})
