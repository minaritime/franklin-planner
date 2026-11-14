import { mergeData } from '../data/logic'
import type { PlannerData } from '../data/types'
import { parsePlannerData } from '../data/validate'

export const COLLECTIONS = ['tasks', 'events', 'notes', 'goals', 'categories'] as const
export type CollectionName = (typeof COLLECTIONS)[number]

interface Stamped {
  readonly updatedAt: number
}

export interface RemoteItem {
  readonly collection: CollectionName
  readonly id: string
  readonly data: Stamped
}

/** Firestore 같은 원격 저장소. 엔진은 이것만 알고 Firebase 는 모른다 */
export interface RemoteAdapter {
  listen(collection: CollectionName, onDocs: (docs: readonly unknown[]) => void, onError: (error: unknown) => void): () => void
  write(items: readonly RemoteItem[]): Promise<void>
}

export interface LocalStore {
  get(): PlannerData
  set(update: (prev: PlannerData) => PlannerData): void
  subscribe(listener: () => void): () => void
}

export type EngineStatus = 'connecting' | 'synced' | 'saving' | 'error'

export function itemId(collection: CollectionName, item: object): string {
  const record = item as { id?: string; date?: string }
  return (collection === 'notes' ? record.date : record.id) ?? ''
}

const keyOf = (collection: CollectionName, id: string): string => `${collection}/${id}`

/** 원격에 없거나 원격보다 새로 고친 로컬 항목 */
export function itemsToPush(local: PlannerData, known: ReadonlyMap<string, number>): RemoteItem[] {
  return COLLECTIONS.flatMap((collection) =>
    (local[collection] as readonly Stamped[])
      .filter((item) => item.updatedAt > (known.get(keyOf(collection, itemId(collection, item))) ?? -1))
      .map((item) => ({ collection, id: itemId(collection, item), data: item })),
  )
}

/** 원격에 로컬보다 새 항목이 있는지 (없으면 화면을 다시 그리지 않는다) */
export function hasNewerItems(local: PlannerData, remote: PlannerData): boolean {
  return COLLECTIONS.some((collection) => {
    const mine = new Map((local[collection] as readonly Stamped[]).map((i) => [itemId(collection, i), i.updatedAt]))
    return (remote[collection] as readonly Stamped[]).some((i) => i.updatedAt > (mine.get(itemId(collection, i)) ?? -1))
  })
}

export interface SyncEngineOptions {
  readonly store: LocalStore
  readonly adapter: RemoteAdapter
  readonly delayMs: number
  readonly onStatus: (status: EngineStatus, error?: unknown) => void
}

export interface SyncEngine {
  start(): void
  stop(): void
  /** 기다리지 않고 지금 바로 올린다. 남김없이 올라갔으면 true */
  flush(): Promise<boolean>
}

const RETRY_MS = 10_000

export function createSyncEngine({ store, adapter, delayMs, onStatus }: SyncEngineOptions): SyncEngine {
  const remote = new Map<CollectionName, readonly unknown[]>()
  const known = new Map<string, number>()
  let unsubscribers: (() => void)[] = []
  let timer: ReturnType<typeof setTimeout> | undefined
  let pushing: Promise<void> | null = null
  let stopped = true

  const ready = (): boolean => COLLECTIONS.every((c) => remote.has(c))

  function rememberRemote(collection: CollectionName, docs: readonly unknown[]): void {
    for (const doc of docs) {
      const stamp = (doc as Partial<Stamped>)?.updatedAt
      const id = typeof doc === 'object' && doc !== null ? itemId(collection, doc) : ''
      if (id && typeof stamp === 'number') {
        const key = keyOf(collection, id)
        known.set(key, Math.max(known.get(key) ?? -1, stamp))
      }
    }
  }

  function reconcile(): void {
    const remoteData = parsePlannerData({ version: 1, ...Object.fromEntries(remote) })
    if (remoteData && hasNewerItems(store.get(), remoteData)) store.set((local) => mergeData(local, remoteData))
    schedule(0)
  }

  async function push(): Promise<void> {
    if (stopped || !ready()) return
    const items = itemsToPush(store.get(), known)
    if (items.length === 0) {
      onStatus('synced')
      return
    }
    onStatus('saving')
    try {
      await adapter.write(items)
      items.forEach((i) => known.set(keyOf(i.collection, i.id), i.data.updatedAt))
      // 올리는 사이에 또 바뀌었으면 한 번 더
      if (itemsToPush(store.get(), known).length > 0) schedule(delayMs)
      else onStatus('synced')
    } catch (error) {
      onStatus('error', error)
      schedule(RETRY_MS)
    }
  }

  function runPush(): Promise<void> {
    if (!pushing) pushing = push().finally(() => (pushing = null))
    return pushing
  }

  function schedule(ms: number): void {
    if (stopped) return
    clearTimeout(timer)
    timer = setTimeout(() => void runPush(), ms)
  }

  return {
    start() {
      if (!stopped) return
      stopped = false
      onStatus('connecting')
      unsubscribers = [
        ...COLLECTIONS.map((collection) =>
          adapter.listen(
            collection,
            (docs) => {
              remote.set(collection, docs)
              rememberRemote(collection, docs)
              if (ready()) reconcile()
            },
            (error) => onStatus('error', error),
          ),
        ),
        store.subscribe(() => {
          if (ready()) schedule(delayMs)
        }),
      ]
    },
    stop() {
      stopped = true
      clearTimeout(timer)
      unsubscribers.forEach((u) => u())
      unsubscribers = []
      remote.clear()
      known.clear()
    },
    async flush() {
      clearTimeout(timer)
      if (stopped || !ready()) return false
      await runPush()
      // 올리는 사이에 바뀐 것이 있으면 한 번 더
      if (itemsToPush(store.get(), known).length > 0) await runPush()
      return itemsToPush(store.get(), known).length === 0
    },
  }
}
