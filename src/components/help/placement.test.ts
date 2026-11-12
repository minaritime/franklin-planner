import { describe, expect, it } from 'vitest'
import { placeCallout, unionRect } from './placement'

const VIEW = { width: 1200, height: 800 }
const CARD = { width: 320, height: 160 }

describe('placeCallout', () => {
  it('좁은 상자는 오른쪽에 자리가 있으면 오른쪽에 둔다', () => {
    const p = placeCallout({ left: 100, top: 100, width: 40, height: 20 }, CARD, VIEW)
    expect(p).toEqual({ left: 152, top: 100 })
  })

  it('오른쪽이 모자라면 왼쪽에 둔다', () => {
    const p = placeCallout({ left: 1000, top: 100, width: 100, height: 20 }, CARD, VIEW)
    expect(p.left).toBe(1000 - 12 - 320)
  })

  it('넓은 상자는 아래에 먼저 둔다', () => {
    const p = placeCallout({ left: 50, top: 100, width: 900, height: 60 }, CARD, VIEW)
    expect(p).toEqual({ left: 50, top: 172 })
  })

  it('아래가 모자라면 위에 둔다', () => {
    const p = placeCallout({ left: 50, top: 600, width: 900, height: 150 }, CARD, VIEW)
    expect(p.top).toBe(600 - 12 - 160)
  })

  it('어디에도 안 맞으면 화면 아래 가운데에 둔다', () => {
    const p = placeCallout({ left: 0, top: 0, width: 1200, height: 800 }, CARD, VIEW)
    expect(p).toEqual({ left: 440, top: 800 - 160 - 16 })
  })

  it('카드가 화면 위아래 밖으로 나가지 않게 당긴다', () => {
    const p = placeCallout({ left: 100, top: 760, width: 40, height: 20 }, CARD, VIEW)
    expect(p.top).toBe(800 - 160 - 8)
  })
})

describe('unionRect', () => {
  it('여러 네모를 감싸는 네모를 만든다', () => {
    expect(
      unionRect([
        { left: 10, top: 20, width: 30, height: 10 },
        { left: 60, top: 5, width: 10, height: 50 },
      ]),
    ).toEqual({ left: 10, top: 5, width: 60, height: 50 })
  })

  it('크기 0 인 요소만 있으면 없음으로 본다', () => {
    expect(unionRect([{ left: 0, top: 0, width: 0, height: 0 }])).toBeNull()
  })
})
