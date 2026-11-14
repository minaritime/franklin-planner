import { Empty, Flex, theme, Typography } from 'antd'
import dayjs from 'dayjs'
import { sortForDay, type CalItem } from '../../data/calendarItems'
import { addDays } from '../../data/logic'
import type { Category } from '../../data/types'
import { PRIORITY_COLOR_TOKEN } from '../../theme'
import { shortDate } from '../../utils/format'
import CategoryDot from './CategoryDot'
import { categoryColor } from './colors'
import { isFinished } from './ItemChip'

interface AgendaViewProps {
  readonly from: string
  readonly to: string
  readonly today: string
  readonly items: readonly CalItem[]
  readonly categories: readonly Category[]
  readonly onOpenItem: (item: CalItem) => void
}

function timeLabel(item: CalItem): string {
  if (item.endDate > item.date) return `${shortDate(item.date)} ~ ${shortDate(item.endDate)}`
  return item.start ? `${item.start}–${item.end}` : '종일'
}

function Row({ item, categories, onOpen }: { item: CalItem; categories: readonly Category[]; onOpen: (i: CalItem) => void }) {
  const { token } = theme.useToken()
  const finished = isFinished(item)
  const category = categories.find((c) => c.id === item.categoryId)
  const sub = [category?.name ?? '분류 없음', item.kind === 'task' ? '할일' : '일정', item.event?.place].filter(Boolean).join(' · ')
  return (
    <button
      type="button"
      onClick={() => onOpen(item)}
      style={{
        display: 'flex',
        gap: 16,
        width: '100%',
        padding: '12px 0',
        border: 0,
        borderTop: `1px solid ${token.colorSplit}`,
        background: 'none',
        textAlign: 'left',
        cursor: 'pointer',
        color: token.colorText,
        opacity: finished ? 0.6 : 1,
      }}
    >
      <Typography.Text type="secondary" className="num" style={{ width: 120, flex: 'none', fontSize: 13 }}>
        {timeLabel(item)}
      </Typography.Text>
      <Flex align="flex-start" gap={8} style={{ minWidth: 0 }}>
        <span style={{ paddingTop: 7 }}>
          <CategoryDot color={categoryColor(categories, item.categoryId)} />
        </span>
        <Flex vertical style={{ minWidth: 0 }}>
          <span style={{ fontWeight: 600, textDecoration: item.status === 'done' || item.status === 'cancelled' ? 'line-through' : undefined }}>
            {item.priority && (
              <span className="num" style={{ marginInlineEnd: 6, color: token[PRIORITY_COLOR_TOKEN[item.priority]] }}>
                {item.priority}
              </span>
            )}
            {item.title}
          </span>
          <Typography.Text type="secondary" style={{ fontSize: 12 }}>
            {sub}
          </Typography.Text>
        </Flex>
      </Flex>
    </button>
  )
}

/** 앞으로 몇 주를 날짜별로. 여러 날짜에 걸친 것은 첫 날(범위 앞에서 시작했으면 범위 첫 날)에 한 번만 */
export default function AgendaView({ from, to, today, items, categories, onOpenItem }: AgendaViewProps) {
  const { token } = theme.useToken()
  const days: { date: string; items: CalItem[] }[] = []
  for (let d = from; d <= to; d = addDays(d, 1)) {
    const onDay = items.filter((i) => (i.date < from ? from : i.date) === d)
    if (onDay.length > 0) days.push({ date: d, items: sortForDay(onDay) })
  }

  if (days.length === 0) return <Empty style={{ padding: 48 }} description="이 기간에는 할일·일정이 없습니다" />

  return (
    <div style={{ padding: '0 16px' }}>
      {days.map(({ date, items: dayItems }) => (
        <section key={date} style={{ padding: '16px 0' }} aria-label={date}>
          <Typography.Title level={5} style={{ margin: '0 0 4px', color: date === today ? token.colorPrimary : undefined }}>
            {dayjs(date).format('M월 D일 (dd)')}
            {date === today && <span style={{ fontSize: 12, marginInlineStart: 8 }}>오늘</span>}
          </Typography.Title>
          {dayItems.map((item) => (
            <Row key={item.key} item={item} categories={categories} onOpen={onOpenItem} />
          ))}
        </section>
      ))}
    </div>
  )
}
