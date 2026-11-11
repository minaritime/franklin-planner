import { getData, setData, subscribe } from '../data/store'
import { EMPTY_DATA } from '../data/types'
import { FIREBASE_CONFIG } from './config'
import { createSyncEngine, type SyncEngine } from './engine'
import { describeSyncError, updateSyncState } from './status'

const PUSH_DELAY_MS = 800

type FirebaseModule = typeof import('./firebase')

let fb: FirebaseModule | null = null
let engine: SyncEngine | null = null

const localStore = { get: getData, set: setData, subscribe }

function startEngine(uid: string): void {
  engine?.stop()
  engine = createSyncEngine({
    store: localStore,
    adapter: fb!.createFirestoreAdapter(uid),
    delayMs: PUSH_DELAY_MS,
    onStatus: (status, error) =>
      updateSyncState({
        phase: status,
        error: error === undefined ? null : describeSyncError(error),
        ...(status === 'synced' ? { lastSyncedAt: Date.now() } : {}),
      }),
  })
  engine.start()
}

function stopEngine(): void {
  engine?.stop()
  engine = null
}

/** 앱 시작 때 한 번. Firebase 는 설정이 있을 때만 따로 불러온다 (첫 화면을 무겁게 하지 않게) */
export async function startSync(): Promise<void> {
  if (!FIREBASE_CONFIG) {
    updateSyncState({ phase: 'unconfigured' })
    return
  }
  try {
    fb = await import('./firebase')
    fb.initFirebase(FIREBASE_CONFIG)
    fb.watchUser(
      (user) => {
        if (user) {
          updateSyncState({
            user: { name: user.displayName ?? '', email: user.email ?? '', photoURL: user.photoURL },
            error: null,
          })
          startEngine(user.uid)
        } else {
          stopEngine()
          updateSyncState({ phase: 'signedOut', user: null })
        }
      },
      (error) => updateSyncState({ error: describeSyncError(error) }),
    )
  } catch (error) {
    updateSyncState({ phase: 'error', error: describeSyncError(error) })
  }
}

export async function signIn(): Promise<void> {
  if (!fb) return
  try {
    updateSyncState({ error: null })
    await fb.signInWithGoogle()
  } catch (error) {
    updateSyncState({ error: describeSyncError(error) })
  }
}

/**
 * clearDevice: 공용 PC 에서 쓰고 나갈 때. 계정에 전부 올라간 것을 확인한 뒤에만 이 기기 데이터를 지운다.
 * 다 못 올렸으면 로그아웃하지 않고 false 를 돌려준다
 */
export async function signOutSync(clearDevice: boolean): Promise<boolean> {
  if (!fb) return false
  const allSaved = (await engine?.flush()) ?? false
  if (clearDevice && !allSaved) return false
  stopEngine()
  await fb.signOutUser()
  if (clearDevice) setData(() => EMPTY_DATA)
  return true
}
