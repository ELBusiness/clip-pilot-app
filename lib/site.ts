/**
 * Where this copy of the game lives.
 *
 * Both values are baked in at build time. `BASE_PATH` is empty for a root
 * domain and '/repo' for a GitHub Pages project site; every absolute path in
 * the page — manifest, icons, share card — has to carry it or it 404s in
 * production while working perfectly on localhost.
 */

/**
 * Reading an env var without assuming `process` exists.
 *
 * Next replaces `process.env.NEXT_PUBLIC_*` with a literal at build time, so
 * the web build never evaluates this. The single-file build is bundled by
 * esbuild, which substitutes only what its `define` names — and a bare
 * `process` reference in a browser is a ReferenceError at module load, which
 * takes the whole app down to a blank page before a single component renders.
 * This module is imported by the game itself, so it must not assume a bundler
 * was configured correctly.
 */
function env(name: string): string | undefined {
  try {
    return typeof process === 'undefined' ? undefined : process.env[name]
  } catch {
    return undefined
  }
}

export const BASE_PATH = (env('NEXT_PUBLIC_BASE_PATH') ?? '').replace(/\/$/, '')

/** Origin only, no path. The metadata layer joins this to `asset()` paths. */
export const SITE_URL = env('NEXT_PUBLIC_SITE_URL') ?? 'https://162-0.app'

/** A root-relative path with the deployment's base path applied. */
export function asset(path: string): string {
  const clean = path.startsWith('/') ? path : `/${path}`
  if (!BASE_PATH) return clean
  return clean === '/' ? `${BASE_PATH}/` : `${BASE_PATH}${clean}`
}

/**
 * The URL to put in a share, which is not always the URL in the address bar.
 *
 * Embedded viewers — an artifact host, an iframe preview, anything sandboxed —
 * give the page a frame URL that is private to that session. Copying it into a
 * message hands a friend a link that cannot open, which quietly breaks the one
 * loop the game grows through. When the page is framed, the canonical site is
 * the honest answer instead.
 */
export function shareOrigin(): URL {
  const here = new URL(window.location.href)
  let framed = false
  try {
    framed = window.self !== window.top
  } catch {
    // Reading window.top across origins throws, which is itself the answer.
    framed = true
  }
  if (!framed && here.protocol.startsWith('http')) {
    here.search = ''
    here.hash = ''
    return here
  }
  return new URL(asset('/'), SITE_URL)
}
