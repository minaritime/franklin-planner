import { useSyncExternalStore } from 'react'

export type SyncPhase =
  | 'unconfigured'
  | 'loading'
  | 'signedOut'
  | 'connecting'
  | 'synced'
  | 'saving'
  | 'error'

export interface SyncUser {
  readonly name: string
  readonly email: string
  readonly photoURL: string | null
}

export interface SyncState {
  readonly phase: SyncPhase
  readonly user: SyncUser | null
  readonly error: string | null
  readonly lastSyncedAt: number | null
}

let state: SyncState = { phase: 'loading', user: null, error: null, lastSyncedAt: null }
const listeners = new Set<() => void>()

export function getSyncState(): SyncState {
  return state
}

export function updateSyncState(patch: Partial<SyncState>): void {
  state = { ...state, ...patch }
  listeners.forEach((l) => l())
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

export function useSyncState(): SyncState {
  return useSyncExternalStore(subscribe, getSyncState)
}

/** Firebase 오류를 사람이 읽을 문장으로 */
export function describeSyncError(error: unknown): string {
  const code = (error as { code?: string })?.code ?? ''
  if (code.includes('permission-denied')) return '권한이 없습니다. Firestore 보안 규칙을 확인해 주세요'
  if (code.includes('unavailable') || code.includes('network')) return '인터넷 연결이 끊겼습니다. 다시 연결되면 이어서 저장합니다'
  if (code.includes('unauthorized-domain')) return '이 주소가 Firebase 승인된 도메인에 없습니다'
  if (code.includes('popup-blocked')) return '로그인 창이 막혔습니다'
  return error instanceof Error ? error.message : '알 수 없는 오류'
}
