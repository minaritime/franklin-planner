import { LeftOutlined, RightOutlined } from '@ant-design/icons'
import { Button, Calendar, Card, Flex, theme, Typography } from 'antd'
import dayjs from 'dayjs'
import { useEffect, useMemo, useState } from 'react'
import { buildItems } from '../../data/calendarItems'
import { addDays } from '../../data/logic'
import { usePlanner } from '../../data/store'
import { fromDayjs } from '../../utils/format'

interface MiniCalendarProps {
  readonly date: string
  readonly today: string
  readonly onPick: (date: string) => void
}

/** 펼친 달 앞뒤로 보이는 칸까지 넉넉히 */
const PANEL_MARGIN = 7

/** 오른쪽 작은 달력. 날짜를 누르면 큰 달력이 그날로 간다. 무언가 있는 날에는 점 */
export default function MiniCalendar({ date, today, onPick }: MiniCalendarProps) {
  const { token } = theme.useToken()
  const data = usePlanner()
  const [panel, setPanel] = useState(() => dayjs(date))
  useEffect(() => setPanel(dayjs(date)), [date])

  const busy = useMemo(() => {
    const from = addDays(fromDayjs(panel.startOf('month'))!, -PANEL_MARGIN)
    const to = addDays(fromDayjs(panel.endOf('month'))!, PANEL_MARGIN)
    const set = new Set<string>()
    for (const item of buildItems(data, from, to, { hidden: new Set(), query: '' })) {
      for (let d = item.date < from ? from : item.date; d <= item.endDate && d <= to; d = addDays(d, 1)) set.add(d)
    }
    return set
  }, [data, panel])

  return (
    <Card styles={{ body: { padding: 8 } }}>
      <Calendar
        fullscreen={false}
        value={panel}
        onPanelChange={(v) => setPanel(v)}
        headerRender={({ value, onChange }) => (
          <Flex justify="space-between" align="center" style={{ padding: '4px 4px 8px' }}>
            <Typography.Text strong className="num">
              {value.year()}년 {value.month() + 1}월
            </Typography.Text>
            <Flex gap={4}>
              <Button type="text" size="small" icon={<LeftOutlined />} aria-label="작은 달력 이전 달" onClick={() => onChange(value.subtract(1, 'month'))} />
              <Button type="text" size="small" icon={<RightOutlined />} aria-label="작은 달력 다음 달" onClick={() => onChange(value.add(1, 'month'))} />
            </Flex>
          </Flex>
        )}
        onSelect={(v, info) => {
          setPanel(v)
          if (info.source === 'date') onPick(fromDayjs(v)!)
        }}
        fullCellRender={(current, info) => {
          if (info.type !== 'date') return info.originNode
          const d = fromDayjs(current)!
          const inMonth = current.month() === panel.month()
          const selected = d === date
          const isToday = d === today
          return (
            <div
              aria-label={`${d} 큰 달력에서 보기`}
              className="num"
              style={{
                position: 'relative',
                width: 28,
                height: 28,
                margin: '0 auto',
                lineHeight: '28px',
                borderRadius: '50%',
                fontSize: 12,
                background: selected ? token.colorPrimary : undefined,
                color: selected ? token.colorTextLightSolid : inMonth ? token.colorText : token.colorTextQuaternary,
                border: isToday && !selected ? `1px solid ${token.colorPrimary}` : '1px solid transparent',
                fontWeight: isToday ? 600 : undefined,
              }}
            >
              {current.date()}
              {busy.has(d) && (
                <span
                  style={{
                    position: 'absolute',
                    left: '50%',
                    bottom: 2,
                    width: 4,
                    height: 4,
                    marginLeft: -2,
                    borderRadius: '50%',
                    background: selected ? token.colorTextLightSolid : token.colorPrimary,
                  }}
                />
              )}
            </div>
          )
        }}
      />
    </Card>
  )
}
