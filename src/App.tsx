import { Alert, Grid, Layout, theme } from 'antd'
import { useCallback, useState } from 'react'
import { todayString } from './data/logic'
import { useSaveFailed } from './data/store'
import HelpButton from './components/help/HelpButton'
import HelpOverlay from './components/help/HelpOverlay'
import { NAV } from './components/navItems'
import SideNav, { type PageKey } from './components/SideNav'
import { useSyncState } from './sync/status'
import { navigate, useHashRoute, type Route } from './hooks/useHashRoute'
import { useToday } from './hooks/useToday'
import CalendarPage from './pages/CalendarPage'
import DayPage from './pages/DayPage'
import GoalsPage from './pages/GoalsPage'
import SettingsPage from './pages/SettingsPage'

/** 좁은 화면에서 ? 버튼을 아래 탭 막대 위로 띄우는 거리 */
const HELP_ABOVE_BAR = 88

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
      aria-label="화면 이동"
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
  const [helpOpen, setHelpOpen] = useState(false)
  const today = useToday()
  const openHelp = (): void => setHelpOpen(true)
  const closeHelp = useCallback(() => setHelpOpen(false), [])

  return (
    <Layout style={{ minHeight: '100vh' }}>
      {isWide && (
        <Layout.Sider
          width={200}
          style={{ borderRight: `1px solid ${token.colorSplit}`, position: 'sticky', top: 0, height: '100vh', overflow: 'auto' }}
        >
          <SideNav items={NAV} active={route.page} sync={sync} onSelect={go} corner={<HelpButton onClick={openHelp} />} />
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
      {!isWide && (
        <>
          <BottomBar active={route.page} />
          <HelpButton onClick={openHelp} style={{ position: 'fixed', left: 16, bottom: HELP_ABOVE_BAR, zIndex: 20 }} />
        </>
      )}
      {helpOpen && <HelpOverlay page={route.page} today={today} isWide={isWide} onClose={closeHelp} />}
    </Layout>
  )
}
