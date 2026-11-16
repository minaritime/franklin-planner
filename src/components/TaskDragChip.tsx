import { HolderOutlined } from '@ant-design/icons'
import { theme } from 'antd'
import type { Priority } from '../data/types'
import { PRIORITY_COLOR_TOKEN } from '../theme'

/** 할일을 끄는 동안 손 밑에 따라다니는 작은 표 (줄 전체가 따라오면 일정표를 가린다) */
export default function TaskDragChip({ title, priority }: { title: string; priority: Priority }) {
  const { token } = theme.useToken()
  return (
    <div
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 8,
        maxWidth: 260,
        padding: '4px 10px',
        borderRadius: token.borderRadius,
        border: `1px solid ${token.colorBorderSecondary}`,
        borderInlineStart: `3px solid ${token[PRIORITY_COLOR_TOKEN[priority]]}`,
        background: token.colorBgElevated,
        boxShadow: token.boxShadowSecondary,
        color: token.colorText,
        fontSize: 13,
        cursor: 'grabbing',
        whiteSpace: 'nowrap',
      }}
    >
      <HolderOutlined style={{ color: token.colorTextQuaternary }} />
      <span className="num" style={{ fontWeight: 600, color: token[PRIORITY_COLOR_TOKEN[priority]] }}>
        {priority}
      </span>
      <span style={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>{title}</span>
    </div>
  )
}
