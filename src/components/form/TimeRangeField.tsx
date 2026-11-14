import { Button, Flex, TimePicker } from 'antd'
import dayjs from 'dayjs'

export type TimeRange = [dayjs.Dayjs, dayjs.Dayjs]

interface TimeRangeFieldProps {
  readonly value?: TimeRange | null
  readonly onChange?: (value: TimeRange | null) => void
  readonly disabled?: boolean
}

export const TIME_FMT = 'HH:mm'
const LENGTHS = [30, 60, 90]
const DEFAULT_START = 9

/** 시작·끝 시각과 '30분·60분·90분' 길이 버튼 */
export default function TimeRangeField({ value, onChange, disabled }: TimeRangeFieldProps) {
  const setLength = (minutes: number): void => {
    const start = value?.[0] ?? dayjs().hour(DEFAULT_START).minute(0)
    const end = start.add(minutes, 'minute')
    onChange?.([start, end.isSame(start, 'day') ? end : start.hour(23).minute(59)])
  }
  return (
    <Flex vertical gap={8}>
      <TimePicker.RangePicker
        value={value ?? null}
        onChange={(v) => onChange?.(v && v[0] && v[1] ? [v[0], v[1]] : null)}
        format={TIME_FMT}
        minuteStep={5}
        needConfirm={false}
        disabled={disabled}
        placeholder={['시작', '끝']}
        style={{ width: '100%' }}
      />
      <Flex gap={8}>
        {LENGTHS.map((m) => (
          <Button key={m} size="small" disabled={disabled} onClick={() => setLength(m)}>
            {m}분
          </Button>
        ))}
      </Flex>
    </Flex>
  )
}

export const validRange = (_: unknown, v: TimeRange | null | undefined): Promise<void> =>
  !v || v[1].isAfter(v[0]) ? Promise.resolve() : Promise.reject(new Error('끝나는 시간이 더 늦어야 합니다'))
