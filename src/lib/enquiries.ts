import 'server-only'

import { db, ENQUIRIES, RATE_LIMITS } from './firebase'
import type { Enquiry, EnquiryStatus } from './validation'

export type EnquiryRecord = Enquiry & {
  id: string
  status: EnquiryStatus
  adminNotes: string
  createdAt: string
  updatedAt: string
  /* Money, in whole cents. Null means "not recorded yet", which is different
     from zero — a job quoted at nothing and a job not yet quoted are not the
     same thing and must not add up the same way. */
  quotedAmount?: number | null
  depositAmount?: number | null
  depositPaid?: boolean
  finalAmount?: number | null
  paidInFull?: boolean
  quotedAt?: string | null
  lastEmailedAt?: string | null
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
  patch: Partial<Omit<EnquiryRecord, 'id'>>
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
 * Split into a read and a write on purpose. Login must *check* the limit before
 * validating a password but only *record* an attempt when that password was
 * wrong — counting successes locked the owner out of their own dashboard for
 * fifteen minutes after a handful of ordinary sign-ins across devices.
 *
 * Both fail open. If Firestore is unreachable this allows the request rather
 * than locking the owner out or refusing a genuine customer enquiry. The
 * password itself is the real barrier; this only blunts automated guessing.
 */
function windowKey(key: string, windowSeconds: number): string {
  const bucket = Math.floor(Date.now() / (windowSeconds * 1000))
  return `${key}:${bucket}`.replace(/\//g, '_')
}

/** Read the current count without recording an attempt. */
export async function checkRateLimit(
  key: string,
  { max, windowSeconds }: { max: number; windowSeconds: number }
): Promise<{ allowed: boolean; remaining: number }> {
  try {
    const doc = await db()
      .collection(RATE_LIMITS)
      .doc(windowKey(key, windowSeconds))
      .get()
    const count = doc.exists ? ((doc.data()?.count as number) ?? 0) : 0
    return { allowed: count < max, remaining: Math.max(0, max - count) }
  } catch (error) {
    console.warn(
      '[rate-limit] check failed, allowing request:',
      error instanceof Error ? error.message : error
    )
    return { allowed: true, remaining: 0 }
  }
}

/** Record one attempt and report whether the caller is now over the limit. */
export async function rateLimit(
  key: string,
  { max, windowSeconds }: { max: number; windowSeconds: number }
): Promise<{ allowed: boolean; remaining: number }> {
  try {
    const ref = db().collection(RATE_LIMITS).doc(windowKey(key, windowSeconds))

    const count = await db().runTransaction(async (tx) => {
      const doc = await tx.get(ref)
      const current = doc.exists ? ((doc.data()?.count as number) ?? 0) : 0
      const next = current + 1
      tx.set(ref, {
        count: next,
        // Kept so old windows can be swept up later; a Firestore TTL policy can
        // be pointed at this field.
        expiresAt: new Date(Date.now() + windowSeconds * 2000).toISOString(),
      })
      return next
    })

    return { allowed: count <= max, remaining: Math.max(0, max - count) }
  } catch (error) {
    console.warn(
      '[rate-limit] record failed, allowing request:',
      error instanceof Error ? error.message : error
    )
    return { allowed: true, remaining: 0 }
  }
}

/**
 * Client IP, for rate limiting.
 *
 * The leftmost value of x-forwarded-for is whatever the *client* claimed, and
 * anyone can send a different one on every request — which defeats the throttle
 * entirely. Prefer headers our own proxy sets and a caller cannot forge, and
 * fall back to the rightmost forwarded value (the hop nearest us) rather than
 * the leftmost (the hop furthest away, and the one under an attacker's
 * control).
 */
export function clientIp(request: Request): string {
  // Set by Vercel's edge; client-supplied copies are overwritten.
  const vercel = request.headers.get('x-vercel-forwarded-for')
  if (vercel) return vercel.split(',')[0].trim()

  const real = request.headers.get('x-real-ip')
  if (real) return real.trim()

  const forwarded = request.headers.get('x-forwarded-for')
  if (forwarded) {
    const hops = forwarded.split(',').map((h) => h.trim()).filter(Boolean)
    if (hops.length > 0) return hops[hops.length - 1]
  }

  return 'unknown'
}
