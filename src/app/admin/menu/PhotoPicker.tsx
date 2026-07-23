'use client'

import { useRef, useState } from 'react'
import type { ProductImage } from '@/lib/content'
import { downscale } from '@/lib/downscale'
import styles from './menu.module.css'

/** Choose a photograph, shrink it in the browser (see lib/downscale), upload it. */

export function PhotoPicker({
  label = 'Choose a photo',
  name,
  onUploaded,
  disabled,
}: {
  label?: string
  /** Used to name the files in storage, so they are identifiable later. */
  name: string
  onUploaded: (image: ProductImage) => void
  disabled?: boolean
}) {
  const input = useRef<HTMLInputElement>(null)
  const [busy, setBusy] = useState(false)
  const [status, setStatus] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  async function handle(file: File) {
    setBusy(true)
    setError(null)
    setStatus('Preparing…')

    try {
      const shrunk = await downscale(file)
      setStatus(
        `Uploading ${(shrunk.size / 1024 / 1024).toFixed(1)}MB — this takes a few seconds`
      )

      const body = new FormData()
      body.append('file', shrunk, 'upload.jpg')
      body.append('name', name || 'photo')

      const response = await fetch('/api/admin/photos', { method: 'POST', body })
      const result = await response.json().catch(() => null)

      if (!response.ok || !result?.ok) {
        throw new Error(result?.message ?? 'Upload failed.')
      }

      onUploaded(result.image as ProductImage)
      setStatus('Photo ready.')
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Upload failed.')
      setStatus(null)
    } finally {
      setBusy(false)
      if (input.current) input.current.value = ''
    }
  }

  return (
    <div className={styles.picker}>
      <input
        ref={input}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        className="visually-hidden"
        id={`photo-${name || 'new'}`}
        disabled={disabled || busy}
        onChange={(event) => {
          const file = event.target.files?.[0]
          if (file) handle(file)
        }}
      />
      <label
        htmlFor={`photo-${name || 'new'}`}
        className={styles.pickerButton}
        aria-disabled={disabled || busy}
      >
        {busy ? 'Working…' : label}
      </label>

      <span aria-live="polite" className={styles.pickerStatus}>
        {error ? (
          <span className={styles.error}>{error}</span>
        ) : (
          status && <span>{status}</span>
        )}
      </span>
    </div>
  )
}
