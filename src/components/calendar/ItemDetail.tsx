import { Button, Descriptions, Flex, Popconfirm, Tag } from 'antd'
import type { CalItem } from '../../data/calendarItems'
import type { Category, Goal, PlanEvent, Repeat, Task, TaskStatus } from '../../data/types'
import { liveCategories } from './colors'

interface ItemDetailProps {
  readonly item: CalItem
  /** 저장소의 지금 값 (item 은 연 순간의 값이라 낡을 수 있다) */
  readonly task?: Task
  readonly event?: PlanEvent
  readonly categories: readonly Category[]
  readonly goals: readonly Goal[]
  readonly onEdit: () => void
  readonly onDelete: () => void
  readonly onToggleDone: () => void
  readonly onOpenDay: () => void
}

const STATUS_LABEL: Record<TaskStatus, string> = { todo: '할 일', done: '완료', forwarded: '미룸', delegated: '맡김', cancelled: '취소' }
const FREQ_LABEL = { daily: '매일', weekly: '매주', biweekly: '격주', monthly: '매월' } as const
const DAY_NAMES = '일월화수목금토'

export function repeatLabel(repeat: Repeat | undefined, firstDate: string): string {
  if (!repeat) return '안 함'
  const days =
    repeat.freq === 'weekly' || repeat.freq === 'biweekly'
      ? ` ${(repeat.weekdays ?? [new Date(`${firstDate}T00:00:00Z`).getUTCDay()]).map((d) => DAY_NAMES[d]).join('·')}`
      : ''
  return `${FREQ_LABEL[repeat.freq]}${days}${repeat.until ? ` (${repeat.until}까지)` : ''}`
}

const dash = (v: string | undefined): string => (v && v.trim() ? v : '—')

function dateText(item: CalItem): string {
  return item.endDate > item.date ? `${item.date} ~ ${item.endDate}` : item.date
}

/** 오른쪽 창의 읽기 화면 */
export default function ItemDetail({ item, task, event, categories, goals, onEdit, onDelete, onToggleDone, onOpenDay }: ItemDetailProps) {
  const category = liveCategories(categories).find((c) => c.id === (task?.categoryId ?? event?.categoryId))
  const goal = task?.goalId ? goals.find((g) => g.id === task.goalId && !g.deleted) : undefined
  const time = item.allDay ? '종일' : `${item.start}–${item.end}`

  const rows = [
    { key: 'date', label: '날짜', children: dateText(item) },
    { key: 'time', label: '시간', children: time },
    ...(event
      ? [
          { key: 'repeat', label: '반복', children: repeatLabel(event.repeat, event.date) },
          { key: 'place', label: '장소', children: dash(event.place) },
          { key: 'note', label: '메모', children: <span style={{ whiteSpace: 'pre-wrap' }}>{dash(event.note)}</span> },
        ]
      : []),
    ...(task
      ? [
          ...(task.dueDate ? [{ key: 'due', label: '마감', children: task.dueDate }] : []),
          { key: 'goal', label: '목표', children: dash(goal?.title) },
          ...(task.delegatedTo ? [{ key: 'who', label: '맡긴 사람', children: task.delegatedTo }] : []),
          { key: 'note', label: '메모', children: <span style={{ whiteSpace: 'pre-wrap' }}>{dash(task.note)}</span> },
        ]
      : []),
  ]

  return (
    <Flex vertical gap={20}>
      <Flex wrap gap={6}>
        <Tag color={category?.color} style={{ margin: 0 }}>
          {category?.name ?? '분류 없음'}
        </Tag>
        <Tag style={{ margin: 0 }}>{task ? `할일 · ${task.priority}` : '일정'}</Tag>
        {task && <Tag style={{ margin: 0 }}>{STATUS_LABEL[task.status]}</Tag>}
        {item.recurring && <Tag style={{ margin: 0 }}>반복</Tag>}
      </Flex>
      <Descriptions column={1} size="small" items={rows} styles={{ label: { width: 72 } }} />
      <Flex wrap gap={8}>
        {task && (task.status === 'todo' || task.status === 'done') && (
          <Button type="primary" onClick={onToggleDone}>
            {task.status === 'done' ? '완료 취소' : '완료'}
          </Button>
        )}
        {task && <Button onClick={onOpenDay}>하루 화면</Button>}
        <Button onClick={onEdit}>수정</Button>
        {item.recurring ? (
          <Button danger onClick={onDelete}>
            삭제
          </Button>
        ) : (
          <Popconfirm title="지울까요?" okText="지우기" cancelText="취소" onConfirm={onDelete}>
            <Button danger>삭제</Button>
          </Popconfirm>
        )}
      </Flex>
    </Flex>
  )
}
