'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'
import styles from './calendar.module.css'
import admin from '../admin.module.css'

export type CalendarEvent = {
  id: string
  name: string
  date: string
  status: string
  category: string
}

const DAY_NAMES = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']

function DayContents({
  dayNumber,
  events,
  isToday,
}: {
  dayNumber: number
  events: CalendarEvent[]
  isToday: boolean
}) {
  return (
    <>
      <span className={styles.dayNumber} data-today={isToday || undefined}>
        {dayNumber}
      </span>
      {events.slice(0, 3).map((event) => (
        <span key={event.id} className={styles.chip} data-status={event.status}>
          {event.name}
        </span>
      ))}
      {events.length > 3 && (
        <span className={styles.more}>+{events.length - 3} more</span>
      )}
    </>
  )
}

/** Local-time parts of an ISO date, avoiding UTC shifting the day. */
function parts(iso: string) {
  const [y, m, d] = iso.split('-').map(Number)
  return { y, m, d }
}

function todayIso(): string {
  const now = new Date()
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`
}

export function CalendarView({ events }: { events: CalendarEvent[] }) {
  const today = todayIso()
  const initial = parts(today)
  const [year, setYear] = useState(initial.y)
  const [month, setMonth] = useState(initial.m) // 1-12
  const [selected, setSelected] = useState<string | null>(null)

  const byDate = useMemo(() => {
    const map = new Map<string, CalendarEvent[]>()
    for (const event of events) {
      const list = map.get(event.date) ?? []
      list.push(event)
      map.set(event.date, list)
    }
    return map
  }, [events])

  // Monday-first grid. getDay() is Sunday-first, hence the shift.
  const firstWeekday = (new Date(year, month - 1, 1).getDay() + 6) % 7
  const daysInMonth = new Date(year, month, 0).getDate()

  const cells: (string | null)[] = [
    ...Array<null>(firstWeekday).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => {
      const day = String(i + 1).padStart(2, '0')
      return `${year}-${String(month).padStart(2, '0')}-${day}`
    }),
  ]
  while (cells.length % 7 !== 0) cells.push(null)

  const weeks: (string | null)[][] = []
  for (let i = 0; i < cells.length; i += 7) weeks.push(cells.slice(i, i + 7))

  const monthName = new Date(year, month - 1, 1).toLocaleDateString('en-US', {
    month: 'long',
    year: 'numeric',
  })

  function shift(by: number) {
    const next = new Date(year, month - 1 + by, 1)
    setYear(next.getFullYear())
    setMonth(next.getMonth() + 1)
    setSelected(null)
  }

  const selectedEvents = selected ? (byDate.get(selected) ?? []) : []
  const monthCount = cells.filter((c) => c && (byDate.get(c)?.length ?? 0) > 0)
    .length

  return (
    <>
      <div className={admin.pageHead}>
        <h1 className={admin.pageTitle}>Calendar</h1>
        <div className={styles.nav}>
          <button type="button" className={styles.navButton} onClick={() => shift(-1)}>
            ← Previous
          </button>
          <button
            type="button"
            className={styles.navButton}
            onClick={() => {
              const t = parts(today)
              setYear(t.y)
              setMonth(t.m)
              setSelected(null)
            }}
          >
            Today
          </button>
          <button type="button" className={styles.navButton} onClick={() => shift(1)}>
            Next →
          </button>
        </div>
      </div>

      <h2 className={styles.monthName} aria-live="polite">
        {monthName}
        <span className={styles.monthCount}>
          {monthCount === 0
            ? 'nothing booked'
            : `${monthCount} ${monthCount === 1 ? 'day' : 'days'} with orders`}
        </span>
      </h2>

      {/*
        A real table, not a CSS grid with ARIA bolted on. A month view is
        genuinely tabular — seven columns of weekdays crossed with weeks — and
        role="grid" requires row elements between the grid and its cells, which
        a flat CSS grid cannot provide without display:contents tricks that
        screen readers handle inconsistently.
      */}
      <table className={styles.grid}>
        <caption className="visually-hidden">
          Orders due in {monthName}
        </caption>
        <thead>
          <tr>
            {DAY_NAMES.map((name) => (
              <th key={name} scope="col" className={styles.dayName}>
                {name}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {weeks.map((week, weekIndex) => (
            <tr key={weekIndex}>
              {week.map((iso, dayIndex) => {
                if (!iso) {
                  return (
                    <td key={`pad-${dayIndex}`} className={styles.pad} />
                  )
                }
                const dayEvents = byDate.get(iso) ?? []
                const isToday = iso === today
                const isPast = iso < today
                const dayNumber = Number(iso.slice(-2))

                return (
                  <td
                    key={iso}
                    className={styles.cell}
                    data-today={isToday || undefined}
                    data-past={isPast || undefined}
                    data-selected={selected === iso || undefined}
                  >
                    {dayEvents.length > 0 ? (
                      <button
                        type="button"
                        className={styles.day}
                        onClick={() => setSelected(iso)}
                        aria-label={`${dayNumber} ${monthName}, ${dayEvents.length} order${dayEvents.length === 1 ? '' : 's'}`}
                      >
                        <DayContents
                          dayNumber={dayNumber}
                          events={dayEvents}
                          isToday={isToday}
                        />
                      </button>
                    ) : (
                      <div className={styles.day}>
                        <DayContents
                          dayNumber={dayNumber}
                          events={dayEvents}
                          isToday={isToday}
                        />
                      </div>
                    )}
                  </td>
                )
              })}
            </tr>
          ))}
        </tbody>
      </table>

      {selected && selectedEvents.length > 0 && (
        <section className={styles.detail}>
          <h2 className={styles.detailTitle}>
            {new Date(`${selected}T00:00:00`).toLocaleDateString('en-US', {
              weekday: 'long',
              day: 'numeric',
              month: 'long',
            })}
          </h2>
          <div className={admin.list}>
            {selectedEvents.map((event) => (
              <Link
                key={event.id}
                href={`/admin/enquiries/${event.id}`}
                className={admin.row}
              >
                <span className={admin.rowName}>{event.name}</span>
                <span className={admin.rowMeta}>{event.category || '—'}</span>
                <span className={admin.rowMono}>{event.status}</span>
              </Link>
            ))}
          </div>
        </section>
      )}
    </>
  )
}
