import { Flex, Input, Segmented, type InputRef } from 'antd'
import { useRef, useState } from 'react'
import { addTask } from '../data/actions'
import type { Priority } from '../data/types'
import { PRIORITIES } from '../data/types'

interface QuickAddProps {
  readonly date: string
}

/** 창을 띄우지 않고 그 날에 바로 할일을 넣는 입력 줄 */
export default function QuickAdd({ date }: QuickAddProps) {
  const [priority, setPriority] = useState<Priority>('B')
  const [title, setTitle] = useState('')
  const inputRef = useRef<InputRef>(null)

  const submit = (): void => {
    const trimmed = title.trim()
    if (!trimmed) return
    addTask({ title: trimmed, note: '', priority, date })
    setTitle('')
    inputRef.current?.focus()
  }

  return (
    <Flex gap={8} style={{ marginBottom: 24 }}>
      <Segmented<Priority>
        value={priority}
        onChange={setPriority}
        options={PRIORITIES.map((p) => ({ value: p, label: p }))}
        aria-label="우선순위"
      />
      <Input
        ref={inputRef}
        value={title}
        placeholder="새 할일"
        maxLength={200}
        aria-label="새 할일"
        onChange={(e) => setTitle(e.target.value)}
        onPressEnter={(e) => {
          if (e.nativeEvent.isComposing) return
          submit()
        }}
      />
    </Flex>
  )
}
