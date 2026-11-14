import { Checkbox, DatePicker, Form, Input, Select, type FormInstance } from 'antd'
import dayjs from 'dayjs'
import type { EventFields } from '../../data/eventOps'
import type { QuickEntry } from '../../data/quickParse'
import type { PlanEvent, RepeatFreq } from '../../data/types'
import { fromDayjs, toDayjs } from '../../utils/format'
import CategorySelect from '../calendar/CategorySelect'
import TimeRangeField, { TIME_FMT, validRange, type TimeRange } from './TimeRangeField'

type RepeatChoice = 'none' | RepeatFreq

export interface EventFormValues {
  title: string
  categoryId?: string
  date: dayjs.Dayjs
  endDate?: dayjs.Dayjs | null
  allDay: boolean
  time?: TimeRange | null
  repeat: RepeatChoice
  weekdays?: number[]
  until?: dayjs.Dayjs | null
  place?: string
  note?: string
}

export interface EventDefaults {
  readonly date: string
  readonly start?: string
  readonly end?: string
  readonly allDay?: boolean
  readonly categoryId?: string
}

const REPEAT_OPTIONS: { value: RepeatChoice; label: string }[] = [
  { value: 'none', label: '안 함' },
  { value: 'daily', label: '매일' },
  { value: 'weekly', label: '매주' },
  { value: 'biweekly', label: '격주' },
  { value: 'monthly', label: '매월' },
]
const WEEKDAY_OPTIONS = ['일', '월', '화', '수', '목', '금', '토'].map((label, value) => ({ label, value }))
const DEFAULT_START = '09:00'
const DEFAULT_END = '10:00'

const weekdayOf = (d: dayjs.Dayjs): number => d.day()

/** 고칠 일정이면 그 회차(occDate)의 날짜로 칸을 채운다 */
export function eventInitialValues(event: PlanEvent | null, occDate: string | null, defaults: EventDefaults): EventFormValues {
  const date = occDate ?? event?.date ?? defaults.date
  const span = event?.endDate ? dayjs(event.endDate).diff(dayjs(event.date), 'day') : 0
  const start = event?.start ?? defaults.start
  const end = event?.end ?? defaults.end
  return {
    title: event?.title ?? '',
    categoryId: event ? event.categoryId : defaults.categoryId,
    date: dayjs(date),
    endDate: span > 0 ? dayjs(date).add(span, 'day') : null,
    allDay: event ? event.allDay === true : (defaults.allDay ?? !start),
    time: start && end ? [dayjs(start, TIME_FMT), dayjs(end, TIME_FMT)] : null,
    repeat: event?.repeat?.freq ?? 'none',
    weekdays: event?.repeat?.weekdays ? [...event.repeat.weekdays] : undefined,
    until: toDayjs(event?.repeat?.until) ?? null,
    place: event?.place ?? '',
    note: event?.note ?? '',
  }
}

export function toEventFields(v: EventFormValues): EventFields {
  const date = fromDayjs(v.date)!
  const endDate = fromDayjs(v.endDate)
  const weekly = v.repeat === 'weekly' || v.repeat === 'biweekly'
  return {
    title: v.title.trim(),
    categoryId: v.categoryId,
    date,
    endDate: endDate && endDate > date ? endDate : undefined,
    allDay: v.allDay || undefined,
    start: v.time ? v.time[0].format(TIME_FMT) : DEFAULT_START,
    end: v.time ? v.time[1].format(TIME_FMT) : DEFAULT_END,
    repeat:
      v.repeat === 'none'
        ? undefined
        : {
            freq: v.repeat,
            ...(weekly && v.weekdays && v.weekdays.length > 0 ? { weekdays: [...v.weekdays].sort((a, b) => a - b) } : {}),
            ...(v.until ? { until: fromDayjs(v.until) } : {}),
          },
    place: v.place?.trim() || undefined,
    note: v.note?.trim() || undefined,
  }
}

export function applyQuickToEvent(form: FormInstance<EventFormValues>, entry: QuickEntry): void {
  const timed = entry.start && entry.end
  form.setFieldsValue({
    ...(entry.title ? { title: entry.title } : {}),
    ...(entry.date ? { date: dayjs(entry.date) } : {}),
    endDate: entry.endDate ? dayjs(entry.endDate) : null,
    allDay: entry.allDay || (!timed && entry.date !== undefined),
    ...(timed ? { time: [dayjs(entry.start, TIME_FMT), dayjs(entry.end, TIME_FMT)] as TimeRange } : {}),
    ...(entry.repeat ? { repeat: entry.repeat.freq, weekdays: entry.repeat.weekdays ? [...entry.repeat.weekdays] : undefined } : {}),
  })
}

interface EventFormFieldsProps {
  readonly form: FormInstance<EventFormValues>
  readonly onSubmit: () => void
}

export default function EventFormFields({ form, onSubmit }: EventFormFieldsProps) {
  const date = Form.useWatch('date', form)
  const allDay = Form.useWatch('allDay', form)
  const repeat = Form.useWatch('repeat', form)
  const weekly = repeat === 'weekly' || repeat === 'biweekly'

  return (
    <>
      <div style={{ display: 'flex', gap: 16 }}>
        <Form.Item name="title" label="제목" style={{ flex: 2 }} rules={[{ required: true, whitespace: true, message: '제목을 적어주세요' }]}>
          <Input
            autoFocus
            maxLength={100}
            onPressEnter={(e) => {
              if (!e.nativeEvent.isComposing) onSubmit()
            }}
          />
        </Form.Item>
        <Form.Item name="categoryId" label="분류" style={{ flex: 1, minWidth: 0 }}>
          <CategorySelect />
        </Form.Item>
      </div>
      <div style={{ display: 'flex', gap: 16 }}>
        <Form.Item name="date" label="날짜" style={{ flex: 1 }} rules={[{ required: true, message: '날짜를 골라주세요' }]}>
          <DatePicker allowClear={false} style={{ width: '100%' }} />
        </Form.Item>
        <Form.Item name="endDate" label="끝 날짜 · 여러 날" style={{ flex: 1 }}>
          <DatePicker placeholder="하루" style={{ width: '100%' }} disabledDate={(d) => (date ? !d.isAfter(date, 'day') : false)} />
        </Form.Item>
      </div>
      <Form.Item name="allDay" valuePropName="checked" style={{ marginBottom: 12 }}>
        <Checkbox>종일</Checkbox>
      </Form.Item>
      <Form.Item name="time" label="시간" rules={[{ validator: validRange }]}>
        <TimeRangeField disabled={allDay} />
      </Form.Item>
      <div style={{ display: 'flex', gap: 16 }}>
        <Form.Item name="repeat" label="반복" style={{ flex: 1 }}>
          <Select
            options={REPEAT_OPTIONS}
            onChange={(v: RepeatChoice) => {
              if ((v === 'weekly' || v === 'biweekly') && !form.getFieldValue('weekdays') && date) form.setFieldValue('weekdays', [weekdayOf(date)])
            }}
          />
        </Form.Item>
        <Form.Item name="until" label="반복 끝" style={{ flex: 1 }}>
          <DatePicker placeholder="계속" disabled={repeat === 'none'} style={{ width: '100%' }} disabledDate={(d) => (date ? d.isBefore(date, 'day') : false)} />
        </Form.Item>
      </div>
      {weekly && (
        <Form.Item name="weekdays" label="반복 요일">
          <Checkbox.Group options={WEEKDAY_OPTIONS} />
        </Form.Item>
      )}
      <Form.Item name="place" label="장소">
        <Input maxLength={100} />
      </Form.Item>
      <Form.Item name="note" label="메모" style={{ marginBottom: 0 }}>
        <Input.TextArea autoSize={{ minRows: 3, maxRows: 8 }} maxLength={2000} />
      </Form.Item>
    </>
  )
}
