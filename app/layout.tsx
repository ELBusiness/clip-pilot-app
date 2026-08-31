import type { Metadata, Viewport } from 'next'
import './globals.css'

/**
 * The site is one static page, so everything a link preview, a search result or
 * an installed app needs has to be declared here. The share loop is the whole
 * growth engine of this genre — people post their record — and a link that
 * previews as a blank rectangle is a link nobody clicks.
 */
const SITE = 'https://162-0.app'
const TITLE = '162-0 — draft an MLB team that never loses'
const DESCRIPTION =
  'Spin for a franchise and a decade, draft thirteen legends, and simulate all 162 games. Real players from 1901 on, era-adjusted, scored by the same run estimator the analysts use.'

export const metadata: Metadata = {
  metadataBase: new URL(SITE),
  title: TITLE,
  description: DESCRIPTION,
  applicationName: '162-0',
  manifest: '/manifest.webmanifest',
  appleWebApp: { capable: true, title: '162-0', statusBarStyle: 'black-translucent' },
  icons: {
    icon: [
      { url: '/icon.svg', type: 'image/svg+xml' },
      { url: '/favicon-32.png', sizes: '32x32', type: 'image/png' },
    ],
    apple: [{ url: '/icon-192.png', sizes: '192x192', type: 'image/png' }],
  },
  openGraph: {
    type: 'website',
    siteName: '162-0',
    title: TITLE,
    description: DESCRIPTION,
    url: SITE,
    images: [{ url: '/share-card.png', width: 1200, height: 630, alt: '162-0 — draft a team that never loses' }],
  },
  twitter: {
    card: 'summary_large_image',
    title: TITLE,
    description: DESCRIPTION,
    images: ['/share-card.png'],
  },
  // The roster pack is CC BY-SA 3.0; the obligation follows the work wherever
  // it is served, so the credit is in the document as well as in the interface.
  other: {
    'data-source': 'Lahman Baseball Database / Chadwick Baseball Databank (CC BY-SA 3.0)',
  },
}

export const viewport: Viewport = {
  // Matches --ink in the default palette. A stale value here paints the
  // browser's own chrome a colour the app no longer uses.
  themeColor: '#0b0e13',
  width: 'device-width',
  initialScale: 1,
  // A game surface with its own tap targets; pinch-zoom only fights it.
  maximumScale: 1,
  viewportFit: 'cover',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap"
        />
      </head>
      <body>{children}</body>
    </html>
  )
}
