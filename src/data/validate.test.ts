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
})
