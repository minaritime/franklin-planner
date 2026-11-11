import { Badge, Typography } from 'antd'
import dayjs from 'dayjs'
import type { SyncState } from '../sync/status'

interface SyncBadgeProps {
  readonly sync: SyncState
}

type BadgeStatus = 'success' | 'processing' | 'default' | 'error' | 'warning'

function describe(sync: SyncState): { status: BadgeStatus; text: string } | null {
  switch (sync.phase) {
    case 'synced':
      return { status: 'success', text: sync.lastSyncedAt ? `동기화됨 ${dayjs(sync.lastSyncedAt).format('HH:mm')}` : '동기화됨' }
    case 'saving':
      return { status: 'processing', text: '저장 중' }
    case 'connecting':
      return { status: 'default', text: '연결 중' }
    case 'error':
      return { status: 'error', text: '동기화 오류' }
    case 'signedOut':
      return { status: 'warning', text: '이 기기에만 저장' }
    default:
      return null
  }
}

export default function SyncBadge({ sync }: SyncBadgeProps) {
  const info = describe(sync)
  if (!info) return null
  return (
    <Badge
      status={info.status}
      text={
        <Typography.Text type="secondary" className="num" style={{ fontSize: 12 }}>
          {info.text}
        </Typography.Text>
      }
    />
  )
}
