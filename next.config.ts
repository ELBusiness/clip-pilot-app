import type { NextConfig } from 'next'

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
}

export default nextConfig
