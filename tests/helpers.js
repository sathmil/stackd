import dotenv from 'dotenv'
import { createClient } from '@supabase/supabase-js'

// dotenv's default `dotenv/config` import only looks for a file literally
// named `.env` -- this project's real env file is `.env.local`, so it
// needs to be pointed at explicitly or the service-role key (and anything
// else) silently fails to load.
dotenv.config({ path: '.env.local' })

const url = process.env.VITE_SUPABASE_URL
const anonKey = process.env.VITE_SUPABASE_ANON_KEY

if (!url || !anonKey) {
  throw new Error('VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY must be set (they are read from .env.local)')
}

// Two fixed, reusable test accounts -- not throwaway emails per run, so QA
// is repeatable. Requires "Confirm email" to be OFF in this Supabase
// project's Auth settings (fine for a dev project, never do this in prod).
const TEST_USERS = [
  { email: process.env.TEST_USER_1_EMAIL || 'sathmi+stackdtest1@stanford.edu', password: 'stackd-test-1234' },
  { email: process.env.TEST_USER_2_EMAIL || 'sathmi+stackdtest2@stanford.edu', password: 'stackd-test-1234' },
]

export async function getTestClient(index) {
  const client = createClient(url, anonKey)
  const { email, password } = TEST_USERS[index]

  const signIn = await client.auth.signInWithPassword({ email, password })
  if (signIn.error) {
    const signUp = await client.auth.signUp({ email, password })
    if (signUp.error) throw signUp.error
  }

  return client
}

export function serviceClient() {
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!serviceKey) {
    throw new Error('SUPABASE_SERVICE_ROLE_KEY must be set in .env.local for the service-role test (never expose this key client-side)')
  }
  return createClient(url, serviceKey)
}
