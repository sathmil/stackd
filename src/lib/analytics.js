import { supabase } from './supabaseClient'

/**
 * Fire-and-forget event logging to the `events` table. Never throws and
 * never blocks the caller -- a failed analytics write (e.g. an anonymous
 * visitor, who has no insert policy) should never break the actual feature
 * it's attached to.
 * @param {string} eventName
 * @param {Record<string, unknown>} [metadata]
 */
export function trackEvent(eventName, metadata = {}) {
  supabase.auth.getUser().then(({ data }) => {
    if (!data.user) return
    supabase
      .from('events')
      .insert({ user_id: data.user.id, event_name: eventName, metadata })
      .then(() => {})
  })
}
