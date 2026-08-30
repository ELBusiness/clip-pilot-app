/**
 * Bundles the whole game into one self-contained HTML file.
 *
 * React, the engine, every sport pack, and the CSS are inlined, so the result
 * runs from a file:// URL, an artifact host, or any static bucket with no
 * build step, no network, and no server. That is what makes it testable on a
 * phone from a link.
 */

import { build } from 'esbuild'
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs'
import { join } from 'node:path'

const root = process.cwd()
const out = join(root, 'dist')
mkdirSync(out, { recursive: true })

const result = await build({
  entryPoints: [join(root, 'standalone/app.tsx')],
  bundle: true,
  minify: true,
  format: 'iife',
  target: ['es2020'],
  jsx: 'automatic',
  write: false,
  define: { 'process.env.NODE_ENV': '"production"' },
  alias: { 'next/link': join(root, 'standalone/next-link-shim.tsx') },
  // esbuild reads the '@/*' paths mapping straight from tsconfig, so module
  // resolution stays identical to the Next build.
  tsconfig: join(root, 'tsconfig.json'),
  loader: { '.tsx': 'tsx', '.ts': 'ts' },
})

const js = result.outputFiles[0].text
const css = readFileSync(join(root, 'app/globals.css'), 'utf8')

const html = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, viewport-fit=cover">
<meta name="theme-color" content="#08090c">
<title>Perfect Season</title>
<style>${css}</style>
</head>
<body>
<div id="root"></div>
<script>${js}</script>
</body>
</html>
`

const target = join(out, 'perfect-season.html')
writeFileSync(target, html, 'utf8')
console.log(`Wrote ${target}  (${(Buffer.byteLength(html) / 1024).toFixed(0)} KB)`)

// Artifact hosts supply their own document skeleton, so that build ships the
// page content only — same bundle, no wrapper tags.
const fragment = `<title>Perfect Season</title>
<style>${css}</style>
<div id="root"></div>
<script>${js}</script>
`
const fragTarget = join(out, 'artifact.html')
writeFileSync(fragTarget, fragment, 'utf8')
console.log(`Wrote ${fragTarget}  (${(Buffer.byteLength(fragment) / 1024).toFixed(0)} KB)`)
