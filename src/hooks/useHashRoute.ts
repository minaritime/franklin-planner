import { useSyncExternalStore } from 'react'
import { todayString } from '../data/logic'

export type Route =
  | { readonly page: 'day'; readonly date: string }
  | { readonly page: 'calendar' }
  | { readonly page: 'goals' }
  | { readonly page: 'settings' }

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/

export function parseHash(hash: string): Route {
  const [page, arg] = hash.replace(/^#\/?/, '').split('/')
  if (page === 'calendar' || page === 'goals' || page === 'settings') return { page }
  if (page === 'day' && arg && DATE_RE.test(arg)) return { page: 'day', date: arg }
  return { page: 'day', date: todayString() }
}

export function routeToHash(route: Route): string {
  return route.page === 'day' ? `#/day/${route.date}` : `#/${route.page}`
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
