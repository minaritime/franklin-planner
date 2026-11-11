import { CheckOutlined, ClockCircleOutlined, CloseOutlined } from '@ant-design/icons'
import { Alert, Button, Card, Col, Flex, Input, Popover, Row, Segmented, Tag, theme, TimePicker, Typography } from 'antd'
import dayjs from 'dayjs'
import { useMemo, useState } from 'react'
import Timeline from '../components/Timeline'
import { todayString } from '../data/logic'
import { parseTimedTitle } from '../data/timeParse'
import type { PlanEvent, Priority } from '../data/types'
import { PRIORITIES } from '../data/types'
import { PRIORITY_COLOR_TOKEN } from '../theme'

/** 할일에 시간 붙이는 두 방법을 시험하는 페이지. 저장·동기화하지 않는다 */

interface LabTask {
  readonly id: string
  readonly title: string
  readonly priority: Priority
  readonly start: string | null
  readonly end: string | null
  readonly done: boolean
}

const SAMPLE: readonly LabTask[] = [
  { id: 's1', title: '선린 알고리즘 모의고사 검토', priority: 'A', start: null, end: null, done: false },
  { id: 's2', title: '정규반 수업', priority: 'A', start: '10:30', end: '12:00', done: false },
  { id: 's3', title: '토요반 숙제 자료 출력', priority: 'B', start: null, end: null, done: false },
  { id: 's4', title: '교재 주문', priority: 'C', start: null, end: null, done: true },
]

const FMT = 'HH:mm'
let seq = 0
const nextId = (): string => `lab-${Date.now()}-${seq++}`

function TimePopover({ task, onSet }: { task: LabTask; onSet: (start: string | null, end: string | null) => void }) {
  const [open, setOpen] = useState(false)
  const { token } = theme.useToken()
  const content = (
    <Flex vertical gap={8}>
      <TimePicker.RangePicker
        format={FMT}
        minuteStep={10}
        needConfirm={false}
        value={task.start && task.end ? [dayjs(task.start, FMT), dayjs(task.end, FMT)] : null}
        onChange={(v) => {
          if (v?.[0] && v[1]) {
            onSet(v[0].format(FMT), v[1].format(FMT))
            setOpen(false)
          }
        }}
      />
      {task.start && (
        <Button
          size="small"
          onClick={() => {
            onSet(null, null)
            setOpen(false)
          }}
        >
          시간 빼기
        </Button>
      )}
    </Flex>
  )
  return (
    <Popover content={content} title="시간 정하기" trigger="click" open={open} onOpenChange={setOpen} destroyOnHidden>
      <Button
        type="text"
        size="small"
        aria-label="시간 정하기"
        icon={<ClockCircleOutlined style={{ color: task.start ? token.colorPrimary : undefined }} />}
      />
    </Popover>
  )
}

function Row1({ task, onToggle, onSet }: { task: LabTask; onToggle: () => void; onSet: (s: string | null, e: string | null) => void }) {
  const { token } = theme.useToken()
  return (
    <Flex align="center" gap={8} style={{ padding: '8px 0', borderBottom: `1px solid ${token.colorSplit}` }}>
      <button
        type="button"
        aria-label={task.done ? '완료' : '완료로 표시'}
        onClick={onToggle}
        style={{
          width: 20,
          height: 20,
          flex: 'none',
          padding: 0,
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          borderRadius: token.borderRadiusSM,
          border: task.done ? 0 : `1px solid ${token.colorBorder}`,
          background: 'none',
          color: token.colorSuccess,
          cursor: 'pointer',
        }}
      >
        {task.done && <CheckOutlined />}
      </button>
      <Typography.Text strong className="num" style={{ width: 16, flex: 'none', color: token[PRIORITY_COLOR_TOKEN[task.priority]] }}>
        {task.priority}
      </Typography.Text>
      {task.start && (
        <Typography.Text className="num" style={{ flex: 'none', color: task.done ? token.colorTextTertiary : token.colorPrimary }}>
          {task.start}
        </Typography.Text>
      )}
      <Typography.Text delete={task.done} type={task.done ? 'secondary' : undefined} style={{ flex: 1, minWidth: 0 }} ellipsis>
        {task.title}
      </Typography.Text>
      <TimePopover task={task} onSet={onSet} />
    </Flex>
  )
}

export default function LabPage() {
  const [tasks, setTasks] = useState<readonly LabTask[]>(SAMPLE)
  const [priority, setPriority] = useState<Priority>('B')
  const [text, setText] = useState('')
  const [ignoreTime, setIgnoreTime] = useState(false)
  const [minutes, setMinutes] = useState(60)
  const today = todayString()

  const parsed = parseTimedTitle(text, minutes)
  const willUseTime = parsed.start !== null && !ignoreTime

  const add = (): void => {
    if (!text.trim()) return
    const title = willUseTime ? parsed.title || text.trim() : text.trim()
    setTasks((prev) => [
      ...prev,
      { id: nextId(), title, priority, start: willUseTime ? parsed.start : null, end: willUseTime ? parsed.end : null, done: false },
    ])
    setText('')
    setIgnoreTime(false)
  }

  const update = (id: string, patch: Partial<LabTask>): void =>
    setTasks((prev) => prev.map((t) => (t.id === id ? { ...t, ...patch } : t)))

  const sorted = useMemo(
    () => [...tasks].sort((a, b) => PRIORITIES.indexOf(a.priority) - PRIORITIES.indexOf(b.priority)),
    [tasks],
  )
  const events: PlanEvent[] = tasks
    .filter((t) => t.start && t.end)
    .map((t) => ({ id: t.id, date: today, start: t.start!, end: t.end!, title: t.done ? `✓ ${t.title}` : t.title, updatedAt: 0 }))

  return (
    <>
      <Flex justify="space-between" align="center" wrap gap={16} style={{ marginBottom: 24 }}>
        <Typography.Title level={4} style={{ margin: 0 }}>
          시간 붙이기 테스트
        </Typography.Title>
        <Flex gap={8} align="center">
          <Typography.Text type="secondary">끝 시간 없을 때</Typography.Text>
          <Segmented<number> value={minutes} onChange={setMinutes} options={[{ value: 30, label: '30분' }, { value: 60, label: '1시간' }]} />
          <Button onClick={() => setTasks(SAMPLE)}>처음으로</Button>
        </Flex>
      </Flex>
      <Alert type="info" showIcon style={{ marginBottom: 16 }} title="테스트 페이지 · 실제 할일에 저장되지 않음" />
      <Row gutter={[24, 16]}>
        <Col xs={24} lg={15}>
          <Card title="우선 업무">
            <Flex gap={8} style={{ marginBottom: willUseTime || ignoreTime ? 8 : 24 }}>
              <Segmented<Priority> value={priority} onChange={setPriority} options={PRIORITIES.map((p) => ({ value: p, label: p }))} />
              <Input
                value={text}
                placeholder="새 할일"
                aria-label="새 할일"
                onChange={(e) => {
                  setText(e.target.value)
                  if (!e.target.value) setIgnoreTime(false)
                }}
                onPressEnter={(e) => {
                  if (!e.nativeEvent.isComposing) add()
                }}
              />
              <Button disabled={!text.trim()} onClick={add}>
                추가
              </Button>
            </Flex>
            {parsed.start !== null && (
              <div style={{ marginBottom: 16 }}>
                {ignoreTime ? (
                  <Tag style={{ cursor: 'pointer' }} onClick={() => setIgnoreTime(false)}>
                    시간 없이 추가 · 되돌리기
                  </Tag>
                ) : (
                  <Tag color="blue" icon={<ClockCircleOutlined />} closable closeIcon={<CloseOutlined />} onClose={(e) => {
                    e.preventDefault()
                    setIgnoreTime(true)
                  }}>
                    <span className="num">
                      {parsed.start}~{parsed.end}
                    </span>
                    {parsed.title && ` · ${parsed.title}`}
                  </Tag>
                )}
              </div>
            )}
            {sorted.map((t) => (
              <Row1
                key={t.id}
                task={t}
                onToggle={() => update(t.id, { done: !t.done })}
                onSet={(start, end) => update(t.id, { start, end })}
              />
            ))}
          </Card>
        </Col>
        <Col xs={24} lg={9}>
          <Card title="일정">
            <Timeline
              date={today}
              isToday
              events={events}
              onOpen={(draft) => {
                if ('event' in draft) update(draft.event.id, { done: !tasks.find((t) => t.id === draft.event.id)?.done })
              }}
            />
          </Card>
        </Col>
      </Row>
    </>
  )
}
