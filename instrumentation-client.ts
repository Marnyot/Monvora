import * as Sentry from '@sentry/nextjs'

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  environment: process.env.NODE_ENV,

  tracesSampleRate: 0,
  replaysSessionSampleRate: 0,
  replaysOnErrorSampleRate: 0,

  enabled: !!process.env.NEXT_PUBLIC_SENTRY_DSN,

  beforeSend(event) {
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

export const onRouterTransitionStart = Sentry.captureRouterTransitionStart
