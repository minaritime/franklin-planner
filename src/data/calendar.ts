import { addDays, tasksForDay } from './logic'
import type { Task } from './types'

/** 일요일부터 시작하는 주 단위 달력 (앞뒤 달 날짜로 빈칸을 채운다) */
export function monthGrid(year: number, month: number): string[][] {
  const first = `${year}-${String(month).padStart(2, '0')}-01`
  const firstDay = new Date(Date.UTC(year, month - 1, 1)).getUTCDay()
  const daysInMonth = new Date(Date.UTC(year, month, 0)).getUTCDate()
  const weekCount = Math.ceil((firstDay + daysInMonth) / 7)
  const start = addDays(first, -firstDay)
  return Array.from({ length: weekCount }, (_, w) => Array.from({ length: 7 }, (_, d) => addDays(start, w * 7 + d)))
}

export function taskStart(task: Task): string {
  return task.startDate ?? task.date
}

/** 하루 넘게 이어지는 기간 할일인지 */
export function isMultiDay(task: Task): boolean {
  return task.dueDate !== undefined && task.dueDate > taskStart(task)
}

const isShown = (t: Task): boolean => !t.deleted && t.status !== 'forwarded'

export interface WeekBar {
  readonly task: Task
  readonly startCol: number
  readonly endCol: number
  readonly lane: number
  readonly continuesBefore: boolean
  readonly continuesAfter: boolean
}

/** 한 주에 걸치는 기간 할일 막대를 겹치지 않게 줄(lane)에 배치한다 */
export function weekBars(tasks: readonly Task[], week: readonly string[]): WeekBar[] {
  const weekStart = week[0]
  const weekEnd = week[week.length - 1]
  const inWeek = tasks
    .filter((t) => isShown(t) && isMultiDay(t) && taskStart(t) <= weekEnd && t.dueDate! >= weekStart)
    .sort((a, b) => taskStart(a).localeCompare(taskStart(b)) || b.dueDate!.localeCompare(a.dueDate!))

  const laneEnds: number[] = []
  return inWeek.map((task) => {
    const start = taskStart(task)
    const startCol = start < weekStart ? 0 : week.indexOf(start)
    const endCol = task.dueDate! > weekEnd ? week.length - 1 : week.indexOf(task.dueDate!)
    let lane = laneEnds.findIndex((end) => end < startCol)
    if (lane === -1) lane = laneEnds.length
    laneEnds[lane] = endCol
    return { task, startCol, endCol, lane, continuesBefore: start < weekStart, continuesAfter: task.dueDate! > weekEnd }
  })
}

/** 그날 칸에 글자로 보여줄 하루짜리 할일 */
export function dayItems(tasks: readonly Task[], date: string): Task[] {
  return tasksForDay(tasks, date).filter((t) => t.status !== 'forwarded' && !isMultiDay(t))
}
