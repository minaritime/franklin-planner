import {
  closestCenter,
  DndContext,
  DragOverlay,
  KeyboardSensor,
  PointerSensor,
  TouchSensor,
  useSensor,
  useSensors,
  type CollisionDetection,
  type DragEndEvent,
  type DragMoveEvent,
} from '@dnd-kit/core'
import { arrayMove, SortableContext, sortableKeyboardCoordinates, verticalListSortingStrategy } from '@dnd-kit/sortable'
import { Empty, Flex, Typography } from 'antd'
import { useState } from 'react'
import { createPortal } from 'react-dom'
import { timelineMinutesAt } from './timelineGeometry'
import TaskDragChip from './TaskDragChip'
import { reorder } from '../data/actions'
import type { Goal, Priority, Task } from '../data/types'
import { PRIORITIES } from '../data/types'
import TaskRow from './TaskRow'
import type { TaskAction } from './TaskActionModal'
import { PRIORITY_OPTIONS } from './form/TaskFormFields'

interface TaskListProps {
  readonly tasks: readonly Task[]
  readonly goals: readonly Goal[]
  /** 보고 있는 날. D-day 를 이 날 기준으로 센다 */
  readonly day: string
  readonly onEdit: (task: Task) => void
  readonly onAction: (action: TaskAction) => void
  readonly onRemove: (task: Task) => void
  /** 상위 할일 이름을 찾을 전체 할일 */
  readonly allTasks: readonly Task[]
  /** 다른 날 시작해 기간 안에 든 장기 할일. 각 묶음 맨 끝에 붙고 끌어서 순서를 바꾸지 못한다 */
  readonly carried: readonly Task[]
  /** 할일을 끌어 일정표 위에 올린 동안 그 시각 (일정표 밖이면 null) */
  readonly onTimelineHover: (task: Task, minutes: number | null) => void
  /** 일정표 위에 놓았을 때 */
  readonly onTimelineDrop: (task: Task, minutes: number) => void
}

/** 끄는 손가락·마우스의 지금 화면 좌표 */
function pointerOf(e: DragMoveEvent | DragEndEvent): { x: number; y: number } | null {
  const a = e.activatorEvent
  const start = a instanceof MouseEvent ? a : typeof TouchEvent !== 'undefined' && a instanceof TouchEvent ? a.touches[0] ?? a.changedTouches[0] : null
  return start ? { x: start.clientX + e.delta.x, y: start.clientY + e.delta.y } : null
}

const minutesOf = (e: DragMoveEvent | DragEndEvent): number | null => {
  const p = pointerOf(e)
  return p ? timelineMinutesAt(p.x, p.y) : null
}

/** 일정표 위에서는 목록 순서가 흔들리지 않게 놓을 줄을 고르지 않는다 */
const collide: CollisionDetection = (args) => {
  const p = args.pointerCoordinates
  if (p && timelineMinutesAt(p.x, p.y) !== null) return []
  return closestCenter(args)
}

/** 일정표에 시간을 붙일 수 있는 할일 (미룬·취소한 할일은 일정표에 안 보인다) */
const canPlace = (t: Task): boolean => t.status !== 'forwarded' && t.status !== 'cancelled'

const GROUP_LABEL = Object.fromEntries(PRIORITY_OPTIONS.map((o) => [o.value, o.label])) as Record<Priority, string>

function Group({ priority, tasks, carried, goals, day, onEdit, onAction, onRemove, allTasks, onTimelineHover, onTimelineDrop }: TaskListProps & { priority: Priority }) {
  const [activeId, setActiveId] = useState<string | null>(null)
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 200, tolerance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  )
  const ids = tasks.map((t) => t.id)

  const taskOf = (id: string | number): Task | undefined => tasks.find((t) => t.id === String(id))
  const activeTask = activeId ? taskOf(activeId) : undefined

  const onDragMove = (e: DragMoveEvent): void => {
    const task = taskOf(e.active.id)
    if (task && canPlace(task)) onTimelineHover(task, minutesOf(e))
  }

  const onDragEnd = (e: DragEndEvent): void => {
    setActiveId(null)
    const task = taskOf(e.active.id)
    if (task) onTimelineHover(task, null)
    const minutes = minutesOf(e)
    if (task && canPlace(task) && minutes !== null) {
      onTimelineDrop(task, minutes)
      return
    }
    const { active, over } = e
    if (!over || active.id === over.id) return
    reorder(arrayMove(ids, ids.indexOf(String(active.id)), ids.indexOf(String(over.id))))
  }

  const onDragCancel = (): void => {
    if (activeTask) onTimelineHover(activeTask, null)
    setActiveId(null)
  }

  const shown = [...tasks, ...carried]
  const done = shown.filter((t) => t.status === 'done').length
  const row = (t: Task, i: number, isCarried: boolean) => (
    <TaskRow
      key={t.id}
      task={t}
      goal={goals.find((g) => g.id === t.goalId && !g.deleted)}
      day={day}
      onEdit={onEdit}
      onAction={onAction}
      onRemove={onRemove}
      parent={t.parentId ? allTasks.find((p) => p.id === t.parentId && !p.deleted) : undefined}
      displayOrder={i + 1}
      carried={isCarried}
    />
  )

  return (
    <section>
      <Flex justify="space-between" align="baseline" style={{ paddingBottom: 8 }}>
        <Typography.Text type="secondary" style={{ fontSize: 12 }}>
          {GROUP_LABEL[priority]}
        </Typography.Text>
        <Typography.Text type="secondary" className="num" style={{ fontSize: 12 }}>
          {done}/{shown.length}
        </Typography.Text>
      </Flex>
      <DndContext
        sensors={sensors}
        collisionDetection={collide}
        onDragStart={(e) => setActiveId(String(e.active.id))}
        onDragMove={onDragMove}
        onDragEnd={onDragEnd}
        onDragCancel={onDragCancel}
      >
        <SortableContext items={ids} strategy={verticalListSortingStrategy}>
          {tasks.map((t, i) => row(t, i, false))}
        </SortableContext>
        {carried.map((t, i) => row(t, tasks.length + i, true))}
        {createPortal(
          <DragOverlay dropAnimation={null} style={{ width: 'auto', height: 'auto' }}>
            {activeTask ? <TaskDragChip title={activeTask.title} priority={activeTask.priority} /> : null}
          </DragOverlay>,
          document.body,
        )}
      </DndContext>
    </section>
  )
}

export default function TaskList(props: TaskListProps) {
  if (props.tasks.length === 0 && props.carried.length === 0) {
    return <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="할일 없음" style={{ margin: '32px 0' }} />
  }
  return (
    <Flex vertical gap={24}>
      {PRIORITIES.map((p) => {
        const group = props.tasks.filter((t) => t.priority === p)
        const carried = props.carried.filter((t) => t.priority === p)
        return group.length + carried.length > 0 ? <Group key={p} {...props} priority={p} tasks={group} carried={carried} /> : null
      })}
    </Flex>
  )
}
