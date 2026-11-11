import { App as AntApp, ConfigProvider } from 'antd'
import koKR from 'antd/locale/ko_KR'
import App from './App'
import ErrorBoundary from './components/ErrorBoundary'
import { useDarkMode } from './hooks/useDarkMode'
import { buildTheme } from './theme'

export default function Root() {
  const isDark = useDarkMode()
  return (
    <ConfigProvider locale={koKR} theme={buildTheme(isDark)}>
      <AntApp>
        <ErrorBoundary>
          <App />
        </ErrorBoundary>
      </AntApp>
    </ConfigProvider>
  )
}
