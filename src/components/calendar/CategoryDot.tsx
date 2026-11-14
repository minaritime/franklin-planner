import { theme } from 'antd'
import type { CategoryColor } from '../../data/types'
import { chipColors } from './colors'

interface CategoryDotProps {
  readonly color: CategoryColor | undefined
  readonly size?: number
}

export default function CategoryDot({ color, size = 8 }: CategoryDotProps) {
  const { token } = theme.useToken()
  return (
    <span
      aria-hidden
      style={{
        display: 'inline-block',
        width: size,
        height: size,
        flex: 'none',
        borderRadius: '50%',
        background: color ? chipColors(token, color).line : token.colorTextQuaternary,
      }}
    />
  )
}
