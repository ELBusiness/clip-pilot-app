import type { MetadataRoute } from 'next'
import { SITE_URL, asset } from '@/lib/site'

/*
 * Reading the deployment's base path makes this route look dynamic to the
 * build, which a static export cannot produce. The values are baked in at
 * build time, so pinning it static is accurate as well as necessary.
 */
export const dynamic = 'force-static'


/** One page, but a search engine still wants to be told where it is. */
export default function sitemap(): MetadataRoute.Sitemap {
  return [
    {
      url: `${SITE_URL}${asset('/')}`,
      changeFrequency: 'daily',
      priority: 1,
    },
  ]
}
