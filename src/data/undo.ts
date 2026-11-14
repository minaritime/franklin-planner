import type { PlannerData } from './types'

type Item = { readonly updatedAt: number; readonly deleted?: boolean }

function restoreList<T extends Item>(
  current: readonly T[],
  before: readonly T[],
  after: readonly T[],
  key: (item: T) => string,
  remove: (item: T, now: number) => T,
  now: number,
): T[] {
  const prev = new Map(before.map((p) => [key(p), p]))
  const made = new Map(after.map((a) => [key(a), a]))
  return current.map((item) => {
    const k = key(item)
    const old = prev.get(k)
    // 그 한 번에 바뀐 것만, 그 뒤 (다른 기기 등에서) 또 바뀌지 않았을 때만 되돌린다
    if (made.get(k) !== item || old === item) return item
    return old ? { ...old, updatedAt: now } : remove(item, now)
  })
}

const softDelete = <T extends Item>(item: T, now: number): T => ({ ...item, deleted: true, updatedAt: now })

/**
 * 한 번의 변경(before → after)을 되돌린다. 되돌린 항목은 지금 시각으로 다시 찍어야 동기화가 '더 새 것'으로 보고 덮어쓰지 않는다.
 * 그사이 새로 생긴 항목은 지우지 않고 삭제 표시를 한다 (다른 기기에도 사라지게).
 */
export function restoreSnapshot(current: PlannerData, before: PlannerData, after: PlannerData, now: number): PlannerData {
  const clearNote = <T extends { text: string; updatedAt: number }>(n: T, t: number): T => ({ ...n, text: '', updatedAt: t })
  return {
    version: 1,
    tasks: restoreList(current.tasks, before.tasks, after.tasks, (t) => t.id, softDelete, now),
    events: restoreList(current.events, before.events, after.events, (e) => e.id, softDelete, now),
    goals: restoreList(current.goals, before.goals, after.goals, (g) => g.id, softDelete, now),
    categories: restoreList(current.categories, before.categories, after.categories, (c) => c.id, softDelete, now),
    notes: restoreList(current.notes, before.notes, after.notes, (n) => n.date, clearNote, now),
  }
}
