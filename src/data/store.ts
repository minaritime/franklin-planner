import { useSyncExternalStore } from 'react'
import { EMPTY_DATA, type PlannerData } from './types'
import { parsePlannerData } from './validate'

export { parsePlannerData }

export const STORAGE_KEY = 'planner:data'
const CORRUPT_PREFIX = 'planner:data:corrupt-'

type Listener = () => void

function readStorage(): string | null {
  try {
    return localStorage.getItem(STORAGE_KEY)
  } catch {
    return null
  }
}

function parseRaw(raw: string): PlannerData | null {
  try {
    return parsePlannerData(JSON.parse(raw))
  } catch {
    return null
  }
}

/** 읽을 수 없는 저장값은 지우지 않고 다른 이름으로 옮겨 둔 뒤 빈 상태로 시작한다 */
function load(): PlannerData {
  const raw = readStorage()
  if (!raw) return EMPTY_DATA
  const parsed = parseRaw(raw)
  if (parsed) return parsed
  try {
    localStorage.setItem(`${CORRUPT_PREFIX}${Date.now()}`, raw)
    // 옮겨 둔 뒤에만 비운다. 안 비우면 새로고침마다 같은 사본이 또 생긴다
    localStorage.removeItem(STORAGE_KEY)
  } catch {
    // 옮겨 둘 자리도 없으면 원본을 덮어쓰지 않도록 저장 실패 상태로 둔다
    saveFailed = true
  }
  return EMPTY_DATA
}

let saveFailed = false
let state: PlannerData = load()
const listeners = new Set<Listener>()

const notify = (): void => listeners.forEach((l) => l())

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

export function setData(update: (prev: PlannerData) => PlannerData): void {
  const next = update(state)
  if (next === state) return
  state = next
  persist(next)
  notify()
}

export function subscribe(listener: Listener): () => void {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

export function usePlanner(): PlannerData {
  return useSyncExternalStore(subscribe, getData)
}

/** 브라우저 저장에 실패하고 있는지 (사생활 보호 모드, 저장 공간 부족 등) */
export function useSaveFailed(): boolean {
  return useSyncExternalStore(subscribe, () => saveFailed)
}

// 다른 탭에서 바꾼 내용도 바로 반영. 읽을 수 없는 값이면 지금 상태를 그대로 둔다
if (typeof window !== 'undefined') {
  window.addEventListener('storage', (e) => {
    if (e.key !== STORAGE_KEY || e.newValue === null) return
    const parsed = parseRaw(e.newValue)
    if (!parsed) return
    state = parsed
    notify()
  })
}
