import { describe, expect, it } from 'vitest'
import { isMultiDay } from './calendar'
import type { Task } from './types'

function task(partial: Partial<Task> & Pick<Task, 'id'>): Task {
  return { title: partial.id, note: '', priority: 'A', order: 1, status: 'todo', date: '2026-11-11', updatedAt: 1, ...partial }
}

describe('isMultiDay', () => {
  it('needs a due date after the start', () => {
    expect(isMultiDay(task({ id: 'a', startDate: '2026-11-11', dueDate: '2026-11-13' }))).toBe(true)
    expect(isMultiDay(task({ id: 'b', dueDate: '2026-11-11' }))).toBe(false)
    expect(isMultiDay(task({ id: 'c' }))).toBe(false)
  })
})
