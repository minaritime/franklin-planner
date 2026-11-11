import { DatePicker, Form, Input, Modal, Segmented, Select } from 'antd'
import type dayjs from 'dayjs'
import { useEffect } from 'react'
import { addTask, editTask, type TaskInput } from '../data/actions'
import { liveGoals } from '../data/logic'
import { usePlanner } from '../data/store'
import type { Priority, Task } from '../data/types'
import { fromDayjs, toDayjs } from '../utils/format'

interface TaskFormProps {
  readonly open: boolean
  /** 고칠 할일. 없으면 새로 만든다 */
  readonly task: Task | null
  readonly defaultDate: string
  readonly onClose: () => void
}

interface FormValues {
  title: string
  priority: Priority
  date: dayjs.Dayjs
  dueDate?: dayjs.Dayjs | null
  goalId?: string
  note?: string
}

export const PRIORITY_OPTIONS = [
  { value: 'A', label: 'A 반드시' },
  { value: 'B', label: 'B 중요' },
  { value: 'C', label: 'C 여유되면' },
]

export default function TaskForm({ open, task, defaultDate, onClose }: TaskFormProps) {
  const [form] = Form.useForm<FormValues>()
  const { goals } = usePlanner()
  const date = Form.useWatch('date', form)

  useEffect(() => {
    if (!open) return
    form.setFieldsValue({
      title: task?.title ?? '',
      priority: task?.priority ?? 'B',
      date: toDayjs(task?.date ?? defaultDate),
      dueDate: toDayjs(task?.dueDate) ?? null,
      goalId: task?.goalId,
      note: task?.note ?? '',
    })
  }, [open, task, defaultDate, form])

  async function submit(): Promise<void> {
    const v = await form.validateFields()
    const input: TaskInput = {
      title: v.title.trim(),
      note: (v.note ?? '').trim(),
      priority: v.priority,
      date: fromDayjs(v.date) ?? defaultDate,
      dueDate: fromDayjs(v.dueDate),
      goalId: v.goalId,
    }
    if (task) editTask(task.id, input)
    else addTask(input)
    onClose()
  }

  return (
    <Modal
      open={open}
      title={task ? '할일 수정' : '할일 추가'}
      okText="저장"
      cancelText="취소"
      onOk={submit}
      onCancel={onClose}
      destroyOnHidden
      width={480}
    >
      <Form form={form} layout="vertical" requiredMark={false} style={{ marginTop: 16 }}>
        <Form.Item name="title" label="할일" rules={[{ required: true, whitespace: true, message: '할일을 적어주세요' }]}>
          <Input autoFocus maxLength={200} onPressEnter={submit} />
        </Form.Item>
        <Form.Item name="priority" label="우선순위">
          <Segmented block options={PRIORITY_OPTIONS} />
        </Form.Item>
        <div style={{ display: 'flex', gap: 16 }}>
          <Form.Item name="date" label="하는 날" style={{ flex: 1 }} rules={[{ required: true, message: '날짜를 골라주세요' }]}>
            <DatePicker allowClear={false} style={{ width: '100%' }} />
          </Form.Item>
          <Form.Item
            name="dueDate"
            label="마감일"
            style={{ flex: 1 }}
            rules={[
              {
                validator: (_, value: dayjs.Dayjs | null) =>
                  !value || !date || !value.isBefore(date, 'day')
                    ? Promise.resolve()
                    : Promise.reject(new Error('하는 날보다 앞설 수 없습니다')),
              },
            ]}
          >
            <DatePicker
              placeholder="없음"
              style={{ width: '100%' }}
              disabledDate={(d) => (date ? d.isBefore(date, 'day') : false)}
            />
          </Form.Item>
        </div>
        <Form.Item name="goalId" label="목표">
          <Select
            allowClear
            placeholder="없음"
            options={liveGoals(goals).map((g) => ({ value: g.id, label: g.title }))}
          />
        </Form.Item>
        <Form.Item name="note" label="메모" style={{ marginBottom: 0 }}>
          <Input.TextArea autoSize={{ minRows: 2, maxRows: 6 }} maxLength={2000} />
        </Form.Item>
      </Form>
    </Modal>
  )
}
