import type { Goal, PlannerData, Priority, Task, TaskStatus } from './types'
import { PRIORITIES } from './types'

const DAY_MS = 86_400_000

function toUtc(date: string): number {
  const [y, m, d] = date.split('-').map(Number)
  return Date.UTC(y, m - 1, d)
}

function fromUtc(ms: number): string {
  return new Date(ms).toISOString().slice(0, 10)
}

export function addDays(date: string, days: number): string {
  return fromUtc(toUtc(date) + days * DAY_MS)
}

/** 기기 시간대 기준 오늘 날짜 */
export function todayString(now: Date = new Date()): string {
  const y = now.getFullYear()
  const m = String(now.getMonth() + 1).padStart(2, '0')
  const d = String(now.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

export function newId(): string {
  return crypto.randomUUID()
}

const isLive = (t: Task): boolean => !t.deleted

function byPriorityThenOrder(a: Task, b: Task): number {
  const p = PRIORITIES.indexOf(a.priority) - PRIORITIES.indexOf(b.priority)
  return p !== 0 ? p : a.order - b.order
}

export function tasksForDay(tasks: readonly Task[], date: string): Task[] {
  return tasks.filter((t) => isLive(t) && t.date === date).sort(byPriorityThenOrder)
}

export function nextOrder(tasks: readonly Task[], date: string, priority: Priority): number {
  const orders = tasks
    .filter((t) => isLive(t) && t.date === date && t.priority === priority)
    .map((t) => t.order)
  return orders.length === 0 ? 1 : Math.max(...orders) + 1
}

function updateTask(tasks: readonly Task[], id: string, patch: Partial<Task>, now: number): Task[] {
  return tasks.map((t) => (t.id === id ? { ...t, ...patch, updatedAt: now } : t))
}

export function setTaskStatus(tasks: readonly Task[], id: string, status: TaskStatus, now: number): Task[] {
  return updateTask(tasks, id, { status }, now)
}

const NEXT_PRIORITY: Record<Priority, Priority> = { A: 'B', B: 'C', C: 'A' }

/** A → B → C → A 로 돌리고, 새 묶음의 맨 뒤 번호를 준다 */
export function cyclePriority(tasks: readonly Task[], id: string, now: number): Task[] {
  const task = tasks.find((t) => t.id === id)
  if (!task) return [...tasks]
  const priority = NEXT_PRIORITY[task.priority]
  return updateTask(tasks, id, { priority, order: nextOrder(tasks, task.date, priority) }, now)
}

export function delegateTask(tasks: readonly Task[], id: string, who: string, now: number): Task[] {
  return updateTask(tasks, id, { status: 'delegated', delegatedTo: who }, now)
}

/** 종이 플래너처럼 원래 칸에는 "→ 날짜"를 남기고, 그 날에 같은 할일을 새로 만든다 */
export function forwardTask(
  tasks: readonly Task[],
  id: string,
  toDate: string,
  now: number,
  makeId: () => string = newId,
): readonly Task[] {
  const original = tasks.find((t) => t.id === id)
  // 이미 미뤘거나 끝난 할일을 또 미루면 살아있는 사본이 둘이 된다 (두 탭, 두 번 클릭)
  if (!original || original.deleted || (original.status !== 'todo' && original.status !== 'delegated')) return tasks
  if (toDate === original.date) return tasks
  const copy: Task = {
    ...original,
    id: makeId(),
    status: 'todo',
    date: toDate,
    order: nextOrder(tasks, toDate, original.priority),
    forwardedFrom: original.date,
    forwardedTo: undefined,
    delegatedTo: undefined,
    updatedAt: now,
  }
  return [...updateTask(tasks, id, { status: 'forwarded', forwardedTo: toDate }, now), copy]
}

export function bringToDay(
  tasks: readonly Task[],
  ids: readonly string[],
  date: string,
  now: number,
  makeId: () => string = newId,
): readonly Task[] {
  return ids.reduce<readonly Task[]>((acc, id) => forwardTask(acc, id, date, now, makeId), tasks)
}

/** orderedIds 순서대로 1부터 다시 번호를 매긴다. 번호가 그대로인 항목은 건드리지 않는다 */
export function reorderGroup(tasks: readonly Task[], orderedIds: readonly string[], now: number): Task[] {
  const position = new Map(orderedIds.map((id, i) => [id, i + 1]))
  return tasks.map((t) => {
    const order = position.get(t.id)
    return order === undefined || order === t.order ? t : { ...t, order, updatedAt: now }
  })
}

export function overdueTasks(tasks: readonly Task[], today: string): Task[] {
  const isOverdue = (t: Task): boolean =>
    isLive(t) && t.status === 'todo' && t.date < today && (t.dueDate === undefined || t.dueDate < today)
  return tasks.filter(isOverdue).sort((a, b) =>
    a.date === b.date ? byPriorityThenOrder(a, b) : a.date.localeCompare(b.date),
  )
}

/** 미뤄서 사라진 사본이 아니라 현재 살아있는 할일인지 */
export function isActiveInstance(t: Task): boolean {
  return isLive(t) && t.status !== 'forwarded' && t.status !== 'cancelled'
}

export function periodTasksOn(tasks: readonly Task[], date: string): Task[] {
  return tasks.filter(
    (t) => isActiveInstance(t) && t.dueDate !== undefined && (t.startDate ?? t.date) <= date && date <= t.dueDate,
  )
}

/**
 * 시작일이 아닌 날의 우선 업무 목록에 같이 보여 줄 장기 할일.
 * 기간 안이면 매일 나와서 잊지 않게 한다. 완료·맡김도 그대로 보여 주고(체크하자마자 사라지지 않게) 취소·미룸은 뺀다.
 */
export function carriedLongTasks(tasks: readonly Task[], date: string): Task[] {
  return periodTasksOn(tasks, date)
    .filter((t) => t.date !== date)
    .sort(byPriorityThenOrder)
}

export function dDay(dueDate: string, today: string): number {
  return Math.round((toUtc(dueDate) - toUtc(today)) / DAY_MS)
}

export function formatDDay(days: number): string {
  if (days === 0) return 'D-day'
  return days > 0 ? `D-${days}` : `D+${-days}`
}

export interface Progress {
  readonly done: number
  readonly total: number
}

export function goalProgress(tasks: readonly Task[], goalId: string): Progress {
  const related = tasks.filter((t) => t.goalId === goalId && isActiveInstance(t))
  return { done: related.filter((t) => t.status === 'done').length, total: related.length }
}

export function liveGoals(goals: readonly Goal[]): Goal[] {
  return goals.filter((g) => !g.deleted)
}

function mergeBy<T extends { readonly updatedAt: number }>(
  local: readonly T[],
  remote: readonly T[],
  key: (item: T) => string,
): T[] {
  const merged = new Map<string, T>()
  for (const item of [...local, ...remote]) {
    const existing = merged.get(key(item))
    if (!existing || item.updatedAt > existing.updatedAt) merged.set(key(item), item)
  }
  return [...merged.values()]
}

/** 항목마다 나중에 고친 쪽을 남긴다. 삭제도 표시로 남아 있어 되살아나지 않는다 */
export function mergeData(local: PlannerData, remote: PlannerData): PlannerData {
  return {
    version: 1,
    tasks: mergeBy(local.tasks, remote.tasks, (t) => t.id),
    events: mergeBy(local.events, remote.events, (e) => e.id),
    notes: mergeBy(local.notes, remote.notes, (n) => n.date),
    goals: mergeBy(local.goals, remote.goals, (g) => g.id),
  }
}
