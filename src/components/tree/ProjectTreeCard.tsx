import { PlusOutlined } from '@ant-design/icons'
import { Button, Card, Flex, Progress, Tag, theme, Tree, Typography, type TreeDataNode } from 'antd'
import { useMemo } from 'react'
import { dDay, formatDDay } from '../../data/logic'
import { usePlanner } from '../../data/store'
import { buildTaskTree, MAX_TREE_DEPTH, treeProgress, type TaskNode } from '../../data/tree'
import type { Task } from '../../data/types'
import { isStringArrayOrNull, PREF_KEYS, usePref } from '../../hooks/usePref'
import { PRIORITY_COLOR_TOKEN } from '../../theme'

interface ProjectTreeCardProps {
  readonly today: string
  readonly onOpen: (task: Task) => void
  /** parent 가 없으면 새 프로젝트(장기 할일) */
  readonly onAdd: (parent: Task | null) => void
}

interface ProjectDataNode extends TreeDataNode {
  readonly node: TaskNode
  readonly depth: number
}

function toTreeData(nodes: readonly TaskNode[], depth = 1): ProjectDataNode[] {
  return nodes.map((n) => ({
    key: n.task.id,
    title: n.task.title,
    node: n,
    depth,
    children: n.children.length > 0 ? toTreeData(n.children, depth + 1) : undefined,
  }))
}

interface NodeTitleProps {
  readonly data: ProjectDataNode
  readonly today: string
  readonly onAdd: (parent: Task) => void
}

/** 한 줄: 우선순위 · 제목 · (+) / 아래 줄: 날짜 미정 · D-day · 진행 막대 */
function NodeTitle({ data, today, onAdd }: NodeTitleProps) {
  const { token } = theme.useToken()
  const { task, children } = data.node
  const done = task.status === 'done'
  const progress = children.length > 0 ? treeProgress(data.node) : null
  const days = task.dueDate && !done ? dDay(task.dueDate, today) : null

  return (
    <Flex vertical gap={2} style={{ minWidth: 0, padding: '2px 0' }}>
      <Flex align="center" gap={6}>
        <span className="num" style={{ fontWeight: 600, fontSize: 12, color: token[PRIORITY_COLOR_TOKEN[task.priority]] }}>
          {task.priority}
        </span>
        <Typography.Text delete={done} type={done ? 'secondary' : undefined} ellipsis={{ tooltip: task.title }} style={{ flex: 1, minWidth: 0 }}>
          {task.title}
        </Typography.Text>
        {data.depth < MAX_TREE_DEPTH && (
          <Button
            type="text"
            size="small"
            icon={<PlusOutlined />}
            aria-label={`${task.title} 아래에 세부 할일 추가`}
            onClick={(e) => {
              e.stopPropagation()
              onAdd(task)
            }}
          />
        )}
      </Flex>
      {(task.unscheduled || days !== null || progress) && (
        <Flex align="center" gap={8} style={{ fontSize: 12 }}>
          {task.unscheduled && (
            <Tag bordered={false} style={{ marginInlineEnd: 0, fontSize: 11 }}>
              {data.depth === 1 ? '마감 미정' : '날짜 미정'}
            </Tag>
          )}
          {days !== null && (
            <Typography.Text type={days < 0 ? 'danger' : days <= 2 ? 'warning' : 'secondary'} className="num" style={{ fontSize: 12 }}>
              {formatDDay(days)}
            </Typography.Text>
          )}
          {progress && (
            <>
              <Progress
                percent={Math.round((progress.done / progress.total) * 100)}
                size="small"
                showInfo={false}
                aria-label={`${task.title} 진행률`}
                style={{ flex: 1, margin: 0, minWidth: 40 }}
              />
              <Typography.Text type="secondary" className="num" style={{ fontSize: 12 }}>
                {progress.done}/{progress.total}
              </Typography.Text>
            </>
          )}
        </Flex>
      )}
    </Flex>
  )
}

/** 달력 왼쪽 칸: 장기 할일과 그 아래 세부 할일을 접고 펼쳐 본다 */
export default function ProjectTreeCard({ today, onOpen, onAdd }: ProjectTreeCardProps) {
  const { tasks } = usePlanner()
  const roots = useMemo(() => buildTaskTree(tasks), [tasks])
  const treeData = useMemo(() => toTreeData(roots), [roots])
  // 처음에는 뿌리만 펼쳐 둘째 단까지 보이게. 그 뒤로는 펼친 상태를 기억한다
  const [saved, setSaved] = usePref<string[] | null>(PREF_KEYS.projectTreeExpanded, null, isStringArrayOrNull)
  const expanded = saved ?? roots.map((n) => n.task.id)
  // 세부 할일을 더하면 바로 보이게 그 할일을 펼쳐 둔다
  const addUnder = (parent: Task): void => {
    if (!expanded.includes(parent.id)) setSaved([...expanded, parent.id])
    onAdd(parent)
  }

  return (
    <Card
      title="프로젝트"
      extra={<Button type="text" size="small" icon={<PlusOutlined />} aria-label="새 프로젝트" onClick={() => onAdd(null)} />}
      styles={{ body: { padding: '12px 8px' } }}
    >
      {roots.length === 0 ? (
        <Typography.Text type="secondary" style={{ paddingInline: 16 }}>
          프로젝트 없음
        </Typography.Text>
      ) : (
        <Tree<ProjectDataNode>
          showLine
          blockNode
          treeData={treeData}
          expandedKeys={expanded}
          selectedKeys={[]}
          onExpand={(keys) => setSaved(keys.map(String))}
          onSelect={(_, { node }) => onOpen(node.node.task)}
          titleRender={(data) => <NodeTitle data={data} today={today} onAdd={addUnder} />}
          aria-label="프로젝트 트리"
        />
      )}
    </Card>
  )
}
