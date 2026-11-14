import { theme } from 'antd'
import type { CalItem } from '../../data/calendarItems'
import type { CategoryColor } from '../../data/types'
import { PRIORITY_COLOR_TOKEN } from '../../theme'
import { chipColors } from './colors'
import { dragPreview } from './dragPreview'
import { formatMinutes, minutesToTop, timeToTop } from './gridMetrics'
import { chipTitle, isFinished } from './ItemChip'
import type { CalendarDrag, DragState } from './useCalendarDrag'

interface TimeBlockProps {
  readonly item: CalItem & { readonly start: string; readonly end: string }
  readonly color: CategoryColor | undefined
  readonly column: number
  readonly columns: number
  /** 끄는 중이면 원래 자리는 흐리게 */
  readonly dimmed: boolean
  readonly drag: CalendarDrag
  readonly onOpen: (item: CalItem) => void
}

const MIN_HEIGHT = 20
const RESIZE_HANDLE = 8

/** 주·일 보기의 시간 블록. 끌어서 옮기고, 아래 끝을 끌어 길이를 바꾼다 */
export default function TimeBlock({ item, color, column, columns, dimmed, drag, onOpen }: TimeBlockProps) {
  const { token } = theme.useToken()
  const colors = chipColors(token, color)
  const finished = isFinished(item)
  const top = timeToTop(item.start)
  const height = Math.max(MIN_HEIGHT, timeToTop(item.end) - top - 1)
  const movable = item.status !== 'cancelled'

  return (
    <div
      style={{
        position: 'absolute',
        top,
        height,
        left: `calc(${(column / columns) * 100}% + 2px)`,
        width: `calc(${100 / columns}% - 4px)`,
        borderRadius: 4,
        border: `1px solid ${colors.line}`,
        background: colors.soft,
        overflow: 'hidden',
        opacity: dimmed ? 0.35 : finished ? 0.7 : 1,
        zIndex: 2,
      }}
    >
      <button
        type="button"
        data-item-key={item.key}
        title={chipTitle(item)}
        onPointerDown={movable ? (e) => drag.beginMove(e, item) : undefined}
        onClick={() => onOpen(item)}
        style={{
          display: 'block',
          width: '100%',
          height: '100%',
          padding: '1px 6px',
          border: 0,
          borderInlineStart: `3px solid ${colors.line}`,
          background: 'transparent',
          textAlign: 'left',
          fontSize: 12,
          lineHeight: '18px',
          color: finished ? token.colorTextTertiary : token.colorText,
          cursor: movable ? 'grab' : 'pointer',
          touchAction: 'none',
          overflow: 'hidden',
        }}
      >
        <div style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
          {item.priority && (
            <span className="num" style={{ fontWeight: 600, marginInlineEnd: 4, color: finished ? undefined : token[PRIORITY_COLOR_TOKEN[item.priority]] }}>
              {item.priority}
            </span>
          )}
          <span className="num" style={{ color: colors.line, marginInlineEnd: 4 }}>
            {item.start}
          </span>
          <span style={{ textDecoration: item.status === 'done' || item.status === 'cancelled' ? 'line-through' : undefined }}>{item.title}</span>
        </div>
        {height >= 40 && (
          <div className="num" style={{ color: token.colorTextSecondary }}>
            {item.start}–{item.end}
          </div>
        )}
      </button>
      {movable && (
        <span
          role="separator"
          aria-label="길이 조절"
          onPointerDown={(e) => drag.beginResize(e, item)}
          style={{ position: 'absolute', left: 2, right: 2, bottom: 0, height: RESIZE_HANDLE, cursor: 'ns-resize', touchAction: 'none' }}
        />
      )}
    </div>
  )
}

/** 끄는 동안 놓일 자리를 미리 보여 주는 테두리 */
export function DragGhost({ state, date }: { state: DragState; date: string }) {
  const { token } = theme.useToken()
  const preview = dragPreview(state)
  if (!preview || preview.date !== date || preview.start === undefined || preview.end === undefined) return null
  const top = minutesToTop(preview.start)
  return (
    <div
      aria-hidden
      style={{
        position: 'absolute',
        top,
        height: Math.max(MIN_HEIGHT, minutesToTop(preview.end) - top),
        left: 2,
        right: 2,
        borderRadius: 4,
        border: `2px dashed ${token.colorPrimary}`,
        background: token.colorPrimaryBg,
        pointerEvents: 'none',
        zIndex: 4,
        padding: '1px 6px',
        fontSize: 12,
        color: token.colorPrimary,
      }}
      className="num"
    >
      {formatMinutes(preview.start)}–{formatMinutes(preview.end)}
    </div>
  )
}

