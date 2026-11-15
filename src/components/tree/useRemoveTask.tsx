import { Button, Flex, Modal, Typography } from 'antd'
import { useCallback, useRef, useState, type ReactNode } from 'react'
import { removeTask, type ChildrenOnRemove } from '../../data/actions'
import { usePlanner } from '../../data/store'
import { descendantIds } from '../../data/tree'

interface Asking {
  readonly title: string
  readonly count: number
}

/**
 * 할일 지우기. 세부 할일이 있으면 같이 지울지, 한 단계 위로 올릴지 묻는다.
 * 지웠으면 true, 취소하면 false
 */
export function useRemoveTask(): [(id: string) => Promise<boolean>, ReactNode] {
  const { tasks } = usePlanner()
  const [asking, setAsking] = useState<Asking | null>(null)
  const resolver = useRef<((choice: ChildrenOnRemove | null) => void) | null>(null)

  const remove = useCallback(
    async (id: string): Promise<boolean> => {
      const count = descendantIds(tasks, id).length
      if (count === 0) {
        removeTask(id)
        return true
      }
      const title = tasks.find((t) => t.id === id)?.title ?? ''
      const choice = await new Promise<ChildrenOnRemove | null>((resolve) => {
        resolver.current?.(null)
        resolver.current = resolve
        setAsking({ title, count })
      })
      if (!choice) return false
      removeTask(id, choice)
      return true
    },
    [tasks],
  )

  const finish = (choice: ChildrenOnRemove | null): void => {
    resolver.current?.(choice)
    resolver.current = null
    setAsking(null)
  }

  const element = (
    <Modal open={asking !== null} title="세부 할일이 있어요" footer={null} onCancel={() => finish(null)} width={440} zIndex={1100}>
      <Typography.Paragraph style={{ marginTop: 8 }}>
        "{asking?.title}" 아래에 세부 할일이 <span className="num">{asking?.count}</span>개 있습니다. 같이 지울까요?
      </Typography.Paragraph>
      <Flex justify="flex-end" gap={8} wrap>
        <Button onClick={() => finish(null)}>취소</Button>
        <Button onClick={() => finish('lift')}>세부 할일은 남기기</Button>
        <Button type="primary" danger onClick={() => finish('all')}>
          모두 지우기
        </Button>
      </Flex>
    </Modal>
  )

  return [remove, element]
}
