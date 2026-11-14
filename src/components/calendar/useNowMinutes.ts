import { useEffect, useState } from 'react'

const MINUTE_MS = 60_000

/** 지금 시각(분). enabled 일 때만 1분마다 다시 잰다 */
export function useNowMinutes(enabled: boolean): number {
  const [now, setNow] = useState(() => new Date())
  useEffect(() => {
    if (!enabled) return
    const id = window.setInterval(() => setNow(new Date()), MINUTE_MS)
    return () => window.clearInterval(id)
  }, [enabled])
  return now.getHours() * 60 + now.getMinutes()
}
