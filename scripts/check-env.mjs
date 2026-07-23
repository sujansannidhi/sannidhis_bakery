/**
 * "Did I set this up right?"
 *
 * Checks each piece of the admin configuration and says which are working,
 * which are missing and which are present but wrong — that last case being the
 * one that is otherwise hardest to tell apart from the others.
 *
 * Reads .env.local, so run it after filling that in:
 *   npm run check:env
 *
 * Nothing here prints a secret. Values are only ever reported as present,
 * absent or malformed.
 */
import { promises as fs } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')

const PASS = '  ok  '
const FAIL = ' FAIL '
const WARN = ' warn '

let failures = 0

function report(state, label, detail = '') {
  if (state === FAIL) failures++
  console.log(`${state} ${label}${detail ? ` — ${detail}` : ''}`)
}

/** Minimal .env parser — enough for KEY=value with optional quotes. */
async function loadEnvLocal() {
  const file = path.join(ROOT, '.env.local')
  try {
    const text = await fs.readFile(file, 'utf8')
    for (const line of text.split('\n')) {
      const trimmed = line.trim()
      if (!trimmed || trimmed.startsWith('#')) continue
      const eq = trimmed.indexOf('=')
      if (eq === -1) continue
      const key = trimmed.slice(0, eq).trim()
      let value = trimmed.slice(eq + 1).trim()
      if (
        (value.startsWith('"') && value.endsWith('"')) ||
        (value.startsWith("'") && value.endsWith("'"))
      ) {
        value = value.slice(1, -1)
      }
      if (!(key in process.env)) process.env[key] = value
    }
    return true
  } catch {
    return false
  }
}

async function checkAdminSecrets() {
  console.log('\nAdmin sign-in')

  const password = process.env.ADMIN_PASSWORD
  if (!password) {
    report(FAIL, 'ADMIN_PASSWORD', 'not set — nobody can sign in')
  } else if (password.length < 12) {
    report(
      WARN,
      'ADMIN_PASSWORD',
      `only ${password.length} characters. This is the whole lock — use a long random one`
    )
  } else {
    report(PASS, 'ADMIN_PASSWORD', `set, ${password.length} characters`)
  }

  const secret = process.env.ADMIN_SESSION_SECRET
  if (!secret) {
    report(FAIL, 'ADMIN_SESSION_SECRET', 'not set — sessions cannot be signed')
  } else if (secret.length < 16) {
    report(FAIL, 'ADMIN_SESSION_SECRET', 'too short, use `openssl rand -base64 32`')
  } else if (secret === password) {
    report(FAIL, 'ADMIN_SESSION_SECRET', 'must not be the same as ADMIN_PASSWORD')
  } else {
    report(PASS, 'ADMIN_SESSION_SECRET', 'set')
  }
}

async function checkFirebase() {
  console.log('\nFirebase (stores order enquiries)')

  const vars = ['FIREBASE_PROJECT_ID', 'FIREBASE_CLIENT_EMAIL', 'FIREBASE_PRIVATE_KEY']
  const missing = vars.filter((name) => !process.env[name])

  if (missing.length === vars.length) {
    report(WARN, 'not configured', 'enquiries will not be stored yet')
    return
  }
  if (missing.length > 0) {
    report(FAIL, 'partly configured', `still missing: ${missing.join(', ')}`)
    return
  }

  const key = process.env.FIREBASE_PRIVATE_KEY ?? ''
  if (!key.includes('BEGIN PRIVATE KEY')) {
    report(
      FAIL,
      'FIREBASE_PRIVATE_KEY',
      'does not look like a key — copy the whole value including the BEGIN and END lines'
    )
    return
  }
  if (!process.env.FIREBASE_CLIENT_EMAIL?.includes('@')) {
    report(FAIL, 'FIREBASE_CLIENT_EMAIL', 'does not look like an email address')
    return
  }
  report(PASS, 'credentials', 'all three present and well formed')

  // The real test: can we actually reach the database?
  try {
    const { cert, getApps, initializeApp } = await import('firebase-admin/app')
    const { getFirestore } = await import('firebase-admin/firestore')

    const app = getApps().length
      ? getApps()[0]
      : initializeApp({
          credential: cert({
            projectId: process.env.FIREBASE_PROJECT_ID,
            clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
            privateKey: key.replace(/\\n/g, '\n'),
          }),
        })

    const store = getFirestore(app)
    // A read of a document that does not exist still proves auth and network.
    await store.collection('enquiries').limit(1).get()
    report(PASS, 'connection', 'connected and able to read the enquiries collection')

    const write = await store.collection('_healthcheck').add({
      at: new Date().toISOString(),
      note: 'written by npm run check:env, safe to delete',
    })
    await write.delete()
    report(PASS, 'write access', 'wrote and removed a test document')
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    let hint = ''
    if (/NOT_FOUND|does not exist/i.test(message)) {
      hint = 'Is Firestore actually enabled? Build -> Firestore Database -> Create database.'
    } else if (/PERMISSION_DENIED/i.test(message)) {
      hint = 'The service account lacks access. Generate a fresh private key.'
    } else if (/DECODER|PEM|private key/i.test(message)) {
      hint = 'The private key is malformed. Re-copy it from the downloaded JSON.'
    } else if (/ENOTFOUND|ECONNREFUSED|network/i.test(message)) {
      hint = 'Network problem reaching Google.'
    }
    report(FAIL, 'connection', `${message.split('\n')[0]}${hint ? ` | ${hint}` : ''}`)
  }
}

async function checkStorage() {
  console.log('\nPhoto storage (Vercel Blob)')

  const token = process.env.BLOB_READ_WRITE_TOKEN
  if (!token) {
    report(
      WARN,
      'not configured',
      'photo uploads will not work. In Vercel: Storage -> create a Blob store -> connect it to this project'
    )
    return
  }

  try {
    const { list } = await import('@vercel/blob')
    const result = await list({ token, limit: 1 })
    report(
      PASS,
      'connection',
      `Blob store reachable (${result.blobs.length === 0 ? 'currently empty' : 'has files'})`
    )
  } catch (error) {
    const detail = error instanceof Error ? error.message : String(error)
    const hint = /forbidden|unauthorized|invalid token/i.test(detail)
      ? 'The token was rejected. Re-connect the store to this project in Vercel'
      : ''
    report(FAIL, 'connection', `${detail.split('\n')[0]}${hint ? ` | ${hint}` : ''}`)
  }
}

async function checkMail() {
  console.log('\nEmail (confirmations and quotes)')

  const user = process.env.GMAIL_USER
  const pass = process.env.GMAIL_APP_PASSWORD

  if (!user && !pass) {
    report(WARN, 'not configured', 'no confirmation or quote emails will be sent')
    return
  }
  if (!user || !pass) {
    report(FAIL, 'partly configured', 'both GMAIL_USER and GMAIL_APP_PASSWORD are needed')
    return
  }
  if (!user.includes('@')) {
    report(FAIL, 'GMAIL_USER', 'should be a full email address')
    return
  }
  // Google shows app passwords in groups of four; people often paste the spaces.
  if (/\s/.test(pass)) {
    report(WARN, 'GMAIL_APP_PASSWORD', 'contains a space — Google displays it in groups of four, but paste it without spaces')
  }

  try {
    const nodemailer = (await import('nodemailer')).default
    const transport = nodemailer.createTransport({
      service: 'gmail',
      auth: { user, pass: pass.replace(/\s/g, '') },
    })
    await transport.verify()
    report(PASS, 'connection', `signed in to Gmail as ${user}`)
  } catch (error) {
    const detail = error instanceof Error ? error.message : String(error)
    const hint = /Username and Password not accepted|BadCredentials/i.test(detail)
      ? 'Google rejected it. An ordinary account password will not work — it must be an app password, which needs 2-factor turned on'
      : ''
    report(FAIL, 'connection', `${detail.split('\n')[0]}${hint ? ` | ${hint}` : ''}`)
  }
}

async function checkGithub() {
  console.log('\nGitHub (publishes content changes)')

  const token = process.env.GITHUB_TOKEN
  const repo = process.env.GITHUB_REPO

  if (!token && !repo) {
    report(WARN, 'not configured', 'the Content page will load but cannot publish')
    return
  }
  if (!token || !repo) {
    report(FAIL, 'partly configured', 'both GITHUB_TOKEN and GITHUB_REPO are needed')
    return
  }
  if (!repo.includes('/')) {
    report(FAIL, 'GITHUB_REPO', `should look like "owner/name", got "${repo}"`)
    return
  }

  const branch = process.env.GITHUB_BRANCH || 'main'

  try {
    const response = await fetch(
      `https://api.github.com/repos/${repo}/contents/src%2Fcontent%2Fsite.json?ref=${branch}`,
      {
        headers: {
          Accept: 'application/vnd.github+json',
          Authorization: `Bearer ${token}`,
          'X-GitHub-Api-Version': '2022-11-28',
        },
      }
    )

    if (response.status === 401) {
      report(FAIL, 'token', 'rejected. Expired, or copied incompletely')
    } else if (response.status === 404) {
      report(
        FAIL,
        'access',
        `cannot see ${repo} on branch "${branch}". Check the token is scoped to this repository and the branch name is right`
      )
    } else if (!response.ok) {
      report(FAIL, 'GitHub', `responded ${response.status}`)
    } else {
      report(PASS, 'read access', `can read src/content/site.json on ${branch}`)

      /*
        Ask the repository endpoint what the token can do, rather than reading
        the x-accepted-github-permissions header on the previous response. That
        header describes what the endpoint *requires* ("contents=read" for a
        GET), not what the token *holds*, so it reported read-only for a token
        that could write perfectly well.
      */
      const repoResponse = await fetch(`https://api.github.com/repos/${repo}`, {
        headers: {
          Accept: 'application/vnd.github+json',
          Authorization: `Bearer ${token}`,
          'X-GitHub-Api-Version': '2022-11-28',
        },
      })
      const repoData = await repoResponse.json().catch(() => null)
      const canPush = repoData?.permissions?.push === true

      report(
        canPush ? PASS : FAIL,
        'write access',
        canPush
          ? 'token can commit to this repository'
          : 'token is read-only. Regenerate it with Contents: Read and write'
      )
    }
  } catch (error) {
    report(FAIL, 'GitHub', error instanceof Error ? error.message : String(error))
  }
}

async function main() {
  const loaded = await loadEnvLocal()
  console.log(
    loaded
      ? 'Reading .env.local'
      : 'No .env.local found — checking the current environment instead'
  )

  await checkAdminSecrets()
  await checkFirebase()
  await checkStorage()
  await checkMail()
  await checkGithub()

  console.log(
    failures === 0
      ? '\nNothing broken. Anything marked "warn" above is optional and can wait.\n'
      : `\n${failures} problem(s) to fix. Details above.\n`
  )
  process.exit(failures === 0 ? 0 : 1)
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
