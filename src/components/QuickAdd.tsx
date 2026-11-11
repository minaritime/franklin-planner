import { ClockCircleOutlined } from '@ant-design/icons'
import { Button, Flex, Input, Segmented, Tag, type InputRef } from 'antd'
import { useRef, useState } from 'react'
import { addTask } from '../data/actions'
import { parseTimedTitle } from '../data/timeParse'
import type { Priority } from '../data/types'
import { PRIORITIES } from '../data/types'

interface QuickAddProps {
  readonly date: string
}

/** 끝 시간을 안 쓰면 이만큼으로 잡는다 */
const DEFAULT_MINUTES = 60

/** 창을 띄우지 않고 그 날에 바로 할일을 넣는 입력 줄. "3시 상담" 처럼 쓰면 시간도 붙는다 */
export default function QuickAdd({ date }: QuickAddProps) {
  const [priority, setPriority] = useState<Priority>('B')
  const [text, setText] = useState('')
  const [ignoreTime, setIgnoreTime] = useState(false)
  const inputRef = useRef<InputRef>(null)

  const parsed = parseTimedTitle(text, DEFAULT_MINUTES)
  const useTime = parsed.start !== null && !ignoreTime

  const submit = (): void => {
    const trimmed = text.trim()
    if (!trimmed) return
    addTask({
      title: useTime ? parsed.title || trimmed : trimmed,
      note: '',
      priority,
      date,
      startTime: useTime ? (parsed.start ?? undefined) : undefined,
      endTime: useTime ? (parsed.end ?? undefined) : undefined,
    })
    setText('')
    setIgnoreTime(false)
    inputRef.current?.focus()
  }

  return (
    <div style={{ marginBottom: 24 }}>
      <Flex gap={8}>
        <Segmented<Priority>
          value={priority}
          onChange={setPriority}
          options={PRIORITIES.map((p) => ({ value: p, label: p }))}
          aria-label="우선순위"
        />
        <Input
          ref={inputRef}
          value={text}
          placeholder="새 할일   예) 3시 상담, 10시반~12시 수업, 14:30 보고"
          maxLength={200}
          aria-label="새 할일"
          onChange={(e) => {
            setText(e.target.value)
            if (!e.target.value) setIgnoreTime(false)
          }}
          onPressEnter={(e) => {
            if (e.nativeEvent.isComposing) return
            submit()
          }}
        />
        <Button disabled={!text.trim()} onClick={submit}>
          추가
        </Button>
      </Flex>
      {parsed.start !== null && (
        <div style={{ marginTop: 8 }}>
          {ignoreTime ? (
            <Tag style={{ cursor: 'pointer' }} onClick={() => setIgnoreTime(false)}>
              시간 없이 추가 · 되돌리기
            </Tag>
          ) : (
            <Tag
              color="blue"
              icon={<ClockCircleOutlined />}
              closable
              onClose={(e) => {
                e.preventDefault()
                setIgnoreTime(true)
              }}
            >
              <span className="num">
                {parsed.start}~{parsed.end}
              </span>
              {parsed.title && ` · ${parsed.title}`}
            </Tag>
          )}
        </div>
      )}
    </div>
  )
}
