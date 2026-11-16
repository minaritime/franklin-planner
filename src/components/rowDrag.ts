import { PointerSensor } from '@dnd-kit/core'
import type { PointerEvent as ReactPointerEvent } from 'react'

/** 휴대폰에서 이만큼 꾹 눌러야 끌기가 된다. 그냥 쓸면 스크롤 */
export const TOUCH_HOLD_MS = 300
/** 마우스는 이만큼 움직여야 끌기. 그 전에 떼면 그냥 누르기 */
export const MOUSE_DRAG_DISTANCE = 4

/**
 * 마우스·펜 전용 끌기. 손가락은 TouchSensor(꾹 누르기)가 맡는다.
 * 줄 전체를 잡게 했으므로, 손가락까지 받으면 목록을 스크롤하려다 할일이 끌려간다
 */
export class MousePointerSensor extends PointerSensor {
  static activators = [
    {
      eventName: 'onPointerDown' as const,
      handler: ({ nativeEvent: e }: ReactPointerEvent): boolean => e.pointerType !== 'touch' && e.isPrimary && e.button === 0,
    },
  ]
}

/** 줄을 끌고 손을 뗀 뒤 따라오는 click 하나를 버린다 (놓은 곳이 할일 이름이면 수정 창이 열리지 않게) */
export function swallowNextClick(): void {
  const stop = (e: MouseEvent): void => {
    e.stopPropagation()
    e.preventDefault()
  }
  window.addEventListener('click', stop, { capture: true, once: true })
  window.setTimeout(() => window.removeEventListener('click', stop, { capture: true }), 0)
}
