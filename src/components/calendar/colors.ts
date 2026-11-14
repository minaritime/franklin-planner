import type { GlobalToken } from 'antd'
import type { Category, CategoryColor } from '../../data/types'

export interface ChipColors {
  /** 왼쪽 줄·시간 글자 */
  readonly line: string
  /** 종일·여러 날 띠의 바탕 */
  readonly soft: string
}

/** 분류 색. 분류가 없으면 테마 기본색 */
export function chipColors(token: GlobalToken, color: CategoryColor | undefined): ChipColors {
  if (!color) return { line: token.colorPrimary, soft: token.colorPrimaryBg }
  return { line: token[`${color}6`], soft: token[`${color}1`] }
}

export function categoryColor(categories: readonly Category[], id: string | undefined): CategoryColor | undefined {
  return id ? categories.find((c) => c.id === id && !c.deleted)?.color : undefined
}

export const liveCategories = (categories: readonly Category[]): Category[] =>
  categories.filter((c) => !c.deleted).sort((a, b) => a.order - b.order)
