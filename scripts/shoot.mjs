/**
 * QA screenshots. Captures every page at 390 / 768 / 1440 so they can be looked
 * at rather than assumed correct.
 *
 * Usage: node scripts/shoot.mjs [outDir] [baseUrl] [--full]
 */
import { chromium } from 'playwright'
import { promises as fs } from 'node:fs'
import path from 'node:path'

const OUT = process.argv[2] ?? '/tmp/shots'
const BASE = process.argv[3] ?? 'http://localhost:3001'
const FULL = process.argv.includes('--full')

const PAGES = [
  { slug: 'home', url: '/' },
  { slug: 'menu', url: '/menu' },
  { slug: 'custom-orders', url: '/custom-orders' },
  { slug: 'about', url: '/about' },
  { slug: 'contact', url: '/contact' },
]

const VIEWPORTS = [
  { name: '390', width: 390, height: 844 },
  { name: '768', width: 768, height: 1024 },
  { name: '1440', width: 1440, height: 900 },
]

const consoleErrors = []
const badResponses = []

async function main() {
  await fs.mkdir(OUT, { recursive: true })
  const browser = await chromium.launch()

  for (const vp of VIEWPORTS) {
    const context = await browser.newContext({
      viewport: { width: vp.width, height: vp.height },
      deviceScaleFactor: 2,
    })
    const page = await context.newPage()

    page.on('console', (m) => {
      if (m.type() === 'error') consoleErrors.push(`[${vp.name}] ${m.text()}`)
    })
    page.on('response', (r) => {
      if (r.status() >= 400) badResponses.push(`[${vp.name}] ${r.status()} ${r.url()}`)
    })

    for (const p of PAGES) {
      const res = await page.goto(BASE + p.url, { waitUntil: 'networkidle' })
      if (!res || res.status() >= 400) {
        console.log(`  !! ${p.slug} returned ${res?.status()}`)
        continue
      }
      // Let the hero load sequence finish and lazy images settle.
      await page.waitForTimeout(1600)
      await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight))
      await page.waitForTimeout(1200)
      await page.evaluate(() => window.scrollTo(0, 0))
      await page.waitForTimeout(600)

      await page.screenshot({
        path: path.join(OUT, `${p.slug}-${vp.name}.png`),
        fullPage: FULL,
      })
      console.log(`  ${p.slug}-${vp.name}.png`)
    }
    await context.close()
  }

  await browser.close()

  if (badResponses.length) {
    console.log(`\n${badResponses.length} bad response(s):`)
    for (const b of [...new Set(badResponses)].slice(0, 30)) console.log(`  ${b}`)
  } else {
    console.log('\nNo 4xx/5xx responses.')
  }

  if (consoleErrors.length) {
    console.log(`\n${consoleErrors.length} console error(s):`)
    for (const e of [...new Set(consoleErrors)].slice(0, 30)) console.log(`  ${e}`)
  } else {
    console.log('No console errors.')
  }
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
