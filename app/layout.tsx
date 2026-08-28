import type { Metadata, Viewport } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'Perfect Season — draft a team that never loses',
  description:
    'Spin for a franchise and an era, draft legends into every roster spot, and simulate a full season. Baseball, basketball, football, and soccer.',
  applicationName: 'Perfect Season',
  appleWebApp: { capable: true, title: 'Perfect Season', statusBarStyle: 'black-translucent' },
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
