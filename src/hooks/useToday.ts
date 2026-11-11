import { useSyncExternalStore } from 'react'
import { todayString } from '../data/logic'

const CHECK_MS = 60_000

/** 자정을 넘기거나 탭으로 돌아오면 '오늘'을 다시 계산한다 */
function subscribe(cb: () => void): () => void {
  const id = window.setInterval(cb, CHECK_MS)
  document.addEventListener('visibilitychange', cb)
  return () => {
    window.clearInterval(id)
    document.removeEventListener('visibilitychange', cb)
  }
}

export function useToday(): string {
  return useSyncExternalStore(subscribe, () => todayString())
}
