import { CalendarOutlined, LeftOutlined, PlusOutlined, RightOutlined } from '@ant-design/icons'
import { Alert, Button, Card, Col, DatePicker, Flex, Grid, Row, Typography } from 'antd'
import dayjs from 'dayjs'
import { useMemo, useState } from 'react'
import DayMemo from '../components/DayMemo'
import QuickAdd from '../components/QuickAdd'
import EventModal, { type EventDraft } from '../components/EventModal'
import TaskActionModal, { type TaskAction } from '../components/TaskActionModal'
import TaskForm from '../components/TaskForm'
import TaskList from '../components/TaskList'
import Timeline from '../components/Timeline'
import { bringOverdue } from '../data/actions'
import { addDays, dDay, formatDDay, overdueTasks, periodTasksOn, tasksForDay, todayString } from '../data/logic'
import { usePlanner } from '../data/store'
import type { Task } from '../data/types'
import { navigate } from '../hooks/useHashRoute'
import { fromDayjs, longDate, shortDate } from '../utils/format'

interface DayPageProps {
  readonly date: string
}

type FormState = { readonly open: false } | { readonly open: true; readonly task: Task | null }

const goTo = (date: string): void => navigate({ page: 'day', date })

function relativeDay(days: number): string {
  if (days === 1) return '내일'
  if (days === -1) return '어제'
  return days > 0 ? `${days}일 뒤` : `${-days}일 전`
}

function DayHeader({ date, today, onAdd }: { date: string; today: string; onAdd: () => void }) {
  const isWide = Grid.useBreakpoint().md ?? true
  return (
    <Flex justify="space-between" align="center" wrap gap={16} style={{ marginBottom: 24 }}>
      <Flex align="baseline" gap={8}>
        <Typography.Title level={4} style={{ margin: 0 }}>
          {longDate(date)}
        </Typography.Title>
        {date !== today && (
          <Typography.Text type="secondary" className="num">
            {relativeDay(dDay(date, today))}
          </Typography.Text>
        )}
      </Flex>
      <Flex gap={8} wrap>
        <Button icon={<LeftOutlined />} aria-label="전날" onClick={() => goTo(addDays(date, -1))} />
        <Button disabled={date === today} onClick={() => goTo(today)}>
          오늘
        </Button>
        <Button icon={<RightOutlined />} aria-label="다음날" onClick={() => goTo(addDays(date, 1))} />
        {isWide && (
          <DatePicker value={dayjs(date)} allowClear={false} onChange={(v) => goTo(fromDayjs(v) ?? date)} style={{ width: 132 }} />
        )}
        <Button icon={<CalendarOutlined />} onClick={onAdd}>
          기간 할일
        </Button>
      </Flex>
    </Flex>
  )
}

function OverdueNotice({ tasks, today }: { tasks: readonly Task[]; today: string }) {
  if (tasks.length === 0) return null
  const preview = tasks.slice(0, 3).map((t) => `${shortDate(t.date)} ${t.title}`).join(', ')
  const rest = tasks.length > 3 ? ` 외 ${tasks.length - 3}건` : ''
  return (
    <Alert
      type="warning"
      showIcon
      style={{ marginBottom: 16 }}
      title={`지난 날 못 끝낸 할일 ${tasks.length}건`}
      description={preview + rest}
      action={
        <Button size="small" onClick={() => bringOverdue(tasks.map((t) => t.id), today)}>
          오늘로 가져오기
        </Button>
      }
    />
  )
}

function PeriodList({ tasks, today }: { tasks: readonly Task[]; today: string }) {
  if (tasks.length === 0) return null
  return (
    <Card title="기간 진행 중" style={{ marginTop: 16 }}>
      {tasks.map((t) => (
        <Flex key={t.id} justify="space-between" gap={8} style={{ padding: '4px 0', cursor: 'pointer' }} onClick={() => goTo(t.date)}>
          <Typography.Text ellipsis>{t.title}</Typography.Text>
          <Typography.Text type="secondary" className="num" style={{ flex: 'none', fontSize: 12 }}>
            ~{shortDate(t.dueDate!)} · {formatDDay(dDay(t.dueDate!, today))}
          </Typography.Text>
        </Flex>
      ))}
    </Card>
  )
}

export default function DayPage({ date }: DayPageProps) {
  const data = usePlanner()
  const today = todayString()
  const [form, setForm] = useState<FormState>({ open: false })
  const [action, setAction] = useState<TaskAction | null>(null)
  const [eventDraft, setEventDraft] = useState<EventDraft | null>(null)

  const dayTasks = useMemo(() => tasksForDay(data.tasks, date), [data.tasks, date])
  const overdue = useMemo(() => (date === today ? overdueTasks(data.tasks, today) : []), [data.tasks, date, today])
  const period = useMemo(
    () => periodTasksOn(data.tasks, date).filter((t) => t.date !== date && t.status === 'todo'),
    [data.tasks, date],
  )
  const events = useMemo(() => data.events.filter((e) => e.date === date && !e.deleted), [data.events, date])
  const note = data.notes.find((n) => n.date === date)?.text ?? ''
  const doneCount = dayTasks.filter((t) => t.status === 'done').length

  return (
    <>
      <DayHeader date={date} today={today} onAdd={() => setForm({ open: true, task: null })} />
      <OverdueNotice tasks={overdue} today={today} />
      <Row gutter={[24, 16]}>
        <Col xs={24} lg={15}>
          <Card
            title="우선 업무"
            extra={
              dayTasks.length > 0 && (
                <Typography.Text type="secondary" className="num">
                  완료 {doneCount} / {dayTasks.length}
                </Typography.Text>
              )
            }
          >
            <QuickAdd date={date} />
            <TaskList
              tasks={dayTasks}
              goals={data.goals}
              today={today}
              onEdit={(task) => setForm({ open: true, task })}
              onAction={setAction}
            />
          </Card>
          <PeriodList tasks={period} today={today} />
        </Col>
        <Col xs={24} lg={9}>
          <Flex vertical gap={16}>
            <Card
              title="일정"
              extra={<Button type="text" size="small" icon={<PlusOutlined />} aria-label="일정 추가" onClick={() => setEventDraft({ date, hour: 9 })} />}
            >
              <Timeline date={date} isToday={date === today} events={events} onOpen={setEventDraft} />
            </Card>
            <Card title="메모">
              <DayMemo key={date} date={date} initial={note} />
            </Card>
          </Flex>
        </Col>
      </Row>
      <TaskForm
        open={form.open}
        task={form.open ? form.task : null}
        defaultDate={date}
        onClose={() => setForm({ open: false })}
      />
      <TaskActionModal action={action} onClose={() => setAction(null)} />
      <EventModal draft={eventDraft} onClose={() => setEventDraft(null)} />
    </>
  )
}
