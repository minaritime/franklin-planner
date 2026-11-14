import { describe, expect, it } from 'vitest'
import { parseQuickEntry } from './quickParse'

// 2026-11-14 는 토요일
const TODAY = '2026-11-14'
const parse = (text: string) => parseQuickEntry(text, TODAY)

describe('parseQuickEntry', () => {
  it('reads a relative day, a time and a length', () => {
    expect(parse('내일 4시 가나연 상담 30분')).toMatchObject({ title: '가나연 상담', date: '2026-11-15', start: '16:00', end: '16:30' })
  })

  it('reads a date range as an all-day event over several days', () => {
    expect(parse('10/22~24 휴원')).toMatchObject({ title: '휴원', date: '2026-10-22', endDate: '2026-10-24', allDay: true })
    expect(parse('12/30~1/2 겨울 방학')).toMatchObject({ date: '2026-12-30', endDate: '2027-01-02' })
  })

  it('reads weekly repeats with a weekday', () => {
    expect(parse('매주 화 7시 학부모 미팅')).toMatchObject({
      title: '학부모 미팅',
      date: '2026-11-17',
      start: '19:00',
      end: '20:00',
      repeat: { freq: 'weekly', weekdays: [2] },
    })
    expect(parse('격주 월수 3시 수업')).toMatchObject({ date: '2026-11-16', repeat: { freq: 'biweekly', weekdays: [1, 3] } })
  })

  it('does not take a weekday out of an ordinary word', () => {
    expect(parse('매주 수학 수업')).toMatchObject({ title: '수학 수업', repeat: { freq: 'weekly' } })
    expect(parse('매주 수학 수업').repeat?.weekdays).toBeUndefined()
    expect(parse('전화 돌리기').title).toBe('전화 돌리기')
  })

  it('reads next week and this week', () => {
    expect(parse('다음주 월요일 회의').date).toBe('2026-11-16')
    expect(parse('담주 금 회식').date).toBe('2026-11-20')
    expect(parse('이번주 금요일 마감').date).toBe('2026-11-13')
    expect(parse('화요일 보고').date).toBe('2026-11-17')
  })

  it('reads month-day dates and a day of this or next month', () => {
    expect(parse('12월 3일 2시 반 상담')).toMatchObject({ title: '상담', date: '2026-12-03', start: '14:30' })
    expect(parse('매월 1일 회비 정리')).toMatchObject({ title: '회비 정리', date: '2026-12-01', repeat: { freq: 'monthly' } })
    expect(parse('20일 발표')).toMatchObject({ date: '2026-11-20' })
  })

  it('reads hours as a length and 종일', () => {
    expect(parse('3시 회의 2시간')).toMatchObject({ start: '15:00', end: '17:00', title: '회의' })
    expect(parse('모레 종일 워크숍')).toMatchObject({ title: '워크숍', date: '2026-11-16', allDay: true, start: null })
  })

  it('leaves plain text alone', () => {
    expect(parse('보고서 쓰기')).toEqual({ title: '보고서 쓰기', start: null, end: null, allDay: false })
  })
})
