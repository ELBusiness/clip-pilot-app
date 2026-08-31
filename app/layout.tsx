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
  themeColor: '#0b1410',
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
