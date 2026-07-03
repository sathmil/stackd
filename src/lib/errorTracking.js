import * as Sentry from '@sentry/react'

/**
 * No-ops locally/in any environment without a DSN configured -- so
 * development never requires a Sentry account, and Sentry only turns on
 * once VITE_SENTRY_DSN is actually set (e.g. in Vercel's env vars).
 */
export function initErrorTracking() {
  const dsn = import.meta.env.VITE_SENTRY_DSN
  if (!dsn) return
  Sentry.init({ dsn, sendDefaultPii: false })
}

export { Sentry }
