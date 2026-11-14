import { Button, Flex, Modal, Typography } from 'antd'
import { useCallback, useRef, useState, type ReactNode } from 'react'
import type { SeriesScope } from '../../data/eventOps'

type Action = 'change' | 'delete'

const TEXT: Record<Action, string> = {
  change: '이 날짜 하나만 바꿀까요, 반복 전체를 바꿀까요?',
  delete: '이 날짜 하나만 지울까요, 반복 전체를 지울까요?',
}

/** 반복 일정을 바꾸거나 지울 때 범위를 묻는다. 취소하면 null */
export function useScopeAsk(): [(action: Action) => Promise<SeriesScope | null>, ReactNode] {
  const [action, setAction] = useState<Action | null>(null)
  const resolver = useRef<((scope: SeriesScope | null) => void) | null>(null)

  const ask = useCallback(
    (next: Action) =>
      new Promise<SeriesScope | null>((resolve) => {
        resolver.current?.(null)
        resolver.current = resolve
        setAction(next)
      }),
    [],
  )

  const finish = (scope: SeriesScope | null): void => {
    resolver.current?.(scope)
    resolver.current = null
    setAction(null)
  }

  const element = (
    <Modal open={action !== null} title="반복 일정이에요" footer={null} onCancel={() => finish(null)} width={420} zIndex={1100}>
      <Typography.Paragraph style={{ marginTop: 8 }}>{action ? TEXT[action] : ''}</Typography.Paragraph>
      <Flex justify="flex-end" gap={8}>
        <Button onClick={() => finish(null)}>취소</Button>
        <Button onClick={() => finish('one')}>이 일정만</Button>
        <Button type="primary" danger={action === 'delete'} onClick={() => finish('all')}>
          반복 전체
        </Button>
      </Flex>
    </Modal>
  )

  return [ask, element]
}
