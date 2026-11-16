import { describe, expect, it } from 'vitest'
import { createSpan, dragSpan, dropSpan, type DragInput } from './timelineDrag'

const base: Omit<DragInput, 'mode' | 'current'> = { anchor: 600, start: 600, end: 660, min: 480, max: 1320 }

describe('createSpan', () => {
  it('그냥 누르면 1시간', () => {
    expect(createSpan(540, 540)).toEqual({ start: 540, end: 600 })
  })
  it('위로 끌어도 순서를 맞춘다', () => {
    expect(createSpan(600, 540)).toEqual({ start: 540, end: 600 })
  })
})

describe('dragSpan', () => {
  it('옮기면 길이는 그대로', () => {
    expect(dragSpan({ ...base, mode: 'move', current: 690 })).toEqual({ start: 690, end: 750 })
  })
  it('옮길 때 일정표 끝을 넘지 않는다', () => {
    expect(dragSpan({ ...base, mode: 'move', current: 1400 })).toEqual({ start: 1260, end: 1320 })
    expect(dragSpan({ ...base, mode: 'move', current: 100 })).toEqual({ start: 480, end: 540 })
  })
  it('위 끝을 끌면 시작만 바뀐다', () => {
    expect(dragSpan({ ...base, mode: 'resize-start', current: 540 })).toEqual({ start: 540, end: 660 })
  })
  it('위 끝은 끝 시각 15분 전까지만 내려간다', () => {
    expect(dragSpan({ ...base, mode: 'resize-start', current: 700 })).toEqual({ start: 645, end: 660 })
  })
  it('아래 끝을 끌면 끝만 바뀐다', () => {
    expect(dragSpan({ ...base, mode: 'resize-end', current: 720 })).toEqual({ start: 600, end: 720 })
  })
  it('아래 끝은 시작 15분 뒤보다 위로 못 간다', () => {
    expect(dragSpan({ ...base, mode: 'resize-end', current: 500 })).toEqual({ start: 600, end: 615 })
  })
})

describe('dropSpan', () => {
  it('시간 없던 할일은 1시간', () => {
    expect(dropSpan(780)).toEqual({ start: 780, end: 840 })
  })
  it('시간 있던 할일은 그 길이를 지킨다', () => {
    expect(dropSpan(780, 30)).toEqual({ start: 780, end: 810 })
  })
  it('하루 끝을 넘지 않게 앞당긴다', () => {
    expect(dropSpan(1410)).toEqual({ start: 1379, end: 1439 })
  })
})
