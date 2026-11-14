import { Button, Drawer, Flex, Form, Grid, Segmented } from 'antd'
import { useEffect, useRef, useState } from 'react'
import { addEvent, addTask, changeStatus, editTask, removeEvent, removeTask, updateEvent } from '../../data/actions'
import type { CalItem } from '../../data/calendarItems'
import { usePlanner } from '../../data/store'
import { PREF_KEYS, readPref, writePref, isOptionalString } from '../../hooks/usePref'
import EventFormFields, { applyQuickToEvent, eventInitialValues, toEventFields, type EventFormValues } from '../form/EventFormFields'
import QuickLine from '../form/QuickLine'
import TaskFormFields, { applyQuickToTask, taskInitialValues, toTaskInput, type TaskFormValues } from '../form/TaskFormFields'
import ItemDetail from './ItemDetail'
import { useScopeAsk } from './useScopeAsk'

export type ItemKind = 'task' | 'event'

export interface CreateDraft {
  readonly kind: ItemKind
  readonly date: string
  readonly start?: string
  readonly end?: string
  readonly allDay?: boolean
}

export type DrawerState =
  | { readonly mode: 'view'; readonly item: CalItem }
  | { readonly mode: 'edit'; readonly item: CalItem }
  | { readonly mode: 'create'; readonly draft: CreateDraft }

interface ItemDrawerProps {
  readonly state: DrawerState | null
  readonly today: string
  readonly onChange: (state: DrawerState | null) => void
  readonly onOpenDay: (date: string) => void
}

const DRAWER_WIDTH = 560
const KIND_OPTIONS = [
  { value: 'task' as const, label: '할일' },
  { value: 'event' as const, label: '일정' },
]

const lastCategory = (): string | undefined => readPref<string | null>(PREF_KEYS.lastCategory, null, isOptionalString) ?? undefined

function drawerTitle(state: DrawerState): string {
  if (state.mode === 'view') return state.item.title
  if (state.mode === 'edit') return state.item.kind === 'task' ? '할일 수정' : '일정 수정'
  return '새로 만들기'
}

/** 달력 오른쪽에서 열리는 창: 보기 → 수정, 또는 새로 만들기 */
export default function ItemDrawer({ state, today, onChange, onOpenDay }: ItemDrawerProps) {
  const data = usePlanner()
  const isWide = Grid.useBreakpoint().md ?? true
  const [taskForm] = Form.useForm<TaskFormValues>()
  const [eventForm] = Form.useForm<EventFormValues>()
  const [askScope, scopeDialog] = useScopeAsk()
  const [kind, setKind] = useState<ItemKind>('task')
  const saving = useRef(false)

  const item = state && state.mode !== 'create' ? state.item : null
  const task = item?.kind === 'task' ? data.tasks.find((t) => t.id === item.id && !t.deleted) : undefined
  const event = item?.kind === 'event' ? data.events.find((e) => e.id === item.id && !e.deleted) : undefined
  const formKind: ItemKind = state?.mode === 'create' ? kind : (item?.kind ?? 'task')

  // 창을 열 때마다 칸을 새로 채운다
  useEffect(() => {
    if (!state || state.mode === 'view') return
    if (state.mode === 'create') {
      const { draft } = state
      setKind(draft.kind)
      const defaults = { date: draft.date, start: draft.start, end: draft.end, categoryId: lastCategory() }
      taskForm.setFieldsValue(taskInitialValues(null, defaults))
      eventForm.setFieldsValue(eventInitialValues(null, null, { ...defaults, allDay: draft.allDay }))
      return
    }
    // 연 순간의 값이 아니라 저장소의 지금 값으로 채운다 (그사이 동기화로 바뀌었을 수 있다)
    if (state.item.kind === 'task') taskForm.setFieldsValue(taskInitialValues(task ?? state.item.task ?? null, { date: state.item.date }))
    else eventForm.setFieldsValue(eventInitialValues(event ?? state.item.event ?? null, state.item.occDate, { date: state.item.occDate }))
    // 열 때 한 번만 채운다 (저장소가 바뀔 때마다 입력 중인 칸을 덮지 않게)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state])

  const close = (): void => onChange(null)

  // 보고 있던 것이 지워지면(다른 기기, 되돌리기) 창을 닫는다
  const gone = item !== null && (item.kind === 'task' ? task === undefined : event === undefined)
  useEffect(() => {
    if (gone) onChange(null)
  }, [gone, onChange])

  async function save(): Promise<void> {
    // 두 번 눌러도 한 번만 저장한다
    if (!state || state.mode === 'view' || saving.current) return
    saving.current = true
    try {
      await saveOnce(state)
    } catch (error) {
      // 칸 확인에 걸린 것은 antd 가 칸 아래에 알려 준다. 그 밖의 오류는 그대로 올린다
      if (!(typeof error === 'object' && error !== null && 'errorFields' in error)) throw error
    } finally {
      saving.current = false
    }
  }

  async function saveOnce(state: Exclude<DrawerState, { mode: 'view' }>): Promise<void> {
    if (formKind === 'task') {
      const values = await taskForm.validateFields()
      const input = toTaskInput(values, today)
      if (state.mode === 'edit') editTask(state.item.id, input)
      else {
        addTask(input)
        writePref(PREF_KEYS.lastCategory, input.categoryId ?? null)
      }
      close()
      return
    }
    const fields = toEventFields(await eventForm.validateFields())
    if (state.mode === 'create') {
      addEvent(fields)
      writePref(PREF_KEYS.lastCategory, fields.categoryId ?? null)
      close()
      return
    }
    const scope = state.item.recurring ? await askScope('change') : 'all'
    if (!scope) return
    updateEvent(state.item.id, state.item.occDate, fields, scope)
    close()
  }

  async function remove(): Promise<void> {
    if (!item) return
    if (item.kind === 'task') removeTask(item.id)
    else {
      const scope = item.recurring ? await askScope('delete') : 'all'
      if (!scope) return
      removeEvent(item.id, item.occDate, scope)
    }
    close()
  }

  const editing = state !== null && state.mode !== 'view'

  return (
    <Drawer
      open={state !== null}
      title={state ? drawerTitle(state) : ''}
      width={isWide ? DRAWER_WIDTH : '100%'}
      onClose={close}
      destroyOnHidden
      footer={
        editing && (
          <Flex justify="flex-end" gap={8}>
            <Button onClick={() => (state.mode === 'edit' ? onChange({ mode: 'view', item: state.item }) : close())}>취소</Button>
            <Button type="primary" onClick={() => void save()}>
              저장
            </Button>
          </Flex>
        )
      }
    >
      {state?.mode === 'view' && (
        <ItemDetail
          item={state.item}
          task={task}
          event={event}
          categories={data.categories}
          goals={data.goals}
          onEdit={() => onChange({ mode: 'edit', item: state.item })}
          onDelete={() => void remove()}
          onToggleDone={() => task && changeStatus(task.id, task.status === 'done' ? 'todo' : 'done')}
          onOpenDay={() => onOpenDay(task?.date ?? state.item.date)}
        />
      )}
      {editing && (
        <>
          {state.mode === 'create' && (
            <Segmented block options={KIND_OPTIONS} value={kind} onChange={setKind} style={{ marginBottom: 20 }} aria-label="종류" />
          )}
          <QuickLine
            today={today}
            onFill={(entry) => (formKind === 'task' ? applyQuickToTask(taskForm, entry) : applyQuickToEvent(eventForm, entry))}
          />
          {/* 둘 다 붙여 두고 하나만 보인다 (종류를 바꿔도 적던 칸이 남게) */}
          <div style={{ display: formKind === 'task' ? undefined : 'none' }}>
            <Form form={taskForm} layout="vertical" requiredMark={false}>
              {formKind === 'task' && <TaskFormFields form={taskForm} requireDue={false} onSubmit={() => void save()} />}
            </Form>
          </div>
          <div style={{ display: formKind === 'event' ? undefined : 'none' }}>
            <Form form={eventForm} layout="vertical" requiredMark={false}>
              {formKind === 'event' && <EventFormFields form={eventForm} onSubmit={() => void save()} />}
            </Form>
          </div>
        </>
      )}
      {scopeDialog}
    </Drawer>
  )
}
