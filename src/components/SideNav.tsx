import { Flex, Menu, Typography } from 'antd'
import type { ReactNode } from 'react'
import type { Route } from '../hooks/useHashRoute'
import type { SyncState } from '../sync/status'
import SyncBadge from './SyncBadge'

export type PageKey = Route['page']

export interface NavItem {
  readonly key: PageKey
  readonly label: string
  readonly icon: ReactNode
}

interface SideNavProps {
  readonly items: readonly NavItem[]
  readonly active: PageKey
  readonly sync: SyncState
  readonly onSelect: (key: PageKey) => void
  /** 맨 아래 왼쪽 구석에 놓을 것 (사용 설명서 버튼) */
  readonly corner: ReactNode
}

/** 넓은 화면의 왼쪽 메뉴. 앱과 사용 설명서의 예시 화면이 같이 쓴다 */
export default function SideNav({ items, active, sync, onSelect, corner }: SideNavProps) {
  return (
    <>
      <div style={{ padding: '20px 24px 16px' }}>
        <Typography.Text strong style={{ fontSize: 16 }}>
          플래너
        </Typography.Text>
      </div>
      <Menu
        mode="inline"
        selectedKeys={[active]}
        style={{ borderInlineEnd: 0 }}
        items={items.map((n) => ({ key: n.key, label: n.label, icon: n.icon }))}
        onClick={({ key }) => onSelect(key as PageKey)}
      />
      <Flex align="center" gap={12} style={{ position: 'absolute', bottom: 16, left: 16, right: 16 }}>
        {corner}
        <SyncBadge sync={sync} />
      </Flex>
    </>
  )
}
