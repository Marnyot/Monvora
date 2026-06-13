import type { Metadata, Viewport } from 'next'
import localFont from 'next/font/local'
import { SpeedInsights } from '@vercel/speed-insights/next'
import './globals.css'
import { Providers } from '@/components/providers'
import { PlausibleScript } from '@/components/analytics/plausible-script'

const geistSans = localFont({
  src: './fonts/GeistVF.woff',
  variable: '--font-geist-sans',
  weight: '100 900',
})

const APP_NAME = 'Monvora'
const APP_DESCRIPTION = 'Personal finance OS untuk pengguna Indonesia'

export const metadata: Metadata = {
  applicationName: APP_NAME,
  title: APP_NAME,
  description: APP_DESCRIPTION,
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: APP_NAME,
  },
  formatDetection: {
    telephone: false,
  },
  icons: {
    icon: [
      { url: '/icons/icon-192.png', sizes: '192x192', type: 'image/png' },
      { url: '/icons/icon-512.png', sizes: '512x512', type: 'image/png' },
    ],
    apple: '/icons/apple-touch-icon.png',
  },
  verification: {
    google: 'F3KFDQWVWLlTgaOrAcmYl3rrUg-BgjpbwTqUKvOBVrg',
  },
}

export const viewport: Viewport = {
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#0f172a' },
    { media: '(prefers-color-scheme: dark)', color: '#020817' },
  ],
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="id" suppressHydrationWarning>
      <head>
        <PlausibleScript />
      </head>
      <body className={`${geistSans.variable} font-sans antialiased`}>
        <Providers>{children}</Providers>
        <SpeedInsights />
      </body>
    </html>
  )
}
