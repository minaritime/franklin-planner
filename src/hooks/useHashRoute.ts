import { useSyncExternalStore } from 'react'
import { CAL_VIEWS, type CalView } from '../data/calendarItems'
import { todayString } from '../data/logic'

export type Route =
  | { readonly page: 'day'; readonly date: string }
  /** view 가 없으면 화면 너비에 맞는 기본 보기, date 가 없으면 오늘 */
  | { readonly page: 'calendar'; readonly view?: CalView; readonly date?: string }
  | { readonly page: 'goals' }
  | { readonly page: 'settings' }

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/
const MONTH_RE = /^\d{4}-(0[1-9]|1[0-2])$/

const isView = (v: string | undefined): v is CalView => CAL_VIEWS.includes(v as CalView)

function parseCalendar(view: string | undefined, date: string | undefined): Route {
  // 예전 주소 #/calendar/2026-11
  if (view && MONTH_RE.test(view)) return { page: 'calendar', view: 'month', date: `${view}-01` }
  if (!isView(view)) return { page: 'calendar' }
  return date && DATE_RE.test(date) ? { page: 'calendar', view, date } : { page: 'calendar', view }
}

export function parseHash(hash: string): Route {
  const [page, arg, arg2] = hash.replace(/^#\/?/, '').split('/')
  if (page === 'calendar') return parseCalendar(arg, arg2)
  if (page === 'goals' || page === 'settings') return { page }
  if (page === 'day' && arg && DATE_RE.test(arg)) return { page: 'day', date: arg }
  return { page: 'day', date: todayString() }
}

export function routeToHash(route: Route): string {
  if (route.page === 'day') return `#/day/${route.date}`
  if (route.page === 'calendar') {
    if (!route.view) return '#/calendar'
    return route.date ? `#/calendar/${route.view}/${route.date}` : `#/calendar/${route.view}`
  }
  return `#/${route.page}`
}

export function navigate(route: Route): void {
  window.location.hash = routeToHash(route)
}

function subscribe(cb: () => void): () => void {
  window.addEventListener('hashchange', cb)
  return () => window.removeEventListener('hashchange', cb)
}

const getHash = (): string => window.location.hash

export function useHashRoute(): Route {
  return parseHash(useSyncExternalStore(subscribe, getHash))
}
