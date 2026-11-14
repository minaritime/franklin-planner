import { describe, expect, it } from 'vitest'
import { occursOn } from '../../data/recurrence'
import { overdueTasks, periodTasksOn, tasksForDay } from '../../data/logic'
import { buildSampleData, sampleAnchor } from './sampleData'

const DAY = '2026-11-12'

describe('buildSampleData', () => {
  const data = buildSampleData(DAY)
  const dayTasks = tasksForDay(data.tasks, DAY)

  it('그날 목록에 상태 기호 다섯 가지가 모두 나온다', () => {
    expect(new Set(dayTasks.map((t) => t.status))).toEqual(new Set(['todo', 'done', 'forwarded', 'delegated', 'cancelled']))
  })

  it('A·B·C 우선순위가 모두 있고 시간 붙은 할일이 있다', () => {
    expect(new Set(dayTasks.map((t) => t.priority))).toEqual(new Set(['A', 'B', 'C']))
    expect(dayTasks.some((t) => t.startTime && t.endTime)).toBe(true)
  })

  it('못 끝낸 할일과 진행 중인 장기 할일이 보인다', () => {
    expect(overdueTasks(data.tasks, DAY).length).toBeGreaterThan(0)
    expect(periodTasksOn(data.tasks, DAY).some((t) => t.date !== DAY)).toBe(true)
  })

  it('그날 일정·메모·목표·가치가 있다', () => {
    // 반복 일정은 앞에서 시작해도 그날 한 번 나오면 된다
    expect(data.events.every((e) => occursOn(e, DAY))).toBe(true)
    expect(data.notes[0].date).toBe(DAY)
    expect(new Set(data.goals.map((g) => g.kind))).toEqual(new Set(['goal', 'value']))
  })
})

describe('sampleAnchor', () => {
  it('하루 화면은 보고 있는 날 기준', () => {
    expect(sampleAnchor({ page: 'day', date: '2026-10-01' }, DAY)).toBe('2026-10-01')
  })
  it('다른 달 달력은 그 달 15일 기준, 이번 달이면 오늘', () => {
    expect(sampleAnchor({ page: 'calendar', view: 'month', date: '2027-01-01' }, DAY)).toBe('2027-01-15')
    expect(sampleAnchor({ page: 'calendar', view: 'month', date: '2026-11-01' }, DAY)).toBe(DAY)
    expect(sampleAnchor({ page: 'calendar', view: 'week', date: '2027-02-03' }, DAY)).toBe('2027-02-03')
    expect(sampleAnchor({ page: 'calendar' }, DAY)).toBe(DAY)
  })
  it('목표·설정은 오늘 기준', () => {
    expect(sampleAnchor({ page: 'goals' }, DAY)).toBe(DAY)
  })
})
