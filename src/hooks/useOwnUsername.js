import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabaseClient'

/**
 * Just the current user's own username, for routing to "my profile" (e.g.
 * the bottom nav's Profile tab) without a full profile fetch.
 * @param {boolean} enabled -- pass false while logged out, no point querying
 * @returns {string | null | undefined} undefined = loading, null = logged out or no session yet
 */
export function useOwnUsername(enabled) {
  const [username, setUsername] = useState(undefined)

  useEffect(() => {
    if (!enabled) {
      setUsername(null)
      return
    }
    supabase
      .from('profiles')
      .select('username')
      .single()
      .then(({ data }) => setUsername(data?.username ?? null))
  }, [enabled])

  return username
}
