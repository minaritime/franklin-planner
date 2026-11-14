import { App as AntApp, ConfigProvider } from 'antd'
import koKR from 'antd/locale/ko_KR'
import App from './App'
import ErrorBoundary from './components/ErrorBoundary'
import ThemeCssVars from './components/ThemeCssVars'
import { useDarkMode } from './hooks/useDarkMode'
import { buildTheme } from './theme'

export default function Root() {
  const isDark = useDarkMode()
  return (
    <ConfigProvider locale={koKR} theme={buildTheme(isDark)}>
      <ThemeCssVars />
      <AntApp>
        <ErrorBoundary>
          <App />
        </ErrorBoundary>
      </AntApp>
    </ConfigProvider>
  )
}
