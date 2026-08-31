import type { MetadataRoute } from 'next'
import { asset } from '@/lib/site'

/*
 * Reading the deployment's base path makes this route look dynamic to the
 * build, which a static export cannot produce. The values are baked in at
 * build time, so pinning it static is accurate as well as necessary.
 */
export const dynamic = 'force-static'


/**
 * Generated rather than a static file in public/, because every path in a
 * manifest is absolute and a project site serves from a subpath. A hand-written
 * manifest would install fine from the root and 404 its own icons anywhere else.
 */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: '162-0 — draft a perfect MLB season',
    short_name: '162-0',
    description:
      'Spin for a franchise and a decade, draft thirteen legends, and simulate all 162 games.',
    start_url: asset('/'),
    scope: asset('/'),
    display: 'standalone',
    orientation: 'portrait',
    background_color: '#0b0e13',
    theme_color: '#0b0e13',
    categories: ['games', 'sports'],
    icons: [
      { src: asset('/icon.svg'), sizes: 'any', type: 'image/svg+xml', purpose: 'any' },
      { src: asset('/icon-192.png'), sizes: '192x192', type: 'image/png', purpose: 'any' },
      { src: asset('/icon-512.png'), sizes: '512x512', type: 'image/png', purpose: 'any' },
      { src: asset('/icon-maskable.png'), sizes: '512x512', type: 'image/png', purpose: 'maskable' },
    ],
  }
}
