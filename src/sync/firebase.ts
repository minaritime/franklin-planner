import { initializeApp, type FirebaseApp, type FirebaseOptions } from 'firebase/app'
import {
  getAuth,
  getRedirectResult,
  GoogleAuthProvider,
  onAuthStateChanged,
  signInWithPopup,
  signInWithRedirect,
  signOut,
  type Auth,
  type User,
} from 'firebase/auth'
import { collection, doc, initializeFirestore, onSnapshot, writeBatch, type Firestore } from 'firebase/firestore'
import type { RemoteAdapter } from './engine'

/** Firestore 한 번에 쓸 수 있는 최대 개수 */
const BATCH_LIMIT = 450

interface FirebaseHandles {
  readonly app: FirebaseApp
  readonly auth: Auth
  readonly db: Firestore
}

let handles: FirebaseHandles | null = null

export function initFirebase(config: FirebaseOptions): FirebaseHandles {
  if (handles) return handles
  const app = initializeApp(config)
  handles = {
    app,
    auth: getAuth(app),
    db: initializeFirestore(app, { ignoreUndefinedProperties: true }),
  }
  return handles
}

function need(): FirebaseHandles {
  if (!handles) throw new Error('Firebase 가 아직 준비되지 않았습니다')
  return handles
}

export function watchUser(onUser: (user: User | null) => void, onError: (error: unknown) => void): () => void {
  const { auth } = need()
  getRedirectResult(auth).catch(onError)
  return onAuthStateChanged(auth, onUser, onError)
}

const POPUP_FALLBACK = ['auth/popup-blocked', 'auth/operation-not-supported-in-environment', 'auth/cancelled-popup-request']

export async function signInWithGoogle(): Promise<void> {
  const { auth } = need()
  const provider = new GoogleAuthProvider()
  provider.setCustomParameters({ prompt: 'select_account' })
  try {
    await signInWithPopup(auth, provider)
  } catch (error) {
    const code = (error as { code?: string }).code ?? ''
    if (code === 'auth/popup-closed-by-user') return
    if (POPUP_FALLBACK.includes(code)) {
      await signInWithRedirect(auth, provider)
      return
    }
    throw error
  }
}

export async function signOutUser(): Promise<void> {
  await signOut(need().auth)
}

/** users/{uid}/{tasks|events|notes|goals}/{id} 에 항목 하나씩 저장한다 */
export function createFirestoreAdapter(uid: string): RemoteAdapter {
  const { db } = need()
  return {
    listen(name, onDocs, onError) {
      return onSnapshot(
        collection(db, 'users', uid, name),
        (snap) => onDocs(snap.docs.map((d) => d.data())),
        onError,
      )
    },
    async write(items) {
      for (let i = 0; i < items.length; i += BATCH_LIMIT) {
        const batch = writeBatch(db)
        items.slice(i, i + BATCH_LIMIT).forEach((item) => batch.set(doc(db, 'users', uid, item.collection, item.id), item.data))
        await batch.commit()
      }
    },
  }
}
