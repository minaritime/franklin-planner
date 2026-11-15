import { describe, expect, it } from 'vitest'
import { carriedLongTasks, forwardTask, overdueTasks, periodTasksOn, tasksForDay } from './logic'
import { buildItems } from './calendarItems'
import { buildTaskTree, canBeParent, cutBadParents, descendantIds, liftChildren, treeProgress } from './tree'
import { EMPTY_DATA, type Task } from './types'
import { parsePlannerData } from './validate'

function task(partial: Partial<Task> & Pick<Task, 'id'>): Task {
  return { title: partial.id, note: '', priority: 'A', order: 1, status: 'todo', date: '2026-11-11', updatedAt: 1, ...partial }
}

// 프로젝트 > 기획 > (캐릭터 기획 ✓, 세계관 기획), 프로젝트 > 개발(날짜 미정)
const project = task({ id: 'p', dueDate: '2026-11-30', startDate: '2026-11-11' })
const plan = task({ id: 'plan', parentId: 'p' })
const character = task({ id: 'char', parentId: 'plan', status: 'done' })
const world = task({ id: 'world', parentId: 'plan', date: '2026-11-12' })
const dev = task({ id: 'dev', parentId: 'p', unscheduled: true })
const loose = task({ id: 'loose' })
const all = [project, plan, character, world, dev, loose]

describe('buildTaskTree', () => {
  it('부모 없는 장기 할일을 뿌리로, 세부 할일을 아래에 단다 (날짜 미정은 같은 단계 맨 뒤)', () => {
    const [root, ...rest] = buildTaskTree(all)
    expect(rest).toHaveLength(0)
    expect(root.task.id).toBe('p')
    expect(root.children.map((n) => n.task.id)).toEqual(['plan', 'dev'])
    expect(root.children[0].children.map((n) => n.task.id)).toEqual(['char', 'world'])
  })

  it('세부 할일이 없는 끝난 장기 할일과 평범한 할일은 뿌리가 아니다', () => {
    expect(buildTaskTree([task({ id: 'x', dueDate: '2026-11-20', status: 'done' }), loose])).toEqual([])
  })

  it('부모가 지워졌으면 세부 할일이 뿌리처럼 보인다', () => {
    const roots = buildTaskTree([{ ...project, deleted: true }, plan, character, world])
    expect(roots.map((n) => n.task.id)).toEqual(['plan'])
  })
})

describe('treeProgress', () => {
  it('맨 아래 할일만 센다', () => {
    expect(treeProgress(buildTaskTree(all)[0])).toEqual({ done: 1, total: 3 })
  })
})

describe('날짜 미정 할일', () => {
  const undated = task({ id: 'u', unscheduled: true, date: '2026-11-01', dueDate: '2026-11-20' })
  it('하루 목록·못 끝낸 할일·장기 할일·달력에 나오지 않는다', () => {
    expect(tasksForDay([undated], '2026-11-01')).toEqual([])
    expect(overdueTasks([undated], '2026-11-11')).toEqual([])
    expect(periodTasksOn([undated], '2026-11-05')).toEqual([])
    expect(carriedLongTasks([undated], '2026-11-05')).toEqual([])
    const items = buildItems({ ...EMPTY_DATA, tasks: [undated] }, '2026-10-01', '2026-12-31', { hidden: new Set(), query: '' })
    expect(items).toEqual([])
  })
})

describe('forwardTask', () => {
  it('미루면 세부 할일이 살아 있는 사본 아래로 옮겨 달린다', () => {
    const next = forwardTask(all, 'plan', '2026-11-13', 5, () => 'plan2')
    expect(next.find((t) => t.id === 'char')?.parentId).toBe('plan2')
    expect(next.find((t) => t.id === 'plan2')?.parentId).toBe('p')
    const root = buildTaskTree(next)[0]
    expect(root.children.map((n) => n.task.id)).toEqual(['plan2', 'dev'])
    expect(root.children[0].children).toHaveLength(2)
  })
})

describe('canBeParent', () => {
  it('자기 자신·자기 아래로는 못 옮긴다', () => {
    expect(canBeParent(all, 'p', plan)).toBe(false)
    expect(canBeParent(all, 'plan', plan)).toBe(false)
  })
  it('붙인 뒤 3단을 넘으면 안 된다', () => {
    expect(canBeParent(all, undefined, plan)).toBe(true) // 새 할일은 3단째
    expect(canBeParent(all, undefined, world)).toBe(false) // 4단째
    expect(canBeParent(all, 'plan', dev)).toBe(false) // 기획(2단 높이)을 2단째 아래로 → 4단
    expect(canBeParent(all, 'dev', plan)).toBe(true)
  })
})

describe('cutBadParents', () => {
  it('순환·4단 이상은 부모를 끊고, 아직 안 온 부모는 남긴다', () => {
    const a = task({ id: 'a', parentId: 'b' })
    const b = task({ id: 'b', parentId: 'a' })
    const deep = task({ id: 'deep', parentId: 'world' })
    const waiting = task({ id: 'w', parentId: 'not-yet' })
    const out = cutBadParents([...all, a, b, deep, waiting])
    expect(out.find((t) => t.id === 'a')?.parentId).toBeUndefined()
    expect(out.find((t) => t.id === 'deep')?.parentId).toBeUndefined()
    expect(out.find((t) => t.id === 'world')?.parentId).toBe('plan')
    expect(out.find((t) => t.id === 'w')?.parentId).toBe('not-yet')
  })

  it('저장값을 읽을 때 적용된다', () => {
    const parsed = parsePlannerData({ ...EMPTY_DATA, tasks: [task({ id: 's', parentId: 's' })] })
    expect(parsed?.tasks[0].parentId).toBeUndefined()
  })
})

describe('descendantIds / liftChildren', () => {
  it('아래 할일을 모두 찾는다', () => {
    expect(descendantIds(all, 'p').sort()).toEqual(['char', 'dev', 'plan', 'world'])
  })
  it('지운 할일의 세부 할일을 한 단계 위로 올린다', () => {
    const lifted = liftChildren(all, 'plan', 9)
    expect(lifted.find((t) => t.id === 'char')?.parentId).toBe('p')
    expect(lifted.find((t) => t.id === 'world')?.updatedAt).toBe(9)
  })
})
