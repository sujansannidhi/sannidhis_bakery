'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'
import { formatMoney, outstanding, received } from '@/lib/money'
import styles from './accounting.module.css'
import admin from '../admin.module.css'

export type Row = {
  id: string
  name: string
  date: string
  status: string
  category: string
  quotedAmount: number | null
  depositAmount: number | null
  depositPaid: boolean
  finalAmount: number | null
  paidInFull: boolean
}

export function AccountingView({ rows }: { rows: Row[] }) {
  const years = useMemo(() => {
    const set = new Set(rows.map((r) => r.date.slice(0, 4)).filter(Boolean))
    return [...set].sort().reverse()
  }, [rows])

  const [year, setYear] = useState<string>(years[0] ?? '')

  const inYear = useMemo(
    () => rows.filter((r) => r.date.startsWith(year)),
    [rows, year]
  )

  const totals = useMemo(() => {
    const totalReceived = inYear.reduce((n, r) => n + received(r), 0)
    const totalOutstanding = inYear.reduce((n, r) => n + outstanding(r), 0)
    const quoted = inYear.reduce((n, r) => n + (r.quotedAmount ?? 0), 0)
    return { totalReceived, totalOutstanding, quoted, count: inYear.length }
  }, [inYear])

  /** Twelve buckets, so a quiet month shows as a gap rather than disappearing. */
  const months = useMemo(() => {
    const buckets = Array.from({ length: 12 }, (_, i) => ({
      month: i + 1,
      label: new Date(2000, i, 1).toLocaleDateString('en-US', { month: 'short' }),
      received: 0,
      orders: 0,
    }))
    for (const row of inYear) {
      const index = Number(row.date.slice(5, 7)) - 1
      if (index < 0 || index > 11) continue
      buckets[index].received += received(row)
      buckets[index].orders += 1
    }
    return buckets
  }, [inYear])

  const peak = Math.max(1, ...months.map((m) => m.received))

  return (
    <>
      <div className={admin.pageHead}>
        <h1 className={admin.pageTitle}>Accounting</h1>
        <div className={styles.controls}>
          {years.length > 1 && (
            <select
              className={styles.year}
              value={year}
              onChange={(e) => setYear(e.target.value)}
              aria-label="Year"
            >
              {years.map((y) => (
                <option key={y} value={y}>
                  {y}
                </option>
              ))}
            </select>
          )}
          <a className="btn" href={`/api/admin/export?year=${year}`} download>
            Download CSV
          </a>
        </div>
      </div>

      <div className={admin.stats}>
        <div className={admin.stat}>
          <span className={admin.statValue}>{formatMoney(totals.totalReceived)}</span>
          <span className={admin.statLabel}>Received in {year}</span>
        </div>
        <div className={admin.stat}>
          <span className={admin.statValue}>{formatMoney(totals.totalOutstanding)}</span>
          <span className={admin.statLabel}>Still owed</span>
        </div>
        <div className={admin.stat}>
          <span className={admin.statValue}>{totals.count}</span>
          <span className={admin.statLabel}>Orders</span>
        </div>
      </div>

      <h2 className={styles.heading}>By month</h2>
      <div className={styles.chart}>
        {months.map((m) => (
          <div key={m.month} className={styles.bar}>
            <div className={styles.barTrack}>
              <div
                className={styles.barFill}
                style={{ height: `${(m.received / peak) * 100}%` }}
              />
            </div>
            <span className={styles.barLabel}>{m.label}</span>
            <span className={styles.barValue}>
              {m.received > 0 ? formatMoney(m.received) : '—'}
            </span>
          </div>
        ))}
      </div>

      <h2 className={styles.heading}>Orders</h2>
      {inYear.length === 0 ? (
        <p className={admin.empty}>Nothing recorded for {year} yet.</p>
      ) : (
        <div className={styles.tableWrap}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th scope="col">Order</th>
                <th scope="col">Date</th>
                <th scope="col">Status</th>
                <th scope="col" className={styles.num}>Quoted</th>
                <th scope="col" className={styles.num}>Received</th>
                <th scope="col" className={styles.num}>Owed</th>
              </tr>
            </thead>
            <tbody>
              {[...inYear]
                .sort((a, b) => b.date.localeCompare(a.date))
                .map((row) => (
                  <tr key={row.id}>
                    <th scope="row">
                      <Link href={`/admin/enquiries/${row.id}`}>{row.name}</Link>
                    </th>
                    <td className={styles.mono}>{row.date}</td>
                    <td className={styles.mono}>{row.status}</td>
                    <td className={styles.num}>{formatMoney(row.quotedAmount)}</td>
                    <td className={styles.num}>
                      {received(row) > 0 ? formatMoney(received(row)) : '—'}
                    </td>
                    <td className={styles.num}>
                      {outstanding(row) > 0 ? formatMoney(outstanding(row)) : '—'}
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
      )}

      <p className={styles.footnote}>
        Received counts deposits and final payments you have marked as paid. A
        quote on its own is not counted — this is money in, not money hoped for.
      </p>
    </>
  )
}
