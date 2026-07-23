'use client'

import { useState, type FormEvent } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import styles from './login.module.css'

export function LoginForm() {
  const router = useRouter()
  const params = useSearchParams()
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  /**
   * Only ever redirect to a path on this site. Taking the `next` parameter at
   * face value would let a crafted link bounce someone to an attacker's page
   * immediately after they typed the admin password.
   */
  function safeNext(): string {
    const next = params.get('next')
    if (!next || !next.startsWith('/admin') || next.startsWith('//')) {
      return '/admin'
    }
    return next
  }

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError(null)
    setBusy(true)

    try {
      const response = await fetch('/api/admin/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password }),
      })
      const body = await response.json().catch(() => null)

      if (response.ok && body?.ok) {
        router.replace(safeNext())
        router.refresh()
        return
      }
      setError(body?.message ?? 'That did not work.')
    } catch {
      setError('Could not reach the server. Check your connection.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <form className={styles.form} onSubmit={onSubmit}>
      <div className={styles.field}>
        <label className={styles.label} htmlFor="password">
          Password
        </label>
        <input
          id="password"
          name="password"
          type="password"
          autoComplete="current-password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          required
          autoFocus
          aria-invalid={Boolean(error)}
          aria-describedby={error ? 'login-error' : undefined}
        />
      </div>

      {error && (
        <p className={styles.error} id="login-error" role="alert">
          {error}
        </p>
      )}

      <button type="submit" className="btn" disabled={busy || !password}>
        {busy ? 'Checking…' : 'Sign in'}
      </button>
    </form>
  )
}
