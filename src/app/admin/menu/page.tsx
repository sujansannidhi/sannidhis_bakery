import { listCategories, listProducts } from '@/lib/admin-content'
import { isFirebaseConfigured } from '@/lib/firebase'
import { MenuEditor } from './MenuEditor'
import { ErrorNotice, missingFirebaseVars, SetupNotice } from '../SetupNotice'
import styles from '../admin.module.css'

export const dynamic = 'force-dynamic'

export default async function AdminMenuPage() {
  const missing = missingFirebaseVars()

  if (missing.length > 0) {
    return (
      <>
        <h1 className={styles.pageTitle}>Menu</h1>
        <SetupNotice missing={missing} />
      </>
    )
  }

  try {
    const [products, categories] = await Promise.all([
      listProducts(),
      listCategories(),
    ])
    return (
      <MenuEditor
        initialProducts={products}
        initialCategories={categories}
        storageReady={isFirebaseConfigured()}
      />
    )
  } catch (error) {
    return (
      <>
        <h1 className={styles.pageTitle}>Menu</h1>
        <ErrorNotice
          message={error instanceof Error ? error.message : 'Unknown error.'}
        />
      </>
    )
  }
}
