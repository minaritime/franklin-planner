import type { Task } from './types'

export function taskStart(task: Task): string {
  return task.startDate ?? task.date
}

/** 하루 넘게 이어지는 기간 할일인지 */
export function isMultiDay(task: Task): boolean {
  return task.dueDate !== undefined && task.dueDate > taskStart(task)
}
