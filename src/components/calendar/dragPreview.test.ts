import { describe, expect, it } from 'vitest'
import type { CalItem } from '../../data/calendarItems'
import { dragPreview } from './dragPreview'
import type { DragState } from './useCalendarDrag'

const timed: CalItem = {
  key: 'event:e:2026-11-09',
  kind: 'event',
  id: 'e',
  title: '회의',
  date: '2026-11-09',
  endDate: '2026-11-09',
  allDay: false,
  start: '13:30',
  end: '14:30',
  occDate: '2026-11-09',
  recurring: false,
}
const longBar: CalItem = { ...timed, key: 'task:t', kind: 'task', date: '2026-11-03', endDate: '2026-11-09', allDay: true, start: undefined, end: undefined }

const state = (s: Partial<DragState>): DragState => ({ mode: 'move', grabDate: '2026-11-09', grabOffset: 0, target: null, ...s })

describe('dragPreview', () => {
  it('moves a long bar by the days between where it was grabbed and dropped', () => {
    expect(dragPreview(state({ item: longBar, grabDate: '2026-11-05', target: { date: '2026-11-07' } }))).toEqual({ date: '2026-11-05' })
  })

  it('keeps the length and the grab point when moving in the time grid', () => {
    const s = state({ item: timed, grabOffset: 30, target: { date: '2026-11-11', minutes: 17 * 60 + 15 } })
    expect(dragPreview(s)).toEqual({ date: '2026-11-11', start: 16 * 60 + 45, end: 17 * 60 + 45 })
  })

  it('does not let a block run past midnight', () => {
    const s = state({ item: timed, target: { date: '2026-11-09', minutes: 23 * 60 + 45 } })
    expect(dragPreview(s)).toMatchObject({ start: 23 * 60, end: 23 * 60 + 59 })
  })

  it('resizes the end only, at least 15 minutes long', () => {
    expect(dragPreview(state({ mode: 'resize', item: timed, target: { date: '2026-11-09', minutes: 15 * 60 } }))).toEqual({ date: '2026-11-09', start: 810, end: 900 })
    expect(dragPreview(state({ mode: 'resize', item: timed, target: { date: '2026-11-09', minutes: 0 } }))?.end).toBe(825)
  })

  it('creates one hour on a click and the dragged range otherwise', () => {
    expect(dragPreview(state({ mode: 'create', anchorMinutes: 600, target: { date: '2026-11-09', minutes: 600 } }))).toEqual({ date: '2026-11-09', start: 600, end: 660 })
    expect(dragPreview(state({ mode: 'create', anchorMinutes: 600, target: { date: '2026-11-09', minutes: 540 } }))).toEqual({ date: '2026-11-09', start: 540, end: 600 })
  })
})
