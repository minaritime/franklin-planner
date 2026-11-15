import { Checkbox, DatePicker, Form, Input, Segmented, Select, TreeSelect, type FormInstance } from 'antd'
import { useMemo } from 'react'
import dayjs from 'dayjs'
import type { TaskInput } from '../../data/actions'
import { liveGoals } from '../../data/logic'
import type { QuickEntry } from '../../data/quickParse'
import { usePlanner } from '../../data/store'
import { buildTaskTree, canBeParent, type TaskNode } from '../../data/tree'
import type { Priority, Task } from '../../data/types'
import { fromDayjs, toDayjs } from '../../utils/format'
import CategorySelect from '../calendar/CategorySelect'
import TimeRangeField, { TIME_FMT, validRange, type TimeRange } from './TimeRangeField'

export interface TaskFormValues {
  title: string
  priority: Priority
  categoryId?: string
  date: dayjs.Dayjs
  dueDate?: dayjs.Dayjs | null
  time?: TimeRange | null
  goalId?: string
  parentId?: string
  unscheduled?: boolean
  note?: string
}

export const PRIORITY_OPTIONS = [
  { value: 'A', label: 'A 반드시' },
  { value: 'B', label: 'B 중요' },
  { value: 'C', label: 'C 여유되면' },
]

export interface TaskDefaults {
  readonly date: string
  readonly start?: string
  readonly end?: string
  readonly categoryId?: string
  readonly parentId?: string
  readonly unscheduled?: boolean
}

export function taskInitialValues(task: Task | null, defaults: TaskDefaults): TaskFormValues {
  const start = task?.startTime ?? defaults.start
  const end = task?.endTime ?? defaults.end
  return {
    title: task?.title ?? '',
    priority: task?.priority ?? 'B',
    categoryId: task ? task.categoryId : defaults.categoryId,
    date: toDayjs(task?.date ?? defaults.date)!,
    dueDate: toDayjs(task?.dueDate) ?? null,
    time: start && end ? [dayjs(start, TIME_FMT), dayjs(end, TIME_FMT)] : null,
    goalId: task?.goalId,
    parentId: task ? task.parentId : defaults.parentId,
    unscheduled: task ? task.unscheduled === true : defaults.unscheduled === true,
    note: task?.note ?? '',
  }
}

export function toTaskInput(v: TaskFormValues, fallbackDate: string): TaskInput {
  return {
    title: v.title.trim(),
    note: (v.note ?? '').trim(),
    priority: v.priority,
    categoryId: v.categoryId,
    date: fromDayjs(v.date) ?? fallbackDate,
    dueDate: fromDayjs(v.dueDate),
    startTime: v.time ? v.time[0].format(TIME_FMT) : undefined,
    endTime: v.time ? v.time[1].format(TIME_FMT) : undefined,
    goalId: v.goalId,
    parentId: v.parentId,
    unscheduled: v.unscheduled === true,
  }
}

/** 한 줄 입력에서 읽은 것을 할일 칸에 넣는다. 여러 날이면 마감일로 */
export function applyQuickToTask(form: FormInstance<TaskFormValues>, entry: QuickEntry): void {
  form.setFieldsValue({
    ...(entry.title ? { title: entry.title } : {}),
    ...(entry.date ? { date: dayjs(entry.date) } : {}),
    ...(entry.endDate ? { dueDate: dayjs(entry.endDate) } : {}),
    time: entry.start && entry.end ? [dayjs(entry.start, TIME_FMT), dayjs(entry.end, TIME_FMT)] : null,
  })
}

interface TaskFormFieldsProps {
  readonly form: FormInstance<TaskFormValues>
  /** 새로 만드는 '장기 할일'이면 마감일이 꼭 있어야 한다 */
  readonly requireDue: boolean
  /** 고치는 할일 id (상위 할일 목록에서 자기와 자기 아래를 막는다) */
  readonly taskId?: string
  readonly onSubmit: () => void
}

interface ParentOption {
  readonly value: string
  readonly title: string
  readonly disabled: boolean
  readonly children: ParentOption[]
}

/** 상위 할일로 고를 수 있는 것 = 할일 트리에 있는 할일. 3단을 넘거나 자기 아래면 고를 수 없다 */
function parentOptions(nodes: readonly TaskNode[], tasks: readonly Task[], taskId: string | undefined): ParentOption[] {
  return nodes.map((n) => ({
    value: n.task.id,
    title: n.task.title,
    disabled: !canBeParent(tasks, taskId, n.task),
    children: parentOptions(n.children, tasks, taskId),
  }))
}

/** 할일 칸들. 하루 화면의 창과 달력의 오른쪽 창이 함께 쓴다 */
export default function TaskFormFields({ form, requireDue, taskId, onSubmit }: TaskFormFieldsProps) {
  const { goals, tasks } = usePlanner()
  const date = Form.useWatch('date', form)
  const dueDate = Form.useWatch('dueDate', form)
  const unscheduled = Form.useWatch('unscheduled', form) === true
  const parents = useMemo(() => parentOptions(buildTaskTree(tasks), tasks, taskId), [tasks, taskId])

  return (
    <>
      <Form.Item name="title" label="할일" rules={[{ required: true, whitespace: true, message: '할일을 적어주세요' }]}>
        <Input
          autoFocus
          maxLength={200}
          onPressEnter={(e) => {
            if (!e.nativeEvent.isComposing) onSubmit()
          }}
        />
      </Form.Item>
      <Form.Item name="priority" label="우선순위">
        <Segmented block options={PRIORITY_OPTIONS} />
      </Form.Item>
      <Form.Item name="categoryId" label="분류">
        <CategorySelect />
      </Form.Item>
      <Form.Item name="parentId" label="상위 할일">
        <TreeSelect
          allowClear
          showSearch
          treeDefaultExpandAll
          treeNodeFilterProp="title"
          placeholder="없음"
          treeData={parents}
          notFoundContent="고를 수 있는 할일이 없습니다"
        />
      </Form.Item>
      {/* 새 프로젝트는 마감일을 정하거나 '마감 미정'으로 둔다 (미정이면 날짜도 없이 트리에만 보인다) */}
      <Form.Item name="unscheduled" valuePropName="checked" style={{ marginBottom: unscheduled ? undefined : 8 }}>
        <Checkbox>{requireDue ? '마감 미정' : '날짜 미정'}</Checkbox>
      </Form.Item>
      {!unscheduled && (
        <>
        <div style={{ display: 'flex', gap: 16 }}>
          <Form.Item name="date" label={dueDate ? '시작일' : '날짜'} style={{ flex: 1 }} rules={[{ required: true, message: '날짜를 골라주세요' }]}>
            <DatePicker allowClear={false} style={{ width: '100%' }} />
          </Form.Item>
          <Form.Item
            name="dueDate"
            label="마감일"
            style={{ flex: 1 }}
            rules={[
              { required: requireDue, message: '마감일을 골라주세요' },
              {
                validator: (_, value: dayjs.Dayjs | null) =>
                  !value || !date || !value.isBefore(date, 'day') ? Promise.resolve() : Promise.reject(new Error('하는 날보다 앞설 수 없습니다')),
              },
            ]}
          >
            <DatePicker placeholder="없음" style={{ width: '100%' }} disabledDate={(d) => (date ? d.isBefore(date, 'day') : false)} />
          </Form.Item>
        </div>
        <Form.Item name="time" label="시간" rules={[{ validator: validRange }]}>
          <TimeRangeField />
        </Form.Item>
        </>
      )}
      <Form.Item name="goalId" label="목표">
        <Select
          allowClear
          placeholder="없음"
          options={liveGoals(goals)
            .filter((g) => g.kind === 'goal')
            .map((g) => ({ value: g.id, label: g.title }))}
        />
      </Form.Item>
      <Form.Item name="note" label="메모" style={{ marginBottom: 0 }}>
        <Input.TextArea autoSize={{ minRows: 2, maxRows: 6 }} maxLength={2000} />
      </Form.Item>
    </>
  )
}
