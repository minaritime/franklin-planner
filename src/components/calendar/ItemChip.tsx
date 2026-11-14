import { theme } from 'antd'
import type { CSSProperties, PointerEvent } from 'react'
import type { CalItem } from '../../data/calendarItems'
import type { CategoryColor } from '../../data/types'
import { PRIORITY_COLOR_TOKEN } from '../../theme'
import { chipColors } from './colors'

interface ItemChipProps {
  readonly item: CalItem
  readonly color: CategoryColor | undefined
  readonly onOpen: (item: CalItem) => void
  readonly onDragStart?: (e: PointerEvent, item: CalItem) => void
  /** 막대처럼 칸 밖으로 이어질 때 모서리를 펴기 위해 */
  readonly style?: CSSProperties
  readonly hideTime?: boolean
}

export const isFinished = (item: CalItem): boolean => item.kind === 'task' && item.status !== 'todo'
const isStruck = (item: CalItem): boolean => item.status === 'done' || item.status === 'cancelled'

export function chipTitle(item: CalItem): string {
  const time = item.start ? `${item.start}–${item.end} ` : ''
  const prefix = item.priority ? `[${item.priority}] ` : ''
  return `${prefix}${time}${item.title}`
}

/** 달력 칸 안의 한 줄. 왼쪽 줄은 분류 색, 할일은 앞에 우선순위 글자 */
export default function ItemChip({ item, color, onOpen, onDragStart, style, hideTime = false }: ItemChipProps) {
  const { token } = theme.useToken()
  const colors = chipColors(token, color)
  const finished = isFinished(item)
  const draggable = onDragStart !== undefined && item.status !== 'cancelled'

  return (
    <button
      type="button"
      data-item-key={item.key}
      title={chipTitle(item)}
      onClick={(e) => {
        e.stopPropagation()
        onOpen(item)
      }}
      onPointerDown={draggable ? (e) => onDragStart(e, item) : undefined}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 4,
        width: '100%',
        minWidth: 0,
        height: 22,
        padding: '0 6px',
        border: 0,
        borderInlineStart: `3px solid ${finished ? token.colorBorder : colors.line}`,
        borderRadius: 3,
        background: item.allDay ? colors.soft : token.colorBgContainer,
        color: finished ? token.colorTextTertiary : token.colorText,
        fontSize: 12,
        lineHeight: '22px',
        textAlign: 'left',
        whiteSpace: 'nowrap',
        overflow: 'hidden',
        cursor: draggable ? 'grab' : 'pointer',
        touchAction: draggable ? 'none' : undefined,
        opacity: finished ? 0.75 : 1,
        ...style,
      }}
    >
      {item.priority && (
        <span className="num" style={{ flex: 'none', fontWeight: 600, color: finished ? undefined : token[PRIORITY_COLOR_TOKEN[item.priority]] }}>
          {item.priority}
        </span>
      )}
      {item.start && !hideTime && (
        <span className="num" style={{ flex: 'none', color: finished ? undefined : colors.line }}>
          {item.start}
        </span>
      )}
      <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', textDecoration: isStruck(item) ? 'line-through' : undefined }}>
        {item.title}
      </span>
    </button>
  )
}
