import { registerSW } from 'virtual:pwa-register'

/** 켠 뒤 이 시간 안에 새 버전을 찾으면 바로 새로고침한다. 그 뒤에는 쓰는 중이라 건드리지 않는다 */
export const STARTUP_WINDOW_MS = 10_000

/** 지금 새로고침해도 되는지: 켠 직후이고, 입력 칸에 치던 글자가 없을 때만 */
export function canReloadNow(loadedAt: number, now: number, typing: boolean): boolean {
  return now - loadedAt <= STARTUP_WINDOW_MS && !typing
}

/** 지금 누른 입력 칸에 치던 글자가 있는지 */
function isTyping(): boolean {
  const el = document.activeElement
  return (el instanceof HTMLInputElement || el instanceof HTMLTextAreaElement) && el.value !== ''
}

/**
 * 새 버전은 받아서 기다리게 둔다(prompt). 켠 직후에 찾았으면 바로 바꿔 끼우고 새로고침,
 * 아니면 앱을 닫았다 다시 켤 때 저절로 새 버전이 된다. (예전에는 늘 한 번 전 버전이 떴다)
 */
export function startPwa(): void {
  const loadedAt = Date.now()
  const update = registerSW({
    immediate: true,
    onNeedRefresh: () => {
      if (canReloadNow(loadedAt, Date.now(), isTyping())) void update(true)
    },
  })
}
