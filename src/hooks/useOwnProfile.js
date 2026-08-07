import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabaseClient'

/**
 * The current user's own username + avatar, for the Feed nav avatar link to
 * "my profile" without a full profile fetch. Mirrors useOwnUsername.
 * @param {boolean} enabled -- pass false while logged out, no point querying
 * @returns {{ username: string, avatar_url: string|null } | null | undefined} undefined = loading, null = logged out or no data yet
 */
export function useOwnProfile(enabled) {
  const [profile, setProfile] = useState(undefined)

  useEffect(() => {
    if (!enabled) {
      setProfile(null)
      return
    }
    supabase
      .from('profiles')
      .select('username, avatar_url')
      .single()
      .then(({ data }) => setProfile(data ?? null))
  }, [enabled])

  return profile
}
