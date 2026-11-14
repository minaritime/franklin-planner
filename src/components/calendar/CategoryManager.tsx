import { DeleteOutlined, PlusOutlined } from '@ant-design/icons'
import { Button, Flex, Input, Modal, Popconfirm, Popover, theme, Typography } from 'antd'
import { useState } from 'react'
import { addCategory, removeCategory, updateCategory } from '../../data/actions'
import { usePlanner } from '../../data/store'
import { CATEGORY_COLORS, type Category } from '../../data/types'
import CategoryDot from './CategoryDot'
import { chipColors, liveCategories } from './colors'

interface CategoryManagerProps {
  readonly open: boolean
  readonly onClose: () => void
}

function ColorPicker({ category }: { category: Category }) {
  const { token } = theme.useToken()
  const [open, setOpen] = useState(false)
  const palette = (
    <Flex wrap gap={6} style={{ width: 168 }}>
      {CATEGORY_COLORS.map((c) => (
        <button
          key={c}
          type="button"
          aria-label={`색 ${c}`}
          onClick={() => {
            updateCategory(category.id, { color: c })
            setOpen(false)
          }}
          style={{
            width: 24,
            height: 24,
            borderRadius: '50%',
            cursor: 'pointer',
            background: chipColors(token, c).line,
            border: c === category.color ? `2px solid ${token.colorText}` : '2px solid transparent',
          }}
        />
      ))}
    </Flex>
  )
  return (
    <Popover content={palette} trigger="click" open={open} onOpenChange={setOpen}>
      <Button type="text" size="small" aria-label={`${category.name} 색 바꾸기`} icon={<CategoryDot color={category.color} size={14} />} />
    </Popover>
  )
}

function CategoryRow({ category }: { category: Category }) {
  const [name, setName] = useState(category.name)
  const save = (): void => {
    const trimmed = name.trim()
    if (trimmed && trimmed !== category.name) updateCategory(category.id, { name: trimmed })
    else setName(category.name)
  }
  return (
    <Flex align="center" gap={8}>
      <ColorPicker category={category} />
      <Input
        value={name}
        maxLength={20}
        aria-label="분류 이름"
        onChange={(e) => setName(e.target.value)}
        onBlur={save}
        onPressEnter={(e) => {
          if (!e.nativeEvent.isComposing) save()
        }}
      />
      <Popconfirm
        title="이 분류를 지울까요?"
        description="이 분류였던 할일·일정은 지워지지 않고 '분류 없음'이 됩니다."
        okText="지우기"
        cancelText="취소"
        onConfirm={() => removeCategory(category.id)}
      >
        <Button type="text" danger icon={<DeleteOutlined />} aria-label={`${category.name} 지우기`} />
      </Popconfirm>
    </Flex>
  )
}

export default function CategoryManager({ open, onClose }: CategoryManagerProps) {
  const { categories } = usePlanner()
  const [name, setName] = useState('')
  const live = liveCategories(categories)

  const add = (): void => {
    if (!name.trim()) return
    addCategory(name)
    setName('')
  }

  return (
    <Modal open={open} title="분류 관리" footer={null} onCancel={onClose} destroyOnHidden width={420}>
      <Flex vertical gap={8} style={{ marginTop: 16 }}>
        {live.length === 0 && <Typography.Text type="secondary">아직 분류가 없습니다.</Typography.Text>}
        {live.map((c) => (
          <CategoryRow key={c.id} category={c} />
        ))}
        <Flex gap={8} style={{ marginTop: 8 }}>
          <Input
            placeholder="새 분류 이름"
            value={name}
            maxLength={20}
            onChange={(e) => setName(e.target.value)}
            onPressEnter={(e) => {
              if (!e.nativeEvent.isComposing) add()
            }}
          />
          <Button icon={<PlusOutlined />} onClick={add}>
            추가
          </Button>
        </Flex>
      </Flex>
    </Modal>
  )
}
