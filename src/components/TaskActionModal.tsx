import { Button, DatePicker, Flex, Input, Modal } from 'antd'
import dayjs from 'dayjs'
import { useState } from 'react'
import { delegate, forward } from '../data/actions'
import { addDays } from '../data/logic'
import type { Task } from '../data/types'
import { fromDayjs } from '../utils/format'

export type TaskAction = { readonly kind: 'forward' | 'delegate'; readonly task: Task }

interface TaskActionModalProps {
  readonly action: TaskAction | null
  readonly onClose: () => void
}

function nextMonday(date: string): string {
  const d = dayjs(date)
  const offset = ((8 - d.day()) % 7) || 7
  return addDays(date, offset)
}

function ForwardBody({ task, onDone }: { task: Task; onDone: () => void }) {
  const [target, setTarget] = useState(addDays(task.date, 1))
  const quick = [
    { label: '내일', date: addDays(task.date, 1) },
    { label: '모레', date: addDays(task.date, 2) },
    { label: '다음 주 월요일', date: nextMonday(task.date) },
  ]
  return (
    <Flex vertical gap={16} style={{ marginTop: 16 }}>
      <Flex gap={8} wrap>
        {quick.map((q) => (
          <Button key={q.label} type={q.date === target ? 'primary' : 'default'} ghost={q.date === target} onClick={() => setTarget(q.date)}>
            {q.label}
          </Button>
        ))}
      </Flex>
      <DatePicker
        value={dayjs(target)}
        allowClear={false}
        disabledDate={(d) => !d.isAfter(dayjs(task.date), 'day')}
        onChange={(v) => setTarget(fromDayjs(v) ?? target)}
      />
      <Flex justify="end" gap={8}>
        <Button onClick={onDone}>취소</Button>
        <Button
          type="primary"
          onClick={() => {
            forward(task.id, target)
            onDone()
          }}
        >
          미루기
        </Button>
      </Flex>
    </Flex>
  )
}

function DelegateBody({ task, onDone }: { task: Task; onDone: () => void }) {
  const [who, setWho] = useState('')
  const submit = (): void => {
    if (!who.trim()) return
    delegate(task.id, who.trim())
    onDone()
  }
  return (
    <Flex vertical gap={16} style={{ marginTop: 16 }}>
      <Input autoFocus placeholder="누구에게" value={who} maxLength={40} onChange={(e) => setWho(e.target.value)} onPressEnter={submit} />
      <Flex justify="end" gap={8}>
        <Button onClick={onDone}>취소</Button>
        <Button type="primary" disabled={!who.trim()} onClick={submit}>
          맡기기
        </Button>
      </Flex>
    </Flex>
  )
}

export default function TaskActionModal({ action, onClose }: TaskActionModalProps) {
  return (
    <Modal
      open={action !== null}
      title={action?.kind === 'forward' ? '다른 날로 미루기' : '맡기기'}
      footer={null}
      onCancel={onClose}
      destroyOnHidden
      width={400}
    >
      {action?.kind === 'forward' && <ForwardBody task={action.task} onDone={onClose} />}
      {action?.kind === 'delegate' && <DelegateBody task={action.task} onDone={onClose} />}
    </Modal>
  )
}
