import { Button, DatePicker, Flex, Form, Input, Modal, Segmented } from 'antd'
import type dayjs from 'dayjs'
import { useEffect } from 'react'
import { removeGoal, saveGoal } from '../data/actions'
import type { Goal, GoalKind } from '../data/types'
import { fromDayjs, toDayjs } from '../utils/format'

export type GoalDraft = { readonly goal: Goal } | { readonly kind: GoalKind }

interface GoalFormProps {
  readonly draft: GoalDraft | null
  readonly onClose: () => void
}

interface FormValues {
  kind: GoalKind
  title: string
  description?: string
  targetDate?: dayjs.Dayjs | null
}

const KIND_OPTIONS = [
  { value: 'goal', label: '장기 목표' },
  { value: 'value', label: '가치' },
]

export default function GoalForm({ draft, onClose }: GoalFormProps) {
  const [form] = Form.useForm<FormValues>()
  const kind = Form.useWatch('kind', form)
  const existing = draft && 'goal' in draft ? draft.goal : null

  useEffect(() => {
    if (!draft) return
    form.setFieldsValue({
      kind: existing?.kind ?? ('kind' in draft ? draft.kind : 'goal'),
      title: existing?.title ?? '',
      description: existing?.description ?? '',
      targetDate: toDayjs(existing?.targetDate) ?? null,
    })
  }, [draft, existing, form])

  async function submit(): Promise<void> {
    const v = await form.validateFields()
    saveGoal(existing?.id ?? null, {
      kind: v.kind,
      title: v.title.trim(),
      description: (v.description ?? '').trim(),
      targetDate: v.kind === 'goal' ? fromDayjs(v.targetDate) : undefined,
    })
    onClose()
  }

  return (
    <Modal
      open={draft !== null}
      title={existing ? '수정' : kind === 'value' ? '가치 추가' : '목표 추가'}
      footer={null}
      onCancel={onClose}
      destroyOnHidden
      width={480}
    >
      <Form form={form} layout="vertical" requiredMark={false} style={{ marginTop: 16 }}>
        <Form.Item name="kind" label="종류">
          <Segmented block options={KIND_OPTIONS} />
        </Form.Item>
        <Form.Item name="title" label={kind === 'value' ? '가치' : '목표'} rules={[{ required: true, whitespace: true, message: '내용을 적어주세요' }]}>
          <Input
            autoFocus
            maxLength={120}
            onPressEnter={(e) => {
              if (!e.nativeEvent.isComposing) void submit()
            }}
          />
        </Form.Item>
        {kind !== 'value' && (
          <Form.Item name="targetDate" label="목표일">
            <DatePicker placeholder="없음" style={{ width: '100%' }} />
          </Form.Item>
        )}
        <Form.Item name="description" label="설명" style={{ marginBottom: 0 }}>
          <Input.TextArea autoSize={{ minRows: 2, maxRows: 6 }} maxLength={2000} />
        </Form.Item>
      </Form>
      <Flex justify="space-between" style={{ marginTop: 24 }}>
        {existing ? (
          <Button
            danger
            onClick={() => {
              removeGoal(existing.id)
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
