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
import { PRIORITY_OPTIONS } from './TaskForm'

interface TaskListProps {
  readonly tasks: readonly Task[]
  readonly goals: readonly Goal[]
  readonly today: string
  readonly onEdit: (task: Task) => void
  readonly onAction: (action: TaskAction) => void
}

const GROUP_LABEL = Object.fromEntries(PRIORITY_OPTIONS.map((o) => [o.value, o.label])) as Record<Priority, string>

function Group({ priority, tasks, goals, today, onEdit, onAction }: TaskListProps & { priority: Priority }) {
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

  const done = tasks.filter((t) => t.status === 'done').length

  return (
    <section>
      <Flex justify="space-between" align="baseline" style={{ paddingBottom: 8 }}>
        <Typography.Text type="secondary" style={{ fontSize: 12 }}>
          {GROUP_LABEL[priority]}
        </Typography.Text>
        <Typography.Text type="secondary" className="num" style={{ fontSize: 12 }}>
          {done}/{tasks.length}
        </Typography.Text>
      </Flex>
      <DndContext sensors={sensors} collisionDetection={closestCenter} modifiers={[restrictToVerticalAxis]} onDragEnd={onDragEnd}>
        <SortableContext items={ids} strategy={verticalListSortingStrategy}>
          {tasks.map((t) => (
            <TaskRow
              key={t.id}
              task={t}
              goal={goals.find((g) => g.id === t.goalId && !g.deleted)}
              today={today}
              onEdit={onEdit}
              onAction={onAction}
            />
          ))}
        </SortableContext>
      </DndContext>
    </section>
  )
}

export default function TaskList(props: TaskListProps) {
  if (props.tasks.length === 0) {
    return <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="할일 없음" style={{ margin: '32px 0' }} />
  }
  return (
    <Flex vertical gap={24}>
      {PRIORITIES.map((p) => {
        const group = props.tasks.filter((t) => t.priority === p)
        return group.length > 0 ? <Group key={p} {...props} priority={p} tasks={group} /> : null
      })}
    </Flex>
  )
}
