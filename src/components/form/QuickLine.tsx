import { Button, Flex, Input, Tag, Typography } from 'antd'
import { useState } from 'react'
import { parseQuickEntry, type QuickEntry } from '../../data/quickParse'

interface QuickLineProps {
  readonly today: string
  readonly onFill: (entry: QuickEntry) => void
}

const REPEAT_LABEL = { daily: '매일', weekly: '매주', biweekly: '격주', monthly: '매월' } as const
const DAY_NAMES = '일월화수목금토'

function summary(entry: QuickEntry): string[] {
  const parts: string[] = []
  if (entry.date) parts.push(entry.endDate ? `${entry.date} ~ ${entry.endDate}` : entry.date)
  if (entry.allDay) parts.push('종일')
  else if (entry.start) parts.push(`${entry.start}–${entry.end}`)
  if (entry.repeat) {
    const days = entry.repeat.weekdays?.map((d) => DAY_NAMES[d]).join('') ?? ''
    parts.push(`${REPEAT_LABEL[entry.repeat.freq]}${days ? ` ${days}` : ''}`)
  }
  return parts
}

/** "내일 4시 가나연 상담 30분" 처럼 한 줄로 쓰고 칸을 한 번에 채운다 */
export default function QuickLine({ today, onFill }: QuickLineProps) {
  const [text, setText] = useState('')
  const entry = text.trim() ? parseQuickEntry(text, today) : null
  const fill = (): void => {
    if (!entry) return
    onFill(entry)
    setText('')
  }
  return (
    <div style={{ marginBottom: 24 }}>
      <Typography.Text strong style={{ display: 'block', marginBottom: 8 }}>
        한 줄 입력
      </Typography.Text>
      <Flex>
        <Input
          value={text}
          placeholder="내일 4시 가나연 상담 30분"
          aria-label="한 줄 입력"
          maxLength={200}
          onChange={(e) => setText(e.target.value)}
          onPressEnter={(e) => {
            if (!e.nativeEvent.isComposing) {
              e.preventDefault()
              fill()
            }
          }}
          style={{ borderStartEndRadius: 0, borderEndEndRadius: 0 }}
        />
        <Button type="primary" disabled={!entry} onClick={fill} style={{ borderStartStartRadius: 0, borderEndStartRadius: 0 }}>
          칸 채우기
        </Button>
      </Flex>
      {entry && (
        <Flex wrap gap={4} style={{ marginTop: 6 }} aria-label="읽은 내용">
          {summary(entry).map((s) => (
            <Tag key={s} className="num" style={{ margin: 0 }}>
              {s}
            </Tag>
          ))}
        </Flex>
      )}
    </div>
  )
}
