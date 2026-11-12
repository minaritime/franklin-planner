import { Layout, theme } from 'antd'
import { useCallback, useLayoutEffect, useRef, useState, type CSSProperties } from 'react'
import { PreviewDataContext } from '../../data/store'
import type { PlannerData } from '../../data/types'
import { useSyncState } from '../../sync/status'
import { NAV } from '../navItems'
import SideNav from '../SideNav'
import HelpButton from './HelpButton'
import type { BadgePlace, ScreenDef } from './screens'

interface Box {
  readonly left: number
  readonly top: number
  readonly width: number
  readonly height: number
}

interface AnnotatedScreenProps {
  readonly screen: ScreenDef
  readonly data: PlannerData
  readonly today: string
  readonly isWide: boolean
  readonly active: number | null
  readonly onPick: (index: number) => void
}

/** 예시 화면을 실제 크기로 그린 뒤 줄여서 보여 준다 */
const STAGE_WIDTH = { wide: 1200, narrow: 390 } as const
const PAD = 3
const BADGE = 22
/** 이보다 좁은 상자는 번호를 위쪽 가운데에 단다 */
const SMALL_BOX = 72
const EDGE = 2
/** 글꼴·표 그리기가 끝난 뒤 한 번 더 잰다 */
const REMEASURE_MS = 250
const noop = (): void => {}

function union(rects: readonly DOMRect[]): DOMRect | null {
  if (rects.length === 0) return null
  const left = Math.min(...rects.map((r) => r.left))
  const top = Math.min(...rects.map((r) => r.top))
  const right = Math.max(...rects.map((r) => r.right))
  const bottom = Math.max(...rects.map((r) => r.bottom))
  return new DOMRect(left, top, right - left, bottom - top)
}

function measure(root: HTMLElement, screen: ScreenDef, today: string): (Box | null)[] {
  const base = root.getBoundingClientRect()
  // 지금 실제로 줄여 그린 비율을 화면에서 바로 잰다 (상태값은 한 박자 늦을 수 있다)
  const scale = root.offsetWidth > 0 ? base.width / root.offsetWidth : 1
  return screen.notes.map((note) => {
    const found = note.find(root, today)
    const list = found === null ? [] : Array.isArray(found) ? found : [found as Element]
    const rect = union(list.map((el) => el.getBoundingClientRect()).filter((r) => r.width > 0))
    if (!rect) return null
    return {
      left: (rect.left - base.left) / scale - PAD,
      top: (rect.top - base.top) / scale - PAD,
      width: rect.width / scale + PAD * 2,
      height: rect.height / scale + PAD * 2,
    }
  })
}

/** 번호는 작은 상자면 위쪽 가운데, 큰 상자면 왼쪽 위 모서리. 화면 밖으로 나가지 않게 안쪽으로 당긴다 */
function badgeStyle(box: Box, place: BadgePlace | undefined): CSSProperties {
  const onTop = place === 'top' || (place === undefined && box.width < SMALL_BOX)
  const left = onTop ? box.width / 2 - BADGE / 2 : -BADGE / 2
  const top = onTop ? -BADGE - 4 : -BADGE / 2
  return { left: Math.max(left, EDGE - box.left), top: Math.max(top, EDGE - box.top) }
}

export default function AnnotatedScreen({ screen, data, today, isWide, active, onPick }: AnnotatedScreenProps) {
  const { token } = theme.useToken()
  const sync = useSyncState()
  const frameRef = useRef<HTMLDivElement>(null)
  const stageRef = useRef<HTMLDivElement>(null)
  const [frameWidth, setFrameWidth] = useState(0)
  const [stageHeight, setStageHeight] = useState(0)
  const [boxes, setBoxes] = useState<(Box | null)[]>([])

  const stageWidth = isWide ? STAGE_WIDTH.wide : STAGE_WIDTH.narrow
  const scale = frameWidth > 0 ? Math.min(1, frameWidth / stageWidth) : 1

  const remeasure = useCallback(() => {
    const stage = stageRef.current
    if (!stage) return
    setStageHeight(stage.offsetHeight)
    setBoxes(measure(stage, screen, today))
  }, [screen, today])

  // 줄이는 비율이 바뀌면 상자 자리도 다시 잰다
  useLayoutEffect(remeasure, [remeasure, scale])

  useLayoutEffect(() => {
    const frame = frameRef.current
    const stage = stageRef.current
    if (!frame || !stage) return
    const observer = new ResizeObserver(() => {
      setFrameWidth(frame.clientWidth)
      remeasure()
    })
    observer.observe(frame)
    observer.observe(stage)
    const timer = window.setTimeout(remeasure, REMEASURE_MS)
    return () => {
      observer.disconnect()
      window.clearTimeout(timer)
    }
  }, [remeasure])

  return (
    <div
      ref={frameRef}
      style={{
        position: 'relative',
        width: '100%',
        height: stageHeight * scale,
        overflow: 'hidden',
        borderRadius: token.borderRadiusLG,
        border: `1px solid ${token.colorBorderSecondary}`,
      }}
    >
      <div style={{ position: 'absolute', top: 0, left: 0, width: stageWidth, transform: `scale(${scale})`, transformOrigin: 'top left' }}>
        <div ref={stageRef} inert aria-hidden style={{ userSelect: 'none' }}>
          <PreviewDataContext.Provider value={data}>
            <Layout style={{ minHeight: isWide ? 760 : 0 }}>
              {isWide && (
                <Layout.Sider width={200} style={{ borderRight: `1px solid ${token.colorSplit}` }}>
                  <SideNav items={NAV} active={screen.key} sync={sync} onSelect={noop} corner={<HelpButton onClick={noop} />} />
                </Layout.Sider>
              )}
              <Layout.Content style={{ padding: isWide ? 24 : 16 }}>{screen.render(today)}</Layout.Content>
            </Layout>
          </PreviewDataContext.Provider>
        </div>
        {boxes.map((box, i) => {
          const note = screen.notes[i]
          if (!box || !note) return null
          const isActive = active === i
          const isFaded = active !== null && !isActive
          return (
            <div
              key={note.title}
              style={{
                position: 'absolute',
                ...box,
                border: `2px solid ${isFaded ? 'transparent' : token.colorPrimary}`,
                borderRadius: token.borderRadius,
                boxShadow: isActive ? '0 0 0 9999px rgba(0, 0, 0, 0.5)' : undefined,
                zIndex: isActive ? 2 : 1,
                pointerEvents: 'none',
                transition: `box-shadow ${token.motionDurationMid}, border-color ${token.motionDurationMid}`,
              }}
            >
              <button
                type="button"
                aria-label={`${i + 1}. ${note.title}`}
                onClick={() => onPick(i)}
                className="num"
                style={{
                  position: 'absolute',
                  ...badgeStyle(box, note.badge),
                  width: BADGE,
                  height: BADGE,
                  borderRadius: '50%',
                  border: `2px solid ${token.colorBgContainer}`,
                  background: isFaded ? token.colorTextQuaternary : token.colorPrimary,
                  color: token.colorTextLightSolid,
                  fontSize: 12,
                  fontWeight: 600,
                  lineHeight: 1,
                  padding: 0,
                  cursor: 'pointer',
                  pointerEvents: 'auto',
                  transform: `scale(${1 / Math.max(scale, 0.6)})`,
                }}
              >
                {i + 1}
              </button>
            </div>
          )
        })}
      </div>
    </div>
  )
}
