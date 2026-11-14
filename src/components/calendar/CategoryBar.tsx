import { SettingOutlined } from '@ant-design/icons'
import { Button, Checkbox, ConfigProvider, Flex, theme, Typography } from 'antd'
import { useState } from 'react'
import { NO_CATEGORY } from '../../data/calendarItems'
import type { Category } from '../../data/types'
import CategoryManager from './CategoryManager'
import { chipColors, liveCategories } from './colors'

interface CategoryBarProps {
  readonly categories: readonly Category[]
  readonly hidden: ReadonlySet<string>
  /** 분류별 개수 (지금 보이는 기간, 끈 것 포함) */
  readonly counts: ReadonlyMap<string, number>
  readonly onToggle: (key: string) => void
}

function Toggle({ label, color, checked, count, onChange }: {
  label: string
  color: string
  checked: boolean
  count: number
  onChange: () => void
}) {
  return (
    <ConfigProvider theme={{ token: { colorPrimary: color, colorPrimaryHover: color } }}>
      <Checkbox checked={checked} onChange={onChange}>
        <span style={{ color: checked ? color : undefined }}>{label}</span>
        {count > 0 && (
          <Typography.Text type="secondary" className="num" style={{ fontSize: 12, marginInlineStart: 4 }}>
            {count}
          </Typography.Text>
        )}
      </Checkbox>
    </ConfigProvider>
  )
}

/** 달력 위 분류 목록. 체크를 끄면 그 분류의 할일·일정이 달력에서 숨는다 */
export default function CategoryBar({ categories, hidden, counts, onToggle }: CategoryBarProps) {
  const { token } = theme.useToken()
  const [managing, setManaging] = useState(false)

  return (
    <Flex align="center" wrap gap={12} style={{ marginBottom: 16 }} role="group" aria-label="분류 목록">
      {liveCategories(categories).map((c) => (
        <Toggle
          key={c.id}
          label={c.name}
          color={chipColors(token, c.color).line}
          checked={!hidden.has(c.id)}
          count={counts.get(c.id) ?? 0}
          onChange={() => onToggle(c.id)}
        />
      ))}
      <Toggle
        label="분류 없음"
        color={token.colorTextSecondary}
        checked={!hidden.has(NO_CATEGORY)}
        count={counts.get(NO_CATEGORY) ?? 0}
        onChange={() => onToggle(NO_CATEGORY)}
      />
      <Button size="small" type="text" icon={<SettingOutlined />} onClick={() => setManaging(true)}>
        분류 관리
      </Button>
      <CategoryManager open={managing} onClose={() => setManaging(false)} />
    </Flex>
  )
}
