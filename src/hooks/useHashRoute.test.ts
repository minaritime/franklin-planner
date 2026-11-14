import { describe, expect, it } from 'vitest'
import { parseHash, routeToHash } from './useHashRoute'

describe('calendar routes', () => {
  it('reads the view and the date', () => {
    expect(parseHash('#/calendar/week/2026-11-14')).toEqual({ page: 'calendar', view: 'week', date: '2026-11-14' })
    expect(parseHash('#/calendar/agenda')).toEqual({ page: 'calendar', view: 'agenda' })
    expect(parseHash('#/calendar')).toEqual({ page: 'calendar' })
  })

  it('still opens old month links', () => {
    expect(parseHash('#/calendar/2026-11')).toEqual({ page: 'calendar', view: 'month', date: '2026-11-01' })
  })

  it('ignores broken parts', () => {
    expect(parseHash('#/calendar/year/2026-11-14')).toEqual({ page: 'calendar' })
    expect(parseHash('#/calendar/day/14-11-2026')).toEqual({ page: 'calendar', view: 'day' })
  })

  it('writes the hash back', () => {
    expect(routeToHash({ page: 'calendar', view: 'day', date: '2026-11-14' })).toBe('#/calendar/day/2026-11-14')
    expect(routeToHash({ page: 'calendar', view: 'month' })).toBe('#/calendar/month')
    expect(routeToHash({ page: 'calendar' })).toBe('#/calendar')
  })
})
