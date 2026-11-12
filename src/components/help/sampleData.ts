import { addDays } from '../../data/logic'
import type { Goal, PlannerData, Task } from '../../data/types'

const GOAL_ID = 'sample-goal'

function task(id: string, fields: Partial<Task> & Pick<Task, 'title' | 'priority' | 'order' | 'date'>): Task {
  return { id: `sample-${id}`, note: '', status: 'todo', updatedAt: 0, ...fields }
}

/** 사용 설명서의 진짜 화면에 채울 예시. 오늘 날짜를 기준으로 만든다 */
export function buildSampleData(today: string): PlannerData {
  const yesterday = addDays(today, -1)
  const tomorrow = addDays(today, 1)

  const tasks: Task[] = [
    task('a1', { title: '학부모 상담', priority: 'A', order: 1, date: today, startTime: '15:00', endTime: '16:00' }),
    task('a2', { title: '중간고사 문제 검토', priority: 'A', order: 2, date: today, status: 'done' }),
    task('b1', { title: '체험 수업 안내문 만들기', priority: 'B', order: 1, date: today, goalId: GOAL_ID, dueDate: addDays(today, 2) }),
    task('b2', { title: '교재 주문', priority: 'B', order: 2, date: today, status: 'delegated', delegatedTo: '김선생' }),
    task('c1', { title: '책상 정리', priority: 'C', order: 1, date: today, status: 'forwarded', forwardedTo: tomorrow }),
    task('c1-next', { title: '책상 정리', priority: 'C', order: 1, date: tomorrow, forwardedFrom: today }),
    task('late', { title: '성적표 정리', priority: 'B', order: 1, date: yesterday }),
    task('long', {
      title: '기말 문제 만들기',
      priority: 'A',
      order: 1,
      date: addDays(today, -2),
      startDate: addDays(today, -2),
      dueDate: addDays(today, 4),
    }),
    task('blog1', { title: '블로그 글 올리기', priority: 'B', order: 1, date: addDays(today, -3), status: 'done', goalId: GOAL_ID }),
    task('blog2', { title: '학원 소개 사진 찍기', priority: 'C', order: 1, date: addDays(today, -5), status: 'done', goalId: GOAL_ID }),
  ]

  const goals: Goal[] = [
    {
      id: GOAL_ID,
      kind: 'goal',
      title: '올해 안에 학생 50명',
      description: '체험 수업과 블로그로 알리기',
      targetDate: `${today.slice(0, 4)}-12-31`,
      updatedAt: 0,
    },
    { id: 'sample-value', kind: 'value', title: '학생이 스스로 공부하는 힘', description: '답을 알려 주기보다 묻기', updatedAt: 0 },
  ]

  return {
    version: 1,
    tasks,
    events: [
      { id: 'sample-e1', date: today, start: '10:00', end: '12:00', title: '오전 수업', updatedAt: 0 },
      { id: 'sample-e2', date: today, start: '13:00', end: '14:00', title: '점심 약속', updatedAt: 0 },
    ],
    notes: [{ date: today, text: '상담 때 수학 진도 질문이 많았음', updatedAt: 0 }],
    goals,
  }
}
