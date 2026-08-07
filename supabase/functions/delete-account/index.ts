// Phase 10: account deletion. Anonymizes the profile but does NOT hard-delete
// auth.users -- reviews.user_id and list_items reference it with `on delete
// cascade`, so a real delete would silently wipe someone's rating history
// and change aggregate scores for every other user who rated the same
// products. Instead: strip identifying profile fields, then ban the auth
// user and scramble their email so they can never log back in or request a
// password reset with the old address.
import { createClient } from 'jsr:@supabase/supabase-js@2'
import { corsHeaders } from '../_shared/cors.ts'

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  try {
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) return new Response(JSON.stringify({ error: 'missing authorization' }), { status: 401, headers: corsHeaders })

    // Verify the caller's own identity via their JWT (not the service role)
    // so only the account owner can trigger deletion for themselves.
    const callerClient = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_ANON_KEY')!, {
      global: { headers: { Authorization: authHeader } },
    })
    const { data: userData, error: userErr } = await callerClient.auth.getUser()
    if (userErr || !userData.user) {
      return new Response(JSON.stringify({ error: 'invalid session' }), { status: 401, headers: corsHeaders })
    }
    const userId = userData.user.id

    const admin = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!)

    const anonUsername = `deleted_user_${userId.slice(0, 8)}`
    const { error: profileErr } = await admin.from('profiles').update({ username: anonUsername, display_name: null, avatar_url: null, location: null, goal: null, birthdate: null }).eq('id', userId)
    if (profileErr) return new Response(JSON.stringify({ error: profileErr.message }), { status: 500, headers: corsHeaders })

    const { error: banErr } = await admin.auth.admin.updateUserById(userId, {
      email: `deleted-${userId}@deleted.invalid`,
      ban_duration: '876000h', // ~100 years -- effectively permanent
    })
    if (banErr) return new Response(JSON.stringify({ error: banErr.message }), { status: 500, headers: corsHeaders })

    return new Response(JSON.stringify({ success: true }), { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
  } catch (err) {
    return new Response(JSON.stringify({ error: String(err) }), { status: 500, headers: corsHeaders })
  }
})
