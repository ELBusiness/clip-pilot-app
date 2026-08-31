import type { MetadataRoute } from 'next'
import { SITE_URL, asset } from '@/lib/site'

/*
 * Reading the deployment's base path makes this route look dynamic to the
 * build, which a static export cannot produce. The values are baked in at
 * build time, so pinning it static is accurate as well as necessary.
 */
export const dynamic = 'force-static'


export default function robots(): MetadataRoute.Robots {
  return {
    rules: { userAgent: '*', allow: '/' },
    sitemap: `${SITE_URL}${asset('/sitemap.xml')}`,
  }
}
