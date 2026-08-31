/**
 * Renders the static assets a launch needs: PNG app icons and the social share
 * card. Both are drawn as HTML and captured with the same Chromium the tests
 * use, so the card is built from the real design tokens rather than redrawn by
 * hand in a graphics tool and left to drift.
 *
 * Run this when the mark or the palette changes; the output is committed, so a
 * normal build and a normal install never touch a browser.
 */

import { chromium } from 'playwright'
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const pub = join(root, 'public')
mkdirSync(pub, { recursive: true })

const INK = '#0b0e13'
const ACCENT = '#f97a1f'
const CHALK = '#f2f5f8'
const DIM = '#8b96a5'

const plate = (stroke, w) => `
  <path d="M148 132 H364 V266 L256 386 L148 266 Z"
        fill="none" stroke="${stroke}" stroke-width="${w}" stroke-linejoin="round"/>
  <path d="M212 206 H300 V262 L256 312 L212 262 Z" fill="${stroke}"/>`

/** A maskable icon must survive a circular crop, so the mark sits in the safe zone. */
const iconHtml = (maskable) => `<!doctype html><meta charset="utf-8">
<style>
  /* Sized in percentages, not pixels: the same markup is captured at 512, 192
     and 32, and a hard-coded 512 would simply crop at the smaller viewports. */
  html,body{margin:0;width:100%;height:100%;background:${INK};}
  svg{display:block;width:100%;height:100%;${maskable ? 'transform:scale(0.66);transform-origin:center;' : ''}}
</style>
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" preserveAspectRatio="xMidYMid meet">
  <rect width="512" height="512" fill="${INK}"/>${plate(ACCENT, 30)}
</svg>`

const fonts =
  '<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>' +
  '<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Inter:wght@500;600;700;800&display=swap">'

/**
 * The card someone sees when the link is pasted anywhere. It has to answer
 * "what is this" in the half second before they scroll past, so it carries the
 * name, the premise and the number the whole game is about — and nothing else.
 */
const cardHtml = `<!doctype html><meta charset="utf-8">${fonts}
<style>
  *{box-sizing:border-box;margin:0}
  html,body{width:1200px;height:630px;background:${INK};
    font-family:Inter,system-ui,sans-serif;color:${CHALK};-webkit-font-smoothing:antialiased}
  .wrap{height:100%;padding:74px 80px;display:flex;flex-direction:column;justify-content:space-between}
  .top{display:flex;align-items:center;gap:22px}
  .name{font-size:46px;font-weight:800;letter-spacing:-.035em}
  .name em{font-style:normal;color:${ACCENT}}
  h1{font-size:92px;font-weight:800;letter-spacing:-.045em;line-height:1.02;max-width:19ch}
  h1 span{color:${ACCENT}}
  .sub{font-size:29px;font-weight:500;color:${DIM};line-height:1.45;max-width:34ch;margin-top:22px}
  .foot{display:flex;gap:14px;align-items:center}
  .chip{font-size:22px;font-weight:600;padding:12px 22px;border-radius:999px;background:#151a22;color:${DIM}}
  .chip.on{background:${ACCENT};color:#1a0d02}
</style>
<div class="wrap">
  <div class="top">
    <svg viewBox="0 0 512 512" width="64" height="64"><rect width="512" height="512" rx="114" fill="#151a22"/>${plate(ACCENT, 34)}</svg>
    <div class="name">162<em>&ndash;0</em></div>
  </div>
  <div>
    <h1>Draft a team that <span>never loses</span>.</h1>
    <p class="sub">Spin for a franchise and a decade. Draft thirteen legends. Simulate all 162 games.</p>
  </div>
  <div class="foot">
    <span class="chip on">120 years of real players</span>
    <span class="chip">Era-adjusted</span>
    <span class="chip">A new draft daily</span>
  </div>
</div>`

const browser = await chromium.launch({
  executablePath: process.env['CHROMIUM_PATH'] || undefined,
})

async function shoot(html, width, height, file, scale = 1) {
  const page = await browser.newPage({ viewport: { width, height }, deviceScaleFactor: scale })
  await page.setContent(html, { waitUntil: 'load' })
  // Give webfonts a moment; the card is unreadable in a fallback face.
  await page.evaluate(() => document.fonts?.ready)
  await page.screenshot({ path: join(pub, file) })
  await page.close()
  console.log(`  ${file}  ${width * scale}x${height * scale}`)
}

console.log('Rendering launch assets into public/')
await shoot(iconHtml(false), 512, 512, 'icon-512.png')
await shoot(iconHtml(false), 192, 192, 'icon-192.png')
await shoot(iconHtml(true), 512, 512, 'icon-maskable.png')
await shoot(iconHtml(false), 32, 32, 'favicon-32.png')
await shoot(cardHtml, 1200, 630, 'share-card.png')
await browser.close()

// The manifest and the card both name the palette; keep them honest.
const manifest = JSON.parse(readFileSync(join(pub, 'manifest.webmanifest'), 'utf8'))
if (manifest.theme_color !== INK) {
  manifest.theme_color = INK
  manifest.background_color = INK
  writeFileSync(join(pub, 'manifest.webmanifest'), JSON.stringify(manifest, null, 2) + '\n')
  console.log('  manifest theme colour resynced')
}
