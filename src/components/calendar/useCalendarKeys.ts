import { useEffect, useRef } from 'react'
import type { CalView } from '../../data/calendarItems'

export interface CalendarKeyHandlers {
  readonly onToday: () => void
  readonly onStep: (dir: 1 | -1) => void
  readonly onView: (view: CalView) => void
  readonly onNew: () => void
  readonly onSearch: () => void
  readonly onUndo: () => void
  readonly onHelp: () => void
}

const VIEW_KEYS: Record<string, CalView> = { m: 'month', w: 'week', d: 'day', a: 'agenda' }

function isTyping(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false
  if (target.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName)) return true
  // 펼친 메뉴·목록 안에서는 화살표가 그 메뉴를 움직여야 한다
  return target.closest('[role="menu"], [role="listbox"]') !== null
}

/** 창(서랍·대화상자)이 떠 있으면 단축키를 쓰지 않는다 */
const overlayOpen = (): boolean => document.querySelector('.ant-drawer-open, .ant-modal-wrap:not([style*="display: none"])') !== null

/**
 * 달력 단축키. T 오늘 · ←/K 이전 · →/J 다음 · M·W·D·A 보기 · N/C 새로 · / 검색 · Ctrl+Z 되돌리기 · ? 도움말
 * 글을 쓰는 중에는 Ctrl+Z 를 포함해 아무것도 가로채지 않는다.
 */
export function useCalendarKeys(handlers: CalendarKeyHandlers): void {
  const ref = useRef(handlers)
  useEffect(() => {
    ref.current = handlers
  }, [handlers])

  useEffect(() => {
    const onKey = (e: KeyboardEvent): void => {
      if (isTyping(e.target) || e.isComposing) return
      const h = ref.current
      if ((e.ctrlKey || e.metaKey) && !e.shiftKey && e.key.toLowerCase() === 'z') {
        if (overlayOpen()) return
        e.preventDefault()
        h.onUndo()
        return
      }
      if (e.ctrlKey || e.metaKey || e.altKey || overlayOpen()) return
      const key = e.key.length === 1 ? e.key.toLowerCase() : e.key
      const actions: Record<string, () => void> = {
        t: h.onToday,
        ArrowLeft: () => h.onStep(-1),
        k: () => h.onStep(-1),
        ArrowRight: () => h.onStep(1),
        j: () => h.onStep(1),
        n: h.onNew,
        c: h.onNew,
        '/': h.onSearch,
        '?': h.onHelp,
      }
      const view = VIEW_KEYS[key]
      const action = view ? () => h.onView(view) : actions[key]
      if (!action) return
      e.preventDefault()
      action()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])
}

export const SHORTCUT_LINES = [
  'T 오늘 · ← / K 이전 · → / J 다음',
  'M 월 · W 주 · D 일 · A 목록',
  'N / C 새로 만들기 · / 검색 · Esc 닫기',
  'Ctrl + Z 되돌리기 · ? 단축키 보기',
]
