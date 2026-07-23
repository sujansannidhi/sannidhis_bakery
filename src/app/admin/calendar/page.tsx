import { listEnquiries, type EnquiryRecord } from '@/lib/enquiries'
import { ErrorNotice, missingFirebaseVars, SetupNotice } from '../SetupNotice'
import { CalendarView } from './CalendarView'
import styles from '../admin.module.css'

export const dynamic = 'force-dynamic'

export default async function CalendarPage() {
  const missing = missingFirebaseVars()

  if (missing.length > 0) {
    return (
      <>
        <h1 className={styles.pageTitle}>Calendar</h1>
        <SetupNotice missing={missing} />
      </>
    )
  }

  let enquiries: EnquiryRecord[] = []
  try {
    enquiries = await listEnquiries(500)
  } catch (error) {
    return (
      <>
        <h1 className={styles.pageTitle}>Calendar</h1>
        <ErrorNotice
          message={error instanceof Error ? error.message : 'Unknown error.'}
        />
      </>
    )
  }

  // Only what the calendar needs. The full record carries customer contact
  // details, and there is no reason to ship those to the browser for a grid.
  const events = enquiries
    .filter((e) => e.status !== 'declined')
    .map((e) => ({
      id: e.id,
      name: e.Name,
      date: e['Event date'],
      status: e.status,
      category: e.Category ?? '',
    }))

  return <CalendarView events={events} />
}
