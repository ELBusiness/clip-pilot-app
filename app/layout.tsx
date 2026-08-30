import type { Metadata, Viewport } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: '162-0 — draft an MLB team that never loses',
  description:
    'Spin for a franchise and an era, draft one legend into each of the nine positions, and simulate all 162 games. Era-adjusted stats and a real run estimator.',
  applicationName: '162-0',
  appleWebApp: { capable: true, title: '162-0', statusBarStyle: 'black-translucent' },
}

export const viewport: Viewport = {
  themeColor: '#08090c',
  width: 'device-width',
  initialScale: 1,
  // A game surface with its own tap targets; pinch-zoom only fights it.
  maximumScale: 1,
  viewportFit: 'cover',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  )
}
