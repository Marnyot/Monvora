import { withSentryConfig } from '@sentry/nextjs'
import withSerwistInit from '@serwist/next'

/** @type {import('next').NextConfig} */
const securityHeaders = [
  { key: 'X-DNS-Prefetch-Control', value: 'on' },
  { key: 'Strict-Transport-Security', value: 'max-age=31536000; includeSubDomains; preload' },
  { key: 'X-Frame-Options', value: 'DENY' },
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'Referrer-Policy', value: 'origin-when-cross-origin' },
  { key: 'X-Permitted-Cross-Domain-Policies', value: 'none' },
  // same-origin-allow-popups: allow Google OAuth popup flow while preventing
  // cross-origin window references from arbitrary sites.
  { key: 'Cross-Origin-Opener-Policy', value: 'same-origin-allow-popups' },
  { key: 'Cross-Origin-Resource-Policy', value: 'same-site' },
  {
    key: 'Permissions-Policy',
    value: 'camera=(), microphone=(), geolocation=(), payment=(), usb=()',
  },
  {
    key: 'Content-Security-Policy',
    value: [
      "default-src 'self'",
      "script-src 'self' 'unsafe-eval' 'unsafe-inline' va.vercel-scripts.com https://plausible.io",
      "style-src 'self' 'unsafe-inline'",
      "img-src 'self' blob: data: lh3.googleusercontent.com",
      "connect-src 'self' https://*.supabase.co wss://*.supabase.co accounts.google.com https://*.sentry.io https://plausible.io",
      "frame-ancestors 'none'",
      "object-src 'none'",
      "base-uri 'self'",
      "form-action 'self'",
      "upgrade-insecure-requests",
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
  telemetry: false,
  authToken: process.env.SENTRY_AUTH_TOKEN,
})
