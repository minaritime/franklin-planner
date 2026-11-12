import { HolderOutlined, MoreOutlined } from '@ant-design/icons'
import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { Button, Dropdown, Flex, Tag, theme, Typography, type MenuProps } from 'antd'
import { changeStatus, removeTask, rotatePriority } from '../data/actions'
import { dDay, formatDDay } from '../data/logic'
import type { Goal, Task } from '../data/types'
import { PRIORITY_COLOR_TOKEN } from '../theme'
import { shortDate } from '../utils/format'
import StatusMark from './StatusMark'
import type { TaskAction } from './TaskActionModal'

interface TaskRowProps {
  readonly task: Task
  readonly goal: Goal | undefined
  readonly today: string
  readonly onEdit: (task: Task) => void
  readonly onAction: (action: TaskAction) => void
  /** 목록에 보이는 번호 (그날 묶음 안의 순서) */
  readonly displayOrder: number
  /** 다른 날 시작한 장기 할일이 그날 목록에 같이 나온 줄. 순서는 시작일 기준이라 끌어서 바꾸지 못한다 */
  readonly carried?: boolean
}

function DueLabel({ dueDate, today, finished }: { dueDate: string; today: string; finished: boolean }) {
  const days = dDay(dueDate, today)
  const type = finished ? 'secondary' : days < 0 ? 'danger' : days <= 2 ? 'warning' : 'secondary'
  return (
    <Typography.Text type={type} className="num" style={{ fontSize: 12 }}>
      {shortDate(dueDate)} 마감 · {formatDDay(days)}
    </Typography.Text>
  )
}

function buildMenu(task: Task, onEdit: TaskRowProps['onEdit'], onAction: TaskRowProps['onAction']): MenuProps {
  const isTodo = task.status === 'todo'
  const items: MenuProps['items'] = [
    { key: 'edit', label: '수정' },
    ...(isTodo
      ? [
          { key: 'forward', label: '미루기 →' },
          { key: 'delegate', label: '맡기기 ●' },
          { key: 'cancel', label: '취소 ✕' },
        ]
      : []),
    { type: 'divider' as const },
    { key: 'delete', label: '삭제', danger: true },
  ]
  const handlers: Record<string, () => void> = {
    edit: () => onEdit(task),
    forward: () => onAction({ kind: 'forward', task }),
    delegate: () => onAction({ kind: 'delegate', task }),
    cancel: () => changeStatus(task.id, 'cancelled'),
    delete: () => removeTask(task.id),
  }
  return { items, onClick: ({ key }) => handlers[key]?.() }
}

export default function TaskRow({ task, goal, today, onEdit, onAction, displayOrder, carried = false }: TaskRowProps) {
  const { token } = theme.useToken()
  const sortable = useSortable({ id: task.id, disabled: carried })
  const finished = task.status !== 'todo'
  const struck = task.status === 'done' || task.status === 'cancelled' || task.status === 'forwarded'

  const toggle = (): void => changeStatus(task.id, task.status === 'todo' ? 'done' : 'todo')

  return (
    <div
      ref={sortable.setNodeRef}
      style={{
        display: 'flex',
        alignItems: 'flex-start',
        gap: 8,
        padding: '8px 0',
        borderBottom: `1px solid ${token.colorSplit}`,
        background: token.colorBgContainer,
        transform: CSS.Transform.toString(sortable.transform),
        transition: sortable.transition,
        position: 'relative',
        zIndex: sortable.isDragging ? 1 : undefined,
      }}
    >
      {carried ? (
        <span style={{ visibility: 'hidden', lineHeight: '22px' }}>
          <HolderOutlined />
        </span>
      ) : (
        <span
          {...sortable.attributes}
          {...sortable.listeners}
          style={{ color: token.colorTextQuaternary, cursor: 'grab', lineHeight: '22px', touchAction: 'none' }}
          aria-label="순서 바꾸기"
        >
          <HolderOutlined />
        </span>
      )}
      <span style={{ paddingTop: 1 }}>
        <StatusMark task={task} onToggle={toggle} />
      </span>
      <button
        type="button"
        className="num"
        aria-label={`우선순위 ${task.priority} 바꾸기`}
        onClick={() => rotatePriority(task.id)}
        style={{
          width: 28,
          flex: 'none',
          padding: 0,
          border: 0,
          background: 'none',
          textAlign: 'left',
          font: 'inherit',
          lineHeight: '22px',
          fontWeight: 600,
          cursor: 'pointer',
          color: token[PRIORITY_COLOR_TOKEN[task.priority]],
        }}
      >
        {task.priority}
        {displayOrder}
      </button>
      <Flex vertical style={{ flex: 1, minWidth: 0 }} gap={2}>
        <Typography.Text
          delete={struck}
          type={finished ? 'secondary' : undefined}
          style={{ wordBreak: 'break-all', cursor: 'pointer' }}
          onClick={() => onEdit(task)}
        >
          {task.startTime && (
            <span className="num" style={{ color: finished ? undefined : token.colorPrimary, marginInlineEnd: 8 }}>
              {task.startTime}
            </span>
          )}
          {task.title}
        </Typography.Text>
        <Flex gap={8} wrap align="center">
          {task.startDate && (
            <Tag color="blue" bordered={false} style={{ marginInlineEnd: 0, fontSize: 12 }}>
              장기
            </Tag>
          )}
          {task.status === 'forwarded' && task.forwardedTo && (
            <Typography.Text type="secondary" style={{ fontSize: 12 }}>→ {shortDate(task.forwardedTo)}</Typography.Text>
          )}
          {task.status === 'delegated' && task.delegatedTo && (
            <Typography.Text type="secondary" style={{ fontSize: 12 }}>{task.delegatedTo}에게 맡김</Typography.Text>
          )}
          {task.forwardedFrom && task.status === 'todo' && (
            <Typography.Text type="secondary" style={{ fontSize: 12 }}>{shortDate(task.forwardedFrom)}에서 넘어옴</Typography.Text>
          )}
          {task.dueDate && <DueLabel dueDate={task.dueDate} today={today} finished={finished} />}
          {goal && (
            <Tag bordered={false} style={{ marginInlineEnd: 0, fontSize: 12 }}>
              {goal.title}
            </Tag>
          )}
        </Flex>
        {task.note && (
          <Typography.Text type="secondary" style={{ fontSize: 12, whiteSpace: 'pre-wrap' }}>
            {task.note}
          </Typography.Text>
        )}
      </Flex>
      <Dropdown menu={buildMenu(task, onEdit, onAction)} trigger={['click']} placement="bottomRight">
        <Button type="text" size="small" icon={<MoreOutlined />} aria-label="더보기" />
      </Dropdown>
    </div>
  )
}
