import { Button, Flex, Form, Input, Modal, TimePicker } from 'antd'
import dayjs from 'dayjs'
import { useEffect } from 'react'
import { removeEvent, saveEvent } from '../data/actions'
import type { PlanEvent } from '../data/types'

export type EventDraft = { readonly event: PlanEvent } | { readonly date: string; readonly hour: number }

interface EventModalProps {
  readonly draft: EventDraft | null
  readonly onClose: () => void
}

interface FormValues {
  title: string
  range: [dayjs.Dayjs, dayjs.Dayjs]
}

const FMT = 'HH:mm'

function initialRange(draft: EventDraft): [dayjs.Dayjs, dayjs.Dayjs] {
  if ('event' in draft) return [dayjs(draft.event.start, FMT), dayjs(draft.event.end, FMT)]
  const start = dayjs().hour(draft.hour).minute(0)
  return [start, start.add(1, 'hour')]
}

export default function EventModal({ draft, onClose }: EventModalProps) {
  const [form] = Form.useForm<FormValues>()
  const existing = draft && 'event' in draft ? draft.event : null

  useEffect(() => {
    if (!draft) return
    form.setFieldsValue({ title: existing?.title ?? '', range: initialRange(draft) })
  }, [draft, existing, form])

  async function submit(): Promise<void> {
    if (!draft) return
    const v = await form.validateFields()
    const date = 'event' in draft ? draft.event.date : draft.date
    saveEvent(existing?.id ?? null, {
      date,
      title: v.title.trim(),
      start: v.range[0].format(FMT),
      end: v.range[1].format(FMT),
    })
    onClose()
  }

  return (
    <Modal open={draft !== null} title={existing ? '일정 수정' : '일정 추가'} footer={null} onCancel={onClose} destroyOnHidden width={400}>
      <Form form={form} layout="vertical" requiredMark={false} style={{ marginTop: 16 }}>
        <Form.Item name="title" label="일정" rules={[{ required: true, whitespace: true, message: '일정을 적어주세요' }]}>
          <Input autoFocus maxLength={100} onPressEnter={submit} />
        </Form.Item>
        <Form.Item
          name="range"
          label="시간"
          rules={[
            { required: true, message: '시간을 골라주세요' },
            {
              validator: (_, v: FormValues['range'] | undefined) =>
                !v || v[1].isAfter(v[0]) ? Promise.resolve() : Promise.reject(new Error('끝나는 시간이 더 늦어야 합니다')),
            },
          ]}
        >
          <TimePicker.RangePicker format={FMT} minuteStep={10} needConfirm={false} style={{ width: '100%' }} />
        </Form.Item>
      </Form>
      <Flex justify="space-between" style={{ marginTop: 8 }}>
        {existing ? (
          <Button
            danger
            onClick={() => {
              removeEvent(existing.id)
              onClose()
            }}
          >
            삭제
          </Button>
        ) : (
          <span />
        )}
        <Flex gap={8}>
          <Button onClick={onClose}>취소</Button>
          <Button type="primary" onClick={submit}>
            저장
          </Button>
        </Flex>
      </Flex>
    </Modal>
  )
}
