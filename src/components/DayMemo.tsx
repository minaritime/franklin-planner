import { Input } from 'antd'
import { useEffect, useRef, useState } from 'react'
import { saveNote } from '../data/actions'

interface DayMemoProps {
  readonly date: string
  readonly initial: string
}

const SAVE_DELAY_MS = 600

/** 날짜가 바뀌면 key 로 새로 만들어 쓴다. 떠나기 전에 남은 글은 꼭 저장한다 */
export default function DayMemo({ date, initial }: DayMemoProps) {
  const [text, setText] = useState(initial)
  const latest = useRef(initial)
  const saved = useRef(initial)

  const flush = (): void => {
    if (latest.current === saved.current) return
    saveNote(date, latest.current)
    saved.current = latest.current
  }
  const flushRef = useRef(flush)
  flushRef.current = flush

  useEffect(() => {
    latest.current = text
    if (text === saved.current) return
    const id = window.setTimeout(() => flushRef.current(), SAVE_DELAY_MS)
    return () => window.clearTimeout(id)
  }, [text])

  // 다른 날로 넘어가거나 탭을 닫을 때
  useEffect(() => {
    const onHide = (): void => flushRef.current()
    window.addEventListener('pagehide', onHide)
    document.addEventListener('visibilitychange', onHide)
    return () => {
      window.removeEventListener('pagehide', onHide)
      document.removeEventListener('visibilitychange', onHide)
      flushRef.current()
    }
  }, [])

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
