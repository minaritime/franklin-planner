import { describe, expect, it, vi } from 'vitest'

vi.mock('virtual:pwa-register', () => ({ registerSW: () => async () => {} }))
const { canReloadNow, STARTUP_WINDOW_MS } = await import('./pwa')

describe('canReloadNow', () => {
  it('켠 직후에는 새로고침한다', () => {
    expect(canReloadNow(0, 3_000, false)).toBe(true)
  })
  it('켠 지 오래되면 쓰는 중이라 건드리지 않는다', () => {
    expect(canReloadNow(0, STARTUP_WINDOW_MS + 1, false)).toBe(false)
  })
  it('켠 직후라도 입력 칸에 치던 글자가 있으면 미룬다', () => {
    expect(canReloadNow(0, 1_000, true)).toBe(false)
  })
})
