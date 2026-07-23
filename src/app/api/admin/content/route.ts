import { NextResponse } from 'next/server'
import { z } from 'zod'
import { readFile, writeFile } from '@/lib/github'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/**
 * Publish a content change by committing it to the repo.
 *
 * Only the two content files can be written. The GitHub token can technically
 * write anywhere in the repository, so this allowlist is what stops a bug — or
 * a crafted request that somehow got past middleware — from rewriting source
 * code through this endpoint.
 */
const WRITABLE = {
  site: 'src/content/site.json',
} as const

const bodySchema = z.object({
  // Products moved to Firestore and are edited at /admin/menu. Accepting them
  // here as well would write a file nothing reads, so the owner's edits would
  // vanish with a success message.
  file: z.enum(['site']),
  // Sent as an object and re-serialised here, so malformed JSON cannot be
  // committed and formatting stays consistent with what the build expects.
  data: z.record(z.string(), z.unknown()),
})

export async function POST(request: Request) {
  let parsedBody
  try {
    parsedBody = bodySchema.safeParse(await request.json())
  } catch {
    return NextResponse.json(
      { ok: false, message: 'That request could not be read.' },
      { status: 400 }
    )
  }

  if (!parsedBody.success) {
    return NextResponse.json(
      { ok: false, message: 'That is not a valid content change.' },
      { status: 422 }
    )
  }

  const { file, data } = parsedBody.data
  const path = WRITABLE[file]

  try {
    // Read immediately before writing so the sha is fresh; GitHub rejects the
    // write if anything changed in between rather than clobbering it.
    const current = await readFile(path)
    const next = JSON.stringify(data, null, 2) + '\n'

    if (next === current.content) {
      return NextResponse.json({ ok: true, unchanged: true })
    }

    const { commitUrl } = await writeFile({
      path,
      content: next,
      sha: current.sha,
      message: 'Update site details from admin',
    })

    return NextResponse.json({ ok: true, commitUrl })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error.'
    console.error('[admin] content publish failed:', message)
    return NextResponse.json(
      {
        ok: false,
        message: message.startsWith('GitHub 409')
          ? 'Someone else changed that file while you were editing. Reload and try again.'
          : `Could not publish that. ${message}`,
      },
      { status: 500 }
    )
  }
}
