import { ArrowRightOutlined, CheckOutlined, CloseOutlined } from '@ant-design/icons'
import { theme, Tooltip } from 'antd'
import type { CSSProperties, ReactNode } from 'react'
import type { Task } from '../data/types'
import { shortDate } from '../utils/format'

interface StatusMarkProps {
  readonly task: Task
  readonly onToggle: () => void
}

const SIZE = 20

/** 프랭클린 플래너 상태 기호: 빈칸 · ✓ 완료 · → 미룸 · ● 맡김 · ✕ 취소 */
export default function StatusMark({ task, onToggle }: StatusMarkProps) {
  const { token } = theme.useToken()

  const base: CSSProperties = {
    width: SIZE,
    height: SIZE,
    flex: 'none',
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: token.borderRadiusSM,
    border: 0,
    padding: 0,
    background: 'none',
    cursor: 'pointer',
    fontSize: 14,
  }

  const marks: Record<Task['status'], { content: ReactNode; style: CSSProperties; tip: string }> = {
    todo: { content: null, style: { border: `1px solid ${token.colorBorder}` }, tip: '완료로 표시' },
    done: { content: <CheckOutlined />, style: { color: token.colorSuccess }, tip: '완료' },
    forwarded: {
      content: <ArrowRightOutlined />,
      style: { color: token.colorPrimary, cursor: 'default' },
      tip: task.forwardedTo ? `${shortDate(task.forwardedTo)}로 미룸` : '미룸',
    },
    delegated: {
      content: <span style={{ width: 8, height: 8, borderRadius: '50%', background: token.colorWarning }} />,
      style: {},
      tip: task.delegatedTo ? `${task.delegatedTo}에게 맡김` : '맡김',
    },
    cancelled: { content: <CloseOutlined />, style: { color: token.colorTextQuaternary }, tip: '취소' },
  }

  const mark = marks[task.status]
  const clickable = task.status !== 'forwarded'

  return (
    <Tooltip title={mark.tip} mouseEnterDelay={0.6}>
      <button
        type="button"
        aria-label={mark.tip}
        style={{ ...base, ...mark.style }}
        onClick={clickable ? onToggle : undefined}
      >
        {mark.content}
      </button>
    </Tooltip>
  )
}
