/**
 * 한 줄 입력("내일 4시 가나연 상담 30분", "매주 화 7시 학부모 미팅", "10/22~24 휴원")을
 * 날짜·시간·반복으로 나눈다. 시간 읽기는 timeParse 를 그대로 쓴다.
 */
import { addDays, dDay } from './logic'
import { toMinutes } from './timeline'
import { parseTimedTitle } from './timeParse'
import type { Repeat, RepeatFreq } from './types'

export interface QuickEntry {
  readonly title: string
  readonly date?: string
  readonly endDate?: string
  readonly start: string | null
  readonly end: string | null
  readonly allDay: boolean
  readonly repeat?: Repeat
}

const DEFAULT_MINUTES = 60
/** 이만큼 지난 날짜(월/일)는 내년으로 본다 */
const PAST_LIMIT_DAYS = 60
const WEEKDAY = '월화수목금토일'
const DAY_INDEX: Record<string, number> = { 일: 0, 월: 1, 화: 2, 수: 3, 목: 4, 금: 5, 토: 6 }
const FREQ: Record<string, RepeatFreq> = { 매일: 'daily', 매주: 'weekly', 격주: 'biweekly', 매월: 'monthly' }

/** 요일 글자 뒤에 오면 낱말의 일부가 아니라고 보는 것 */
const DAY_END = '(?:요일)?(?=\\s|\\d|$)'
const REPEAT_RE = new RegExp(`(매일|매주|격주|매월)(?:\\s*([${WEEKDAY}]+)${DAY_END})?`)
const WEEK_RE = new RegExp(`(이번\\s*주|다음\\s*주|담주)\\s*([${WEEKDAY}])${DAY_END}`)
const WEEKDAY_RE = new RegExp(`([${WEEKDAY}])요일`)
const RELATIVE_RE = /(오늘|내일|모레)/
const MD = '(\\d{1,2})\\s*(?:[/.]|월\\s*)\\s*(\\d{1,2})일?'
const RANGE_RE = new RegExp(`(?<!\\d)${MD}\\s*[~\\-]\\s*(?:(\\d{1,2})\\s*(?:[/.]|월\\s*))?\\s*(\\d{1,2})일?(?![\\d:])`)
const DATE_RE = new RegExp(`(?<![\\d:])${MD}(?![\\d:])`)
const DAY_ONLY_RE = /(?<![\d월/.])(\d{1,2})일(?!\s*간)/
const ALL_DAY_RE = /종일/
const DURATION_RE = /(?<![\d:])(?:(\d{1,2})\s*시간(\s*반)?|(\d{1,3})\s*분)(?![가-힣])/

const weekdayOf = (date: string): number => new Date(`${date}T00:00:00Z`).getUTCDay()
const pad = (n: number): string => String(n).padStart(2, '0')
const fmt = (m: number): string => `${pad(Math.floor(m / 60))}:${pad(m % 60)}`

function take(text: string, re: RegExp): { rest: string; match: RegExpExecArray | null } {
  const match = re.exec(text)
  if (!match) return { rest: text, match: null }
  return { rest: text.slice(0, match.index) + ' ' + text.slice(match.index + match[0].length), match }
}

function monthDay(today: string, month: number, day: number): string | undefined {
  if (month < 1 || month > 12 || day < 1 || day > 31) return undefined
  let year = Number(today.slice(0, 4))
  const candidate = (y: number): string => `${y}-${pad(month)}-${pad(day)}`
  if (dDay(candidate(year), today) < -PAST_LIMIT_DAYS) year += 1
  const date = candidate(year)
  // 2월 30일 같은 날은 버린다
  return new Date(`${date}T00:00:00Z`).toISOString().slice(0, 10) === date ? date : undefined
}

/** 오늘 포함, 다가오는 그 요일 */
const nextWeekday = (today: string, day: number): string => addDays(today, (day - weekdayOf(today) + 7) % 7)

function readDates(text: string, today: string): { rest: string; date?: string; endDate?: string } {
  const range = take(text, RANGE_RE)
  if (range.match) {
    const [, m1, d1, m2, d2] = range.match
    const date = monthDay(today, Number(m1), Number(d1))
    let endDate = date && monthDay(date, Number(m2 ?? m1), Number(d2))
    if (date && endDate && endDate < date) endDate = monthDay(date, Number(m2 ?? m1) + (m2 ? 0 : 1), Number(d2))
    if (date && endDate && endDate >= date) return { rest: range.rest, date, endDate }
  }
  const week = take(text, WEEK_RE)
  if (week.match) {
    const sunday = addDays(today, -weekdayOf(today))
    const offset = week.match[1].startsWith('이번') ? 0 : 7
    return { rest: week.rest, date: addDays(sunday, offset + DAY_INDEX[week.match[2]]) }
  }
  const relative = take(text, RELATIVE_RE)
  if (relative.match) {
    return { rest: relative.rest, date: addDays(today, ['오늘', '내일', '모레'].indexOf(relative.match[1])) }
  }
  const exact = take(text, DATE_RE)
  if (exact.match) {
    const date = monthDay(today, Number(exact.match[1]), Number(exact.match[2]))
    if (date) return { rest: exact.rest, date }
  }
  const weekday = take(text, WEEKDAY_RE)
  if (weekday.match) return { rest: weekday.rest, date: nextWeekday(today, DAY_INDEX[weekday.match[1]]) }
  const dayOnly = take(text, DAY_ONLY_RE)
  if (dayOnly.match) {
    const day = Number(dayOnly.match[1])
    const thisMonth = `${today.slice(0, 8)}${pad(day)}`
    const [y, m] = today.split('-').map(Number)
    const date = thisMonth >= today ? thisMonth : `${m === 12 ? y + 1 : y}-${pad(m === 12 ? 1 : m + 1)}-${pad(day)}`
    if (day >= 1 && day <= 31) return { rest: dayOnly.rest, date }
  }
  return { rest: text }
}

function readRepeat(text: string, today: string): { rest: string; repeat?: Repeat; date?: string } {
  const { rest, match } = take(text, REPEAT_RE)
  if (!match) return { rest: text }
  const freq = FREQ[match[1]]
  const days = match[2] && freq !== 'daily' && freq !== 'monthly' ? [...match[2]].map((c) => DAY_INDEX[c]) : undefined
  if (!days) return { rest, repeat: { freq } }
  const sorted = [...new Set(days)].sort((a, b) => a - b)
  const date = sorted.map((d) => nextWeekday(today, d)).sort()[0]
  return { rest, repeat: { freq, weekdays: sorted }, date }
}

function readDuration(text: string): { rest: string; minutes?: number } {
  const { rest, match } = take(text, DURATION_RE)
  if (!match) return { rest: text }
  const minutes = match[3] !== undefined ? Number(match[3]) : Number(match[1]) * 60 + (match[2] ? 30 : 0)
  return minutes > 0 ? { rest, minutes } : { rest: text }
}

const tidy = (text: string): string => text.replace(/\s+/g, ' ').trim()

export function parseQuickEntry(text: string, today: string): QuickEntry {
  const repeated = readRepeat(text, today)
  const dated = readDates(repeated.rest, today)
  const allDayMatch = take(dated.rest, ALL_DAY_RE)
  const timed = parseTimedTitle(allDayMatch.rest, DEFAULT_MINUTES)
  const duration = readDuration(timed.title)

  const isAllDay = allDayMatch.match !== null || (dated.endDate !== undefined && timed.start === null)
  const start = isAllDay ? null : timed.start
  let end = isAllDay ? null : timed.end
  if (start && duration.minutes) end = fmt(Math.min(toMinutes(start) + duration.minutes, 23 * 60 + 59))

  const date = dated.date ?? repeated.date
  const entry: QuickEntry = { title: tidy(duration.rest), start, end, allDay: isAllDay }
  return {
    ...entry,
    ...(date ? { date } : {}),
    ...(dated.endDate ? { endDate: dated.endDate } : {}),
    ...(repeated.repeat ? { repeat: repeated.repeat } : {}),
  }
}
