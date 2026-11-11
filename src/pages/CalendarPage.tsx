import { LeftOutlined, PlusOutlined, RightOutlined } from '@ant-design/icons'
import { Button, Card, Col, Empty, Flex, Grid, Row, theme, Typography } from 'antd'
import { useMemo, useState } from 'react'
import MonthGrid from '../components/MonthGrid'
import TaskForm from '../components/TaskForm'
import { monthGrid, taskStart } from '../data/calendar'
import { dDay, formatDDay, isActiveInstance } from '../data/logic'
import { usePlanner } from '../data/store'
import type { Task } from '../data/types'
import { navigate } from '../hooks/useHashRoute'
import { useToday } from '../hooks/useToday'
import { PRIORITY_COLOR_TOKEN } from '../theme'
import { shortDate } from '../utils/format'

interface CalendarPageProps {
  /** 'YYYY-MM'. 없으면 이번 달 */
  readonly month?: string
}

type FormState = { readonly open: false } | { readonly open: true; readonly task: Task | null }

function shiftMonth(month: string, delta: number): string {
  const [y, m] = month.split('-').map(Number)
  const total = y * 12 + (m - 1) + delta
  return `${Math.floor(total / 12)}-${String((total % 12) + 1).padStart(2, '0')}`
}

const goMonth = (month: string): void => navigate({ page: 'calendar', month })

/** 마감이 있는 할일 중 아직 끝나지 않은 것 (지난 마감 먼저, 그다음 가까운 마감 순) */
function openDeadlines(tasks: readonly Task[]): Task[] {
  return tasks
    .filter((t) => isActiveInstance(t) && t.dueDate !== undefined && (t.status === 'todo' || t.status === 'delegated'))
    .sort((a, b) => a.dueDate!.localeCompare(b.dueDate!))
}

function DeadlineList({ tasks, today, onOpen }: { tasks: readonly Task[]; today: string; onOpen: (t: Task) => void }) {
  const { token } = theme.useToken()
  if (tasks.length === 0) return <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="마감 있는 할일 없음" />
  return (
    <div>
      {tasks.map((t, i) => {
        const days = dDay(t.dueDate!, today)
        const urgent = days <= 2
        return (
          <Flex
            key={t.id}
            gap={8}
            align="flex-start"
            onClick={() => onOpen(t)}
            style={{ padding: '8px 0', borderTop: i === 0 ? undefined : `1px solid ${token.colorSplit}`, cursor: 'pointer' }}
          >
            <Typography.Text className="num" strong style={{ width: 16, flex: 'none', color: token[PRIORITY_COLOR_TOKEN[t.priority]] }}>
              {t.priority}
            </Typography.Text>
            <Flex vertical style={{ flex: 1, minWidth: 0 }}>
              <Typography.Text ellipsis>{t.title}</Typography.Text>
              <Typography.Text type="secondary" className="num" style={{ fontSize: 12 }}>
                {taskStart(t) === t.dueDate ? shortDate(t.dueDate!) : `${shortDate(taskStart(t))} ~ ${shortDate(t.dueDate!)}`}
                {t.status === 'delegated' && t.delegatedTo ? ` · ${t.delegatedTo}에게 맡김` : ''}
              </Typography.Text>
            </Flex>
            <Typography.Text
              className="num"
              type={days < 0 ? 'danger' : urgent ? 'warning' : 'secondary'}
              strong={urgent}
              style={{ flex: 'none', fontSize: 12, lineHeight: '22px' }}
            >
              {formatDDay(days)}
            </Typography.Text>
          </Flex>
        )
      })}
    </div>
  )
}

export default function CalendarPage({ month }: CalendarPageProps) {
  const data = usePlanner()
  const today = useToday()
  const current = month ?? today.slice(0, 7)
  const [year, mon] = current.split('-').map(Number)
  const isWide = Grid.useBreakpoint().md ?? true
  const [form, setForm] = useState<FormState>({ open: false })

  const weeks = useMemo(() => monthGrid(year, mon), [year, mon])
  const deadlines = useMemo(() => openDeadlines(data.tasks), [data.tasks])
  const events = useMemo(() => data.events.filter((e) => !e.deleted), [data.events])
  const openTask = (task: Task): void => setForm({ open: true, task })

  return (
    <>
      <Flex justify="space-between" align="center" wrap gap={16} style={{ marginBottom: 24 }}>
        <Typography.Title level={4} style={{ margin: 0 }} className="num">
          {year}년 {mon}월
        </Typography.Title>
        <Flex gap={8} wrap>
          <Button icon={<LeftOutlined />} aria-label="지난달" onClick={() => goMonth(shiftMonth(current, -1))} />
          <Button disabled={current === today.slice(0, 7)} onClick={() => goMonth(today.slice(0, 7))}>
            이번 달
          </Button>
          <Button icon={<RightOutlined />} aria-label="다음달" onClick={() => goMonth(shiftMonth(current, 1))} />
          <Button type="primary" icon={<PlusOutlined />} onClick={() => setForm({ open: true, task: null })}>
            장기 할일 추가
          </Button>
        </Flex>
      </Flex>
      <Row gutter={[24, 16]}>
        <Col xs={24} xl={17}>
          <Card styles={{ body: { padding: 0 } }}>
            <MonthGrid
              weeks={weeks}
              month={current}
              today={today}
              tasks={data.tasks}
              events={events}
              compact={!isWide}
              onOpenDay={(date) => navigate({ page: 'day', date })}
              onOpenTask={openTask}
            />
          </Card>
        </Col>
        <Col xs={24} xl={7}>
          <Card title="마감 일정" extra={deadlines.length > 0 && <Typography.Text type="secondary" className="num">{deadlines.length}</Typography.Text>}>
            <DeadlineList tasks={deadlines} today={today} onOpen={openTask} />
          </Card>
        </Col>
      </Row>
      <TaskForm open={form.open} task={form.open ? form.task : null} defaultDate={today} onClose={() => setForm({ open: false })} />
    </>
  )
}
