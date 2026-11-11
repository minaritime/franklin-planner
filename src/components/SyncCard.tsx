import { GoogleOutlined } from '@ant-design/icons'
import { Alert, App, Avatar, Button, Card, Flex, Popconfirm, Spin, Typography } from 'antd'
import { useState } from 'react'
import { signIn, signOutSync } from '../sync'
import { useSyncState } from '../sync/status'
import SyncBadge from './SyncBadge'

export default function SyncCard() {
  const sync = useSyncState()
  const { message } = App.useApp()
  const [busy, setBusy] = useState(false)

  const leave = async (clearDevice: boolean): Promise<void> => {
    setBusy(true)
    try {
      const ok = await signOutSync(clearDevice)
      if (!ok && clearDevice) message.error('아직 계정에 다 올라가지 않아 지우지 않았습니다')
      else if (clearDevice) message.success('로그아웃하고 이 기기의 할일을 지웠습니다')
    } finally {
      setBusy(false)
    }
  }

  const body = (() => {
    switch (sync.phase) {
      case 'unconfigured':
        return <Typography.Text type="secondary">Firebase 설정 전 · 이 기기에만 저장</Typography.Text>
      case 'loading':
        return <Spin size="small" />
      case 'signedOut':
        return (
          <Flex vertical gap={16} align="flex-start">
            <SyncBadge sync={sync} />
            <Button type="primary" icon={<GoogleOutlined />} onClick={() => void signIn()}>
              Google로 로그인
            </Button>
          </Flex>
        )
      default:
        return (
          <Flex vertical gap={16}>
            <Flex gap={16} align="center">
              <Avatar src={sync.user?.photoURL ?? undefined} size={40}>
                {sync.user?.name.slice(0, 1)}
              </Avatar>
              <Flex vertical style={{ minWidth: 0 }}>
                <Typography.Text strong ellipsis>
                  {sync.user?.name}
                </Typography.Text>
                <Typography.Text type="secondary" ellipsis>
                  {sync.user?.email}
                </Typography.Text>
              </Flex>
            </Flex>
            <SyncBadge sync={sync} />
            <Flex gap={8} wrap>
              <Button loading={busy} onClick={() => void leave(false)}>
                로그아웃
              </Button>
              <Popconfirm
                title="이 기기의 할일을 지웁니다"
                description="계정에는 그대로 남습니다"
                okText="지우기"
                cancelText="취소"
                okButtonProps={{ danger: true }}
                onConfirm={() => leave(true)}
              >
                <Button danger loading={busy}>
                  로그아웃하고 이 기기에서 지우기
                </Button>
              </Popconfirm>
            </Flex>
          </Flex>
        )
    }
  })()

  return (
    <Card title="동기화">
      {sync.error && <Alert type="error" showIcon title={sync.error} style={{ marginBottom: 16 }} />}
      {body}
    </Card>
  )
}
