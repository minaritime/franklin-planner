import { LeftOutlined, PlusOutlined, RightOutlined } from '@ant-design/icons'
import { Alert, Button, Card, Col, DatePicker, Flex, Grid, Row, theme, Typography } from 'antd'
import dayjs from 'dayjs'
import { useMemo, useState } from 'react'
import DayMemo from '../components/DayMemo'
import QuickAdd from '../components/QuickAdd'
import ItemChip from '../components/calendar/ItemChip'
import ItemDrawer, { type DrawerState } from '../components/calendar/ItemDrawer'
import { categoryColor, chipColors } from '../components/calendar/colors'
import TaskActionModal, { type TaskAction } from '../components/TaskActionModal'
import TaskForm from '../components/TaskForm'
import TaskList from '../components/TaskList'
import Timeline, { type TimelineBlock } from '../components/Timeline'
import { bringOverdue } from '../data/actions'
import { buildItems } from '../data/calendarItems'
import { addDays, carriedLongTasks, dDay, overdueTasks, tasksForDay } from '../data/logic'
import { usePlanner } from '../data/store'
import type { Task } from '../data/types'
import { navigate } from '../hooks/useHashRoute'
import { useToday } from '../hooks/useToday'
import { fromDayjs, longDate, shortDate } from '../utils/format'

interface DayPageProps {
  readonly date: string
}

type FormState = { readonly open: false } | { readonly open: true; readonly task: Task | null }

const goTo = (date: string): void => navigate({ page: 'day', date })

const hh = (hour: number): string => `${String(Math.min(hour, 23)).padStart(2, '0')}:00`
const newEvent = (date: string, start: string, end: string): DrawerState => ({ mode: 'create', draft: { kind: 'event', date, start, end } })

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
        <Button type="primary" icon={<PlusOutlined />} onClick={onAdd}>
          장기 할일 추가
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

export default function DayPage({ date }: DayPageProps) {
  const data = usePlanner()
  const today = useToday()
  const [form, setForm] = useState<FormState>({ open: false })
  const [action, setAction] = useState<TaskAction | null>(null)
  const [drawer, setDrawer] = useState<DrawerState | null>(null)
  const { token } = theme.useToken()

  const dayTasks = useMemo(() => tasksForDay(data.tasks, date), [data.tasks, date])
  const overdue = useMemo(() => (date === today ? overdueTasks(data.tasks, today) : []), [data.tasks, date, today])
  const carried = useMemo(() => carriedLongTasks(data.tasks, date), [data.tasks, date])
  // 반복·여러 날 일정까지 펼친 그날 일정 (달력에서 분류를 꺼도 하루 화면에서는 다 보인다)
  const eventItems = useMemo(
    () => buildItems(data, date, date, { hidden: new Set(), query: '' }).filter((i) => i.kind === 'event'),
    [data, date],
  )
  const blocks = useMemo<TimelineBlock[]>(() => {
    const eventBlocks = eventItems
      .filter((i) => !i.allDay && i.start && i.end)
      .map((i) => ({
        id: i.key,
        kind: 'event' as const,
        start: i.start!,
        end: i.end!,
        title: i.title,
        lineColor: chipColors(token, categoryColor(data.categories, i.categoryId)).line,
      }))
    const taskBlocks = dayTasks
      .filter((t) => t.startTime && t.endTime && t.status !== 'forwarded' && t.status !== 'cancelled')
      .map((t) => ({
        id: t.id,
        kind: 'task' as const,
        start: t.startTime!,
        end: t.endTime!,
        title: t.title,
        priority: t.priority,
        finished: t.status !== 'todo',
      }))
    return [...eventBlocks, ...taskBlocks]
  }, [eventItems, dayTasks, data.categories, token])

  const openBlock = (block: TimelineBlock): void => {
    if (block.kind === 'task') {
      const task = dayTasks.find((t) => t.id === block.id)
      if (task) setForm({ open: true, task })
      return
    }
    const item = eventItems.find((i) => i.key === block.id)
    if (item) setDrawer({ mode: 'view', item })
  }
  const allDayEvents = eventItems.filter((i) => i.allDay)
  const note = data.notes.find((n) => n.date === date)?.text ?? ''
  const listed = [...dayTasks, ...carried]
  const doneCount = listed.filter((t) => t.status === 'done').length

  return (
    <>
      <DayHeader date={date} today={today} onAdd={() => setForm({ open: true, task: null })} />
      <OverdueNotice tasks={overdue} today={today} />
      <Row gutter={[24, 16]}>
        <Col xs={24} lg={15}>
          <Card
            title="우선 업무"
            extra={
              listed.length > 0 && (
                <Typography.Text type="secondary" className="num">
                  완료 {doneCount} / {listed.length}
                </Typography.Text>
              )
            }
          >
            <QuickAdd date={date} />
            <TaskList
              tasks={dayTasks}
              carried={carried}
              goals={data.goals}
              day={date}
              onEdit={(task) => setForm({ open: true, task })}
              onAction={setAction}
            />
          </Card>
        </Col>
        <Col xs={24} lg={9}>
          <Flex vertical gap={16}>
            <Card
              title="일정"
              extra={<Button type="text" size="small" icon={<PlusOutlined />} aria-label="일정 추가" onClick={() => setDrawer(newEvent(date, hh(9), hh(10)))} />}
            >
              {allDayEvents.length > 0 && (
                <Flex vertical gap={2} style={{ marginBottom: 8 }} aria-label="종일 일정">
                  {allDayEvents.map((i) => (
                    <ItemChip key={i.key} item={i} color={categoryColor(data.categories, i.categoryId)} onOpen={(item) => setDrawer({ mode: 'view', item })} />
                  ))}
                </Flex>
              )}
              <Timeline
                isToday={date === today}
                blocks={blocks}
                onOpenBlock={openBlock}
                onCreate={(start, end) => setDrawer(newEvent(date, start, end))}
              />
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
      <ItemDrawer state={drawer} today={today} onChange={setDrawer} onOpenDay={goTo} />
    </>
  )
}
