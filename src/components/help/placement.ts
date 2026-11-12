/** 화면 좌표의 네모 (px) */
export interface Rect {
  readonly left: number
  readonly top: number
  readonly width: number
  readonly height: number
}

export interface Size {
  readonly width: number
  readonly height: number
}

export interface Point {
  readonly left: number
  readonly top: number
}

const GAP = 12
const MARGIN = 8

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), Math.max(min, max))
}

/**
 * 설명 카드를 놓을 자리. 상자를 가리지 않는 쪽을 찾는다.
 * 넓은 상자는 위아래부터, 좁은 상자는 좌우부터 본다. 어디에도 안 맞으면 화면 아래 가운데.
 */
export function placeCallout(box: Rect, card: Size, view: Size): Point {
  const right = box.left + box.width
  const bottom = box.top + box.height
  const sideTop = clamp(box.top, MARGIN, view.height - card.height - MARGIN)
  const flatLeft = clamp(box.left, MARGIN, view.width - card.width - MARGIN)

  const sides: readonly (Point | null)[] = [
    right + GAP + card.width <= view.width - MARGIN ? { left: right + GAP, top: sideTop } : null,
    box.left - GAP - card.width >= MARGIN ? { left: box.left - GAP - card.width, top: sideTop } : null,
  ]
  const flats: readonly (Point | null)[] = [
    bottom + GAP + card.height <= view.height - MARGIN ? { left: flatLeft, top: bottom + GAP } : null,
    box.top - GAP - card.height >= MARGIN ? { left: flatLeft, top: box.top - GAP - card.height } : null,
  ]
  const isWideBox = box.width > view.width / 2
  const order = isWideBox ? [...flats, ...sides] : [...sides, ...flats]
  return (
    order.find((p): p is Point => p !== null) ?? {
      left: Math.max(MARGIN, (view.width - card.width) / 2),
      top: Math.max(MARGIN, view.height - card.height - MARGIN * 2),
    }
  )
}

/** 여러 요소를 전부 감싸는 네모. 안 보이는 요소(크기 0)는 뺀다 */
export function unionRect(rects: readonly Rect[]): Rect | null {
  const visible = rects.filter((r) => r.width > 0 && r.height > 0)
  if (visible.length === 0) return null
  const left = Math.min(...visible.map((r) => r.left))
  const top = Math.min(...visible.map((r) => r.top))
  const right = Math.max(...visible.map((r) => r.left + r.width))
  const bottom = Math.max(...visible.map((r) => r.top + r.height))
  return { left, top, width: right - left, height: bottom - top }
}
