import { useSyncExternalStore } from 'react'
import { EMPTY_DATA, type PlannerData } from './types'

export const STORAGE_KEY = 'planner:data'

type Listener = () => void

function isArray(value: unknown): value is unknown[] {
  return Array.isArray(value)
}

/** 바깥에서 들어온 데이터(저장값, Gist, 가져오기 파일)의 모양을 확인한다 */
export function parsePlannerData(value: unknown): PlannerData | null {
  if (typeof value !== 'object' || value === null) return null
  const v = value as Record<string, unknown>
  if (v.version !== 1) return null
  if (!isArray(v.tasks) || !isArray(v.events) || !isArray(v.notes) || !isArray(v.goals)) return null
  return value as PlannerData
}

function load(): PlannerData {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return EMPTY_DATA
    return parsePlannerData(JSON.parse(raw)) ?? EMPTY_DATA
  } catch {
    return EMPTY_DATA
  }
}

let state: PlannerData = load()
let saveFailed = false
const listeners = new Set<Listener>()

function persist(next: PlannerData): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next))
    saveFailed = false
  } catch {
    saveFailed = true
  }
}

export function getData(): PlannerData {
  return state
}

export function didSaveFail(): boolean {
  return saveFailed
}

export function setData(update: (prev: PlannerData) => PlannerData): void {
  const next = update(state)
  if (next === state) return
  state = next
  persist(next)
  listeners.forEach((l) => l())
}

export function subscribe(listener: Listener): () => void {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

export function usePlanner(): PlannerData {
  return useSyncExternalStore(subscribe, getData)
}

// 다른 탭에서 바꾼 내용도 바로 반영
if (typeof window !== 'undefined') {
  window.addEventListener('storage', (e) => {
    if (e.key !== STORAGE_KEY) return
    state = load()
    listeners.forEach((l) => l())
  })
}
