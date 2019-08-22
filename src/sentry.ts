import { Event, EventHint } from '@sentry/types'

const sentry = require('@sentry/node')

export const initSentry = (sentryDsn: string) => {
  sentry.init({
    dsn: sentryDsn,
    beforeSend(event: Event, hint?: EventHint) {
      if (hint && hint.originalException) {
        console.error(hint.originalException)
      }
      return event
    },
  })
}

export const enableSentryIfPossible = () => {
  const sentryDsn = process.env.SENTRY_DSN
  if (sentryDsn) {
    initSentry(sentryDsn)
  }
}
