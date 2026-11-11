import { Input } from 'antd'
import { useEffect, useRef, useState } from 'react'
import { saveNote } from '../data/actions'

interface DayMemoProps {
  readonly date: string
  readonly initial: string
}

const SAVE_DELAY_MS = 600

/** 날짜가 바뀌면 key 로 새로 만들어 쓴다 */
export default function DayMemo({ date, initial }: DayMemoProps) {
  const [text, setText] = useState(initial)
  const saved = useRef(initial)

  useEffect(() => {
    if (text === saved.current) return
    const id = window.setTimeout(() => {
      saveNote(date, text)
      saved.current = text
    }, SAVE_DELAY_MS)
    return () => window.clearTimeout(id)
  }, [date, text])

  const flush = (): void => {
    if (text === saved.current) return
    saveNote(date, text)
    saved.current = text
  }

  return (
    <Input.TextArea
      aria-label="메모"
      variant="borderless"
      value={text}
      onChange={(e) => setText(e.target.value)}
      onBlur={flush}
      autoSize={{ minRows: 6 }}
      maxLength={5000}
      style={{ padding: 0 }}
    />
  )
}
