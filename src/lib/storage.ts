import 'server-only'

import { del, list, put } from '@vercel/blob'

/**
 * Storage for photographs uploaded through the admin.
 *
 * Vercel Blob rather than Firebase Storage. Firebase now requires the Blaze
 * plan — and therefore a card on file — to create a Storage bucket on a new
 * project, and photo upload is the only feature that needed it; everything else
 * runs on Firebase's free tier. Blob is on the platform this site already
 * deploys to, so it adds no new account.
 *
 * Everything that touches storage goes through this file, which is why swapping
 * providers was a single-file change.
 */

export function isStorageConfigured(): boolean {
  return Boolean(process.env.BLOB_READ_WRITE_TOKEN)
}

function requireToken(): string {
  const token = process.env.BLOB_READ_WRITE_TOKEN
  if (!token) {
    throw new Error(
      'BLOB_READ_WRITE_TOKEN is not set. In Vercel, open Storage, create a Blob ' +
        'store and connect it to this project — the token is added automatically.'
    )
  }
  return token
}

/**
 * Upload one file and return its public URL.
 *
 * Photographs of cakes are the entire point of the public site, so these are
 * public. `addRandomSuffix: false` keeps the path predictable, which matters
 * because the path prefix is how a replaced photo's old derivatives are found
 * and removed.
 */
export async function uploadPublic(
  path: string,
  data: Buffer,
  contentType: string
): Promise<string> {
  const result = await put(path, data, {
    access: 'public',
    contentType,
    token: requireToken(),
    addRandomSuffix: false,
    // Derivatives are immutable: a new upload writes a new prefix, so this can
    // be cached hard.
    cacheControlMaxAge: 31536000,
  })
  return result.url
}

/** Remove every file under a prefix — used when a photo is replaced or deleted. */
export async function deletePrefix(prefix: string): Promise<void> {
  if (!prefix || !isStorageConfigured()) return
  try {
    const token = requireToken()
    const { blobs } = await list({ prefix, token })
    if (blobs.length === 0) return
    await del(
      blobs.map((blob) => blob.url),
      { token }
    )
  } catch (error) {
    // A leftover file costs a fraction of a cent; failing the owner's action
    // over it does not help them.
    console.warn(
      '[storage] could not remove old files:',
      error instanceof Error ? error.message : error
    )
  }
}
