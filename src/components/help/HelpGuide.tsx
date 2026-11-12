import { Button, Flex, Grid, Modal, Segmented, theme, Typography } from 'antd'
import { useMemo, useState } from 'react'
import { useToday } from '../../hooks/useToday'
import type { PageKey } from '../SideNav'
import AnnotatedScreen from './AnnotatedScreen'
import { buildSampleData } from './sampleData'
import { SCREENS, type ScreenDef } from './screens'

interface HelpGuideProps {
  readonly open: boolean
  readonly onClose: () => void
}

interface NoteListProps {
  readonly screen: ScreenDef
  readonly active: number | null
  readonly onPick: (index: number) => void
}

function NoteList({ screen, active, onPick }: NoteListProps) {
  const { token } = theme.useToken()
  return (
    <ol style={{ listStyle: 'none', margin: 0, padding: 0, display: 'flex', flexDirection: 'column', gap: 4 }}>
      {screen.notes.map((note, i) => {
        const isActive = active === i
        return (
          <li key={note.title}>
            <button
              type="button"
              onClick={() => onPick(i)}
              style={{
                width: '100%',
                display: 'flex',
                gap: 12,
                alignItems: 'flex-start',
                textAlign: 'left',
                padding: '10px 12px',
                border: 0,
                borderRadius: token.borderRadius,
                background: isActive ? token.colorPrimaryBg : 'none',
                cursor: 'pointer',
                font: 'inherit',
                color: 'inherit',
              }}
            >
              <span
                className="num"
                style={{
                  width: 22,
                  height: 22,
                  flex: 'none',
                  borderRadius: '50%',
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: 12,
                  fontWeight: 600,
                  color: token.colorTextLightSolid,
                  background: active === null || isActive ? token.colorPrimary : token.colorTextQuaternary,
                }}
              >
                {i + 1}
              </span>
              <span style={{ display: 'flex', flexDirection: 'column', gap: 2, minWidth: 0 }}>
                <Typography.Text strong>{note.title}</Typography.Text>
                <Typography.Text type="secondary" style={{ fontSize: 13 }}>
                  {note.desc}
                </Typography.Text>
              </span>
            </button>
          </li>
        )
      })}
    </ol>
  )
}

export default function HelpGuide({ open, onClose }: HelpGuideProps) {
  const today = useToday()
  const isWide = Grid.useBreakpoint().lg ?? true
  const data = useMemo(() => buildSampleData(today), [today])
  const [screenKey, setScreenKey] = useState<PageKey>('day')
  const [active, setActive] = useState<number | null>(null)

  const screen = useMemo(() => {
    const found = SCREENS.find((s) => s.key === screenKey) ?? SCREENS[0]
    return isWide ? found : { ...found, notes: found.notes.filter((n) => !n.wideOnly) }
  }, [screenKey, isWide])
  const count = screen.notes.length
  const pick = (index: number): void => setActive((cur) => (cur === index ? null : index))
  const step = (delta: number): void => setActive((cur) => (cur === null ? (delta > 0 ? 0 : count - 1) : (cur + delta + count) % count))
  const changeScreen = (key: PageKey): void => {
    setScreenKey(key)
    setActive(null)
  }

  return (
    <Modal
      open={open}
      title="사용 설명서"
      width={isWide ? 'min(1440px, 96vw)' : undefined}
      centered
      destroyOnHidden
      onCancel={onClose}
      footer={
        <Flex justify="space-between" align="center">
          <Button type="text" disabled={active === null} onClick={() => setActive(null)}>
            전체 보기
          </Button>
          <Flex gap={8} align="center">
            <Typography.Text type="secondary" className="num">
              {active === null ? `${count}곳` : `${active + 1} / ${count}`}
            </Typography.Text>
            <Button onClick={() => step(-1)}>이전</Button>
            <Button type="primary" onClick={() => step(1)}>
              다음
            </Button>
          </Flex>
        </Flex>
      }
    >
      <Flex vertical gap={16}>
        <Segmented<PageKey>
          value={screenKey}
          onChange={changeScreen}
          options={SCREENS.map((s) => ({ value: s.key, label: s.label }))}
          style={{ alignSelf: 'flex-start' }}
        />
        <Flex vertical={!isWide} gap={24} align="flex-start">
          <div style={{ flex: 1, minWidth: 0, width: '100%', maxHeight: isWide ? '72vh' : undefined, overflowY: 'auto', padding: 12 }}>
            <AnnotatedScreen key={screen.key} screen={screen} data={data} today={today} isWide={isWide} active={active} onPick={pick} />
          </div>
          <div style={{ width: isWide ? 340 : '100%', flex: 'none', maxHeight: isWide ? '72vh' : undefined, overflowY: 'auto' }}>
            <NoteList screen={screen} active={active} onPick={pick} />
          </div>
        </Flex>
      </Flex>
    </Modal>
  )
}
