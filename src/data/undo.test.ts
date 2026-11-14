import { describe, expect, it } from 'vitest'
import { restoreSnapshot } from './undo'
import { EMPTY_DATA, type PlannerData, type Task } from './types'

const task = (id: string, title: string, updatedAt: number): Task => ({
  id,
  title,
  note: '',
  priority: 'A',
  order: 1,
  status: 'todo',
  date: '2026-11-14',
  updatedAt,
})

describe('restoreSnapshot', () => {
  it('puts changed items back with a new time so sync keeps the undo', () => {
    const before: PlannerData = { ...EMPTY_DATA, tasks: [task('a', '원래', 1), task('b', '그대로', 1)] }
    const after: PlannerData = { ...EMPTY_DATA, tasks: [task('a', '바꿈', 5), before.tasks[1]] }
    const restored = restoreSnapshot(after, before, after, 9)
    expect(restored.tasks[0]).toMatchObject({ id: 'a', title: '원래', updatedAt: 9 })
    expect(restored.tasks[1]).toBe(before.tasks[1])
  })

  it('marks items that did not exist before as deleted instead of dropping them', () => {
    const before: PlannerData = EMPTY_DATA
    const after: PlannerData = {
      ...EMPTY_DATA,
      tasks: [task('new', '새로', 5)],
      notes: [{ date: '2026-11-14', text: '메모', updatedAt: 5 }],
    }
    const restored = restoreSnapshot(after, before, after, 9)
    expect(restored.tasks[0]).toMatchObject({ id: 'new', deleted: true, updatedAt: 9 })
    expect(restored.notes[0]).toEqual({ date: '2026-11-14', text: '', updatedAt: 9 })
  })

  it('brings back a deleted category', () => {
    const cat = { id: 'c', name: '학원', color: 'blue' as const, order: 1, updatedAt: 1 }
    const before: PlannerData = { ...EMPTY_DATA, categories: [cat] }
    const after: PlannerData = { ...EMPTY_DATA, categories: [{ ...cat, deleted: true, updatedAt: 3 }] }
    expect(restoreSnapshot(after, before, after, 9).categories[0]).toEqual({ ...cat, updatedAt: 9 })
  })

  it('leaves alone items that another device changed after the commit', () => {
    const before: PlannerData = { ...EMPTY_DATA, tasks: [task('a', '원래', 1), task('b', 'B 원래', 1)] }
    const after: PlannerData = { ...EMPTY_DATA, tasks: [task('a', '바꿈', 5), before.tasks[1]] }
    // 그 뒤 동기화로 B 가 바뀌어 들어왔다
    const current: PlannerData = { ...EMPTY_DATA, tasks: [after.tasks[0], task('b', 'B 다른 기기', 7)] }
    const restored = restoreSnapshot(current, before, after, 9)
    expect(restored.tasks[0]).toMatchObject({ title: '원래', updatedAt: 9 })
    expect(restored.tasks[1]).toBe(current.tasks[1])
  })

  it('does not undo an item that was changed again after the commit', () => {
    const before: PlannerData = { ...EMPTY_DATA, tasks: [task('a', '원래', 1)] }
    const after: PlannerData = { ...EMPTY_DATA, tasks: [task('a', '바꿈', 5)] }
    const current: PlannerData = { ...EMPTY_DATA, tasks: [task('a', '다른 기기에서 또 바꿈', 7)] }
    expect(restoreSnapshot(current, before, after, 9).tasks[0]).toBe(current.tasks[0])
  })
})
