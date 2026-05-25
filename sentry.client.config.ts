import * as Sentry from '@sentry/nextjs'

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  environment: process.env.NODE_ENV,

  // Sampling minimal — hanya error, bukan performance
  tracesSampleRate: 0,
  replaysSessionSampleRate: 0,
  replaysOnErrorSampleRate: 0,

  // Aktif hanya jika DSN tersedia
  enabled: !!process.env.NEXT_PUBLIC_SENTRY_DSN,

  beforeSend(event) {
    // Hapus breadcrumbs yang bisa mengandung data form atau request
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const crumbs = (event as any).breadcrumbs
    if (Array.isArray(crumbs)) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      ;(event as any).breadcrumbs = crumbs.filter(
        (b: { category?: string }) => b.category !== 'ui.input' && b.category !== 'xhr'
      )
    }
    return event
  },
})
