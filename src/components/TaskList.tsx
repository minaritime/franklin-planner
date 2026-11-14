import {
  closestCenter,
  DndContext,
  KeyboardSensor,
  PointerSensor,
  TouchSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core'
import { restrictToVerticalAxis } from '@dnd-kit/modifiers'
import { arrayMove, SortableContext, sortableKeyboardCoordinates, verticalListSortingStrategy } from '@dnd-kit/sortable'
import { Empty, Flex, Typography } from 'antd'
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
  /** 다른 날 시작해 기간 안에 든 장기 할일. 각 묶음 맨 끝에 붙고 끌어서 순서를 바꾸지 못한다 */
  readonly carried: readonly Task[]
}

const GROUP_LABEL = Object.fromEntries(PRIORITY_OPTIONS.map((o) => [o.value, o.label])) as Record<Priority, string>

function Group({ priority, tasks, carried, goals, day, onEdit, onAction }: TaskListProps & { priority: Priority }) {
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 200, tolerance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  )
  const ids = tasks.map((t) => t.id)

  const onDragEnd = ({ active, over }: DragEndEvent): void => {
    if (!over || active.id === over.id) return
    reorder(arrayMove(ids, ids.indexOf(String(active.id)), ids.indexOf(String(over.id))))
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
      <DndContext sensors={sensors} collisionDetection={closestCenter} modifiers={[restrictToVerticalAxis]} onDragEnd={onDragEnd}>
        <SortableContext items={ids} strategy={verticalListSortingStrategy}>
          {tasks.map((t, i) => row(t, i, false))}
        </SortableContext>
        {carried.map((t, i) => row(t, tasks.length + i, true))}
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
