import { itemOfTask } from '../../data/calendarItems'
import type { Category, Task } from '../../data/types'
import type { DrawerState } from '../calendar/ItemDrawer'

/** 프로젝트 칸에서 줄을 누르면: 상세 창(완료·수정·삭제). 달력·계획 화면이 똑같이 쓴다 */
export const viewProject = (task: Task, categories: readonly Category[]): DrawerState => ({ mode: 'view', item: itemOfTask(task, categories) })

/** 프로젝트 칸의 + : parent 가 있으면 그 아래 세부 할일(기본 날짜 미정, 상위 분류 이어받음), 없으면 새 프로젝트 */
export const addToProject = (parent: Task | null, today: string): DrawerState => ({
  mode: 'create',
  draft: parent
    ? { kind: 'task', date: today, parentId: parent.id, unscheduled: true, categoryId: parent.categoryId }
    : { kind: 'task', date: today, project: true },
})
