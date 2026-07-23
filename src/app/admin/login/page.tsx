import { Suspense } from 'react'
import { LoginForm } from './LoginForm'
import styles from './login.module.css'

export const dynamic = 'force-dynamic'

export const metadata = {
  title: 'Sign in',
  robots: { index: false, follow: false },
}

export default function LoginPage() {
  return (
    <div className={styles.wrap}>
      <div className={styles.panel}>
        <span className={styles.rule} aria-hidden="true" />
        <h1 className={styles.title}>Sannidhi&rsquo;s Bakery</h1>
        <p className={styles.sub}>Admin</p>
        <Suspense fallback={null}>
          <LoginForm />
        </Suspense>
      </div>
    </div>
  )
}
