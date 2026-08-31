/**
 * Loads the built single-file game in a real browser and fails loudly if it
 * does not work.
 *
 * This exists because of a specific mistake. A module started reading
 * `process.env`, which Next substitutes at build time but esbuild only
 * substitutes for the names in its `define`. The result was a
 * ReferenceError at module load — a completely blank page — and it shipped,
 * because typecheck passed, all 46 tests passed, and both builds reported
 * success. Nothing in that chain loads the page.
 *
 * A bundle can be type-correct, fully tested and still be a white screen. The
 * only check that catches it is opening it.
 */

import { chromium } from 'playwright'
import { existsSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const target = join(root, 'dist/perfect-season.html')

if (!existsSync(target)) {
  console.error(`✗ ${target} does not exist — run npm run build:standalone first`)
  process.exit(1)
}

const browser = await chromium.launch({
  executablePath: process.env['CHROMIUM_PATH'] || undefined,
})
const page = await browser.newPage({ viewport: { width: 390, height: 844 } })

const errors = []
page.on('pageerror', (e) => errors.push(`uncaught: ${e}`))
page.on('console', (m) => {
  if (m.type() !== 'error') return
  // A blocked webfont logs "Failed to load resource" with the URL only in the
  // message's location, not its text — so filter on both or this check fails
  // on its own network stubbing.
  const from = `${m.text()} ${m.location()?.url ?? ''}`
  if (!/fonts\.(googleapis|gstatic)/.test(from)) errors.push(`console: ${m.text()}`)
})

const fail = async (why) => {
  console.error(`✗ ${why}`)
  for (const e of errors) console.error(`  ${e}`)
  await browser.close()
  process.exit(1)
}

// Webfonts are blocked: they are not part of what this checks, and a flaky
// network should not fail a build.
await page.route(/^https?:\/\/fonts\./, (r) => r.abort())
await page.goto(`file://${target}`)

try {
  // It renders at all. This is the check the blank-page bug needed.
  await page.waitForSelector('.start-title', { timeout: 15000 })

  // It is interactive: the opening screen leads into a draft.
  await page.locator('.btn', { hasText: 'Play' }).click()
  await page.waitForSelector('.reels', { timeout: 10000 })

  // A spin produces players to pick from.
  await page.click('.btn')
  await page.waitForSelector('.candidates .cand', { timeout: 20000 })
  const offered = await page.locator('.candidates .cand').count()
  if (offered < 1) await fail('a spin offered no players')
} catch (e) {
  await fail(`the built page did not reach a playable state: ${e.message.split('\n')[0]}`)
}

if (errors.length) await fail('the built page loaded with errors')

console.log('✓ built page renders, opens a draft, and spins clean')
await browser.close()
