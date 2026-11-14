import { addDays } from '../../data/logic'
import type { Goal, PlannerData, Task } from '../../data/types'
import type { Route } from '../../hooks/useHashRoute'

const GOAL_ID = 'sample-goal'
const WORK = 'sample-cat-work'
const ME = 'sample-cat-me'

function task(id: string, fields: Partial<Task> & Pick<Task, 'title' | 'priority' | 'order' | 'date'>): Task {
  return { id: `sample-${id}`, note: '', status: 'todo', updatedAt: 0, ...fields }
}

/**
 * 사용 설명서를 켠 동안만 화면에 보여 줄 예시. 저장소에는 절대 넣지 않는다.
 * day 를 기준으로 만들어, 설명서의 모든 항목(상태 기호 네 가지, 시간 붙은 할일, 장기 할일, 못 끝낸 할일 등)이 화면에 나오게 한다.
 */
export function buildSampleData(day: string): PlannerData {
  const yesterday = addDays(day, -1)
  const tomorrow = addDays(day, 1)

  const tasks: Task[] = [
    task('a1', { title: '학부모 상담', priority: 'A', order: 1, date: day, startTime: '15:00', endTime: '16:00', categoryId: WORK }),
    task('a2', { title: '중간고사 문제 검토', priority: 'A', order: 2, date: day, status: 'done' }),
    task('b1', { title: '체험 수업 안내문 만들기', priority: 'B', order: 1, date: day, goalId: GOAL_ID, dueDate: addDays(day, 2) }),
    task('b2', { title: '교재 주문', priority: 'B', order: 2, date: day, status: 'delegated', delegatedTo: '김선생' }),
    task('c1', { title: '책상 정리', priority: 'C', order: 1, date: day, status: 'forwarded', forwardedTo: tomorrow }),
    task('c2', { title: '보강 일정 잡기', priority: 'C', order: 2, date: day, status: 'cancelled' }),
    task('c1-next', { title: '책상 정리', priority: 'C', order: 1, date: tomorrow, forwardedFrom: day }),
    task('late', { title: '성적표 정리', priority: 'B', order: 1, date: yesterday }),
    task('long', {
      title: '기말 문제 만들기',
      categoryId: WORK,
      priority: 'A',
      order: 1,
      date: addDays(day, -2),
      startDate: addDays(day, -2),
      dueDate: addDays(day, 4),
    }),
    task('blog1', { title: '블로그 글 올리기', priority: 'B', order: 1, date: addDays(day, -3), status: 'done', goalId: GOAL_ID }),
    task('blog2', { title: '학원 소개 사진 찍기', priority: 'C', order: 1, date: addDays(day, -5), status: 'done', goalId: GOAL_ID }),
  ]

  const goals: Goal[] = [
    {
      id: GOAL_ID,
      kind: 'goal',
      title: '올해 안에 학생 50명',
      description: '체험 수업과 블로그로 알리기',
      targetDate: `${day.slice(0, 4)}-12-31`,
      updatedAt: 0,
    },
    { id: 'sample-value', kind: 'value', title: '학생이 스스로 공부하는 힘', description: '답을 알려 주기보다 묻기', updatedAt: 0 },
  ]

  return {
    version: 1,
    tasks,
    events: [
      { id: 'sample-e1', date: day, start: '10:00', end: '12:00', title: '오전 수업', categoryId: WORK, updatedAt: 0 },
      { id: 'sample-e2', date: day, start: '13:00', end: '14:00', title: '점심 약속', categoryId: ME, updatedAt: 0 },
      {
        id: 'sample-e3',
        date: addDays(day, -7),
        start: '18:00',
        end: '19:00',
        title: '선생님 회의',
        categoryId: WORK,
        repeat: { freq: 'weekly' },
        updatedAt: 0,
      },
    ],
    notes: [{ date: day, text: '상담 때 수학 진도 질문이 많았음', updatedAt: 0 }],
    goals,
    categories: [
      { id: WORK, name: '학원', color: 'blue', order: 1, updatedAt: 0 },
      { id: ME, name: '개인', color: 'green', order: 2, updatedAt: 0 },
    ],
  }
}

/** 예시를 어느 날 기준으로 만들지. 지금 보고 있는 날(달)에 맞춰야 화면에 예시가 보인다 */
export function sampleAnchor(route: Route, today: string): string {
  if (route.page === 'day') return route.date
  if (route.page === 'calendar' && route.date) {
    const month = route.date.slice(0, 7)
    if (route.view !== 'month') return route.date
    return month === today.slice(0, 7) ? today : `${month}-15`
  }
  return today
}
