import styles from './admin.module.css'

/**
 * Shown instead of a crash when the environment is not configured yet.
 *
 * The admin area is deployed before Firebase credentials exist, so this is the
 * expected first thing the owner sees. An error page would suggest something is
 * broken; this tells them exactly which variable is missing and what to do.
 */
export function SetupNotice({ missing }: { missing: string[] }) {
  return (
    <div className={styles.notice}>
      <h2>Almost there — this needs connecting</h2>
      <p>
        Enquiries are stored in Firebase, and these environment variables are not
        set yet:
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
        , then redeploy. The steps are in <code>README.md</code> under
        &ldquo;Admin area&rdquo;.
      </p>
      <p>
        Until then the public site works exactly as it does now — order enquiries
        still reach your phone through Formspree.
      </p>
    </div>
  )
}

export function ErrorNotice({ message }: { message: string }) {
  return (
    <div className={`${styles.notice} ${styles.noticeError}`}>
      <h2>Could not load that</h2>
      <p>{message}</p>
    </div>
  )
}

/** Which of the required Firebase variables are absent. */
export function missingFirebaseVars(): string[] {
  return [
    'FIREBASE_PROJECT_ID',
    'FIREBASE_CLIENT_EMAIL',
    'FIREBASE_PRIVATE_KEY',
  ].filter((name) => !process.env[name])
}
