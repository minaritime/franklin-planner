import { isActiveInstance, isScheduled, type Progress } from './logic'
import type { Task } from './types'

/** 프로젝트 > 기획 > 캐릭터 기획 까지 */
export const MAX_TREE_DEPTH = 3

export interface TaskNode {
  readonly task: Task
  readonly children: readonly TaskNode[]
}

const byId = (tasks: readonly Task[]): Map<string, Task> => new Map(tasks.map((t) => [t.id, t]))

/** 위로 거슬러 올라간 부모들 (가까운 순). 순환이면 null */
function ancestorChain(task: Task, index: ReadonlyMap<string, Task>): Task[] | null {
  const chain: Task[] = []
  const seen = new Set([task.id])
  for (let p = task.parentId ? index.get(task.parentId) : undefined; p; p = p.parentId ? index.get(p.parentId) : undefined) {
    if (seen.has(p.id)) return null
    seen.add(p.id)
    chain.push(p)
  }
  return chain
}

/**
 * 바깥에서 들어온 데이터의 부모 연결을 확인한다.
 * 자기 자신·순환이거나 3단을 넘으면 부모를 끊는다. 아직 안 온 부모(동기화 전)는 그대로 둔다.
 */
export function cutBadParents(tasks: readonly Task[]): Task[] {
  const index = byId(tasks)
  return tasks.map((t) => {
    if (!t.parentId) return t
    const chain = ancestorChain(t, index)
    if (chain !== null && chain.length < MAX_TREE_DEPTH) return t
    const { parentId: _cut, ...rest } = t
    return rest
  })
}

/** 트리에 보이는 할일: 지우지·미루지·취소하지 않은 것 */
const inTree = (t: Task): boolean => isActiveInstance(t)

function childMap(tasks: readonly Task[]): Map<string, Task[]> {
  const map = new Map<string, Task[]>()
  for (const t of tasks) {
    if (!t.parentId) continue
    map.set(t.parentId, [...(map.get(t.parentId) ?? []), t])
  }
  return map
}

/** 같은 단계 안에서는 날짜 있는 것(빠른 날 먼저), 날짜 미정은 뒤로 */
function siblingOrder(a: Task, b: Task): number {
  if (isScheduled(a) !== isScheduled(b)) return isScheduled(a) ? -1 : 1
  return a.date === b.date ? a.title.localeCompare(b.title, 'ko') : a.date.localeCompare(b.date)
}

function buildNode(task: Task, children: ReadonlyMap<string, Task[]>, depth: number): TaskNode {
  const kids = depth >= MAX_TREE_DEPTH ? [] : [...(children.get(task.id) ?? [])].sort(siblingOrder)
  return { task, children: kids.map((k) => buildNode(k, children, depth + 1)) }
}

/**
 * 할일 트리. 뿌리 = 살아 있는 부모가 없는 할일 중 세부 할일이 있거나, 아직 안 끝난 장기 할일.
 * 끝난 장기 할일도 세부 할일이 있으면 남겨 진행 기록을 볼 수 있게 한다.
 */
export function buildTaskTree(tasks: readonly Task[]): TaskNode[] {
  const live = tasks.filter(inTree)
  const ids = new Set(live.map((t) => t.id))
  const children = childMap(live)
  const isRoot = (t: Task): boolean =>
    (!t.parentId || !ids.has(t.parentId)) && (children.has(t.id) || (t.dueDate !== undefined && t.status !== 'done'))
  return live
    .filter(isRoot)
    .sort((a, b) => (a.dueDate ?? '9999').localeCompare(b.dueDate ?? '9999') || siblingOrder(a, b))
    .map((t) => buildNode(t, children, 1))
}

/** 맨 아래 할일만 센다 (중간 단계는 아래가 다 끝나야 끝난 것) */
export function treeProgress(node: TaskNode): Progress {
  if (node.children.length === 0) return { done: node.task.status === 'done' ? 1 : 0, total: 1 }
  return node.children.map(treeProgress).reduce((a, b) => ({ done: a.done + b.done, total: a.total + b.total }), { done: 0, total: 0 })
}

/** 자기 아래 모든 할일 id (지운 것 제외) */
export function descendantIds(tasks: readonly Task[], id: string): string[] {
  const children = childMap(tasks.filter((t) => !t.deleted))
  const out: string[] = []
  const walk = (pid: string): void => {
    for (const c of children.get(pid) ?? []) {
      if (out.includes(c.id)) continue
      out.push(c.id)
      walk(c.id)
    }
  }
  walk(id)
  return out
}

/** 자기 아래로 몇 단이 더 있는지 (잎=0) */
function heightOf(tasks: readonly Task[], id: string): number {
  const children = childMap(tasks.filter(inTree))
  const walk = (pid: string, seen: ReadonlySet<string>): number =>
    Math.max(0, ...(children.get(pid) ?? []).filter((c) => !seen.has(c.id)).map((c) => 1 + walk(c.id, new Set([...seen, c.id]))))
  return walk(id, new Set([id]))
}

/** 몇 번째 단인지 (뿌리=1) */
function depthOf(tasks: readonly Task[], task: Task): number {
  return (ancestorChain(task, byId(tasks.filter(inTree)))?.length ?? 0) + 1
}

/** childId 를 parentId 아래로 옮겨도 되는지: 자기·자기 아래가 아니고, 붙인 뒤 3단을 넘지 않을 것 */
export function canBeParent(tasks: readonly Task[], childId: string | undefined, parent: Task): boolean {
  if (childId === undefined) return depthOf(tasks, parent) < MAX_TREE_DEPTH
  if (parent.id === childId || descendantIds(tasks, childId).includes(parent.id)) return false
  return depthOf(tasks, parent) + 1 + heightOf(tasks, childId) <= MAX_TREE_DEPTH
}

/** 부모를 지울 때 세부 할일을 한 단계 위(지운 할일의 부모)로 올린다 */
export function liftChildren(tasks: readonly Task[], id: string, now: number): Task[] {
  const removed = tasks.find((t) => t.id === id)
  return tasks.map((t) => (t.parentId === id ? { ...t, parentId: removed?.parentId, updatedAt: now } : t))
}
