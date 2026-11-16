import { HolderOutlined, MoreOutlined } from '@ant-design/icons'
import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import type { KeyboardEventHandler } from 'react'
import { Button, Dropdown, Flex, Tag, theme, Typography, type MenuProps } from 'antd'
import { changeStatus, rotatePriority } from '../data/actions'
import { dDay, formatDDay } from '../data/logic'
import type { Goal, Task } from '../data/types'
import { PRIORITY_COLOR_TOKEN } from '../theme'
import { shortDate } from '../utils/format'
import StatusMark from './StatusMark'
import type { TaskAction } from './TaskActionModal'

interface TaskRowProps {
  readonly task: Task
  readonly goal: Goal | undefined
  /** D-day 를 세는 기준일 = 보고 있는 날 (다음 날 페이지에서는 하루 줄어든다) */
  readonly day: string
  readonly onEdit: (task: Task) => void
  readonly onAction: (action: TaskAction) => void
  readonly onRemove: (task: Task) => void
  /** 상위 할일 (할일 트리). 있으면 이름을 작게 붙여 왜 하는 일인지 보이게 한다 */
  readonly parent?: Task
  /** 목록에 보이는 번호 (그날 묶음 안의 순서) */
  readonly displayOrder: number
  /** 다른 날 시작한 장기 할일이 그날 목록에 같이 나온 줄. 순서는 시작일 기준이라 끌어서 바꾸지 못한다 */
  readonly carried?: boolean
}

function DueLabel({ dueDate, day, finished }: { dueDate: string; day: string; finished: boolean }) {
  const days = dDay(dueDate, day)
  const type = finished ? 'secondary' : days < 0 ? 'danger' : days <= 2 ? 'warning' : 'secondary'
  return (
    <Typography.Text type={type} className="num" style={{ fontSize: 12 }}>
      {shortDate(dueDate)} 마감 · {formatDDay(days)}
    </Typography.Text>
  )
}

function buildMenu(task: Task, onEdit: TaskRowProps['onEdit'], onAction: TaskRowProps['onAction'], onRemove: TaskRowProps['onRemove']): MenuProps {
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
    delete: () => onRemove(task),
  }
  return { items, onClick: ({ key }) => handlers[key]?.() }
}

/** 작은 버튼(완료 칸·우선순위·더보기)은 누르다 손이 밀려도 끌기가 되지 않게 */
const stopDrag = (e: { stopPropagation: () => void }): void => e.stopPropagation()

export default function TaskRow({ task, goal, day, onEdit, onAction, onRemove, parent, displayOrder, carried = false }: TaskRowProps) {
  const { token } = theme.useToken()
  const sortable = useSortable({ id: task.id, disabled: carried })
  const finished = task.status !== 'todo'
  const struck = task.status === 'done' || task.status === 'cancelled' || task.status === 'forwarded'

  const toggle = (): void => changeStatus(task.id, task.status === 'todo' ? 'done' : 'todo')
  // 마우스·손가락 끌기는 줄 전체, 키보드 끌기(Space)는 손잡이에서만 (줄 전체가 버튼이 되면 안의 버튼들과 겹친다)
  const { onKeyDown, ...pointerListeners } = sortable.listeners ?? {}
  const keyListener = onKeyDown as KeyboardEventHandler | undefined
  const rowListeners = carried ? {} : pointerListeners

  return (
    <div
      ref={sortable.setNodeRef}
      {...rowListeners}
      style={{
        cursor: carried ? undefined : 'grab',
        // 꾹 누를 때 글자 선택·복사 메뉴가 뜨지 않게
        userSelect: 'none',
        WebkitUserSelect: 'none',
        WebkitTouchCallout: 'none',
        display: 'flex',
        alignItems: 'flex-start',
        gap: 8,
        padding: '8px 0',
        borderBottom: `1px solid ${token.colorSplit}`,
        background: token.colorBgContainer,
        transform: CSS.Transform.toString(sortable.transform),
        transition: sortable.transition,
        position: 'relative',
        // 끄는 동안 손 밑에는 작은 표가 따라가고, 원래 줄은 흐리게 자리만 지킨다
        opacity: sortable.isDragging ? 0.4 : undefined,
      }}
    >
      {carried ? (
        <span style={{ visibility: 'hidden', lineHeight: '22px' }}>
          <HolderOutlined />
        </span>
      ) : (
        <span
          ref={sortable.setActivatorNodeRef}
          {...sortable.attributes}
          onKeyDown={keyListener}
          style={{ color: token.colorTextQuaternary, cursor: 'grab', lineHeight: '22px', touchAction: 'none' }}
          aria-label="순서 바꾸기·일정표로 끌기"
        >
          <HolderOutlined />
        </span>
      )}
      <span style={{ paddingTop: 1 }} onPointerDown={stopDrag} onTouchStart={stopDrag}>
        <StatusMark task={task} onToggle={toggle} />
      </span>
      <button
        type="button"
        className="num"
        aria-label={`우선순위 ${task.priority} 바꾸기`}
        onClick={() => rotatePriority(task.id)}
        onPointerDown={stopDrag}
        onTouchStart={stopDrag}
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
          {parent && (
            <Tag bordered={false} color="purple" style={{ marginInlineEnd: 0, fontSize: 12 }} aria-label={`상위 할일 ${parent.title}`}>
              {parent.title}
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
          {task.dueDate && <DueLabel dueDate={task.dueDate} day={day} finished={finished} />}
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
      <Dropdown menu={buildMenu(task, onEdit, onAction, onRemove)} trigger={['click']} placement="bottomRight">
        <Button type="text" size="small" icon={<MoreOutlined />} aria-label="더보기" onPointerDown={stopDrag} onTouchStart={stopDrag} />
      </Dropdown>
    </div>
  )
}
