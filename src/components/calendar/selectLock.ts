/** 끄는 동안 화면 글자가 파랗게 선택되지 않게 막는다 */
export function lockTextSelect(locked: boolean): void {
  document.documentElement.classList.toggle('drag-no-select', locked)
  if (locked) window.getSelection()?.removeAllRanges()
}
