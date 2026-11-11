import type { DayNote, Goal, PlanEvent, PlannerData, Task } from './types'

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/
const TIME_RE = /^([01]\d|2[0-3]):[0-5]\d$/
const PRIORITY = new Set(['A', 'B', 'C'])
const STATUS = new Set(['todo', 'done', 'forwarded', 'delegated', 'cancelled'])
const GOAL_KIND = new Set(['value', 'goal'])

type Obj = Record<string, unknown>

const isObj = (v: unknown): v is Obj => typeof v === 'object' && v !== null && !Array.isArray(v)
const isStr = (v: unknown): v is string => typeof v === 'string'
const isNum = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v)
const isDate = (v: unknown): v is string => isStr(v) && DATE_RE.test(v)
const optDate = (v: unknown): boolean => v === undefined || isDate(v)
const optStr = (v: unknown): boolean => v === undefined || isStr(v)
const optBool = (v: unknown): boolean => v === undefined || typeof v === 'boolean'

export function isTask(v: unknown): v is Task {
  return (
    isObj(v) &&
    isStr(v.id) &&
    isStr(v.title) &&
    isStr(v.note) &&
    PRIORITY.has(v.priority as string) &&
    isNum(v.order) &&
    STATUS.has(v.status as string) &&
    isDate(v.date) &&
    optDate(v.startDate) &&
    optDate(v.dueDate) &&
    optStr(v.goalId) &&
    optStr(v.delegatedTo) &&
    optDate(v.forwardedTo) &&
    optDate(v.forwardedFrom) &&
    isNum(v.updatedAt) &&
    optBool(v.deleted)
  )
}

export function isEvent(v: unknown): v is PlanEvent {
  return (
    isObj(v) &&
    isStr(v.id) &&
    isDate(v.date) &&
    isStr(v.start) &&
    TIME_RE.test(v.start) &&
    isStr(v.end) &&
    TIME_RE.test(v.end) &&
    isStr(v.title) &&
    isNum(v.updatedAt) &&
    optBool(v.deleted)
  )
}

export function isNote(v: unknown): v is DayNote {
  return isObj(v) && isDate(v.date) && isStr(v.text) && isNum(v.updatedAt)
}

export function isGoal(v: unknown): v is Goal {
  return (
    isObj(v) &&
    isStr(v.id) &&
    isStr(v.title) &&
    GOAL_KIND.has(v.kind as string) &&
    isStr(v.description) &&
    optDate(v.targetDate) &&
    isNum(v.updatedAt) &&
    optBool(v.deleted)
  )
}

/**
 * 바깥에서 들어온 데이터(저장값, Gist, 가져오기 파일)를 확인한다.
 * 겉모양이 틀리면 null, 항목 중 일부만 틀리면 그 항목만 버린다.
 */
export function parsePlannerData(value: unknown): PlannerData | null {
  if (!isObj(value) || value.version !== 1) return null
  const { tasks, events, notes, goals } = value
  if (!Array.isArray(tasks) || !Array.isArray(events) || !Array.isArray(notes) || !Array.isArray(goals)) return null
  return {
    version: 1,
    tasks: tasks.filter(isTask),
    events: events.filter(isEvent),
    notes: notes.filter(isNote),
    goals: goals.filter(isGoal),
  }
}
