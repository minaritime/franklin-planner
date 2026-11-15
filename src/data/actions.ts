import {
  bringToDay,
  cyclePriority,
  delegateTask,
  forwardTask,
  newId,
  nextOrder,
  reorderGroup,
  setTaskStatus,
} from './logic'
import { commit } from './store'
import { descendantIds, liftChildren } from './tree'
import { deleteOccurrence, editOccurrence, moveTaskBy, nextCategoryColor, type EventFields, type SeriesScope, type TaskTime } from './eventOps'
import type { Category, Goal, Priority, Task, TaskStatus } from './types'

export interface TaskInput {
  readonly title: string
  readonly note: string
  readonly priority: Priority
  readonly date: string
  readonly dueDate?: string
  readonly goalId?: string
  readonly categoryId?: string
  readonly startTime?: string
  readonly endTime?: string
  readonly parentId?: string
  /** 날짜 미정 (마감일·시간은 저장하지 않는다) */
  readonly unscheduled?: boolean
}

/** 날짜 미정이면 마감일·시간을 비운다 */
function normalize(input: TaskInput): TaskInput {
  if (!input.unscheduled) return { ...input, unscheduled: undefined }
  return { ...input, dueDate: undefined, startTime: undefined, endTime: undefined }
}

export function addTask(raw: TaskInput): void {
  const input = normalize(raw)
  commit((d) => {
    const task: Task = {
      ...input,
      id: newId(),
      order: nextOrder(d.tasks, input.date, input.priority),
      status: 'todo',
      startDate: input.dueDate ? input.date : undefined,
      updatedAt: Date.now(),
    }
    return { ...d, tasks: [...d.tasks, task] }
  })
}

const earlier = (a: string, b: string): string => (a < b ? a : b)

export function editTask(id: string, raw: TaskInput): void {
  const input = normalize(raw)
  commit((d) => ({
    ...d,
    tasks: d.tasks.map((t) => {
      if (t.id !== id) return t
      const moved = t.date !== input.date || t.priority !== input.priority || Boolean(t.unscheduled) !== Boolean(input.unscheduled)
      return {
        ...t,
        ...input,
        order: moved ? nextOrder(d.tasks, input.date, input.priority) : t.order,
        startDate: input.dueDate ? earlier(t.startDate ?? input.date, input.date) : undefined,
        updatedAt: Date.now(),
      }
    }),
  }))
}

/** 세부 할일이 있을 때: 'all' 은 아래까지 다 지우고, 'lift' 는 세부 할일을 한 단계 위로 올린다 */
export type ChildrenOnRemove = 'all' | 'lift'

export function removeTask(id: string, children: ChildrenOnRemove = 'lift'): void {
  commit((d) => {
    const now = Date.now()
    const gone = new Set([id, ...(children === 'all' ? descendantIds(d.tasks, id) : [])])
    const tasks = children === 'lift' ? liftChildren(d.tasks, id, now) : d.tasks
    return { ...d, tasks: tasks.map((t) => (gone.has(t.id) ? { ...t, deleted: true, updatedAt: now } : t)) }
  })
}

export function changeStatus(id: string, status: TaskStatus): void {
  commit((d) => ({ ...d, tasks: setTaskStatus(d.tasks, id, status, Date.now()) }))
}

export function rotatePriority(id: string): void {
  commit((d) => ({ ...d, tasks: cyclePriority(d.tasks, id, Date.now()) }))
}

export function delegate(id: string, who: string): void {
  commit((d) => ({ ...d, tasks: delegateTask(d.tasks, id, who, Date.now()) }))
}

export function forward(id: string, toDate: string): void {
  commit((d) => ({ ...d, tasks: forwardTask(d.tasks, id, toDate, Date.now()) }))
}

export function bringOverdue(ids: readonly string[], date: string): void {
  commit((d) => ({ ...d, tasks: bringToDay(d.tasks, ids, date, Date.now()) }))
}

export function reorder(orderedIds: readonly string[]): void {
  commit((d) => ({ ...d, tasks: reorderGroup(d.tasks, orderedIds, Date.now()) }))
}

/** 새 일정 */
export function addEvent(fields: EventFields): void {
  commit((d) => ({ ...d, events: [...d.events, { ...fields, id: newId(), updatedAt: Date.now() }] }))
}

/** 일정 고치기. 반복 일정이면 scope 로 이 회차만/전체를 고른다 */
export function updateEvent(id: string, occDate: string, fields: EventFields, scope: SeriesScope): void {
  commit((d) => ({ ...d, events: editOccurrence(d.events, id, occDate, fields, scope, Date.now()) }))
}

export function removeEvent(id: string, occDate: string, scope: SeriesScope): void {
  commit((d) => ({ ...d, events: deleteOccurrence(d.events, id, occDate, scope, Date.now()) }))
}

/** 할일을 끌어서 옮길 때. delta 는 옮긴 날 수 */
export function moveTask(id: string, delta: number, time: TaskTime): void {
  commit((d) => ({ ...d, tasks: moveTaskBy(d.tasks, id, delta, time, Date.now()) }))
}

export function addCategory(name: string): string {
  const id = newId()
  commit((d) => {
    const order = d.categories.reduce((m, c) => Math.max(m, c.order), 0) + 1
    const category: Category = { id, name: name.trim(), color: nextCategoryColor(d.categories), order, updatedAt: Date.now() }
    return { ...d, categories: [...d.categories, category] }
  })
  return id
}

export function updateCategory(id: string, patch: Partial<Pick<Category, 'name' | 'color'>>): void {
  commit((d) => ({
    ...d,
    categories: d.categories.map((c) => (c.id === id ? { ...c, ...patch, updatedAt: Date.now() } : c)),
  }))
}

/** 분류만 지운다. 그 분류였던 할일·일정은 '분류 없음'으로 보인다 */
export function removeCategory(id: string): void {
  commit((d) => ({
    ...d,
    categories: d.categories.map((c) => (c.id === id ? { ...c, deleted: true, updatedAt: Date.now() } : c)),
  }))
}

export function saveNote(date: string, text: string): void {
  commit((d) => {
    const now = Date.now()
    const exists = d.notes.some((n) => n.date === date)
    const notes = exists
      ? d.notes.map((n) => (n.date === date ? { ...n, text, updatedAt: now } : n))
      : [...d.notes, { date, text, updatedAt: now }]
    return { ...d, notes }
  })
}

export type GoalInput = Pick<Goal, 'title' | 'kind' | 'description' | 'targetDate'>

export function saveGoal(id: string | null, input: GoalInput): void {
  commit((d) => {
    const now = Date.now()
    if (id === null) return { ...d, goals: [...d.goals, { ...input, id: newId(), updatedAt: now }] }
    return { ...d, goals: d.goals.map((g) => (g.id === id ? { ...g, ...input, updatedAt: now } : g)) }
  })
}

export function removeGoal(id: string): void {
  commit((d) => ({
    ...d,
    goals: d.goals.map((g) => (g.id === id ? { ...g, deleted: true, updatedAt: Date.now() } : g)),
  }))
}
