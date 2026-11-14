import { describe, expect, it } from 'vitest'
import { expandEvents, occursOn } from './recurrence'
import type { PlanEvent } from './types'

const base: PlanEvent = { id: 'e', date: '2026-11-02', start: '13:30', end: '14:30', title: '회의', updatedAt: 1 }
const dates = (events: readonly PlanEvent[], from: string, to: string): string[] =>
  expandEvents(events, from, to).map((o) => o.date)

describe('expandEvents', () => {
  it('returns a one-off event only when it overlaps the range', () => {
    expect(dates([base], '2026-11-01', '2026-11-30')).toEqual(['2026-11-02'])
    expect(dates([base], '2026-11-03', '2026-11-30')).toEqual([])
  })

  it('keeps a multi-day event that started before the range', () => {
    const trip = { ...base, endDate: '2026-11-05' }
    const [occ] = expandEvents([trip], '2026-11-04', '2026-11-10')
    expect(occ).toMatchObject({ date: '2026-11-02', endDate: '2026-11-05', key: 'e:2026-11-02' })
  })

  it('skips deleted events', () => {
    expect(dates([{ ...base, deleted: true }], '2026-11-01', '2026-11-30')).toEqual([])
  })

  it('repeats daily from the first day, never before it', () => {
    const daily = { ...base, repeat: { freq: 'daily' as const } }
    expect(dates([daily], '2026-10-30', '2026-11-04')).toEqual(['2026-11-02', '2026-11-03', '2026-11-04'])
  })

  it('repeats weekly on the first day weekday by default', () => {
    const weekly = { ...base, repeat: { freq: 'weekly' as const } }
    expect(dates([weekly], '2026-11-01', '2026-11-30')).toEqual(['2026-11-02', '2026-11-09', '2026-11-16', '2026-11-23', '2026-11-30'])
  })

  it('repeats weekly on chosen weekdays', () => {
    const mwf = { ...base, repeat: { freq: 'weekly' as const, weekdays: [1, 3, 5] } }
    expect(dates([mwf], '2026-11-01', '2026-11-08')).toEqual(['2026-11-02', '2026-11-04', '2026-11-06'])
  })

  it('repeats every other week counted from the first week', () => {
    const biweekly = { ...base, repeat: { freq: 'biweekly' as const, weekdays: [1, 4] } }
    expect(dates([biweekly], '2026-11-01', '2026-11-30')).toEqual(['2026-11-02', '2026-11-05', '2026-11-16', '2026-11-19', '2026-11-30'])
  })

  it('repeats monthly on the same day, or the last day in shorter months', () => {
    const monthly = { ...base, date: '2026-01-31', repeat: { freq: 'monthly' as const } }
    expect(dates([monthly], '2026-01-01', '2026-05-31')).toEqual(['2026-01-31', '2026-02-28', '2026-03-31', '2026-04-30', '2026-05-31'])
  })

  it('counts every other week from the first real occurrence, not from the start date', () => {
    // 목요일에 시작하지만 반복은 월요일만: 첫 회차는 다음 주 월요일
    const biweekly = { ...base, date: '2026-11-05', repeat: { freq: 'biweekly' as const, weekdays: [1] } }
    expect(dates([biweekly], '2026-11-01', '2026-12-10')).toEqual(['2026-11-09', '2026-11-23', '2026-12-07'])
  })

  it('stops at until and leaves out skipped dates', () => {
    const weekly = { ...base, repeat: { freq: 'weekly' as const, until: '2026-11-20' }, skipDates: ['2026-11-09'] }
    expect(dates([weekly], '2026-11-01', '2026-11-30')).toEqual(['2026-11-02', '2026-11-16'])
  })

  it('shows a repeated multi-day occurrence that began before the range', () => {
    const weekend = { ...base, date: '2026-11-07', endDate: '2026-11-08', repeat: { freq: 'weekly' as const } }
    expect(dates([weekend], '2026-11-15', '2026-11-15')).toEqual(['2026-11-14'])
  })

  it('marks occurrences of repeating events', () => {
    const weekly = { ...base, repeat: { freq: 'weekly' as const } }
    expect(expandEvents([weekly, { ...base, id: 'one' }], '2026-11-02', '2026-11-02').map((o) => o.recurring)).toEqual([true, false])
  })
})

describe('occursOn', () => {
  it('tells whether a repeating event has an occurrence on a date', () => {
    const weekly = { ...base, repeat: { freq: 'weekly' as const } }
    expect(occursOn(weekly, '2026-11-09')).toBe(true)
    expect(occursOn(weekly, '2026-11-10')).toBe(false)
  })
})
