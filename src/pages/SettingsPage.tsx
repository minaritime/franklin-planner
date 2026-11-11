import { DownloadOutlined, UploadOutlined } from '@ant-design/icons'
import { App, Button, Card, Flex, Typography, Upload } from 'antd'
import { mergeData, todayString } from '../data/logic'
import { getData, parsePlannerData, setData } from '../data/store'

function exportJson(): void {
  const blob = new Blob([JSON.stringify(getData(), null, 2)], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `planner-${todayString()}.json`
  a.click()
  URL.revokeObjectURL(url)
}

export default function SettingsPage() {
  const { message } = App.useApp()

  const importJson = async (file: File): Promise<void> => {
    try {
      const parsed = parsePlannerData(JSON.parse(await file.text()))
      if (!parsed) {
        message.error('플래너 파일 형식이 아닙니다')
        return
      }
      setData((d) => mergeData(d, parsed))
      message.success('가져와서 합쳤습니다')
    } catch {
      message.error('파일을 읽지 못했습니다')
    }
  }

  return (
    <>
      <Typography.Title level={4} style={{ margin: '0 0 24px' }}>
        설정
      </Typography.Title>
      <Flex vertical gap={16} style={{ maxWidth: 640 }}>
        <Card title="동기화">
          <Typography.Text type="secondary">준비 중</Typography.Text>
        </Card>
        <Card title="백업 파일">
          <Flex gap={8} wrap>
            <Button icon={<DownloadOutlined />} onClick={exportJson}>
              내보내기
            </Button>
            <Upload
              accept="application/json,.json"
              showUploadList={false}
              beforeUpload={(file) => {
                void importJson(file)
                return false
              }}
            >
              <Button icon={<UploadOutlined />}>가져오기</Button>
            </Upload>
          </Flex>
        </Card>
      </Flex>
    </>
  )
}
