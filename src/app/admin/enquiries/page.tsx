import Link from 'next/link'
import { listEnquiries, type EnquiryRecord } from '@/lib/enquiries'
import { ENQUIRY_STATUSES, STATUS_LABELS } from '@/lib/validation'
import { ErrorNotice, missingFirebaseVars, SetupNotice } from '../SetupNotice'
import { formatDate, StatusBadge } from '../page'
import styles from '../admin.module.css'

export const dynamic = 'force-dynamic'

export default async function EnquiriesPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>
}) {
  const { status: filter } = await searchParams
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

  const visible =
    filter && filter !== 'all'
      ? enquiries.filter((e) => e.status === filter)
      : enquiries

  return (
    <>
      <div className={styles.pageHead}>
        <h1 className={styles.pageTitle}>Enquiries</h1>
      </div>

      {missing.length > 0 && <SetupNotice missing={missing} />}
      {error && <ErrorNotice message={error} />}

      {missing.length === 0 && !error && (
        <>
          <div className={styles.filters}>
            <Link
              href="/admin/enquiries"
              className={styles.filter}
              aria-current={!filter || filter === 'all' ? 'true' : undefined}
            >
              All <span>{enquiries.length}</span>
            </Link>
            {ENQUIRY_STATUSES.map((status) => {
              const count = enquiries.filter((e) => e.status === status).length
              return (
                <Link
                  key={status}
                  href={`/admin/enquiries?status=${status}`}
                  className={styles.filter}
                  aria-current={filter === status ? 'true' : undefined}
                >
                  {STATUS_LABELS[status]} <span>{count}</span>
                </Link>
              )
            })}
          </div>

          {visible.length === 0 ? (
            <p className={styles.empty}>
              {enquiries.length === 0
                ? 'No enquiries yet. They will appear here as soon as someone submits the custom order form.'
                : 'Nothing with that status.'}
            </p>
          ) : (
            <div className={styles.list}>
              {visible.map((enquiry) => (
                <Link
                  key={enquiry.id}
                  href={`/admin/enquiries/${enquiry.id}`}
                  className={styles.row}
                >
                  <span className={styles.rowName}>{enquiry.Name}</span>
                  <span className={styles.rowMeta}>
                    {enquiry.Occasion || enquiry.Category || 'Not specified'}
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
