import { QuestionOutlined } from '@ant-design/icons'
import { Alert, Button, Flex, Grid, Menu, Modal, Select, Typography } from 'antd'
import { useState } from 'react'
import { HELP_SECTIONS, type HelpSection } from './helpSections'

interface HelpGuideProps {
  /** 넓은 화면이면 왼쪽 메뉴 아래 구석, 좁은 화면이면 아래 탭 막대 위에 놓는다 */
  readonly isWide: boolean
}

const BUTTON_SIZE = 36
const EDGE = 16
/** 좁은 화면 아래 탭 막대 높이만큼 띄운다 */
const BOTTOM_BAR_GAP = 72

function SectionBody({ section }: { section: HelpSection }) {
  return (
    <Flex vertical gap={20}>
      <div>
        <Typography.Title level={5} style={{ marginTop: 0 }}>
          {section.title}
        </Typography.Title>
        <Typography.Text type="secondary">{section.when}</Typography.Text>
      </div>
      <ol style={{ margin: 0, paddingInlineStart: 20, display: 'flex', flexDirection: 'column', gap: 6 }}>
        {section.steps.map((step) => (
          <li key={step}>
            <Typography.Text>{step}</Typography.Text>
          </li>
        ))}
      </ol>
      {section.tip && <Alert type="info" showIcon title={section.tip} />}
      {section.example}
    </Flex>
  )
}

export default function HelpGuide({ isWide }: HelpGuideProps) {
  const [open, setOpen] = useState(false)
  const [active, setActive] = useState(HELP_SECTIONS[0].key)
  const isRoomy = Grid.useBreakpoint().md ?? true
  const section = HELP_SECTIONS.find((s) => s.key === active) ?? HELP_SECTIONS[0]
  const index = HELP_SECTIONS.indexOf(section)
  const next = HELP_SECTIONS[index + 1]

  return (
    <>
      <Button
        shape="circle"
        icon={<QuestionOutlined />}
        aria-label="사용 설명서"
        onClick={() => setOpen(true)}
        style={{
          position: 'fixed',
          left: EDGE,
          bottom: isWide ? EDGE : BOTTOM_BAR_GAP + EDGE,
          width: BUTTON_SIZE,
          height: BUTTON_SIZE,
          zIndex: 20,
          boxShadow: '0 2px 8px rgba(0, 0, 0, 0.12)',
        }}
      />
      <Modal
        open={open}
        title="사용 설명서"
        width={isRoomy ? 880 : undefined}
        footer={
          <Flex justify="space-between" align="center">
            <Typography.Text type="secondary" className="num">
              {index + 1} / {HELP_SECTIONS.length}
            </Typography.Text>
            {next ? (
              <Button type="primary" onClick={() => setActive(next.key)}>
                다음: {next.title}
              </Button>
            ) : (
              <Button type="primary" onClick={() => setOpen(false)}>
                닫기
              </Button>
            )}
          </Flex>
        }
        onCancel={() => setOpen(false)}
      >
        {isRoomy ? (
          <Flex gap={24} style={{ minHeight: 480 }}>
            <Menu
              mode="inline"
              selectedKeys={[active]}
              items={HELP_SECTIONS.map((s) => ({ key: s.key, label: s.title }))}
              onClick={({ key }) => setActive(key)}
              style={{ width: 180, flex: 'none', borderInlineEnd: 0 }}
            />
            <div style={{ flex: 1, minWidth: 0, maxHeight: '64vh', overflowY: 'auto', paddingTop: 12, paddingInlineEnd: 4 }}>
              <SectionBody section={section} />
            </div>
          </Flex>
        ) : (
          <Flex vertical gap={16}>
            <Select
              value={active}
              onChange={setActive}
              options={HELP_SECTIONS.map((s) => ({ value: s.key, label: s.title }))}
              aria-label="설명 고르기"
            />
            <div style={{ paddingTop: 12 }}>
              <SectionBody section={section} />
            </div>
          </Flex>
        )}
      </Modal>
    </>
  )
}
