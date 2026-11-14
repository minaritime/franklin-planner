import { Form, Modal } from 'antd'
import { useEffect } from 'react'
import { addTask, editTask } from '../data/actions'
import type { Task } from '../data/types'
import TaskFormFields, { taskInitialValues, toTaskInput, type TaskFormValues } from './form/TaskFormFields'

interface TaskFormProps {
  readonly open: boolean
  /** 고칠 할일. 없으면 새로 만든다 */
  readonly task: Task | null
  readonly defaultDate: string
  readonly onClose: () => void
}

/** 하루 화면의 할일 창 (장기 할일 추가·할일 수정) */
export default function TaskForm({ open, task, defaultDate, onClose }: TaskFormProps) {
  const [form] = Form.useForm<TaskFormValues>()

  useEffect(() => {
    if (open) form.setFieldsValue(taskInitialValues(task, { date: defaultDate }))
  }, [open, task, defaultDate, form])

  async function submit(): Promise<void> {
    const input = toTaskInput(await form.validateFields(), defaultDate)
    if (task) editTask(task.id, input)
    else addTask(input)
    onClose()
  }

  return (
    <Modal
      open={open}
      title={task ? '할일 수정' : '장기 할일 추가'}
      okText="저장"
      cancelText="취소"
      onOk={submit}
      onCancel={onClose}
      destroyOnHidden
      width={480}
    >
      <Form form={form} layout="vertical" requiredMark={false} style={{ marginTop: 16 }}>
        <TaskFormFields form={form} requireDue={task === null} onSubmit={() => void submit()} />
      </Form>
    </Modal>
  )
}
