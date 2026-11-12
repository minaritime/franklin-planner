import { AimOutlined, ClockCircleOutlined, GoogleOutlined, MoreOutlined } from '@ant-design/icons'
import { Alert, Badge, Button, Card, Flex, Input, Progress, Segmented, Tag, theme, Typography } from 'antd'
import type { ReactNode } from 'react'
import type { Priority, Task, TaskStatus } from '../../data/types'
import { PRIORITY_COLOR_TOKEN } from '../../theme'
import StatusMark from '../StatusMark'
import Timeline, { type TimelineBlock } from '../Timeline'

/** 설명서 안의 예시 화면. 진짜 데이터는 건드리지 않고 모양만 보여 준다 */
export function MockFrame({ children }: { children: ReactNode }) {
  const { token } = theme.useToken()
  return (
    <div
      aria-hidden
      style={{
        position: 'relative',
        border: `1px dashed ${token.colorBorder}`,
        borderRadius: token.borderRadiusLG,
        background: token.colorBgLayout,
        padding: 16,
        pointerEvents: 'none',
        userSelect: 'none',
      }}
    >
      <Tag style={{ position: 'absolute', top: -11, left: 12, margin: 0 }}>예시 화면</Tag>
      {children}
    </div>
  )
}

function fakeTask(status: TaskStatus, extra: Partial<Task> = {}): Task {
  return { id: status, title: '', note: '', priority: 'A', order: 1, status, date: '2026-11-12', updatedAt: 0, ...extra }
}

interface MockRowProps {
  readonly priority: Priority
  readonly order: number
  readonly title: string
  readonly status?: TaskStatus
  readonly time?: string
  readonly sub?: ReactNode
}

export function MockRow({ priority, order, title, status = 'todo', time, sub }: MockRowProps) {
  const { token } = theme.useToken()
  const finished = status !== 'todo'
  const struck = status === 'done' || status === 'cancelled' || status === 'forwarded'
  return (
    <Flex gap={8} align="flex-start" style={{ padding: '8px 0', borderBottom: `1px solid ${token.colorSplit}` }}>
      <span style={{ paddingTop: 1 }}>
        <StatusMark task={fakeTask(status, { delegatedTo: '김선생', forwardedTo: '2026-11-13' })} onToggle={() => {}} />
      </span>
      <span className="num" style={{ width: 28, flex: 'none', lineHeight: '22px', fontWeight: 600, color: token[PRIORITY_COLOR_TOKEN[priority]] }}>
        {priority}
        {order}
      </span>
      <Flex vertical style={{ flex: 1, minWidth: 0 }} gap={2}>
        <Typography.Text delete={struck} type={finished ? 'secondary' : undefined}>
          {time && (
            <span className="num" style={{ color: finished ? undefined : token.colorPrimary, marginInlineEnd: 8 }}>
              {time}
            </span>
          )}
          {title}
        </Typography.Text>
        {sub && <Typography.Text type="secondary" style={{ fontSize: 12 }}>{sub}</Typography.Text>}
      </Flex>
      <MoreOutlined style={{ color: token.colorTextTertiary, paddingTop: 4 }} />
    </Flex>
  )
}

export function MockDay() {
  return (
    <Flex vertical gap={12}>
      <Typography.Text strong>11월 12일 목요일</Typography.Text>
      <Card size="small" title="우선 업무" extra={<Typography.Text type="secondary" className="num">완료 1 / 4</Typography.Text>}>
        <MockRow priority="A" order={1} title="학부모 상담" time="10:30" />
        <MockRow priority="A" order={2} title="중간고사 문제 검토" status="done" />
        <MockRow priority="B" order={1} title="교재 주문" status="delegated" sub="김선생에게 맡김" />
        <MockRow priority="C" order={1} title="책상 정리" status="forwarded" sub="→ 11/13" />
      </Card>
    </Flex>
  )
}

export function MockQuickAdd({ text, priority = 'A', preview }: { text: string; priority?: Priority; preview?: string }) {
  return (
    <div>
      <Flex gap={8}>
        <Segmented<Priority> value={priority} options={['A', 'B', 'C']} />
        <Input value={text} readOnly />
        <Button>추가</Button>
      </Flex>
      {preview && (
        <Tag color="blue" icon={<ClockCircleOutlined />} closable style={{ marginTop: 8 }}>
          <span className="num">{preview}</span>
        </Tag>
      )}
    </div>
  )
}

export function MockStatusList() {
  const rows: readonly { status: TaskStatus; label: string; how: string }[] = [
    { status: 'todo', label: '할일', how: '아직 안 함' },
    { status: 'done', label: '완료', how: '네모 칸을 누름' },
    { status: 'forwarded', label: '미룸', how: '… 메뉴 → 미루기' },
    { status: 'delegated', label: '맡김', how: '… 메뉴 → 맡기기' },
    { status: 'cancelled', label: '취소', how: '… 메뉴 → 취소' },
  ]
  return (
    <Flex vertical gap={10}>
      {rows.map((r) => (
        <Flex key={r.status} gap={12} align="center">
          <StatusMark task={fakeTask(r.status)} onToggle={() => {}} />
          <Typography.Text strong style={{ width: 64 }}>{r.label}</Typography.Text>
          <Typography.Text type="secondary">{r.how}</Typography.Text>
        </Flex>
      ))}
    </Flex>
  )
}

const TIMELINE_SAMPLE: readonly TimelineBlock[] = [
  { id: 'e1', kind: 'event', start: '09:00', end: '10:30', title: '수업' },
  { id: 't1', kind: 'task', start: '10:30', end: '11:30', title: '학부모 상담', priority: 'A' },
  { id: 'e2', kind: 'event', start: '12:00', end: '13:00', title: '점심 약속' },
]

export function MockTimeline() {
  return (
    <Card size="small" title="일정">
      <div style={{ maxHeight: 264, overflow: 'hidden' }}>
        <Timeline isToday={false} blocks={TIMELINE_SAMPLE} onOpenBlock={() => {}} onOpenEmpty={() => {}} />
      </div>
    </Card>
  )
}

export function MockLongTask() {
  const { token } = theme.useToken()
  const days = ['월', '화', '수', '목', '금', '토', '일']
  return (
    <Flex vertical gap={12}>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 0 }}>
        {days.map((d, i) => (
          <Typography.Text key={d} type="secondary" className="num" style={{ fontSize: 12, textAlign: 'center' }}>
            {d} {16 + i}
          </Typography.Text>
        ))}
        <div
          style={{
            gridColumn: '2 / 6',
            marginTop: 6,
            background: token.colorPrimaryBg,
            borderRadius: token.borderRadiusSM,
            padding: '0 8px',
            fontSize: 12,
            lineHeight: '20px',
          }}
        >
          <span style={{ color: token.colorError, fontWeight: 500 }}>A</span> 기말 문제 만들기
        </div>
      </div>
      <Card size="small" title="진행 중인 장기 할일">
        <Flex justify="space-between">
          <Typography.Text>기말 문제 만들기</Typography.Text>
          <Typography.Text type="secondary" className="num" style={{ fontSize: 12 }}>~11/20 · D-2</Typography.Text>
        </Flex>
      </Card>
    </Flex>
  )
}

export function MockOverdue() {
  return (
    <Alert
      type="warning"
      showIcon
      title="지난 날 못 끝낸 할일 2건"
      description="11/10 교재 주문, 11/11 성적표 정리"
      action={<Button size="small">오늘로 가져오기</Button>}
    />
  )
}

export function MockGoal() {
  return (
    <Card size="small" title={<><AimOutlined /> 학원 학생 수 50명</>} extra={<Typography.Text type="secondary" className="num">12/31 · D-49</Typography.Text>}>
      <Flex align="center" gap={16}>
        <Progress percent={60} showInfo={false} style={{ flex: 1, margin: 0 }} />
        <Typography.Text type="secondary" className="num">3 / 5</Typography.Text>
      </Flex>
      <div style={{ marginTop: 12 }}>
        <MockRow priority="A" order={1} title="블로그 글 올리기" status="done" />
        <MockRow priority="B" order={1} title="체험 수업 안내문 만들기" />
      </div>
    </Card>
  )
}

export function MockSync() {
  return (
    <Flex vertical gap={12}>
      <Card size="small" title="동기화">
        <Button icon={<GoogleOutlined />}>Google로 로그인</Button>
      </Card>
      <Badge status="success" text={<Typography.Text type="secondary" className="num" style={{ fontSize: 12 }}>동기화됨 09:41</Typography.Text>} />
    </Flex>
  )
}
