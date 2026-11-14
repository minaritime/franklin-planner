import { App, Card, Col, Grid, Modal, Row, Typography, type InputRef } from 'antd'
import { useCallback, useMemo, useRef, useState } from 'react'
import AgendaView from '../components/calendar/AgendaView'
import { applyMove, applyResize } from '../components/calendar/applyDrop'
import CalendarToolbar from '../components/calendar/CalendarToolbar'
import CategoryBar from '../components/calendar/CategoryBar'
import DeadlineCard from '../components/calendar/DeadlineCard'
import { dragPreview } from '../components/calendar/dragPreview'
import { formatMinutes } from '../components/calendar/gridMetrics'
import ItemDrawer, { type DrawerState } from '../components/calendar/ItemDrawer'
import MonthView from '../components/calendar/MonthView'
import TimeGridView from '../components/calendar/TimeGridView'
import { useCalendarDrag, type DragState } from '../components/calendar/useCalendarDrag'
import { SHORTCUT_LINES, useCalendarKeys } from '../components/calendar/useCalendarKeys'
import { useScopeAsk } from '../components/calendar/useScopeAsk'
import {
  buildItems,
  NO_CATEGORY,
  rangeFor,
  stepDate,
  titleFor,
  weeksOfMonth,
  type CalItem,
  type CalView,
  type WeekStart,
} from '../data/calendarItems'
import { addDays } from '../data/logic'
import { undo, usePlanner } from '../data/store'
import { isStringArray, isWeekStart, PREF_KEYS, usePref } from '../hooks/usePref'
import { navigate } from '../hooks/useHashRoute'
import { useToday } from '../hooks/useToday'

interface CalendarPageProps {
  readonly view?: CalView
  readonly date?: string
}

const go = (view: CalView, date: string): void => navigate({ page: 'calendar', view, date })

export default function CalendarPage({ view: routeView, date: routeDate }: CalendarPageProps) {
  const data = usePlanner()
  const today = useToday()
  const { message } = App.useApp()
  const isWide = Grid.useBreakpoint().md ?? true
  const view: CalView = routeView ?? (isWide ? 'month' : 'agenda')
  const date = routeDate ?? today

  const [hiddenList, setHiddenList] = usePref<string[]>(PREF_KEYS.hiddenCategories, [], isStringArray)
  const [weekStart, setWeekStart] = usePref<WeekStart>(PREF_KEYS.weekStart, 0, isWeekStart)
  const [query, setQuery] = useState('')
  const [drawer, setDrawer] = useState<DrawerState | null>(null)
  const [keysOpen, setKeysOpen] = useState(false)
  const searchRef = useRef<InputRef>(null)
  const [askScope, scopeDialog] = useScopeAsk()

  const hidden = useMemo(() => new Set(hiddenList), [hiddenList])
  const range = useMemo(() => rangeFor(view, date, weekStart), [view, date, weekStart])
  const items = useMemo(() => buildItems(data, range.from, range.to, { hidden, query }), [data, range, hidden, query])
  const counts = useMemo(() => {
    const all = buildItems(data, range.from, range.to, { hidden: new Set(), query: '' })
    return all.reduce((m, i) => m.set(i.categoryId ?? NO_CATEGORY, (m.get(i.categoryId ?? NO_CATEGORY) ?? 0) + 1), new Map<string, number>())
  }, [data, range])

  const onDrop = useCallback(
    (s: DragState) => {
      const to = dragPreview(s)
      if (!to) return
      const ask = () => askScope('change')
      if (s.mode === 'create') {
        setDrawer({ mode: 'create', draft: { kind: 'event', date: to.date, start: formatMinutes(to.start!), end: formatMinutes(to.end!) } })
      } else if (s.item && s.mode === 'resize') void applyResize(s.item, to, ask)
      else if (s.item) void applyMove(s.item, to, view === 'month', ask)
    },
    [askScope, view],
  )
  const drag = useCalendarDrag(onDrop)

  const openItem = (item: CalItem): void => {
    if (!drag.consumeClick()) setDrawer({ mode: 'view', item })
  }
  const createAt = (d: string, allDay = false): void => {
    if (!drag.consumeClick()) setDrawer({ mode: 'create', draft: { kind: allDay ? 'event' : 'task', date: d, allDay } })
  }
  const toggleCategory = (key: string): void =>
    setHiddenList(hidden.has(key) ? hiddenList.filter((k) => k !== key) : [...hiddenList, key])

  useCalendarKeys({
    onToday: () => go(view, today),
    onStep: (dir) => go(view, stepDate(view, date, dir)),
    onView: (v) => go(v, date),
    onNew: () => createAt(view === 'month' ? today : date),
    onSearch: () => searchRef.current?.focus(),
    onUndo: () => (undo() ? message.success('되돌렸습니다') : message.info('되돌릴 것이 없습니다')),
    onHelp: () => setKeysOpen(true),
  })

  const days = view === 'day' ? [date] : Array.from({ length: 7 }, (_, i) => addDays(range.from, i))
  const dragLabel = drag.drag && drag.drag.mode !== 'create' ? dragPreview(drag.drag) : null

  return (
    <>
      <CalendarToolbar
        title={titleFor(view, date, weekStart)}
        view={view}
        query={query}
        searchRef={searchRef}
        weekStart={weekStart}
        onToday={() => go(view, today)}
        onStep={(dir) => go(view, stepDate(view, date, dir))}
        onView={(v) => go(v, date)}
        onQuery={setQuery}
        onNew={() => createAt(view === 'month' ? today : date)}
        onToggleWeekStart={() => setWeekStart(weekStart === 0 ? 1 : 0)}
        onShowKeys={() => setKeysOpen(true)}
      />
      <CategoryBar categories={data.categories} hidden={hidden} counts={counts} onToggle={toggleCategory} />
      <Row gutter={[24, 16]}>
        <Col xs={24} xl={18}>
          <Card styles={{ body: { padding: 0 } }} style={{ position: 'relative' }}>
            {dragLabel && (
              <div className="num" role="status" style={{ position: 'absolute', top: -30, right: 0, fontSize: 13 }}>
                옮길 곳: {dragLabel.date}
                {dragLabel.start !== undefined ? ` ${formatMinutes(dragLabel.start)}` : ''}
              </div>
            )}
            {view === 'month' && (
              <MonthView
                weeks={weeksOfMonth(date, weekStart)}
                month={date.slice(0, 7)}
                today={today}
                items={items}
                categories={data.categories}
                compact={!isWide}
                drag={drag}
                onOpenItem={openItem}
                onOpenDay={(d) => go('day', d)}
                onCreate={(d) => createAt(d)}
              />
            )}
            {(view === 'week' || view === 'day') && (
              <TimeGridView
                days={days}
                today={today}
                items={items}
                categories={data.categories}
                drag={drag}
                onOpenItem={openItem}
                onOpenDay={(d) => go('day', d)}
                onCreateAllDay={(d) => createAt(d, true)}
              />
            )}
            {view === 'agenda' && (
              <AgendaView from={range.from} to={range.to} today={today} items={items} categories={data.categories} onOpenItem={openItem} />
            )}
          </Card>
        </Col>
        <Col xs={24} xl={6}>
          <DeadlineCard tasks={data.tasks} today={today} onOpen={(item) => setDrawer({ mode: 'view', item })} />
        </Col>
      </Row>
      <ItemDrawer state={drawer} today={today} onChange={setDrawer} onOpenDay={(d) => navigate({ page: 'day', date: d })} />
      <Modal open={keysOpen} title="달력 단축키" footer={null} onCancel={() => setKeysOpen(false)} width={420}>
        {SHORTCUT_LINES.map((line) => (
          <Typography.Paragraph key={line} style={{ marginBottom: 4 }}>
            {line}
          </Typography.Paragraph>
        ))}
      </Modal>
      {scopeDialog}
    </>
  )
}
