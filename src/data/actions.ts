import {
  bringToDay,
  delegateTask,
  forwardTask,
  newId,
  nextOrder,
  reorderGroup,
  setTaskStatus,
} from './logic'
import { setData } from './store'
import type { Goal, PlanEvent, Priority, Task, TaskStatus } from './types'

export interface TaskInput {
  readonly title: string
  readonly note: string
  readonly priority: Priority
  readonly date: string
  readonly dueDate?: string
  readonly goalId?: string
}

export function addTask(input: TaskInput): void {
  setData((d) => {
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

export function editTask(id: string, input: TaskInput): void {
  setData((d) => ({
    ...d,
    tasks: d.tasks.map((t) => {
      if (t.id !== id) return t
      const moved = t.date !== input.date || t.priority !== input.priority
      return {
        ...t,
        ...input,
        order: moved ? nextOrder(d.tasks, input.date, input.priority) : t.order,
        startDate: input.dueDate ? (t.startDate ?? input.date) : undefined,
        updatedAt: Date.now(),
      }
    }),
  }))
}

export function removeTask(id: string): void {
  setData((d) => ({
    ...d,
    tasks: d.tasks.map((t) => (t.id === id ? { ...t, deleted: true, updatedAt: Date.now() } : t)),
  }))
}

export function changeStatus(id: string, status: TaskStatus): void {
  setData((d) => ({ ...d, tasks: setTaskStatus(d.tasks, id, status, Date.now()) }))
}

export function delegate(id: string, who: string): void {
  setData((d) => ({ ...d, tasks: delegateTask(d.tasks, id, who, Date.now()) }))
}

export function forward(id: string, toDate: string): void {
  setData((d) => ({ ...d, tasks: forwardTask(d.tasks, id, toDate, Date.now()) }))
}

export function bringOverdue(ids: readonly string[], date: string): void {
  setData((d) => ({ ...d, tasks: bringToDay(d.tasks, ids, date, Date.now()) }))
}

export function reorder(orderedIds: readonly string[]): void {
  setData((d) => ({ ...d, tasks: reorderGroup(d.tasks, orderedIds, Date.now()) }))
}

export interface EventInput {
  readonly date: string
  readonly start: string
  readonly end: string
  readonly title: string
}

export function saveEvent(id: string | null, input: EventInput): void {
  setData((d) => {
    const now = Date.now()
    if (id === null) return { ...d, events: [...d.events, { ...input, id: newId(), updatedAt: now }] }
    return { ...d, events: d.events.map((e) => (e.id === id ? { ...e, ...input, updatedAt: now } : e)) }
  })
}

export function removeEvent(id: string): void {
  setData((d) => ({
    ...d,
    events: d.events.map((e: PlanEvent) => (e.id === id ? { ...e, deleted: true, updatedAt: Date.now() } : e)),
  }))
}

export function saveNote(date: string, text: string): void {
  setData((d) => {
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
  setData((d) => {
    const now = Date.now()
    if (id === null) return { ...d, goals: [...d.goals, { ...input, id: newId(), updatedAt: now }] }
    return { ...d, goals: d.goals.map((g) => (g.id === id ? { ...g, ...input, updatedAt: now } : g)) }
  })
}

export function removeGoal(id: string): void {
  setData((d) => ({
    ...d,
    goals: d.goals.map((g) => (g.id === id ? { ...g, deleted: true, updatedAt: Date.now() } : g)),
  }))
}
