import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { EMPTY_DATA, type PlannerData, type Task } from '../data/types'
import { COLLECTIONS, createSyncEngine, hasNewerItems, itemsToPush, type CollectionName, type RemoteAdapter, type RemoteItem } from './engine'

function task(id: string, updatedAt: number, title = id): Task {
  return { id, title, note: '', priority: 'A', order: 1, status: 'todo', date: '2026-11-11', updatedAt }
}

function memoryStore(initial: PlannerData) {
  let state = initial
  const listeners = new Set<() => void>()
  return {
    get: () => state,
    set: (update: (p: PlannerData) => PlannerData) => {
      const next = update(state)
      if (next === state) return
      state = next
      listeners.forEach((l) => l())
    },
    subscribe: (l: () => void) => {
      listeners.add(l)
      return () => listeners.delete(l)
    },
  }
}

/** 서버 흉내: 쓰면 저장하고 구독자에게 다시 알려준다 */
function fakeServer(initial: Partial<Record<CollectionName, unknown[]>> = {}) {
  const docs = new Map<CollectionName, Map<string, unknown>>(
    COLLECTIONS.map((c) => [c, new Map((initial[c] ?? []).map((d) => [(d as { id?: string; date?: string }).id ?? (d as { date: string }).date, d]))]),
  )
  const listeners = new Map<CollectionName, (docs: readonly unknown[]) => void>()
  const writes: RemoteItem[][] = []
  let fail = false
  const emit = (c: CollectionName) => listeners.get(c)?.([...docs.get(c)!.values()])
  const adapter: RemoteAdapter = {
    listen(c, onDocs) {
      listeners.set(c, onDocs)
      queueMicrotask(() => emit(c))
      return () => listeners.delete(c)
    },
    async write(items) {
      if (fail) throw new Error('network')
      writes.push([...items])
      items.forEach((i) => docs.get(i.collection)!.set(i.id, i.data))
      new Set(items.map((i) => i.collection)).forEach((c) => queueMicrotask(() => emit(c)))
    },
  }
  return {
    adapter,
    writes,
    docs,
    setFail: (v: boolean) => (fail = v),
    put: (c: CollectionName, d: { id: string }) => {
      docs.get(c)!.set(d.id, d)
      emit(c)
    },
  }
}

describe('itemsToPush', () => {
  it('pushes items missing remotely or newer than the remote copy', () => {
    const local = { ...EMPTY_DATA, tasks: [task('a', 5), task('b', 1), task('c', 3)], notes: [{ date: '2026-11-11', text: 'x', updatedAt: 2 }] }
    const known = new Map([['tasks/a', 4], ['tasks/b', 1]])
    expect(itemsToPush(local, known).map((i) => `${i.collection}/${i.id}`)).toEqual(['tasks/a', 'tasks/c', 'notes/2026-11-11'])
  })
})

describe('hasNewerItems', () => {
  it('is true only when remote has something newer', () => {
    const local = { ...EMPTY_DATA, tasks: [task('a', 5)] }
    expect(hasNewerItems(local, { ...EMPTY_DATA, tasks: [task('a', 5)] })).toBe(false)
    expect(hasNewerItems(local, { ...EMPTY_DATA, tasks: [task('a', 6)] })).toBe(true)
    expect(hasNewerItems(local, { ...EMPTY_DATA, goals: [{ id: 'g', title: 'g', kind: 'goal', description: '', updatedAt: 1 }] })).toBe(true)
  })
})

describe('createSyncEngine', () => {
  beforeEach(() => vi.useFakeTimers())
  afterEach(() => vi.useRealTimers())

  const settle = async () => {
    for (let i = 0; i < 5; i++) await vi.runAllTimersAsync()
  }

  it('first sign-in merges both sides: pulls remote items and uploads local ones', async () => {
    const store = memoryStore({ ...EMPTY_DATA, tasks: [task('local', 1)] })
    const server = fakeServer({ tasks: [task('remote', 1)] })
    const statuses: string[] = []
    createSyncEngine({ store, adapter: server.adapter, delayMs: 100, onStatus: (s) => statuses.push(s) }).start()
    await settle()

    expect(store.get().tasks.map((t) => t.id).sort()).toEqual(['local', 'remote'])
    expect([...server.docs.get('tasks')!.keys()].sort()).toEqual(['local', 'remote'])
    expect(statuses.at(-1)).toBe('synced')
  })

  it('uploads only what changed after a local edit, once', async () => {
    const store = memoryStore({ ...EMPTY_DATA, tasks: [task('a', 1), task('b', 1)] })
    const server = fakeServer({ tasks: [task('a', 1), task('b', 1)] })
    createSyncEngine({ store, adapter: server.adapter, delayMs: 100, onStatus: () => {} }).start()
    await settle()
    expect(server.writes).toHaveLength(0)

    store.set((d) => ({ ...d, tasks: d.tasks.map((t) => (t.id === 'b' ? { ...t, title: 'changed', updatedAt: 2 } : t)) }))
    await settle()
    expect(server.writes).toHaveLength(1)
    expect(server.writes[0].map((i) => i.id)).toEqual(['b'])
  })

  it('applies a newer remote edit from another device without echoing it back', async () => {
    const store = memoryStore({ ...EMPTY_DATA, tasks: [task('a', 1)] })
    const server = fakeServer({ tasks: [task('a', 1)] })
    createSyncEngine({ store, adapter: server.adapter, delayMs: 100, onStatus: () => {} }).start()
    await settle()

    server.put('tasks', task('a', 9, 'from phone'))
    await settle()
    expect(store.get().tasks[0].title).toBe('from phone')
    expect(server.writes).toHaveLength(0)
  })

  it('keeps the newer local copy when the remote one is older', async () => {
    const store = memoryStore({ ...EMPTY_DATA, tasks: [task('a', 9, 'mine')] })
    const server = fakeServer({ tasks: [task('a', 3, 'old')] })
    createSyncEngine({ store, adapter: server.adapter, delayMs: 100, onStatus: () => {} }).start()
    await settle()
    expect(store.get().tasks[0].title).toBe('mine')
    expect((server.docs.get('tasks')!.get('a') as Task).title).toBe('mine')
  })

  it('reports an error and retries after the network comes back', async () => {
    const store = memoryStore({ ...EMPTY_DATA, tasks: [task('a', 1)] })
    const server = fakeServer()
    server.setFail(true)
    const statuses: string[] = []
    createSyncEngine({ store, adapter: server.adapter, delayMs: 100, onStatus: (s) => statuses.push(s) }).start()
    await vi.advanceTimersByTimeAsync(50)
    expect(statuses).toContain('error')

    server.setFail(false)
    await vi.advanceTimersByTimeAsync(10_000)
    await settle()
    expect(server.docs.get('tasks')!.has('a')).toBe(true)
    expect(statuses.at(-1)).toBe('synced')
  })

  it('drops invalid remote documents instead of breaking local data', async () => {
    const store = memoryStore({ ...EMPTY_DATA, tasks: [task('a', 1)] })
    const server = fakeServer({ tasks: [task('a', 1), { id: 'bad', updatedAt: 99 } as unknown as Task] })
    createSyncEngine({ store, adapter: server.adapter, delayMs: 100, onStatus: () => {} }).start()
    await settle()
    expect(store.get().tasks.map((t) => t.id)).toEqual(['a'])
  })

  it('stop() unsubscribes so later remote changes are ignored', async () => {
    const store = memoryStore({ ...EMPTY_DATA, tasks: [task('a', 1)] })
    const server = fakeServer({ tasks: [task('a', 1)] })
    const engine = createSyncEngine({ store, adapter: server.adapter, delayMs: 100, onStatus: () => {} })
    engine.start()
    await settle()
    engine.stop()
    server.put('tasks', task('a', 9, 'late'))
    await settle()
    expect(store.get().tasks[0].title).toBe('a')
  })
  it('flush() says whether everything reached the server', async () => {
    const store = memoryStore({ ...EMPTY_DATA, tasks: [task('a', 1)] })
    const server = fakeServer({ tasks: [task('a', 1)] })
    const engine = createSyncEngine({ store, adapter: server.adapter, delayMs: 100, onStatus: () => {} })
    engine.start()
    await settle()

    server.setFail(true)
    store.set((d) => ({ ...d, tasks: [task('a', 2, 'unsaved')] }))
    expect(await engine.flush()).toBe(false)

    server.setFail(false)
    expect(await engine.flush()).toBe(true)
    expect((server.docs.get('tasks')!.get('a') as Task).title).toBe('unsaved')
  })
})
