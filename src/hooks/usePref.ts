import { useCallback, useState } from 'react'

/**
 * 이 브라우저에만 남기는 화면 설정 (끈 분류, 주 시작 요일, 마지막에 고른 분류).
 * 기기마다 달라도 되는 것이라 동기화하지 않는다. 저장이 막혀 있어도 화면은 그대로 동작한다.
 */
export function readPref<T>(key: string, fallback: T, isValid: (v: unknown) => v is T): T {
  try {
    const raw = localStorage.getItem(key)
    if (raw === null) return fallback
    const parsed: unknown = JSON.parse(raw)
    return isValid(parsed) ? parsed : fallback
  } catch {
    return fallback
  }
}

export function writePref<T>(key: string, value: T): void {
  try {
    localStorage.setItem(key, JSON.stringify(value))
  } catch {
    // 저장 못 해도 이번 화면에서는 그대로 쓴다
  }
}

export function usePref<T>(key: string, fallback: T, isValid: (v: unknown) => v is T): [T, (value: T) => void] {
  const [value, setValue] = useState<T>(() => readPref(key, fallback, isValid))
  const update = useCallback(
    (next: T) => {
      setValue(next)
      writePref(key, next)
    },
    [key],
  )
  return [value, update]
}

export const isStringArray = (v: unknown): v is string[] => Array.isArray(v) && v.every((x) => typeof x === 'string')
export const isWeekStart = (v: unknown): v is 0 | 1 => v === 0 || v === 1
export const isOptionalString = (v: unknown): v is string | null => v === null || typeof v === 'string'

export const PREF_KEYS = {
  hiddenCategories: 'planner:calendar-hidden',
  weekStart: 'planner:week-start',
  lastCategory: 'planner:last-category',
  calendarView: 'planner:calendar-view',
} as const
