'use client'

import { useRef, useState } from 'react'
import type { ProductImage } from '@/lib/content'
import styles from './menu.module.css'

/**
 * Choose a photograph, shrink it in the browser, upload it.
 *
 * The downscale is not cosmetic. Vercel caps a request body at 4.5MB and a
 * modern phone photo is comfortably past that, so a straight upload would fail
 * for exactly the pictures the owner most wants to use. Resizing to 2000px here
 * makes a 5MB photo about 700KB, and 2000px is still wider than the largest
 * derivative the site serves, so nothing visible is lost.
 */

const MAX_EDGE = 2000
const QUALITY = 0.9

async function downscale(file: File): Promise<Blob> {
  // HEIC and anything the canvas cannot decode falls through to the original
  // file; the server will reject it with a clear message if it truly cannot be
  // read, which is better than failing silently here.
  const bitmap = await createImageBitmap(file).catch(() => null)
  if (!bitmap) return file

  const scale = Math.min(1, MAX_EDGE / Math.max(bitmap.width, bitmap.height))
  if (scale === 1 && file.size < 2 * 1024 * 1024) {
    bitmap.close()
    return file
  }

  const canvas = document.createElement('canvas')
  canvas.width = Math.round(bitmap.width * scale)
  canvas.height = Math.round(bitmap.height * scale)

  const context = canvas.getContext('2d')
  if (!context) {
    bitmap.close()
    return file
  }
  context.drawImage(bitmap, 0, 0, canvas.width, canvas.height)
  bitmap.close()

  const blob = await new Promise<Blob | null>((resolve) =>
    canvas.toBlob(resolve, 'image/jpeg', QUALITY)
  )
  return blob ?? file
}

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
