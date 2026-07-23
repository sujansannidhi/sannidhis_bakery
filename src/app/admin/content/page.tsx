import siteContent from '@/content/site.json'
import { missingGithubVars } from '@/lib/github'
import { ContentEditor } from './ContentEditor'
import styles from '../admin.module.css'

export const dynamic = 'force-dynamic'

export default function ContentPage() {
  const missing = missingGithubVars()

  return (
    <>
      <div className={styles.pageHead}>
        <h1 className={styles.pageTitle}>Business details</h1>
      </div>

      {missing.length > 0 && (
        <div className={styles.notice}>
          <h2>Publishing is not connected yet</h2>
          <p>
            You can look around, but saving needs these environment variables:
          </p>
          <ul>
            {missing.map((name) => (
              <li key={name}>
                <code>{name}</code>
              </li>
            ))}
          </ul>
          <p>
            Add them in Vercel under <strong>Settings → Environment Variables</strong>
            , then redeploy. See <code>README.md</code>.
          </p>
        </div>
      )}

      <p className={styles.empty} style={{ paddingBlock: 0, marginBottom: '2.5rem' }}>
        Products and sections have moved to <strong>Menu</strong>, where you can
        also upload photographs. This page is for the business facts that appear
        across the site.
      </p>

      <ContentEditor
        site={siteContent as Record<string, unknown>}
        canPublish={missing.length === 0}
      />
    </>
  )
}
