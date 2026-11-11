import { PlusOutlined } from '@ant-design/icons'
import { Button, Card, Col, Empty, Flex, Progress, Row, theme, Typography } from 'antd'
import { useMemo, useState } from 'react'
import GoalForm, { type GoalDraft } from '../components/GoalForm'
import { dDay, formatDDay, goalProgress, isActiveInstance, liveGoals } from '../data/logic'
import { usePlanner } from '../data/store'
import type { Goal, Task } from '../data/types'
import { navigate } from '../hooks/useHashRoute'
import { useToday } from '../hooks/useToday'
import { PRIORITY_COLOR_TOKEN } from '../theme'
import { shortDate } from '../utils/format'

const MAX_TASKS = 5

function linkedTasks(tasks: readonly Task[], goalId: string): Task[] {
  return tasks
    .filter((t) => t.goalId === goalId && isActiveInstance(t))
    .sort((a, b) => Number(a.status !== 'todo') - Number(b.status !== 'todo') || a.date.localeCompare(b.date))
}

function GoalCard({ goal, tasks, today, onEdit }: { goal: Goal; tasks: readonly Task[]; today: string; onEdit: () => void }) {
  const { token } = theme.useToken()
  const progress = goalProgress(tasks, goal.id)
  const related = linkedTasks(tasks, goal.id)
  const percent = progress.total === 0 ? 0 : Math.round((progress.done / progress.total) * 100)
  const days = goal.targetDate ? dDay(goal.targetDate, today) : null

  return (
    <Card
      title={
        <Typography.Text strong style={{ cursor: 'pointer' }} onClick={onEdit}>
          {goal.title}
        </Typography.Text>
      }
      extra={
        days !== null && (
          <Typography.Text type={days < 0 ? 'danger' : 'secondary'} className="num">
            {shortDate(goal.targetDate!)} · {formatDDay(days)}
          </Typography.Text>
        )
      }
    >
      {goal.description && (
        <Typography.Paragraph type="secondary" style={{ whiteSpace: 'pre-wrap', marginBottom: 16 }}>
          {goal.description}
        </Typography.Paragraph>
      )}
      <Flex align="center" gap={16}>
        <Progress percent={percent} showInfo={false} style={{ flex: 1, margin: 0 }} />
        <Typography.Text type="secondary" className="num" style={{ flex: 'none' }}>
          {progress.done} / {progress.total}
        </Typography.Text>
      </Flex>
      {related.length > 0 && (
        <div style={{ marginTop: 16 }}>
          {related.slice(0, MAX_TASKS).map((t) => {
            const finished = t.status !== 'todo'
            return (
              <Flex
                key={t.id}
                gap={8}
                align="center"
                onClick={() => navigate({ page: 'day', date: t.date })}
                style={{ padding: '4px 0', cursor: 'pointer' }}
              >
                <Typography.Text strong className="num" style={{ width: 16, flex: 'none', color: token[PRIORITY_COLOR_TOKEN[t.priority]] }}>
                  {t.priority}
                </Typography.Text>
                <Typography.Text ellipsis delete={t.status === 'done'} type={finished ? 'secondary' : undefined} style={{ flex: 1 }}>
                  {t.title}
                </Typography.Text>
                <Typography.Text type="secondary" className="num" style={{ flex: 'none', fontSize: 12 }}>
                  {shortDate(t.date)}
                </Typography.Text>
              </Flex>
            )
          })}
          {related.length > MAX_TASKS && (
            <Typography.Text type="secondary" style={{ fontSize: 12 }}>
              +{related.length - MAX_TASKS}개
            </Typography.Text>
          )}
        </div>
      )}
    </Card>
  )
}

function ValueList({ values, onEdit }: { values: readonly Goal[]; onEdit: (g: Goal) => void }) {
  const { token } = theme.useToken()
  if (values.length === 0) return <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="가치 없음" />
  return (
    <div>
      {values.map((v, i) => (
        <div
          key={v.id}
          onClick={() => onEdit(v)}
          style={{ padding: '12px 0', borderTop: i === 0 ? undefined : `1px solid ${token.colorSplit}`, cursor: 'pointer' }}
        >
          <Typography.Text strong>{v.title}</Typography.Text>
          {v.description && (
            <Typography.Paragraph type="secondary" style={{ margin: '4px 0 0', whiteSpace: 'pre-wrap' }}>
              {v.description}
            </Typography.Paragraph>
          )}
        </div>
      ))}
    </div>
  )
}

export default function GoalsPage() {
  const data = usePlanner()
  const today = useToday()
  const [draft, setDraft] = useState<GoalDraft | null>(null)

  const all = useMemo(() => liveGoals(data.goals), [data.goals])
  const goals = all
    .filter((g) => g.kind === 'goal')
    .sort((a, b) => (a.targetDate ?? '9999').localeCompare(b.targetDate ?? '9999'))
  const values = all.filter((g) => g.kind === 'value')

  return (
    <>
      <Flex justify="space-between" align="center" wrap gap={16} style={{ marginBottom: 24 }}>
        <Typography.Title level={4} style={{ margin: 0 }}>
          목표
        </Typography.Title>
        <Button type="primary" icon={<PlusOutlined />} onClick={() => setDraft({ kind: 'goal' })}>
          목표 추가
        </Button>
      </Flex>
      <Row gutter={[24, 16]}>
        <Col xs={24} lg={16}>
          {goals.length === 0 ? (
            <Card>
              <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="장기 목표 없음" />
            </Card>
          ) : (
            <Flex vertical gap={16}>
              {goals.map((g) => (
                <GoalCard key={g.id} goal={g} tasks={data.tasks} today={today} onEdit={() => setDraft({ goal: g })} />
              ))}
            </Flex>
          )}
        </Col>
        <Col xs={24} lg={8}>
          <Card
            title="나의 가치"
            extra={<Button type="text" size="small" icon={<PlusOutlined />} aria-label="가치 추가" onClick={() => setDraft({ kind: 'value' })} />}
          >
            <ValueList values={values} onEdit={(g) => setDraft({ goal: g })} />
          </Card>
        </Col>
      </Row>
      <GoalForm draft={draft} onClose={() => setDraft(null)} />
    </>
  )
}
