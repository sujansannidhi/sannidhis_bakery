import Link from 'next/link'
import { listEnquiries, type EnquiryRecord } from '@/lib/enquiries'
import { ErrorNotice, missingFirebaseVars, SetupNotice } from './SetupNotice'
import styles from './admin.module.css'

export const dynamic = 'force-dynamic'

export default async function AdminDashboard() {
  const missing = missingFirebaseVars()

  let enquiries: EnquiryRecord[] = []
  let error: string | null = null

  if (missing.length === 0) {
    try {
      enquiries = await listEnquiries()
    } catch (caught) {
      error = caught instanceof Error ? caught.message : 'Unknown error.'
    }
  }

  const newCount = enquiries.filter((e) => e.status === 'new').length
  const upcoming = enquiries.filter(isUpcomingWithin(7))
  const confirmed = enquiries.filter((e) => e.status === 'confirmed').length

  return (
    <>
      <div className={styles.pageHead}>
        <h1 className={styles.pageTitle}>Dashboard</h1>
      </div>

      {missing.length > 0 && <SetupNotice missing={missing} />}
      {error && <ErrorNotice message={error} />}

      {missing.length === 0 && !error && (
        <>
          <div className={styles.stats}>
            <Link href="/admin/enquiries?status=new" className={styles.stat}>
              <span className={styles.statValue}>{newCount}</span>
              <span className={styles.statLabel}>
                New {newCount === 1 ? 'enquiry' : 'enquiries'}
              </span>
            </Link>
            <Link href="/admin/enquiries?status=confirmed" className={styles.stat}>
              <span className={styles.statValue}>{confirmed}</span>
              <span className={styles.statLabel}>Confirmed orders</span>
            </Link>
            <Link href="/admin/enquiries" className={styles.stat}>
              <span className={styles.statValue}>{upcoming.length}</span>
              <span className={styles.statLabel}>Due in the next 7 days</span>
            </Link>
          </div>

          <h2 className={styles.pageTitle} style={{ fontSize: 'var(--t-27)' }}>
            Coming up
          </h2>
          {upcoming.length === 0 ? (
            <p className={styles.empty}>
              Nothing due in the next week.{' '}
              <Link href="/admin/enquiries">See all enquiries</Link>.
            </p>
          ) : (
            <div className={styles.list}>
              {upcoming
                .sort((a, b) =>
                  a['Event date'].localeCompare(b['Event date'])
                )
                .map((enquiry) => (
                  <Link
                    key={enquiry.id}
                    href={`/admin/enquiries/${enquiry.id}`}
                    className={styles.row}
                  >
                    <span className={styles.rowName}>{enquiry.Name}</span>
                    <span className={styles.rowMeta}>
                      {enquiry.Category || 'Not specified'}
                    </span>
                    <span className={styles.rowMono}>
                      {formatDate(enquiry['Event date'])}
                    </span>
                    <StatusBadge status={enquiry.status} />
                  </Link>
                ))}
            </div>
          )}
        </>
      )}
    </>
  )
}

function isUpcomingWithin(days: number) {
  return (enquiry: EnquiryRecord) => {
    if (enquiry.status === 'declined' || enquiry.status === 'completed') {
      return false
    }
    const event = new Date(`${enquiry['Event date']}T00:00:00`).getTime()
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const limit = today.getTime() + days * 86_400_000
    return event >= today.getTime() && event <= limit
  }
}

export function formatDate(value: string): string {
  const date = new Date(`${value}T00:00:00`)
  if (Number.isNaN(date.getTime())) return value
  return date.toLocaleDateString('en-US', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })
}

export function StatusBadge({ status }: { status: string }) {
  const variant =
    status === 'new'
      ? styles.badgeNew
      : status === 'confirmed'
        ? styles.badgeConfirmed
        : status === 'completed' || status === 'declined'
          ? styles.badgeCompleted
          : ''
  return <span className={`${styles.badge} ${variant}`}>{status}</span>
}
