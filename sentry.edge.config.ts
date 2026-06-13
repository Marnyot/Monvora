import * as Sentry from '@sentry/nextjs'

Sentry.init({
  dsn: process.env.SENTRY_DSN,
  environment: process.env.NODE_ENV,

  tracesSampleRate: 0,

  enabled: !!process.env.SENTRY_DSN,

  beforeSend(event) {
    delete event.request?.data
    delete event.request?.cookies
    delete event.request?.headers

    if (event.user) {
      event.user = { id: event.user.id }
    }

    return event
  },
})
