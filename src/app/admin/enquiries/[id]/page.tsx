import Link from 'next/link'
import { notFound } from 'next/navigation'
import { getEnquiry } from '@/lib/enquiries'
import { ErrorNotice, missingFirebaseVars, SetupNotice } from '../../SetupNotice'
import { formatDate } from '../../page'
import { EnquiryActions } from './EnquiryActions'
import styles from '../../admin.module.css'

export const dynamic = 'force-dynamic'

/** Order matters — this is the order the baker reads them in. */
const FIELDS: { key: string; label: string }[] = [
  { key: 'Event date', label: 'Event date' },
  { key: 'Occasion', label: 'Occasion' },
  { key: 'Category', label: 'Type' },
  { key: 'Servings', label: 'How many people' },
  { key: 'What you would like', label: 'What they would like' },
  { key: 'Dietary', label: 'Allergies / dietary' },
  { key: 'Budget', label: 'Budget' },
  { key: 'Notes', label: 'Anything else' },
  { key: 'Started from', label: 'Started from' },
  { key: 'Phone', label: 'Phone' },
]

export default async function EnquiryDetail({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const missing = missingFirebaseVars()

  if (missing.length > 0) {
    return (
      <>
        <h1 className={styles.pageTitle}>Enquiry</h1>
        <SetupNotice missing={missing} />
      </>
    )
  }

  let enquiry
  try {
    enquiry = await getEnquiry(id)
  } catch (caught) {
    return (
      <>
        <h1 className={styles.pageTitle}>Enquiry</h1>
        <ErrorNotice
          message={caught instanceof Error ? caught.message : 'Unknown error.'}
        />
      </>
    )
  }

  if (!enquiry) notFound()

  const record = enquiry as unknown as Record<string, string>

  return (
    <>
      <Link href="/admin/enquiries" className={styles.back}>
        ← All enquiries
      </Link>

      <div className={styles.pageHead}>
        <h1 className={styles.pageTitle}>{enquiry.Name}</h1>
        <span className={styles.rowMono}>
          Received {formatDate(enquiry.createdAt.slice(0, 10))}
        </span>
      </div>

      <div className={styles.detail}>
        <div>
          <div className={styles.fields}>
            <div className={styles.field}>
              <span className={styles.fieldLabel}>Email</span>
              <p className={styles.fieldValue}>
                <a href={`mailto:${enquiry.Email}`}>{enquiry.Email}</a>
              </p>
            </div>

            {FIELDS.map(({ key, label }) => {
              const value = record[key]
              if (!value) return null
              return (
                <div key={key} className={styles.field}>
                  <span className={styles.fieldLabel}>{label}</span>
                  <p className={styles.fieldValue}>
                    {key === 'Event date' ? formatDate(value) : value}
                  </p>
                </div>
              )
            })}
          </div>
        </div>

        <EnquiryActions
          id={enquiry.id}
          status={enquiry.status}
          adminNotes={enquiry.adminNotes ?? ''}
          email={enquiry.Email}
          name={enquiry.Name}
        />
      </div>
    </>
  )
}
