import { useCallback, useEffect, useState } from 'react'
import { unionRect, type Rect } from './placement'
import type { ScreenNote } from './screens'

/** 지금 화면에서 찾은 설명 한 곳 */
export interface FoundNote {
  readonly note: ScreenNote
  readonly elements: readonly Element[]
  readonly box: Rect
}

const PAD = 4

function toList(found: ReturnType<ScreenNote['find']>): readonly Element[] {
  if (found === null) return []
  return Array.isArray(found) ? found : [found as Element]
}

function boxOf(elements: readonly Element[]): Rect | null {
  const rect = unionRect(elements.map((el) => el.getBoundingClientRect()))
  if (!rect) return null
  return { left: rect.left - PAD, top: rect.top - PAD, width: rect.width + PAD * 2, height: rect.height + PAD * 2 }
}

function locate(notes: readonly ScreenNote[], today: string): FoundNote[] {
  return notes.flatMap((note) => {
    const elements = toList(note.find(document, today))
    const box = boxOf(elements)
    return box ? [{ note, elements, box }] : []
  })
}

/**
 * 설명서가 떠 있는 동안 화면에서 설명할 부분을 찾고, 스크롤·창 크기가 바뀌면 상자 자리를 다시 잰다.
 * 지금 화면에 없는 부분(할일이 없어서 안 보이는 줄 등)은 빠진다.
 */
export interface NoteBoxes {
  readonly found: readonly FoundNote[]
  /** 지금 바로 다시 잰다 (가이드가 스크롤한 직후, 화면에 그리기 전에 부른다) */
  readonly relocate: () => void
}

export function useNoteBoxes(notes: readonly ScreenNote[], today: string): NoteBoxes {
  const [found, setFound] = useState<FoundNote[]>([])

  const relocate = useCallback(() => setFound(locate(notes, today)), [notes, today])

  useEffect(() => {
    let frame = window.requestAnimationFrame(relocate)
    const schedule = (): void => {
      window.cancelAnimationFrame(frame)
      frame = window.requestAnimationFrame(relocate)
    }
    window.addEventListener('scroll', schedule, true)
    window.addEventListener('resize', schedule)
    return () => {
      window.cancelAnimationFrame(frame)
      window.removeEventListener('scroll', schedule, true)
      window.removeEventListener('resize', schedule)
    }
  }, [relocate])

  return { found, relocate }
}
