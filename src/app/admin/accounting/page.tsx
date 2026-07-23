import { listEnquiries, type EnquiryRecord } from '@/lib/enquiries'
import { ErrorNotice, missingFirebaseVars, SetupNotice } from '../SetupNotice'
import { AccountingView } from './AccountingView'
import styles from '../admin.module.css'

export const dynamic = 'force-dynamic'

export default async function AccountingPage() {
  const missing = missingFirebaseVars()

  if (missing.length > 0) {
    return (
      <>
        <h1 className={styles.pageTitle}>Accounting</h1>
        <SetupNotice missing={missing} />
      </>
    )
  }

  let enquiries: EnquiryRecord[] = []
  try {
    enquiries = await listEnquiries(1000)
  } catch (error) {
    return (
      <>
        <h1 className={styles.pageTitle}>Accounting</h1>
        <ErrorNotice
          message={error instanceof Error ? error.message : 'Unknown error.'}
        />
      </>
    )
  }

  const rows = enquiries
    .filter((e) => e.status !== 'declined')
    .map((e) => ({
      id: e.id,
      name: e.Name,
      date: e['Event date'],
      status: e.status,
      category: e.Category ?? '',
      quotedAmount: e.quotedAmount ?? null,
      depositAmount: e.depositAmount ?? null,
      depositPaid: Boolean(e.depositPaid),
      finalAmount: e.finalAmount ?? null,
      paidInFull: Boolean(e.paidInFull),
    }))

  return <AccountingView rows={rows} />
}
