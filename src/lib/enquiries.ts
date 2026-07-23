import 'server-only'

import { db, ENQUIRIES, RATE_LIMITS } from './firebase'
import type { Enquiry, EnquiryStatus } from './validation'

export type EnquiryRecord = Enquiry & {
  id: string
  status: EnquiryStatus
  adminNotes: string
  createdAt: string
  updatedAt: string
}

type StoredEnquiry = Omit<EnquiryRecord, 'id'>

export async function createEnquiry(enquiry: Enquiry): Promise<string> {
  const now = new Date().toISOString()
  const record: StoredEnquiry = {
    ...enquiry,
    status: 'new',
    adminNotes: '',
    createdAt: now,
    updatedAt: now,
  }
  const ref = await db().collection(ENQUIRIES).add(record)
  return ref.id
}

export async function listEnquiries(limit = 200): Promise<EnquiryRecord[]> {
  const snapshot = await db()
    .collection(ENQUIRIES)
    .orderBy('createdAt', 'desc')
    .limit(limit)
    .get()

  return snapshot.docs.map(
    (doc) => ({ id: doc.id, ...doc.data() }) as EnquiryRecord
  )
}

export async function getEnquiry(id: string): Promise<EnquiryRecord | null> {
  const doc = await db().collection(ENQUIRIES).doc(id).get()
  if (!doc.exists) return null
  return { id: doc.id, ...doc.data() } as EnquiryRecord
}

export async function updateEnquiry(
  id: string,
  patch: { status?: EnquiryStatus; adminNotes?: string }
): Promise<void> {
  await db()
    .collection(ENQUIRIES)
    .doc(id)
    .update({ ...patch, updatedAt: new Date().toISOString() })
}

/**
 * Fixed-window rate limit, counted in Firestore.
 *
 * It has to be in Firestore rather than a module-level variable: serverless
 * invocations do not share memory, so an in-process counter would reset
 * constantly and limit nothing.
 *
 * Fails open. If Firestore is unreachable this returns "allowed" rather than
 * locking the owner out of their own admin area or refusing a genuine customer
 * enquiry. The password itself is the real barrier; this only blunts automated
 * guessing.
 */
export async function rateLimit(
  key: string,
  { max, windowSeconds }: { max: number; windowSeconds: number }
): Promise<{ allowed: boolean; remaining: number }> {
  try {
    const now = Date.now()
    const windowStart = Math.floor(now / (windowSeconds * 1000))
    const docId = `${key}:${windowStart}`.replace(/\//g, '_')
    const ref = db().collection(RATE_LIMITS).doc(docId)

    const count = await db().runTransaction(async (tx) => {
      const doc = await tx.get(ref)
      const current = doc.exists ? ((doc.data()?.count as number) ?? 0) : 0
      const next = current + 1
      tx.set(ref, {
        count: next,
        // Kept so old windows can be swept up later; Firestore TTL policies can
        // be pointed at this field.
        expiresAt: new Date(now + windowSeconds * 2000).toISOString(),
      })
      return next
    })

    return { allowed: count <= max, remaining: Math.max(0, max - count) }
  } catch (error) {
    console.warn(
      '[rate-limit] check failed, allowing request:',
      error instanceof Error ? error.message : error
    )
    return { allowed: true, remaining: 0 }
  }
}

/** Best-effort client IP behind Vercel's proxy. */
export function clientIp(request: Request): string {
  const forwarded = request.headers.get('x-forwarded-for')
  if (forwarded) return forwarded.split(',')[0].trim()
  return request.headers.get('x-real-ip') ?? 'unknown'
}
