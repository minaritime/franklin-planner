import { theme } from 'antd'
import { useEffect } from 'react'

/**
 * antd 테마 색 중 CSS 파일에서 써야 하는 것(스크롤바)을 :root 변수로 내보낸다.
 * 밝은·어두운 화면이 바뀌면 같이 바뀐다.
 */
export default function ThemeCssVars() {
  const { token } = theme.useToken()
  useEffect(() => {
    const root = document.documentElement.style
    root.setProperty('--scrollbar-thumb', token.colorTextQuaternary)
    root.setProperty('--scrollbar-thumb-hover', token.colorTextTertiary)
  }, [token.colorTextQuaternary, token.colorTextTertiary])
  return null
}
