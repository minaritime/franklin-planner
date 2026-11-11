import { AimOutlined, CalendarOutlined, ScheduleOutlined, SettingOutlined } from '@ant-design/icons'
import { Alert, Grid, Layout, Menu, theme, Typography } from 'antd'
import type { ReactNode } from 'react'
import { todayString } from './data/logic'
import { useSaveFailed } from './data/store'
import SyncBadge from './components/SyncBadge'
import { useSyncState } from './sync/status'
import { navigate, useHashRoute, type Route } from './hooks/useHashRoute'
import CalendarPage from './pages/CalendarPage'
import DayPage from './pages/DayPage'
import GoalsPage from './pages/GoalsPage'
import SettingsPage from './pages/SettingsPage'

type PageKey = Route['page']

interface NavItem {
  readonly key: PageKey
  readonly label: string
  readonly icon: ReactNode
}

const NAV: readonly NavItem[] = [
  { key: 'day', label: '하루', icon: <ScheduleOutlined /> },
  { key: 'calendar', label: '달력', icon: <CalendarOutlined /> },
  { key: 'goals', label: '목표', icon: <AimOutlined /> },
  { key: 'settings', label: '설정', icon: <SettingOutlined /> },
]

function go(key: PageKey): void {
  navigate(key === 'day' ? { page: 'day', date: todayString() } : { page: key })
}

function renderPage(route: Route) {
  switch (route.page) {
    case 'day':
      return <DayPage date={route.date} />
    case 'calendar':
      return <CalendarPage month={route.month} />
    case 'goals':
      return <GoalsPage />
    case 'settings':
      return <SettingsPage />
  }
}

function BottomBar({ active }: { active: PageKey }) {
  const { token } = theme.useToken()
  return (
    <nav
      style={{
        position: 'fixed',
        insetInline: 0,
        bottom: 0,
        display: 'flex',
        background: token.colorBgContainer,
        borderTop: `1px solid ${token.colorSplit}`,
        paddingBottom: 'env(safe-area-inset-bottom)',
        zIndex: 10,
      }}
    >
      {NAV.map((item) => (
        <button
          key={item.key}
          type="button"
          onClick={() => go(item.key)}
          style={{
            flex: 1,
            border: 0,
            background: 'none',
            padding: '8px 0',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: 4,
            fontSize: 12,
            cursor: 'pointer',
            color: item.key === active ? token.colorPrimary : token.colorTextSecondary,
          }}
        >
          <span style={{ fontSize: 18 }}>{item.icon}</span>
          {item.label}
        </button>
      ))}
    </nav>
  )
}

export default function App() {
  const route = useHashRoute()
  const screens = Grid.useBreakpoint()
  const { token } = theme.useToken()
  const isWide = screens.md ?? true
  const saveFailed = useSaveFailed()
  const sync = useSyncState()

  return (
    <Layout style={{ minHeight: '100vh' }}>
      {isWide && (
        <Layout.Sider
          width={200}
          style={{ borderRight: `1px solid ${token.colorSplit}`, position: 'sticky', top: 0, height: '100vh', overflow: 'auto' }}
        >
          <div style={{ padding: '20px 24px 16px' }}>
            <Typography.Text strong style={{ fontSize: 16 }}>
              플래너
            </Typography.Text>
          </div>
          <Menu
            mode="inline"
            selectedKeys={[route.page]}
            style={{ borderInlineEnd: 0 }}
            items={NAV.map((n) => ({ key: n.key, label: n.label, icon: n.icon }))}
            onClick={({ key }) => go(key as PageKey)}
          />
          <div style={{ position: 'absolute', bottom: 16, left: 24, right: 16 }}>
            <SyncBadge sync={sync} />
          </div>
        </Layout.Sider>
      )}
      <Layout.Content style={{ padding: isWide ? 24 : '16px 16px 88px', maxWidth: 1280, width: '100%' }}>
        {saveFailed && (
          <Alert
            type="error"
            showIcon
            style={{ marginBottom: 16 }}
            title="이 브라우저에 저장되지 않고 있습니다"
            description="사생활 보호 모드이거나 저장 공간이 부족하면 새로고침할 때 내용이 사라집니다. 설정에서 백업 파일로 내보내 두세요."
          />
        )}
        {renderPage(route)}
      </Layout.Content>
      {!isWide && <BottomBar active={route.page} />}
    </Layout>
  )
}
