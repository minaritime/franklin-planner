import dayjs from 'dayjs'

export function shortDate(date: string): string {
  return dayjs(date).format('M/D')
}

export function longDate(date: string): string {
  return dayjs(date).format('M월 D일 dddd')
}

export function toDayjs(date: string | undefined): dayjs.Dayjs | undefined {
  return date ? dayjs(date) : undefined
}

export function fromDayjs(value: dayjs.Dayjs | null | undefined): string | undefined {
  return value ? value.format('YYYY-MM-DD') : undefined
}
