import { PlusOutlined } from '@ant-design/icons'
import { Button, Divider, Flex, Input, Select } from 'antd'
import { useState, type CSSProperties } from 'react'
import { addCategory } from '../../data/actions'
import { usePlanner } from '../../data/store'
import CategoryDot from './CategoryDot'
import { liveCategories } from './colors'

interface CategorySelectProps {
  /** Form.Item 이 넣어 준다 */
  readonly value?: string
  readonly onChange?: (value: string | undefined) => void
  readonly style?: CSSProperties
  readonly size?: 'small' | 'middle'
  readonly placeholder?: string
}

/** 분류 고르기. 목록 아래에서 바로 새 분류를 만들 수 있다 */
export default function CategorySelect({ value, onChange, style, size, placeholder = '분류 없음' }: CategorySelectProps) {
  const { categories } = usePlanner()
  const [name, setName] = useState('')
  const live = liveCategories(categories)
  const known = value !== undefined && live.some((c) => c.id === value)

  const create = (): void => {
    const trimmed = name.trim()
    if (!trimmed) return
    const existing = live.find((c) => c.name === trimmed)
    onChange?.(existing ? existing.id : addCategory(trimmed))
    setName('')
  }

  return (
    <Select
      aria-label="분류"
      size={size}
      style={style}
      allowClear
      placeholder={placeholder}
      value={known ? value : undefined}
      onChange={(v: string | undefined) => onChange?.(v)}
      options={live.map((c) => ({
        value: c.id,
        label: (
          <Flex align="center" gap={6}>
            <CategoryDot color={c.color} />
            {c.name}
          </Flex>
        ),
      }))}
      popupRender={(menu) => (
        <>
          {menu}
          <Divider style={{ margin: '4px 0' }} />
          <Flex gap={4} style={{ padding: '0 4px 4px' }}>
            <Input
              size="small"
              placeholder="새 분류 이름"
              value={name}
              maxLength={20}
              onChange={(e) => setName(e.target.value)}
              onKeyDown={(e) => {
                e.stopPropagation()
                if (e.key === 'Enter' && !e.nativeEvent.isComposing) create()
              }}
            />
            <Button size="small" type="text" icon={<PlusOutlined />} onClick={create}>
              추가
            </Button>
          </Flex>
        </>
      )}
    />
  )
}
