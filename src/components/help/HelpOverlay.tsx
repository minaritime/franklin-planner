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
/** 이전·다음 막대: 화면 아래 가운데에 고정. 좁은 화면은 아래 탭 막대 위로 띄운다 */
const BAR_HEIGHT = 48
const BAR_BOTTOM = { wide: 24, narrow: 72 } as const
const BAR_GAP = 12
/** 큰 상자를 스크롤할 때 위쪽에 남길 여백 (번호가 잘리지 않게) */
const TOP_GAP = 32

function barReserve(isWide: boolean): number {
  return (isWide ? BAR_BOTTOM.wide : BAR_BOTTOM.narrow) + BAR_HEIGHT + BAR_GAP
}

/** 상자가 화면 위아래 밖에 있으면 번호를 숨긴다 (가장자리에 겹쳐 쌓이지 않게) */
function isOffscreen(box: Rect): boolean {
  return box.top + box.height < 0 || box.top > window.innerHeight
}

function badgePosition(box: Rect): CSSProperties {
  const onTop = box.width < SMALL_BOX
  const left = onTop ? box.left + box.width / 2 - BADGE / 2 : box.left - BADGE / 2
  const top = onTop ? box.top - BADGE - 4 : box.top - BADGE / 2
  return { left: Math.max(2, left), top: Math.max(2, top) }
}

/** 이전·다음 막대에 가리지 않고 다 보이는지 */
function isInView(box: Rect, reserve: number): boolean {
  return box.top >= 0 && box.top + box.height <= window.innerHeight - reserve
}

interface CalloutProps {
  readonly item: FoundNote
  readonly index: number
  /** 아래쪽 이전·다음 막대 자리. 설명 카드는 이 위로만 놓는다 */
  readonly reserve: number
}

/** 고른 부분 옆에 붙는 설명 카드 (글만 있고, 버튼은 아래 고정 막대에 있다) */
function Callout({ item, index, reserve }: CalloutProps) {
  const { token } = theme.useToken()
  const ref = useRef<HTMLDivElement>(null)
  const [size, setSize] = useState<Size>(DEFAULT_CARD)
  const width = Math.min(CARD_WIDTH, window.innerWidth - 16)

  useLayoutEffect(() => {
    const el = ref.current
    if (el && el.offsetHeight !== size.height) setSize({ width, height: el.offsetHeight })
  }, [item, width, size.height])

  const view = { width: window.innerWidth, height: window.innerHeight - reserve }
  const pos = placeCallout(item.box, { width, height: size.height }, view)

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
      }}
    >
      <Typography.Text strong style={{ fontSize: 15, display: 'block', marginBottom: 8 }}>
        <span className="num" style={{ color: token.colorPrimary, marginInlineEnd: 8 }}>
          {index + 1}
        </span>
        {item.note.title}
      </Typography.Text>
      <Typography.Paragraph style={{ margin: 0 }}>{item.note.desc}</Typography.Paragraph>
    </div>
  )
}

interface StepBarProps {
  readonly index: number
  readonly total: number
  readonly isWide: boolean
  readonly onStep: (delta: number) => void
  readonly onClose: () => void
}

/** 화면 아래 가운데에 고정된 이전·다음 막대. 설명 카드가 움직여도 버튼 자리는 그대로다 */
function StepBar({ index, total, isWide, onStep, onClose }: StepBarProps) {
  const { token } = theme.useToken()
  const isLast = index >= total - 1
  return (
    <Flex
      role="toolbar"
      aria-label="설명 넘기기"
      align="center"
      gap={8}
      style={{
        position: 'fixed',
        left: '50%',
        bottom: isWide ? BAR_BOTTOM.wide : BAR_BOTTOM.narrow,
        transform: 'translateX(-50%)',
        height: BAR_HEIGHT,
        padding: '0 8px',
        zIndex: Z + 3,
        background: token.colorBgElevated,
        borderRadius: BAR_HEIGHT / 2,
        boxShadow: token.boxShadowSecondary,
        whiteSpace: 'nowrap',
      }}
    >
      <Button shape="round" disabled={index <= 0} onClick={() => onStep(-1)}>
        이전
      </Button>
      <Typography.Text type="secondary" className="num" style={{ minWidth: 56, textAlign: 'center' }}>
        {total > 0 ? `${index + 1} / ${total}` : ''}
      </Typography.Text>
      <Button shape="round" type="primary" disabled={isLast} onClick={() => onStep(1)}>
        다음
      </Button>
      <Button type="text" shape="circle" icon={<CloseOutlined />} aria-label="설명 끝내기" onClick={onClose} />
    </Flex>
  )
}

/**
 * 지금 보고 있는 화면 위에 막을 덮고, 실제 부분마다 번호를 달아 하나씩 설명한다.
 * 켤 때마다 새로 붙인다 (App 에서 열려 있을 때만 그린다)
 */
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
  const { found, relocate } = useNoteBoxes(notes, today)
  const reserve = barReserve(isWide)
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

  // 고른 곳이 화면 밖이면 애니메이션 없이 바로 스크롤하고, 그리기 전에 상자 자리를 다시 재서 틀이 같이 옮겨 가게 한다
  const scrolledTo = useRef<Element | null>(null)
  useLayoutEffect(() => {
    const element = current?.elements[0] ?? null
    if (element === scrolledTo.current) return
    scrolledTo.current = element
    if (!element || !current || isInView(current.box, reserve)) return
    // 남는 높이에 들어가면 가운데로, 그보다 크면 윗부분이 보이게 위쪽에 맞춘다
    const room = window.innerHeight - reserve
    const offset = current.box.height <= room - TOP_GAP * 2 ? (room - current.box.height) / 2 : TOP_GAP
    const top = window.scrollY + current.box.top - offset
    window.scrollTo({ top: Math.max(0, top), behavior: 'instant' })
    relocate()
  }, [current, reserve, relocate])

  const step = (delta: number): void => setActive(Math.min(Math.max(index + delta, 0), found.length - 1))

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
              }}
            />
            {!isOffscreen(item.box) && (
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
            )}
          </div>
        )
      })}
      {current ? (
        <Callout item={current} index={index} reserve={reserve} />
      ) : (
        <Typography.Text style={{ position: 'fixed', inset: 0, display: 'grid', placeItems: 'center', color: '#fff', zIndex: Z + 2 }}>
          이 화면에서 설명할 부분을 찾는 중입니다
        </Typography.Text>
      )}
      <StepBar index={index} total={found.length} isWide={isWide} onStep={step} onClose={onClose} />
    </div>,
    document.body,
  )
}
