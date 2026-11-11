import { describe, expect, it } from 'vitest'
import { parseTimedTitle } from './timeParse'

const parse = (text: string, minutes = 60) => parseTimedTitle(text, minutes)

describe('parseTimedTitle', () => {
  it('reads "N시" as afternoon for 1~7 and morning for 8~11', () => {
    expect(parse('3시 김은우 상담')).toEqual({ title: '김은우 상담', start: '15:00', end: '16:00' })
    expect(parse('9시 출근')).toEqual({ title: '출근', start: '09:00', end: '10:00' })
    expect(parse('12시 점심')).toEqual({ title: '점심', start: '12:00', end: '13:00' })
  })

  it('handles 반, 분, 오전/오후 and HH:MM', () => {
    expect(parse('10시반 회의')).toMatchObject({ start: '10:30' })
    expect(parse('4시 20분 전화')).toMatchObject({ title: '전화', start: '16:20' })
    expect(parse('오전 7시 운동')).toMatchObject({ title: '운동', start: '07:00' })
    expect(parse('오후 9시 정리')).toMatchObject({ start: '21:00' })
    expect(parse('14:30 보고')).toMatchObject({ title: '보고', start: '14:30', end: '15:30' })
  })

  it('reads ranges with ~ or -', () => {
    expect(parse('10시반~12시 정규반 수업')).toEqual({ title: '정규반 수업', start: '10:30', end: '12:00' })
    expect(parse('7-9시 고등부')).toEqual({ title: '고등부', start: '19:00', end: '21:00' })
    expect(parse('13:00-14:15 상담')).toEqual({ title: '상담', start: '13:00', end: '14:15' })
  })

  it('finds the time in the middle or end and drops a following 에', () => {
    expect(parse('상담 준비 3시에')).toEqual({ title: '상담 준비', start: '15:00', end: '16:00' })
    expect(parse('학부모 3시에 전화')).toEqual({ title: '학부모 전화', start: '15:00', end: '16:00' })
  })

  it('uses the given default length', () => {
    expect(parse('3시 상담', 30)).toMatchObject({ end: '15:30' })
  })

  it('leaves text without a time alone', () => {
    expect(parse('교재 주문')).toEqual({ title: '교재 주문', start: null, end: null })
    expect(parse('3시간 공부')).toEqual({ title: '3시간 공부', start: null, end: null })
    expect(parse('2교시 기출 12~20번')).toEqual({ title: '2교시 기출 12~20번', start: null, end: null })
    expect(parse('25시 이상한 시간')).toEqual({ title: '25시 이상한 시간', start: null, end: null })
  })

  it('does not end past midnight', () => {
    expect(parse('11시반 오후 정리', 60)).toMatchObject({ start: '11:30' })
    expect(parse('오후 11시 30분 마감', 60)).toMatchObject({ start: '23:30', end: '23:59' })
  })
})
