import { describe, expect, it } from 'vitest'
import {
  addDays,
  bringToDay,
  dDay,
  delegateTask,
  forwardTask,
  goalProgress,
  mergeData,
  nextOrder,
  overdueTasks,
  periodTasksOn,
  reorderGroup,
  setTaskStatus,
  tasksForDay,
} from './logic'
import { EMPTY_DATA, type Task } from './types'

function task(partial: Partial<Task> & Pick<Task, 'id'>): Task {
  return {
    title: partial.id,
    note: '',
    priority: 'A',
    order: 1,
    status: 'todo',
    date: '2026-11-11',
    updatedAt: 1,
    ...partial,
  }
}

describe('addDays', () => {
  it('crosses month boundaries', () => {
    expect(addDays('2026-11-30', 1)).toBe('2026-12-01')
    expect(addDays('2026-03-01', -1)).toBe('2026-02-28')
  })
})

describe('tasksForDay', () => {
  it('returns only that day, sorted by priority then order, without deleted', () => {
    const tasks = [
      task({ id: 'c1', priority: 'C', order: 1 }),
      task({ id: 'a2', priority: 'A', order: 2 }),
      task({ id: 'a1', priority: 'A', order: 1 }),
      task({ id: 'other', date: '2026-11-12' }),
      task({ id: 'gone', deleted: true }),
    ]
    expect(tasksForDay(tasks, '2026-11-11').map((t) => t.id)).toEqual(['a1', 'a2', 'c1'])
  })
})

describe('nextOrder', () => {
  it('is one past the largest order in the same day and priority', () => {
    const tasks = [task({ id: 'a', order: 3 }), task({ id: 'b', priority: 'B', order: 9 })]
    expect(nextOrder(tasks, '2026-11-11', 'A')).toBe(4)
    expect(nextOrder(tasks, '2026-11-11', 'C')).toBe(1)
  })
})

describe('forwardTask', () => {
  it('marks the original forwarded and creates a todo copy on the target day', () => {
    const tasks = [task({ id: 'x', startDate: '2026-11-10', dueDate: '2026-11-20' })]
    const result = forwardTask(tasks, 'x', '2026-11-14', 50, () => 'new')
    expect(result).toHaveLength(2)
    expect(result[0]).toMatchObject({ id: 'x', status: 'forwarded', forwardedTo: '2026-11-14', updatedAt: 50 })
    expect(result[1]).toMatchObject({
      id: 'new',
      status: 'todo',
      date: '2026-11-14',
      forwardedFrom: '2026-11-11',
      startDate: '2026-11-10',
      dueDate: '2026-11-20',
      order: 1,
      updatedAt: 50,
    })
    expect(tasks[0].status).toBe('todo')
  })

  it('refuses to forward a task that is already forwarded, done or deleted, or to the same day', () => {
    for (const extra of [{ status: 'forwarded' as const }, { status: 'done' as const }, { deleted: true }]) {
      const tasks = [task({ id: 'x', ...extra })]
      expect(forwardTask(tasks, 'x', '2026-11-14', 1, () => 'n')).toBe(tasks)
    }
    const tasks = [task({ id: 'x' })]
    expect(forwardTask(tasks, 'x', '2026-11-11', 1, () => 'n')).toBe(tasks)
  })

  it('leaves tasks untouched when the id is unknown', () => {
    const tasks = [task({ id: 'x' })]
    expect(forwardTask(tasks, 'nope', '2026-11-14', 1, () => 'n')).toBe(tasks)
  })
})

describe('bringToDay', () => {
  it('forwards every given task to the day', () => {
    const tasks = [task({ id: 'a', date: '2026-11-09' }), task({ id: 'b', date: '2026-11-10' })]
    let n = 0
    const result = bringToDay(tasks, ['a', 'b'], '2026-11-11', 5, () => `n${n++}`)
    expect(result.filter((t) => t.date === '2026-11-11').map((t) => t.id)).toEqual(['n0', 'n1'])
    expect(result.filter((t) => t.status === 'forwarded')).toHaveLength(2)
  })
})

describe('setTaskStatus / delegateTask', () => {
  it('changes status immutably', () => {
    const tasks = [task({ id: 'x' })]
    const result = setTaskStatus(tasks, 'x', 'done', 9)
    expect(result[0]).toMatchObject({ status: 'done', updatedAt: 9 })
    expect(tasks[0].status).toBe('todo')
  })

  it('records who it was delegated to', () => {
    const result = delegateTask([task({ id: 'x' })], 'x', '김선생', 9)
    expect(result[0]).toMatchObject({ status: 'delegated', delegatedTo: '김선생' })
  })
})

describe('reorderGroup', () => {
  it('renumbers the group 1..n in the given order', () => {
    const tasks = [task({ id: 'a', order: 1 }), task({ id: 'b', order: 2 }), task({ id: 'c', order: 3 })]
    const result = reorderGroup(tasks, ['c', 'a', 'b'], 7)
    expect(Object.fromEntries(result.map((t) => [t.id, t.order]))).toEqual({ c: 1, a: 2, b: 3 })
  })

  it('does not touch tasks whose order did not change', () => {
    const tasks = [task({ id: 'a', order: 1 }), task({ id: 'b', order: 2 })]
    const result = reorderGroup(tasks, ['a', 'b'], 7)
    expect(result[0].updatedAt).toBe(1)
  })
})

describe('overdueTasks', () => {
  it('returns unfinished tasks from earlier days only', () => {
    const tasks = [
      task({ id: 'old', date: '2026-11-09' }),
      task({ id: 'olddone', date: '2026-11-09', status: 'done' }),
      task({ id: 'today' }),
      task({ id: 'olddel', date: '2026-11-09', deleted: true }),
      task({ id: 'inperiod', date: '2026-11-09', dueDate: '2026-11-20' }),
      task({ id: 'pastdue', date: '2026-11-08', dueDate: '2026-11-10' }),
    ]
    expect(overdueTasks(tasks, '2026-11-11').map((t) => t.id)).toEqual(['pastdue', 'old'])
  })
})

describe('periodTasksOn', () => {
  it('includes live tasks whose period covers the day', () => {
    const tasks = [
      task({ id: 'in', startDate: '2026-11-01', dueDate: '2026-11-15' }),
      task({ id: 'fwd', startDate: '2026-11-01', dueDate: '2026-11-15', status: 'forwarded' }),
      task({ id: 'after', startDate: '2026-11-12', dueDate: '2026-11-15' }),
      task({ id: 'nodue' }),
    ]
    expect(periodTasksOn(tasks, '2026-11-11').map((t) => t.id)).toEqual(['in'])
  })
})

describe('dDay', () => {
  it('counts days until the due date', () => {
    expect(dDay('2026-11-14', '2026-11-11')).toBe(3)
    expect(dDay('2026-11-11', '2026-11-11')).toBe(0)
    expect(dDay('2026-11-10', '2026-11-11')).toBe(-1)
  })
})

describe('goalProgress', () => {
  it('ignores forwarded, cancelled and deleted tasks', () => {
    const tasks = [
      task({ id: 'd', goalId: 'g', status: 'done' }),
      task({ id: 't', goalId: 'g' }),
      task({ id: 'f', goalId: 'g', status: 'forwarded' }),
      task({ id: 'x', goalId: 'g', status: 'cancelled' }),
      task({ id: 'r', goalId: 'g', deleted: true }),
      task({ id: 'o', goalId: 'other', status: 'done' }),
    ]
    expect(goalProgress(tasks, 'g')).toEqual({ done: 1, total: 2 })
  })
})

describe('mergeData', () => {
  it('keeps the newer version of each item from either side', () => {
    const local = { ...EMPTY_DATA, tasks: [task({ id: 'a', title: 'local-new', updatedAt: 5 }), task({ id: 'b', title: 'local-old', updatedAt: 1 })] }
    const remote = { ...EMPTY_DATA, tasks: [task({ id: 'a', title: 'remote-old', updatedAt: 2 }), task({ id: 'b', title: 'remote-new', updatedAt: 8 }), task({ id: 'c', updatedAt: 3 })] }
    const merged = mergeData(local, remote)
    const byId = Object.fromEntries(merged.tasks.map((t) => [t.id, t.title]))
    expect(byId).toEqual({ a: 'local-new', b: 'remote-new', c: 'c' })
  })

  it('keeps deletions so removed items do not come back', () => {
    const local = { ...EMPTY_DATA, tasks: [task({ id: 'a', deleted: true, updatedAt: 9 })] }
    const remote = { ...EMPTY_DATA, tasks: [task({ id: 'a', updatedAt: 3 })] }
    expect(mergeData(local, remote).tasks[0].deleted).toBe(true)
  })

  it('merges notes by date', () => {
    const local = { ...EMPTY_DATA, notes: [{ date: '2026-11-11', text: 'L', updatedAt: 1 }] }
    const remote = { ...EMPTY_DATA, notes: [{ date: '2026-11-11', text: 'R', updatedAt: 2 }] }
    expect(mergeData(local, remote).notes).toEqual([{ date: '2026-11-11', text: 'R', updatedAt: 2 }])
  })
})
