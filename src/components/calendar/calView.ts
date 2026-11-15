import { CAL_VIEWS, type CalView } from '../../data/calendarItems'
import { PREF_KEYS, readPref } from '../../hooks/usePref'

const isCalView = (v: unknown): v is CalView | null => v === null || CAL_VIEWS.includes(v as CalView)

/** 주소에 보기가 없으면 마지막에 고른 보기, 그것도 없으면 화면 너비에 맞는 기본 보기 */
export function resolveCalView(routeView: CalView | undefined, isWide: boolean): CalView {
  return routeView ?? readPref<CalView | null>(PREF_KEYS.calendarView, null, isCalView) ?? (isWide ? 'month' : 'agenda')
}
