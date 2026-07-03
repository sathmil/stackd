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
