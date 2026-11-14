import { createContext, useContext, useSyncExternalStore } from 'react'
import { EMPTY_DATA, type PlannerData } from './types'
import { restoreSnapshot } from './undo'
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

const UNDO_LIMIT = 50
const undoStack: { readonly before: PlannerData; readonly after: PlannerData }[] = []

/**
 * 사용자가 한 일로 바꿀 때 쓴다. 바로 앞 상태를 기억해 두어 Ctrl+Z 로 되돌릴 수 있다.
 * 동기화로 들어온 변경은 setData 를 그대로 써서 되돌리기 대상에 넣지 않는다.
 */
export function commit(update: (prev: PlannerData) => PlannerData): void {
  const before = state
  setData(update)
  if (state === before) return
  undoStack.push({ before, after: state })
  if (undoStack.length > UNDO_LIMIT) undoStack.shift()
}

/** 되돌린 게 있으면 true */
export function undo(): boolean {
  const last = undoStack.pop()
  if (!last) return false
  setData((current) => restoreSnapshot(current, last.before, last.after, Date.now()))
  return true
}

/** 파일 가져오기·기기 비우기처럼 통째로 바뀌면 이전 되돌리기는 의미가 없다 */
export function clearUndo(): void {
  undoStack.length = 0
}

export function subscribe(listener: Listener): () => void {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

/**
 * 사용 설명서를 켠 동안 화면에 대신 보여 줄 예시 데이터. 화면만 바꾸고 저장소에는 쓰지 않으므로
 * 설명서를 끄면 원래 내용이 그대로 돌아온다.
 */
export const PreviewDataContext = createContext<PlannerData | null>(null)

export function usePlanner(): PlannerData {
  const preview = useContext(PreviewDataContext)
  const live = useSyncExternalStore(subscribe, getData)
  return preview ?? live
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
