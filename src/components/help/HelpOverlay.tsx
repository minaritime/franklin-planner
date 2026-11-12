import { CloseOutlined } from '@ant-design/icons'
import { Button, Flex, theme, Typography } from 'antd'
import { useEffect, useLayoutEffect, useMemo, useRef, useState, type CSSProperties } from 'react'
import { createPortal } from 'react-dom'
import type { PageKey } from '../SideNav'
import { placeCallout, type Rect, type Size } from './placement'
import { SCREEN_NOTES } from './screens'
import { useNoteBoxes, type FoundNote } from './useNoteBoxes'

interface HelpOverlayProps {
  readonly page: PageKey
  readonly today: string
  readonly isWide: boolean
  readonly onClose: () => void
}

const Z = 1100
const BADGE = 24
const SMALL_BOX = 72
const CARD_WIDTH = 320
const DEFAULT_CARD: Size = { width: CARD_WIDTH, height: 180 }
const MASK = 'rgba(0, 0, 0, 0.55)'

function badgePosition(box: Rect): CSSProperties {
  const onTop = box.width < SMALL_BOX
  const left = onTop ? box.left + box.width / 2 - BADGE / 2 : box.left - BADGE / 2
  const top = onTop ? box.top - BADGE - 4 : box.top - BADGE / 2
  return { left: Math.max(2, left), top: Math.max(2, top) }
}

function isInView(box: Rect): boolean {
  return box.top >= 0 && box.top + box.height <= window.innerHeight
}

interface CalloutProps {
  readonly item: FoundNote
  readonly index: number
  readonly total: number
  readonly onStep: (delta: number) => void
  readonly onClose: () => void
}

function Callout({ item, index, total, onStep, onClose }: CalloutProps) {
  const { token } = theme.useToken()
  const ref = useRef<HTMLDivElement>(null)
  const [size, setSize] = useState<Size>(DEFAULT_CARD)
  const width = Math.min(CARD_WIDTH, window.innerWidth - 16)

  useLayoutEffect(() => {
    const el = ref.current
    if (el && el.offsetHeight !== size.height) setSize({ width, height: el.offsetHeight })
  }, [item, width, size.height])

  const pos = placeCallout(item.box, { width, height: size.height }, { width: window.innerWidth, height: window.innerHeight })
  const isLast = index === total - 1

  return (
    <div
      ref={ref}
      role="dialog"
      aria-label={item.note.title}
      style={{
        position: 'fixed',
        ...pos,
        width,
        zIndex: Z + 2,
        background: token.colorBgElevated,
        borderRadius: token.borderRadiusLG,
        boxShadow: token.boxShadowSecondary,
        padding: 16,
        transition: `left ${token.motionDurationMid}, top ${token.motionDurationMid}`,
      }}
    >
      <Flex justify="space-between" align="center" style={{ marginBottom: 8 }}>
        <Typography.Text strong style={{ fontSize: 15 }}>
          <span className="num" style={{ color: token.colorPrimary, marginInlineEnd: 8 }}>
            {index + 1}
          </span>
          {item.note.title}
        </Typography.Text>
        <Button type="text" size="small" icon={<CloseOutlined />} aria-label="설명 끝내기" onClick={onClose} />
      </Flex>
      <Typography.Paragraph style={{ marginBottom: 16 }}>{item.note.desc}</Typography.Paragraph>
      <Flex justify="space-between" align="center">
        <Typography.Text type="secondary" className="num">
          {index + 1} / {total}
        </Typography.Text>
        <Flex gap={8}>
          <Button size="small" disabled={index === 0} onClick={() => onStep(-1)}>
            이전
          </Button>
          <Button size="small" type="primary" onClick={isLast ? onClose : () => onStep(1)}>
            {isLast ? '끝' : '다음'}
          </Button>
        </Flex>
      </Flex>
    </div>
  )
}

/** 지금 보고 있는 화면 위에 막을 덮고, 실제 부분마다 번호를 달아 하나씩 설명한다 */
/** 켤 때마다 새로 붙인다 (App 에서 열려 있을 때만 그린다) */
export default function HelpOverlay({ page, today, isWide, onClose }: HelpOverlayProps) {
  const { token } = theme.useToken()
  const notes = useMemo(
    () => {
      const shown = SCREEN_NOTES[page].filter((n) => (isWide ? !n.narrowOnly : !n.wideOnly))
      // 휴대폰의 아래 탭 막대는 화면 맨 아래라 마지막 순서로 둔다
      return [...shown.filter((n) => !n.narrowOnly), ...shown.filter((n) => n.narrowOnly)]
    },
    [page, isWide],
  )
  const found = useNoteBoxes(notes, today)
  const [active, setActive] = useState(0)
  const current = found[Math.min(active, found.length - 1)]
  const index = Math.min(active, found.length - 1)

  useEffect(() => {
    const onKey = (e: KeyboardEvent): void => {
      if (e.key === 'Escape') onClose()
      if (e.key === 'ArrowRight') setActive((i) => Math.min(i + 1, found.length - 1))
      if (e.key === 'ArrowLeft') setActive((i) => Math.max(i - 1, 0))
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose, found.length])

  // 고른 곳이 화면 밖이면 한 번만 스크롤해서 보여 준다 (스크롤 중 상자가 움직여도 다시 부르지 않는다)
  const scrolledTo = useRef<Element | null>(null)
  useEffect(() => {
    const element = current?.elements[0] ?? null
    if (element === scrolledTo.current) return
    scrolledTo.current = element
    if (element && current && !isInView(current.box)) element.scrollIntoView({ block: 'center', behavior: 'smooth' })
  }, [current])

  return createPortal(
    <div style={{ position: 'fixed', inset: 0, zIndex: Z }} aria-label="사용 설명" onClick={(e) => e.stopPropagation()}>
      {!current && <div style={{ position: 'fixed', inset: 0, background: MASK }} />}
      {found.map((item, i) => {
        const isActive = item === current
        return (
          <div key={`${item.note.title}-${i}`}>
            <div
              style={{
                position: 'fixed',
                ...item.box,
                borderRadius: token.borderRadius,
                border: isActive ? `2px solid ${token.colorPrimary}` : '1.5px dashed rgba(255, 255, 255, 0.75)',
                boxShadow: isActive ? `0 0 0 9999px ${MASK}` : undefined,
                zIndex: isActive ? Z : Z + 1,
                pointerEvents: 'none',
                transition: `all ${token.motionDurationMid}`,
              }}
            />
            <button
              type="button"
              className="num"
              aria-label={`${i + 1}. ${item.note.title}`}
              onClick={() => setActive(i)}
              style={{
                position: 'fixed',
                ...badgePosition(item.box),
                zIndex: Z + 1,
                width: BADGE,
                height: BADGE,
                padding: 0,
                borderRadius: '50%',
                border: `2px solid ${isActive ? token.colorBgContainer : 'transparent'}`,
                background: isActive ? token.colorPrimary : 'rgba(255, 255, 255, 0.9)',
                color: isActive ? token.colorTextLightSolid : '#1f1f1f',
                fontSize: 12,
                fontWeight: 600,
                cursor: 'pointer',
                boxShadow: '0 1px 4px rgba(0, 0, 0, 0.3)',
              }}
            >
              {i + 1}
            </button>
          </div>
        )
      })}
      {current ? (
        <Callout
          item={current}
          index={index}
          total={found.length}
          onStep={(d) => setActive(Math.min(Math.max(index + d, 0), found.length - 1))}
          onClose={onClose}
        />
      ) : (
        <Flex vertical align="center" gap={16} style={{ position: 'fixed', inset: 0, justifyContent: 'center', zIndex: Z + 2 }}>
          <Typography.Text style={{ color: '#fff' }}>이 화면에서 설명할 부분을 찾는 중입니다</Typography.Text>
          <Button onClick={onClose}>닫기</Button>
        </Flex>
      )}
    </div>,
    document.body,
  )
}
