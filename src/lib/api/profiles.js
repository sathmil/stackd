import { supabase } from '../supabaseClient'

/** @param {string} username */
export async function fetchProfileByUsername(username) {
  return supabase.from('public_profiles').select('*').eq('username', username).maybeSingle()
}

/**
 * Review count + average rating + list count for a profile. The list count
 * intentionally only counts public lists regardless of who's asking --
 * private lists still show up in the Lists tab for the owner (RLS handles
 * that split on the query itself), but the headline stat is what's
 * actually visible to anyone viewing the profile.
 * @param {string} userId
 */
export async function fetchProfileStats(userId) {
  const [{ count: reviewCount }, { data: ratings }, { count: listCount }] = await Promise.all([
    supabase.from('reviews').select('id', { count: 'exact', head: true }).eq('user_id', userId).eq('status', 'visible'),
    supabase.from('reviews').select('overall_rating').eq('user_id', userId).eq('status', 'visible'),
    supabase.from('lists').select('id', { count: 'exact', head: true }).eq('user_id', userId).eq('is_public', true),
  ])
  const values = (ratings || []).map((r) => Number(r.overall_rating))
  const avgRating = values.length ? values.reduce((a, b) => a + b, 0) / values.length : null
  return { data: { reviewCount: reviewCount || 0, avgRating, listCount: listCount || 0 }, error: null }
}

/** @param {string} userId */
export async function fetchReviewsForUser(userId) {
  return supabase.from('reviews').select('*, product_variants(*, products(*))').eq('user_id', userId).eq('status', 'visible').order('created_at', { ascending: false })
}

/**
 * No is_public filter -- RLS ("lists select public or own") already
 * returns everything when the viewer is the owner and only public rows
 * otherwise, so this one query is correct for both cases.
 * @param {string} userId
 */
export async function fetchListsForUser(userId) {
  return supabase.from('lists').select('*, list_items(count)').eq('user_id', userId).order('created_at', { ascending: false })
}

/** @param {string} userId @param {object} fields -- whatever subset of username/display_name/location/goal/avatar_url changed */
export async function updateProfile(userId, fields) {
  return supabase.from('profiles').update(fields).eq('id', userId).select().single()
}

/**
 * Anonymizes the caller's own profile and bans their auth account -- see
 * supabase/functions/delete-account for why this isn't a hard delete
 * (reviews/list_items would cascade-delete along with auth.users, silently
 * changing aggregate scores for everyone else who rated the same products).
 */
export async function deleteAccount() {
  return supabase.functions.invoke('delete-account', { body: {} })
}

/**
 * Everything RLS already lets this user read about themselves, scoped by
 * userId rather than a broader table scan -- no service role needed. Unlike
 * fetchReviewsForUser/fetchListsForUser (which filter to what's fit for
 * public display), this pulls every status so the export is complete.
 * @param {string} userId
 */
export async function exportUserData(userId) {
  const [{ data: profile, error: profileErr }, { data: reviews, error: reviewsErr }, { data: lists, error: listsErr }] = await Promise.all([
    supabase.from('profiles').select('*').eq('id', userId).single(),
    supabase.from('reviews').select('*, product_variants(flavor, size, products(name, brand_name))').eq('user_id', userId),
    supabase.from('lists').select('*, list_items(*, product_variants(flavor, size, products(name, brand_name)))').eq('user_id', userId),
  ])
  const error = profileErr || reviewsErr || listsErr
  if (error) return { data: null, error }
  return { data: { exported_at: new Date().toISOString(), profile, reviews: reviews || [], lists: lists || [] }, error: null }
}
