import { describe, expect, it } from 'vitest'
import { buildItems, NO_CATEGORY, placeBars, rangeFor, sortForDay, weeksOfMonth } from './calendarItems'
import { EMPTY_DATA, type PlannerData, type Task } from './types'

const task = (id: string, fields: Partial<Task> = {}): Task => ({
  id,
  title: id,
  note: '',
  priority: 'B',
  order: 1,
  status: 'todo',
  date: '2026-11-14',
  updatedAt: 1,
  ...fields,
})

const data: PlannerData = {
  ...EMPTY_DATA,
  categories: [
    { id: 'work', name: '학원', color: 'blue', order: 1, updatedAt: 1 },
    { id: 'gone', name: '지운 것', color: 'red', order: 2, updatedAt: 1, deleted: true },
  ],
  tasks: [
    task('plain'),
    task('work-task', { categoryId: 'work', startTime: '15:00', endTime: '16:00' }),
    task('orphan', { categoryId: 'gone' }),
    task('moved', { status: 'forwarded' }),
    task('removed', { deleted: true }),
    task('long', { date: '2026-11-10', startDate: '2026-11-10', dueDate: '2026-11-16' }),
  ],
  events: [
    { id: 'meet', date: '2026-11-14', start: '13:30', end: '14:30', title: '회의', categoryId: 'work', updatedAt: 1 },
    { id: 'weekly', date: '2026-11-02', start: '09:00', end: '10:00', title: '수업', repeat: { freq: 'weekly' }, updatedAt: 1 },
  ],
}

const keys = (items: readonly { key: string }[]): string[] => items.map((i) => i.key).sort()

describe('buildItems', () => {
  it('collects live tasks and event occurrences in the range', () => {
    const items = buildItems(data, '2026-11-14', '2026-11-16', { hidden: new Set(), query: '' })
    expect(keys(items)).toEqual(['event:meet:2026-11-14', 'event:weekly:2026-11-16', 'task:long', 'task:orphan', 'task:plain', 'task:work-task'])
  })

  it('treats a deleted category as no category', () => {
    const [orphan] = buildItems(data, '2026-11-14', '2026-11-14', { hidden: new Set(), query: '' }).filter((i) => i.id === 'orphan')
    expect(orphan.categoryId).toBeUndefined()
  })

  it('hides categories that were switched off, including the no-category group', () => {
    const items = buildItems(data, '2026-11-14', '2026-11-14', { hidden: new Set([NO_CATEGORY]), query: '' })
    expect(keys(items)).toEqual(['event:meet:2026-11-14', 'task:work-task'])
    const noWork = buildItems(data, '2026-11-14', '2026-11-14', { hidden: new Set(['work']), query: '' })
    expect(noWork.some((i) => i.categoryId === 'work')).toBe(false)
  })

  it('filters by the search words in the title', () => {
    expect(keys(buildItems(data, '2026-11-01', '2026-11-30', { hidden: new Set(), query: ' 회 ' }))).toEqual(['event:meet:2026-11-14'])
  })

  it('makes long tasks and timed tasks into the right shape', () => {
    const items = buildItems(data, '2026-11-14', '2026-11-14', { hidden: new Set(), query: '' })
    expect(items.find((i) => i.id === 'long')).toMatchObject({ date: '2026-11-10', endDate: '2026-11-16', allDay: true })
    expect(items.find((i) => i.id === 'work-task')).toMatchObject({ allDay: false, start: '15:00', end: '16:00' })
  })
})

describe('weeksOfMonth', () => {
  it('starts weeks on Sunday or Monday', () => {
    expect(weeksOfMonth('2026-11-14', 0)[0][0]).toBe('2026-11-01')
    expect(weeksOfMonth('2026-11-14', 1)[0][0]).toBe('2026-10-26')
    expect(weeksOfMonth('2026-11-14', 1).at(-1)?.at(-1)).toBe('2026-12-06')
  })
})

describe('rangeFor', () => {
  it('gives the visible days for each view', () => {
    expect(rangeFor('week', '2026-11-14', 0)).toEqual({ from: '2026-11-08', to: '2026-11-14' })
    expect(rangeFor('week', '2026-11-14', 1)).toEqual({ from: '2026-11-09', to: '2026-11-15' })
    expect(rangeFor('day', '2026-11-14', 0)).toEqual({ from: '2026-11-14', to: '2026-11-14' })
    expect(rangeFor('agenda', '2026-11-14', 0)).toEqual({ from: '2026-11-14', to: '2026-12-25' })
    expect(rangeFor('month', '2026-11-14', 0)).toEqual({ from: '2026-11-01', to: '2026-12-05' })
  })
})

describe('placeBars', () => {
  it('puts overlapping multi-day items on separate lanes inside one week', () => {
    const week = ['2026-11-08', '2026-11-09', '2026-11-10', '2026-11-11', '2026-11-12', '2026-11-13', '2026-11-14']
    const items = buildItems(
      { ...EMPTY_DATA, tasks: [task('a', { date: '2026-11-05', startDate: '2026-11-05', dueDate: '2026-11-10' }), task('b', { date: '2026-11-09', startDate: '2026-11-09', dueDate: '2026-11-20' })] },
      week[0],
      week[6],
      { hidden: new Set(), query: '' },
    )
    const bars = placeBars(items, week)
    expect(bars.map((b) => [b.item.id, b.startCol, b.endCol, b.lane, b.continuesBefore, b.continuesAfter])).toEqual([
      ['a', 0, 2, 0, true, false],
      ['b', 1, 6, 1, false, true],
    ])
  })
})

describe('sortForDay', () => {
  it('puts untimed first, then by time, and finished tasks last', () => {
    const items = buildItems(
      {
        ...EMPTY_DATA,
        tasks: [task('late', { startTime: '18:00', endTime: '19:00' }), task('done', { status: 'done' }), task('a', { priority: 'A' }), task('early', { startTime: '09:00', endTime: '10:00' })],
      },
      '2026-11-14',
      '2026-11-14',
      { hidden: new Set(), query: '' },
    )
    expect(sortForDay(items).map((i) => i.id)).toEqual(['a', 'early', 'late', 'done'])
  })
})
