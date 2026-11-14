import { toMinutes } from '../../data/timeline'

/** 주·일 보기 한 시간의 높이 */
export const HOUR_HEIGHT = 48

export const minutesToTop = (minutes: number): number => (minutes / 60) * HOUR_HEIGHT
export const timeToTop = (time: string): number => minutesToTop(toMinutes(time))

export function formatMinutes(minutes: number): string {
  return `${String(Math.floor(minutes / 60)).padStart(2, '0')}:${String(minutes % 60).padStart(2, '0')}`
}
