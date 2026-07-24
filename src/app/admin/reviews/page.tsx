import { listReviews } from '@/lib/admin-content'
import { ReviewsEditor } from './ReviewsEditor'
import { ErrorNotice, missingFirebaseVars, SetupNotice } from '../SetupNotice'
import styles from '../admin.module.css'

export const dynamic = 'force-dynamic'

export default async function AdminReviewsPage() {
  const missing = missingFirebaseVars()
  if (missing.length > 0) {
    return (
      <>
        <h1 className={styles.pageTitle}>Reviews</h1>
        <SetupNotice missing={missing} />
      </>
    )
  }

  try {
    const reviews = await listReviews()
    return <ReviewsEditor initial={reviews} />
  } catch (error) {
    return (
      <>
        <h1 className={styles.pageTitle}>Reviews</h1>
        <ErrorNotice
          message={error instanceof Error ? error.message : 'Unknown error.'}
        />
      </>
    )
  }
}
