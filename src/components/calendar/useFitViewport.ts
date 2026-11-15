import { useEffect, useRef, type RefObject } from 'react'

/**
 * 붙어 있는(sticky) 칸의 높이를 '지금 화면에 보이는 만큼'으로 맞춘다.
 * 페이지 맨 위에서는 칸이 아래로 내려와 있으므로 그만큼 줄여, 칸 안 스크롤로 끝까지 볼 수 있게 한다.
 * 리렌더 없이 style 만 바꾼다.
 */
export function useFitViewport<T extends HTMLElement>(enabled: boolean, bottomGap: number): RefObject<T | null> {
  const ref = useRef<T>(null)

  useEffect(() => {
    const el = ref.current
    if (!el) return
    if (!enabled) {
      el.style.maxHeight = ''
      return
    }
    let frame = 0
    const fit = (): void => {
      frame = 0
      const top = Math.max(el.getBoundingClientRect().top, 0)
      el.style.maxHeight = `${Math.max(window.innerHeight - top - bottomGap, 120)}px`
    }
    const schedule = (): void => {
      if (!frame) frame = requestAnimationFrame(fit)
    }
    fit()
    window.addEventListener('scroll', schedule, { passive: true })
    window.addEventListener('resize', schedule)
    return () => {
      window.removeEventListener('scroll', schedule)
      window.removeEventListener('resize', schedule)
      if (frame) cancelAnimationFrame(frame)
    }
  }, [enabled, bottomGap])

  return ref
}
