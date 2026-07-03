import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabaseClient'

/** @returns {import('@supabase/supabase-js').User | null | undefined} undefined = loading, null = logged out */
export function useCurrentUser() {
  const [user, setUser] = useState(undefined)

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setUser(data.user ?? null))
  }, [])

  return user
}
