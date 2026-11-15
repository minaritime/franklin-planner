import { CloseOutlined } from '@ant-design/icons'
import { Button, Flex, theme, Typography } from 'antd'
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState, type CSSProperties } from 'react'
import { createPortal } from 'react-dom'
import type { CalView } from '../../data/calendarItems'
import type { PageKey } from '../SideNav'
import { placeCallout, unionRect, type Rect, type Size } from './placement'
import { startSectionOf, tourFor, type ScreenNote } from './screens'
import { useNoteBoxes, type FoundNote } from './useNoteBoxes'

interface HelpOverlayProps {
  readonly page: PageKey
  readonly today: string
  readonly isWide: boolean
  /** 달력 화면이면 지금 보이는 보기 */
  readonly calendarView: CalView | null
  /** 설명할 차례가 된 보기로 달력을 바꾼다 */
  readonly onShowView: (view: CalView) => void
  readonly onClose: () => void
}

const NO_NOTES: readonly ScreenNote[] = []

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

/** 넓은 칸부터 (원래 순번 i 를 같이 들고 간다) */
function byAreaDesc(found: readonly FoundNote[]): { item: FoundNote; i: number }[] {
  return found.map((item, i) => ({ item, i })).sort((a, b) => b.item.box.width * b.item.box.height - a.item.box.width * a.item.box.height)
}

function badgePosition(box: Rect): CSSProperties {
  const onTop = box.width < SMALL_BOX
  const left = onTop ? box.left + box.width / 2 - BADGE / 2 : box.left - BADGE / 2
  const top = onTop ? box.top - BADGE - 4 : box.top - BADGE / 2
  return { left: Math.max(2, left), top: Math.max(2, top) }
}

/** 창이 아닌 스크롤 칸 안에서 element 가 가려져 있으면 그 칸을 움직인다. 움직였으면 true */
function revealInScrollParents(element: Element): boolean {
  let moved = false
  for (let p = element.parentElement; p && p !== document.body && p !== document.documentElement; p = p.parentElement) {
    const { overflowY } = getComputedStyle(p)
    if ((overflowY !== 'auto' && overflowY !== 'scroll') || p.scrollHeight <= p.clientHeight) continue
    const r = element.getBoundingClientRect()
    const c = p.getBoundingClientRect()
    if (r.top < c.top) p.scrollTop -= c.top - r.top
    else if (r.bottom > c.bottom) p.scrollTop += Math.min(r.bottom - c.bottom, r.top - c.top)
    else continue
    moved = true
  }
  return moved
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
  readonly isFirst: boolean
  readonly isLast: boolean
  readonly isWide: boolean
  readonly onStep: (delta: number) => void
  readonly onClose: () => void
}

/** 화면 아래 가운데에 고정된 이전·다음 막대. 설명 카드가 움직여도 버튼 자리는 그대로다 */
function StepBar({ index, total, isFirst, isLast, isWide, onStep, onClose }: StepBarProps) {
  const { token } = theme.useToken()
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
      <Button shape="round" disabled={isFirst} onClick={() => onStep(-1)}>
        이전
      </Button>
      <Typography.Text type="secondary" className="num" style={{ minWidth: 56, textAlign: 'center' }}>
        {total > 0 && index >= 0 ? `${index + 1} / ${total}` : ''}
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
export default function HelpOverlay({ page, today, isWide, calendarView, onShowView, onClose }: HelpOverlayProps) {
  const { token } = theme.useToken()
  // 번호는 늘 같은 순서로 매기고, 켤 때 보던 보기의 설명부터 보여 준다
  const sections = useMemo(() => tourFor(page), [page])
  const [sectionIndex, setSectionIndex] = useState(() => startSectionOf(sections, calendarView))
  const section = sections[Math.min(sectionIndex, sections.length - 1)]
  const isShowing = !section.view || section.view === calendarView
  const notes = useMemo(() => {
    if (!isShowing) return NO_NOTES
    const shown = section.notes.filter((n) => (isWide ? !n.narrowOnly : !n.wideOnly))
    // 휴대폰의 아래 탭 막대는 화면 맨 아래라 마지막 순서로 둔다
    return [...shown.filter((n) => !n.last), ...shown.filter((n) => n.last)]
  }, [section, isShowing, isWide])

  // 설명할 차례의 보기가 아니면 달력을 그 보기로 바꾼다
  useEffect(() => {
    if (section.view && section.view !== calendarView) onShowView(section.view)
  }, [section, calendarView, onShowView])

  const { found, relocate } = useNoteBoxes(notes, today)
  const reserve = barReserve(isWide)
  const [active, setActive] = useState(0)
  const current = found[Math.min(active, found.length - 1)]
  const index = Math.min(active, found.length - 1)
  // 번호는 보기를 넘어가도 이어서 센다. 지금 묶음은 화면에서 찾은 수, 나머지 묶음은 설명 수로 센다
  const countOf = (i: number): number =>
    i === sectionIndex ? found.length : sections[i].notes.filter((n) => (isWide ? !n.narrowOnly : !n.wideOnly)).length
  const offset = sections.slice(0, sectionIndex).reduce((sum, _, i) => sum + countOf(i), 0)
  const total = sections.reduce((sum, _, i) => sum + countOf(i), 0)
  const isFirstSection = sectionIndex <= 0
  const isLastSection = sectionIndex >= sections.length - 1

  /** 묶음 끝에서 다음을 누르면 다음 보기의 처음으로, 처음에서 이전을 누르면 앞 보기의 끝으로 간다 */
  const step = useCallback(
    (delta: number): void => {
      const next = index + delta
      if (next >= 0 && next < found.length) setActive(next)
      else if (delta > 0 && !isLastSection) {
        setSectionIndex((i) => i + 1)
        setActive(0)
      } else if (delta < 0 && !isFirstSection) {
        setSectionIndex((i) => i - 1)
        setActive(Number.MAX_SAFE_INTEGER)
      }
    },
    [index, found.length, isFirstSection, isLastSection],
  )

  useEffect(() => {
    const onKey = (e: KeyboardEvent): void => {
      if (e.key === 'Escape') onClose()
      if (e.key === 'ArrowRight') step(1)
      if (e.key === 'ArrowLeft') step(-1)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose, step])

  // 고른 곳이 화면 밖이면 애니메이션 없이 바로 스크롤하고, 그리기 전에 상자 자리를 다시 재서 틀이 같이 옮겨 가게 한다
  const scrolledTo = useRef<Element | null>(null)
  useLayoutEffect(() => {
    const element = current?.elements[0] ?? null
    if (element === scrolledTo.current) return
    scrolledTo.current = element
    if (!element || !current) return
    // 따로 스크롤되는 칸(달력 왼쪽 칸 등) 안에 가려져 있으면 그 칸부터 움직인다
    const movedInner = revealInScrollParents(element)
    const box = movedInner ? (unionRect(current.elements.map((el) => el.getBoundingClientRect())) ?? current.box) : current.box
    if (isInView(box, reserve)) {
      if (movedInner) relocate()
      return
    }
    // 남는 높이에 들어가면 가운데로, 그보다 크면 윗부분이 보이게 위쪽에 맞춘다
    const room = window.innerHeight - reserve
    const offset = box.height <= room - TOP_GAP * 2 ? (room - box.height) / 2 : TOP_GAP
    const top = window.scrollY + box.top - offset
    window.scrollTo({ top: Math.max(0, top), behavior: 'instant' })
    relocate()
  }, [current, reserve, relocate])

  return createPortal(
    <div style={{ position: 'fixed', inset: 0, zIndex: Z }} aria-label="사용 설명" onClick={(e) => e.stopPropagation()}>
      {!current && <div style={{ position: 'fixed', inset: 0, background: MASK }} />}
      {current && (
        <div
          style={{
            position: 'fixed',
            ...current.box,
            borderRadius: token.borderRadius,
            border: `2px solid ${token.colorPrimary}`,
            boxShadow: `0 0 0 9999px ${MASK}`,
            zIndex: Z,
            pointerEvents: 'none',
          }}
        />
      )}
      {/* 칸을 누르면 그 설명으로 간다. 큰 칸부터 깔아 안쪽 작은 칸이 위에서 눌리게 한다 */}
      {byAreaDesc(found).map(({ item, i }) => {
        const isActive = item === current
        return (
          <div
            key={`box-${item.note.title}-${i}`}
            data-help-box={i + 1}
            onClick={() => setActive(i)}
            style={{
              position: 'fixed',
              ...item.box,
              borderRadius: token.borderRadius,
              border: isActive ? undefined : '1.5px dashed rgba(255, 255, 255, 0.75)',
              zIndex: Z + 1,
              cursor: isActive ? 'default' : 'pointer',
            }}
          />
        )
      })}
      {found.map((item, i) => {
        const isActive = item === current
        if (isOffscreen(item.box)) return null
        return (
          <button
            key={`badge-${item.note.title}-${i}`}
            type="button"
            className="num"
            aria-label={`${offset + i + 1}. ${item.note.title}`}
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
            {offset + i + 1}
          </button>
        )
      })}
      {current ? (
        <Callout item={current} index={offset + index} reserve={reserve} />
      ) : (
        <Typography.Text style={{ position: 'fixed', inset: 0, display: 'grid', placeItems: 'center', color: '#fff', zIndex: Z + 2 }}>
          이 화면에서 설명할 부분을 찾는 중입니다
        </Typography.Text>
      )}
      <StepBar
        index={found.length > 0 ? offset + index : -1}
        total={total}
        isFirst={isFirstSection && found.length > 0 && index <= 0}
        isLast={isLastSection && found.length > 0 && index >= found.length - 1}
        isWide={isWide}
        onStep={step}
        onClose={onClose}
      />
    </div>,
    document.body,
  )
}
