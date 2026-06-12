import { withSentryConfig } from '@sentry/nextjs'
import withSerwistInit from '@serwist/next'

/** @type {import('next').NextConfig} */
const securityHeaders = [
  { key: 'X-DNS-Prefetch-Control', value: 'on' },
  { key: 'Strict-Transport-Security', value: 'max-age=31536000; includeSubDomains; preload' },
  { key: 'X-Frame-Options', value: 'DENY' },
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'Referrer-Policy', value: 'origin-when-cross-origin' },
  {
    key: 'Permissions-Policy',
    value: 'camera=(), microphone=(), geolocation=()',
  },
  {
    key: 'Content-Security-Policy',
    value: [
      "default-src 'self'",
      // 'unsafe-eval' + 'wasm-unsafe-eval' untuk Tesseract WASM; blob: untuk worker blob URL; jsdelivr untuk worker.min.js + tesseract-core
      "script-src 'self' 'unsafe-eval' 'wasm-unsafe-eval' 'unsafe-inline' blob: va.vercel-scripts.com https://cdn.jsdelivr.net",
      // Tesseract worker dibangun dari blob URL — wajib diizinkan
      "worker-src 'self' blob:",
      "style-src 'self' 'unsafe-inline'",
      "img-src 'self' blob: data: lh3.googleusercontent.com",
      // jsdelivr untuk worker/core, tessdata.projectnaptha.com untuk eng.traineddata
      "connect-src 'self' https://*.supabase.co wss://*.supabase.co accounts.google.com https://cdn.jsdelivr.net https://tessdata.projectnaptha.com",
    ].join('; '),
  },
]

const nextConfig = {
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: securityHeaders,
      },
    ]
  },
}

const withSerwist = withSerwistInit({
  swSrc: 'app/sw.ts',
  swDest: 'public/sw.js',
  disable: process.env.NODE_ENV === 'development',
  cacheOnNavigation: false,
  reloadOnOnline: true,
})

export default withSentryConfig(withSerwist(nextConfig), {
  // Hanya upload source maps saat SENTRY_DSN tersedia (production)
  silent: !process.env.SENTRY_DSN,
  disableServerWebpackPlugin: !process.env.SENTRY_DSN,
  disableClientWebpackPlugin: !process.env.SENTRY_DSN,
  hideSourceMaps: true,
})
