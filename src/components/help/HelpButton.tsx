import { QuestionOutlined } from '@ant-design/icons'
import { Button } from 'antd'
import type { CSSProperties } from 'react'

interface HelpButtonProps {
  readonly onClick: () => void
  readonly style?: CSSProperties
}

export default function HelpButton({ onClick, style }: HelpButtonProps) {
  return (
    <Button
      shape="circle"
      icon={<QuestionOutlined />}
      aria-label="사용 설명서"
      onClick={onClick}
      style={{ flex: 'none', boxShadow: '0 2px 8px rgba(0, 0, 0, 0.12)', ...style }}
    />
  )
}
