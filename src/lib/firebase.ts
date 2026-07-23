import 'server-only'

import { cert, getApp, getApps, initializeApp } from 'firebase-admin/app'
import { getFirestore, type Firestore } from 'firebase-admin/firestore'

/**
 * Firestore, server-side only.
 *
 * The `server-only` import at the top is a build-time tripwire: if any client
 * component ever imports this file, the build fails rather than shipping service
 * account credentials to a browser.
 *
 * All access goes through the Admin SDK, which bypasses Firestore security
 * rules. That is why firestore.rules denies everything — there is no legitimate
 * client path to this data, so the rules can be closed completely.
 */

let cached: Firestore | null = null

/** True when the credentials are present, so callers can degrade rather than crash. */
export function isFirebaseConfigured(): boolean {
  return Boolean(
    process.env.FIREBASE_PROJECT_ID &&
      process.env.FIREBASE_CLIENT_EMAIL &&
      process.env.FIREBASE_PRIVATE_KEY
  )
}

export function db(): Firestore {
  if (cached) return cached

  if (!isFirebaseConfigured()) {
    throw new Error(
      'Firebase is not configured. Set FIREBASE_PROJECT_ID, ' +
        'FIREBASE_CLIENT_EMAIL and FIREBASE_PRIVATE_KEY. See README.'
    )
  }

  const app = getApps().length
    ? getApp()
    : initializeApp({
        credential: cert({
          projectId: process.env.FIREBASE_PROJECT_ID,
          clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
          // Environment variables cannot hold real newlines, so the private key
          // is stored with literal \n sequences and unescaped here.
          privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
        }),
      })

  cached = getFirestore(app)
  // Undefined values would otherwise throw on write; optional form fields are
  // routinely absent, and dropping them is the sane behaviour.
  cached.settings({ ignoreUndefinedProperties: true })
  return cached
}

export const ENQUIRIES = 'enquiries'
export const RATE_LIMITS = 'rateLimits'
