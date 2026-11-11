import { Card, Empty, Typography } from 'antd'

export default function GoalsPage() {
  return (
    <>
      <Typography.Title level={4} style={{ margin: '0 0 24px' }}>
        목표
      </Typography.Title>
      <Card>
        <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="준비 중" />
      </Card>
    </>
  )
}
