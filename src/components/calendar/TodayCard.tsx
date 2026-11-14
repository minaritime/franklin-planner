import { Button, Card, Flex, Typography } from 'antd'
import { useMemo } from 'react'
import { buildItems, sortForDay, type CalItem } from '../../data/calendarItems'
import { usePlanner } from '../../data/store'
import { categoryColor } from './colors'
import ItemChip from './ItemChip'

interface TodayCardProps {
  /** 달력에서 고른 날 */
  readonly date: string
  readonly today: string
  readonly onOpen: (item: CalItem) => void
  readonly onOpenPlan: () => void
}

/** 고른 날의 할일과 일정. 끝낸 것은 아래로 */
export default function TodayCard({ date, today, onOpen, onOpenPlan }: TodayCardProps) {
  const data = usePlanner()
  const items = useMemo(() => sortForDay(buildItems(data, date, date, { hidden: new Set(), query: '' })), [data, date])
  const label = date === today ? '오늘 계획' : `${Number(date.slice(5, 7))}월 ${Number(date.slice(8, 10))}일 계획`
  const left = items.filter((i) => i.kind !== 'task' || i.status === 'todo').length

  return (
    <Card
      title={label}
      extra={
        <Flex align="center" gap={8}>
          {items.length > 0 && (
            <Typography.Text type="secondary" className="num">
              {left}
            </Typography.Text>
          )}
          <Button type="link" size="small" style={{ padding: 0 }} onClick={onOpenPlan}>
            계획 화면
          </Button>
        </Flex>
      }
    >
      {items.length === 0 && <Typography.Text type="secondary">계획 없음</Typography.Text>}
      <Flex vertical gap={2} aria-label={label}>
        {items.map((i) => (
          <ItemChip key={i.key} item={i} color={categoryColor(data.categories, i.categoryId)} onOpen={onOpen} />
        ))}
      </Flex>
    </Card>
  )
}
