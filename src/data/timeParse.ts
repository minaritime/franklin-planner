/**
 * "3시 상담", "10시반~12시 수업", "14:30 보고" 처럼 할일 글에 섞인 시간을 알아듣는다.
 * 오전/오후를 안 쓰면 1~7시는 오후, 8~11시는 오전으로 본다 (학원 일과 기준).
 */

export interface TimedTitle {
  readonly title: string
  readonly start: string | null
  readonly end: string | null
}

const AMPM = '(?:(?:오전|오후)\\s*)?'
/** 시 또는 : 가 붙은 확실한 시각 */
const POINT = `${AMPM}\\d{1,2}(?::\\d{2}|시(?!간)(?:\\s*(?:반|\\d{1,2}분))?)`
/** 범위의 앞쪽은 숫자만 써도 된다 (7-9시) */
const POINT_OR_BARE = `${AMPM}\\d{1,2}(?::\\d{2}|시(?!간)(?:\\s*(?:반|\\d{1,2}분))?)?`

const RANGE_RE = new RegExp(`(?<![\\d:])(${POINT_OR_BARE})\\s*[~\\-]\\s*(${POINT})(?![\\d:])(\\s*에)?`)
const SINGLE_RE = new RegExp(`(?<![\\d:])(${POINT})(?![\\d:])(\\s*에)?`)

const AFTERNOON_FROM = 1
const AFTERNOON_TO = 7
const LAST_MINUTE = 23 * 60 + 59

/** 시각 하나를 분으로. 말이 안 되는 시각이면 null */
function toMinutes(text: string): number | null {
  const m = /(오전|오후)?\s*(\d{1,2})(?::(\d{2})|시(?:\s*(반|(\d{1,2})분))?)?/.exec(text)
  if (!m) return null
  const [, ampm, hText, colonMin, half, korMin] = m
  let hour = Number(hText)
  const minute = colonMin !== undefined ? Number(colonMin) : half === '반' ? 30 : korMin !== undefined ? Number(korMin) : 0
  if (ampm === '오후' && hour < 12) hour += 12
  else if (ampm === '오전' && hour === 12) hour = 0
  else if (!ampm && hour >= AFTERNOON_FROM && hour <= AFTERNOON_TO) hour += 12
  if (hour > 23 || minute > 59) return null
  return hour * 60 + minute
}

function format(minutes: number): string {
  return `${String(Math.floor(minutes / 60)).padStart(2, '0')}:${String(minutes % 60).padStart(2, '0')}`
}

function cleanTitle(text: string, match: RegExpExecArray): string {
  return (text.slice(0, match.index) + ' ' + text.slice(match.index + match[0].length)).replace(/\s+/g, ' ').trim()
}

export function parseTimedTitle(text: string, defaultMinutes: number): TimedTitle {
  const none = { title: text.trim(), start: null, end: null }

  const range = RANGE_RE.exec(text)
  if (range) {
    const start = toMinutes(range[1])
    let end = toMinutes(range[2])
    if (start !== null && end !== null) {
      // "7-9시" 처럼 뒤가 오전으로 읽혀 앞보다 빠르면 오후로 본다
      if (end <= start && end < 12 * 60) end += 12 * 60
      if (end > start && end <= LAST_MINUTE + 1) {
        return { title: cleanTitle(text, range), start: format(start), end: format(Math.min(end, LAST_MINUTE)) }
      }
    }
  }

  const single = SINGLE_RE.exec(text)
  if (!single) return none
  const start = toMinutes(single[1])
  if (start === null) return none
  return { title: cleanTitle(text, single), start: format(start), end: format(Math.min(start + defaultMinutes, LAST_MINUTE)) }
}
