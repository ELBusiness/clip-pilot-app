import type { NextConfig } from 'next'

/** Empty for a root domain; '/repo' for a GitHub Pages project site. */
const BASE_PATH = (process.env['BASE_PATH'] ?? '').replace(/\/$/, '')

/** Origin only, no path — the metadata layer joins the two. */
const SITE_URL = process.env['SITE_URL'] ?? 'https://162-0.app'

const nextConfig: NextConfig = {
  reactStrictMode: true,
  typedRoutes: true,
  /*
   * The game has no server: every screen is decided in the browser from a seed,
   * and the roster pack ships in the bundle. Exporting to plain files means it
   * hosts anywhere static — a bucket, a CDN, GitHub Pages — for nothing, and a
   * spike in traffic costs nothing either. Without this, `next build` produces
   * a server build that a static host cannot run.
   */
  output: 'export',
  images: { unoptimized: true },
  // Directory-style URLs, so a host that serves index.html from a folder finds
  // the page whether or not the request carries a trailing slash.
  trailingSlash: true,
  /*
   * GitHub Pages serves a project site from a subpath
   * (user.github.io/repo/), so every absolute URL in the page has to carry it.
   * A custom domain or any other static host serves from the root and leaves
   * this empty. One env var decides, and the manifest, the icons and the share
   * card all read the same one — a mismatch here is the classic "works locally,
   * blank page in production".
   */
  basePath: BASE_PATH,
  assetPrefix: BASE_PATH || undefined,
  env: { NEXT_PUBLIC_BASE_PATH: BASE_PATH, NEXT_PUBLIC_SITE_URL: SITE_URL },
}

export default nextConfig
