import { theme, type ThemeConfig } from 'antd'

const FONT_FAMILY = [
  'Pretendard Variable',
  'Pretendard',
  '-apple-system',
  'BlinkMacSystemFont',
  "'Segoe UI'",
  "'Malgun Gothic'",
  "'Apple SD Gothic Neo'",
  'Roboto',
  'sans-serif',
].join(', ')

/** antd 기본 토큰을 거의 그대로 쓰고, 한글 글꼴만 덧붙인다 */
export function buildTheme(isDark: boolean): ThemeConfig {
  return {
    algorithm: isDark ? theme.darkAlgorithm : theme.defaultAlgorithm,
    token: { fontFamily: FONT_FAMILY },
    components: {
      Layout: { siderBg: isDark ? '#141414' : '#ffffff' },
    },
  }
}

/** 우선순위 표시에 쓰는 의미 색 (antd 토큰 이름) */
export const PRIORITY_COLOR_TOKEN = {
  A: 'colorError',
  B: 'colorWarning',
  C: 'colorTextTertiary',
} as const
