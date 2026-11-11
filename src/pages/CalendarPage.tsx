import { Card, Empty, Typography } from 'antd'

export default function CalendarPage() {
  return (
    <>
      <Typography.Title level={4} style={{ margin: '0 0 24px' }}>
        달력
      </Typography.Title>
      <Card>
        <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="준비 중" />
      </Card>
    </>
  )
}
