import { Card, Flex, theme, Typography } from 'antd'
import { taskStart } from '../../data/calendar'
import { itemOfTask, type CalItem } from '../../data/calendarItems'
import { dDay, formatDDay, isActiveInstance } from '../../data/logic'
import { usePlanner } from '../../data/store'
import type { Task } from '../../data/types'
import { PRIORITY_COLOR_TOKEN } from '../../theme'
import { shortDate } from '../../utils/format'

interface DeadlineCardProps {
  readonly tasks: readonly Task[]
  readonly today: string
  readonly onOpen: (item: CalItem) => void
}

/** 지난 마감 먼저, 그다음 가까운 마감 순 */
function openDeadlines(tasks: readonly Task[]): Task[] {
  return tasks
    .filter((t) => isActiveInstance(t) && t.dueDate !== undefined && (t.status === 'todo' || t.status === 'delegated'))
    .sort((a, b) => a.dueDate!.localeCompare(b.dueDate!))
}

/** 마감이 있는 할일 중 아직 끝나지 않은 것 */
export default function DeadlineCard({ tasks, today, onOpen }: DeadlineCardProps) {
  const { token } = theme.useToken()
  const { categories } = usePlanner()
  const deadlines = openDeadlines(tasks)

  return (
    <Card title="마감 일정" extra={deadlines.length > 0 && <Typography.Text type="secondary" className="num">{deadlines.length}</Typography.Text>}>
      {deadlines.length === 0 && <Typography.Text type="secondary">마감 있는 할일 없음</Typography.Text>}
      {deadlines.map((t, i) => {
        const days = dDay(t.dueDate!, today)
        const urgent = days <= 2
        return (
          <Flex
            key={t.id}
            gap={8}
            align="flex-start"
            role="button"
            onClick={() => onOpen(itemOfTask(t, categories))}
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
    </Card>
  )
}
