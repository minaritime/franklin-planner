interface Timed {
  readonly start: string
  readonly end: string
}

export const DEFAULT_START_HOUR = 8
export const DEFAULT_END_HOUR = 22

export function toMinutes(time: string): number {
  const [h, m] = time.split(':').map(Number)
  return h * 60 + m
}

export interface HourRange {
  readonly start: number
  readonly end: number
}

/** 기본 8~22시, 그 밖의 일정이 있으면 그만큼 넓힌다 */
export function hourRange(events: readonly Timed[]): HourRange {
  return events.reduce<HourRange>(
    (r, e) => ({
      start: Math.min(r.start, Math.floor(toMinutes(e.start) / 60)),
      end: Math.max(r.end, Math.ceil(toMinutes(e.end) / 60)),
    }),
    { start: DEFAULT_START_HOUR, end: DEFAULT_END_HOUR },
  )
}

export interface PlacedEvent<T extends Timed> {
  readonly event: T
  readonly column: number
  readonly columns: number
}

/** 겹치는 일정끼리 묶어서 나란히 놓을 칸을 정한다 */
export function layoutEvents<T extends Timed>(events: readonly T[]): PlacedEvent<T>[] {
  const sorted = [...events].sort((a, b) => toMinutes(a.start) - toMinutes(b.start) || toMinutes(b.end) - toMinutes(a.end))
  const placed: PlacedEvent<T>[] = []
  let cluster: { event: T; column: number }[] = []
  let clusterEnd = -1
  let columnEnds: number[] = []

  const flush = (): void => {
    const columns = columnEnds.length
    cluster.forEach((c) => placed.push({ ...c, columns }))
    cluster = []
    columnEnds = []
  }

  for (const event of sorted) {
    const start = toMinutes(event.start)
    const end = toMinutes(event.end)
    if (start >= clusterEnd) flush()
    let column = columnEnds.findIndex((e) => e <= start)
    if (column === -1) {
      column = columnEnds.length
      columnEnds = [...columnEnds, end]
    } else {
      columnEnds = columnEnds.map((e, i) => (i === column ? end : e))
    }
    cluster.push({ event, column })
    clusterEnd = Math.max(clusterEnd, end)
  }
  flush()
  return placed
}
