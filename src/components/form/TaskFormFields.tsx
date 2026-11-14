import { DatePicker, Form, Input, Segmented, Select, type FormInstance } from 'antd'
import dayjs from 'dayjs'
import type { TaskInput } from '../../data/actions'
import { liveGoals } from '../../data/logic'
import type { QuickEntry } from '../../data/quickParse'
import { usePlanner } from '../../data/store'
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
  readonly onSubmit: () => void
}

/** 할일 칸들. 하루 화면의 창과 달력의 오른쪽 창이 함께 쓴다 */
export default function TaskFormFields({ form, requireDue, onSubmit }: TaskFormFieldsProps) {
  const { goals } = usePlanner()
  const date = Form.useWatch('date', form)
  const dueDate = Form.useWatch('dueDate', form)

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
