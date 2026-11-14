import { describe, expect, it } from 'vitest'
import { parsePlannerData } from './validate'

const goodTask = { id: 't', title: '할일', note: '', priority: 'A', order: 1, status: 'todo', date: '2026-11-11', updatedAt: 1 }

describe('parsePlannerData', () => {
  it('rejects wrong top-level shapes', () => {
    expect(parsePlannerData(null)).toBeNull()
    expect(parsePlannerData({ version: 2, tasks: [], events: [], notes: [], goals: [] })).toBeNull()
    expect(parsePlannerData({ version: 1, tasks: {}, events: [], notes: [], goals: [] })).toBeNull()
  })

  it('drops only the broken items', () => {
    const parsed = parsePlannerData({
      version: 1,
      tasks: [goodTask, null, { ...goodTask, id: 'x', date: '11/11' }, { ...goodTask, id: 'y', updatedAt: undefined }, { ...goodTask, id: 'z', priority: 'D' }],
      events: [
        { id: 'e', date: '2026-11-11', start: '09:00', end: '10:00', title: '수업', updatedAt: 1 },
        { id: 'bad', date: '2026-11-11', start: '9시', end: '10:00', title: '수업', updatedAt: 1 },
      ],
      notes: [{ date: '2026-11-11', text: '메모', updatedAt: 1 }, { date: '2026-11-11', text: 3, updatedAt: 1 }],
      goals: [{ id: 'g', title: '목표', kind: 'goal', description: '', updatedAt: 1 }, { id: 'g2', kind: 'goal' }],
    })
    expect(parsed?.tasks.map((t) => t.id)).toEqual(['t'])
    expect(parsePlannerData({ version: 1, tasks: [{ ...goodTask, startTime: '15:00', endTime: '16:00' }, { ...goodTask, id: 'bt', startTime: '3시' }], events: [], notes: [], goals: [] })?.tasks.map((t) => t.id)).toEqual(['t'])
    expect(parsed?.events.map((e) => e.id)).toEqual(['e'])
    expect(parsed?.notes).toHaveLength(1)
    expect(parsed?.goals.map((g) => g.id)).toEqual(['g'])
  })

  it('treats missing categories as empty (data saved before categories existed)', () => {
    expect(parsePlannerData({ version: 1, tasks: [], events: [], notes: [], goals: [] })?.categories).toEqual([])
  })

  it('keeps valid categories and drops broken ones', () => {
    const parsed = parsePlannerData({
      version: 1,
      tasks: [{ ...goodTask, categoryId: 'c1' }, { ...goodTask, id: 'bad-cat', categoryId: 3 }],
      events: [],
      notes: [],
      goals: [],
      categories: [
        { id: 'c1', name: '학원', color: 'blue', order: 1, updatedAt: 1 },
        { id: 'c2', name: '개인', color: 'pink-ish', order: 2, updatedAt: 1 },
        { id: 'c3', name: '', color: 'green', order: 3, updatedAt: 1 },
      ],
    })
    expect(parsed?.categories.map((c) => c.id)).toEqual(['c1'])
    expect(parsed?.tasks.map((t) => t.id)).toEqual(['t'])
  })

  it('accepts the richer event fields and rejects broken ones', () => {
    const base = { id: 'e', date: '2026-11-11', start: '09:00', end: '10:00', title: '수업', updatedAt: 1 }
    const events = [
      { ...base, endDate: '2026-11-13', allDay: true, place: '본관', note: '메모', categoryId: 'c1' },
      { ...base, id: 'rep', repeat: { freq: 'weekly', weekdays: [1, 3], until: '2026-12-31' }, skipDates: ['2026-11-18'] },
      { ...base, id: 'bad-freq', repeat: { freq: 'yearly' } },
      { ...base, id: 'bad-day', repeat: { freq: 'weekly', weekdays: [7] } },
      { ...base, id: 'bad-end', endDate: '2026-11-10' },
      { ...base, id: 'bad-skip', skipDates: ['11/18'] },
    ]
    const parsed = parsePlannerData({ version: 1, tasks: [], events, notes: [], goals: [] })
    expect(parsed?.events.map((e) => e.id)).toEqual(['e', 'rep'])
  })
})
