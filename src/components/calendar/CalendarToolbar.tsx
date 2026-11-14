import { LeftOutlined, MoreOutlined, PlusOutlined, RightOutlined, SearchOutlined } from '@ant-design/icons'
import { Button, Dropdown, Flex, Input, Segmented, Typography, type InputRef } from 'antd'
import type { Ref } from 'react'
import type { CalView, WeekStart } from '../../data/calendarItems'

interface CalendarToolbarProps {
  readonly title: string
  readonly view: CalView
  readonly query: string
  readonly searchRef: Ref<InputRef>
  readonly weekStart: WeekStart
  readonly onToday: () => void
  readonly onStep: (dir: 1 | -1) => void
  readonly onView: (view: CalView) => void
  readonly onQuery: (query: string) => void
  readonly onNew: () => void
  readonly onToggleWeekStart: () => void
  readonly onShowKeys: () => void
}

const VIEW_OPTIONS: { value: CalView; label: string }[] = [
  { value: 'month', label: '월' },
  { value: 'week', label: '주' },
  { value: 'day', label: '일' },
  { value: 'agenda', label: '목록' },
]

export default function CalendarToolbar(props: CalendarToolbarProps) {
  const menu = {
    items: [
      { key: 'week-start', label: props.weekStart === 0 ? '주 시작: 일요일 → 월요일로' : '주 시작: 월요일 → 일요일로' },
      { key: 'keys', label: '단축키 보기' },
    ],
    onClick: ({ key }: { key: string }) => (key === 'keys' ? props.onShowKeys() : props.onToggleWeekStart()),
  }

  return (
    <Flex justify="space-between" align="center" wrap gap={12} style={{ marginBottom: 16 }}>
      <Flex align="center" gap={8}>
        <Button onClick={props.onToday}>오늘</Button>
        <Button icon={<LeftOutlined />} aria-label="이전" onClick={() => props.onStep(-1)} />
        <Button icon={<RightOutlined />} aria-label="다음" onClick={() => props.onStep(1)} />
        <Typography.Title level={4} className="num" style={{ margin: '0 0 0 8px', whiteSpace: 'nowrap' }}>
          {props.title}
        </Typography.Title>
      </Flex>
      <Flex align="center" gap={8} wrap>
        <Input
          ref={props.searchRef}
          allowClear
          prefix={<SearchOutlined />}
          placeholder="검색 ( / )"
          aria-label="검색"
          value={props.query}
          onChange={(e) => props.onQuery(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Escape') (e.target as HTMLInputElement).blur()
          }}
          style={{ width: 180 }}
        />
        <Segmented<CalView> options={VIEW_OPTIONS} value={props.view} onChange={props.onView} aria-label="보기" />
        <Button type="primary" icon={<PlusOutlined />} onClick={props.onNew}>
          추가
        </Button>
        <Dropdown menu={menu} trigger={['click']} placement="bottomRight">
          <Button icon={<MoreOutlined />} aria-label="더보기" />
        </Dropdown>
      </Flex>
    </Flex>
  )
}
