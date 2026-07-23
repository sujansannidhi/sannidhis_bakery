import 'server-only'

/**
 * Commit a content file back to the repository.
 *
 * Content lives in git rather than a database on purpose: every edit becomes a
 * commit, so a bad change can be seen and reverted, and the site stays static
 * and fast. The cost is that saving is not instant — Vercel has to rebuild,
 * which takes about a minute. The UI says so rather than pretending otherwise.
 *
 * Uses the REST contents API directly. Octokit would be a large dependency for
 * two endpoints.
 */

const API = 'https://api.github.com'

type Config = { repo: string; branch: string; token: string }

function config(): Config {
  const token = process.env.GITHUB_TOKEN
  const repo = process.env.GITHUB_REPO
  if (!token || !repo) {
    throw new Error(
      'GITHUB_TOKEN and GITHUB_REPO must be set to publish content changes.'
    )
  }
  return { token, repo, branch: process.env.GITHUB_BRANCH || 'main' }
}

export function isGithubConfigured(): boolean {
  return Boolean(process.env.GITHUB_TOKEN && process.env.GITHUB_REPO)
}

export function missingGithubVars(): string[] {
  return ['GITHUB_TOKEN', 'GITHUB_REPO'].filter((name) => !process.env[name])
}

async function gh(path: string, init: RequestInit = {}) {
  const { token } = config()
  const response = await fetch(`${API}${path}`, {
    ...init,
    headers: {
      Accept: 'application/vnd.github+json',
      Authorization: `Bearer ${token}`,
      'X-GitHub-Api-Version': '2022-11-28',
      'Content-Type': 'application/json',
      ...init.headers,
    },
    cache: 'no-store',
  })

  if (!response.ok) {
    const detail = await response.text().catch(() => '')
    // Never echo the token back, and keep GitHub's own message short.
    throw new Error(
      `GitHub ${response.status}: ${detail.slice(0, 200) || response.statusText}`
    )
  }
  return response.json()
}

/** Current contents of a file, plus the blob sha needed to update it. */
export async function readFile(
  path: string
): Promise<{ content: string; sha: string }> {
  const { repo, branch } = config()
  const data = await gh(
    `/repos/${repo}/contents/${encodeURIComponent(path)}?ref=${encodeURIComponent(branch)}`
  )
  const content = Buffer.from(data.content, 'base64').toString('utf8')
  return { content, sha: data.sha }
}

/**
 * Write a file. The sha must be the one just read — if someone else has changed
 * the file since, GitHub rejects the write rather than silently overwriting it.
 */
export async function writeFile({
  path,
  content,
  sha,
  message,
}: {
  path: string
  content: string
  sha: string
  message: string
}): Promise<{ commitUrl: string }> {
  const { repo, branch } = config()
  const data = await gh(`/repos/${repo}/contents/${encodeURIComponent(path)}`, {
    method: 'PUT',
    body: JSON.stringify({
      message,
      content: Buffer.from(content, 'utf8').toString('base64'),
      sha,
      branch,
      committer: {
        name: "Sannidhi's Bakery admin",
        // noreply.github.com addresses do not bounce and are not a real mailbox.
        email: 'admin@users.noreply.github.com',
      },
    }),
  })
  return { commitUrl: data.commit?.html_url ?? '' }
}
