import type { Metadata } from 'next'
import localFont from 'next/font/local'
import { SpeedInsights } from '@vercel/speed-insights/next'
import './globals.css'
import { Providers } from '@/components/providers'

const geistSans = localFont({
  src: './fonts/GeistVF.woff',
  variable: '--font-geist-sans',
  weight: '100 900',
})

export const metadata: Metadata = {
  title: 'Monvora',
  description: 'Personal finance OS untuk pengguna Indonesia',
  verification: {
    google: 'F3KFDQWVWLlTgaOrAcmYl3rrUg-BgjpbwTqUKvOBVrg',
  },
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="id" suppressHydrationWarning>
      <body className={`${geistSans.variable} font-sans antialiased`}>
        <Providers>{children}</Providers>
        <SpeedInsights />
      </body>
    </html>
  )
}
