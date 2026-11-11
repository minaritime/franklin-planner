import { describe, expect, it } from 'vitest'
import { hourRange, layoutEvents } from './timeline'
import type { PlanEvent } from './types'

const ev = (id: string, start: string, end: string): PlanEvent => ({ id, date: '2026-11-11', start, end, title: id, updatedAt: 1 })

describe('hourRange', () => {
  it('defaults to 8~22 and widens for early or late events', () => {
    expect(hourRange([])).toEqual({ start: 8, end: 22 })
    expect(hourRange([ev('a', '06:30', '07:00'), ev('b', '22:00', '23:10')])).toEqual({ start: 6, end: 24 })
  })
})

describe('layoutEvents', () => {
  it('puts overlapping events side by side and separate ones full width', () => {
    const placed = layoutEvents([ev('a', '09:00', '11:00'), ev('b', '10:00', '12:00'), ev('c', '13:00', '14:00')])
    const byId = Object.fromEntries(placed.map((p) => [p.event.id, [p.column, p.columns]]))
    expect(byId).toEqual({ a: [0, 2], b: [1, 2], c: [0, 1] })
  })

  it('reuses a column once the earlier event ended', () => {
    const placed = layoutEvents([ev('a', '09:00', '12:00'), ev('b', '09:00', '10:00'), ev('c', '10:00', '11:00')])
    const byId = Object.fromEntries(placed.map((p) => [p.event.id, p.column]))
    expect(byId).toEqual({ a: 0, b: 1, c: 1 })
  })
})
