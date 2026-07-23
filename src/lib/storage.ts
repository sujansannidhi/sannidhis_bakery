import 'server-only'

import { getApps, initializeApp, cert } from 'firebase-admin/app'
import { getStorage } from 'firebase-admin/storage'

/**
 * Firebase Storage, for photographs uploaded through the admin.
 *
 * Same project and same credentials as Firestore, so this adds no new service to
 * manage. The bucket name defaults to the project's own, which is what Firebase
 * creates automatically — FIREBASE_STORAGE_BUCKET only needs setting if a
 * different bucket is used.
 */

/**
 * Firebase has used two default bucket names over the years — projects created
 * before roughly 2024 get `<project>.appspot.com`, newer ones get
 * `<project>.firebasestorage.app`. Guessing wrong produces "The specified
 * bucket does not exist", which reads like Storage is switched off even when it
 * is not, so both are tried and the answer cached.
 */
function candidateBuckets(): string[] {
  const explicit = process.env.FIREBASE_STORAGE_BUCKET
  if (explicit) return [explicit]
  const project = process.env.FIREBASE_PROJECT_ID
  if (!project) throw new Error('FIREBASE_PROJECT_ID is not set.')
  return [`${project}.firebasestorage.app`, `${project}.appspot.com`]
}

let resolvedBucket: string | null = null

async function bucket() {
  const storage = getStorage(app())

  if (resolvedBucket) return storage.bucket(resolvedBucket)

  const candidates = candidateBuckets()
  for (const name of candidates) {
    try {
      const [exists] = await storage.bucket(name).exists()
      if (exists) {
        resolvedBucket = name
        return storage.bucket(name)
      }
    } catch {
      /* try the next candidate */
    }
  }

  throw new Error(
    `No Firebase Storage bucket found (tried ${candidates.join(', ')}). ` +
      'Open the Firebase console, choose Build → Storage and click Get started. ' +
      'If your bucket has a different name, set FIREBASE_STORAGE_BUCKET.'
  )
}

function app() {
  if (getApps().length) return getApps()[0]
  return initializeApp({
    credential: cert({
      projectId: process.env.FIREBASE_PROJECT_ID,
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
    }),
  })
}

export function isStorageConfigured(): boolean {
  return Boolean(
    process.env.FIREBASE_PROJECT_ID &&
      process.env.FIREBASE_CLIENT_EMAIL &&
      process.env.FIREBASE_PRIVATE_KEY
  )
}

/**
 * Upload one file and return a public URL.
 *
 * Photographs of cakes are not secret — they are the entire point of the public
 * site — so these are made public rather than served through signed URLs that
 * expire. A signed URL would also change on every render, defeating caching.
 */
export async function uploadPublic(
  path: string,
  data: Buffer,
  contentType: string
): Promise<string> {
  const target = await bucket()
  const file = target.file(path)

  await file.save(data, {
    contentType,
    resumable: false,
    metadata: {
      // Derivatives are immutable: a new upload writes a new path, so this can
      // be cached hard.
      cacheControl: 'public, max-age=31536000, immutable',
    },
  })
  await file.makePublic()

  return `https://storage.googleapis.com/${target.name}/${encodeURI(path)}`
}

/** Remove every file under a prefix — used when a photo is replaced or deleted. */
export async function deletePrefix(prefix: string): Promise<void> {
  if (!prefix) return
  try {
    await (await bucket()).deleteFiles({ prefix, force: true })
  } catch (error) {
    // A leftover file costs pennies; failing the user's action over it does not
    // help them.
    console.warn(
      '[storage] could not remove old files:',
      error instanceof Error ? error.message : error
    )
  }
}
