import { supabase } from '../supabaseClient'

/** @param {string} userId @param {string} targetUserId */
export async function fetchFollowStatus(userId, targetUserId) {
  return supabase.from('follows').select('follower_id').eq('follower_id', userId).eq('followee_id', targetUserId).maybeSingle()
}

/** @param {string} userId */
export async function fetchFollowCounts(userId) {
  const [{ count: followerCount }, { count: followingCount }] = await Promise.all([
    supabase.from('follows').select('follower_id', { count: 'exact', head: true }).eq('followee_id', userId),
    supabase.from('follows').select('follower_id', { count: 'exact', head: true }).eq('follower_id', userId),
  ])
  return { data: { followerCount: followerCount || 0, followingCount: followingCount || 0 }, error: null }
}

/** @param {string} followerId @param {string} followeeId */
export async function followUser(followerId, followeeId) {
  return supabase.from('follows').insert({ follower_id: followerId, followee_id: followeeId })
}

/** @param {string} followerId @param {string} followeeId */
export async function unfollowUser(followerId, followeeId) {
  return supabase.from('follows').delete().eq('follower_id', followerId).eq('followee_id', followeeId)
}

/**
 * Just the follow rows (follower_id/followee_id/created_at) -- public_profiles
 * is a view with no real FK for PostgREST to embed through, so the caller
 * fetches profiles for the returned ids separately via fetchProfilesByIds,
 * same two-step pattern Feed.jsx/Profile.jsx already use for reviewers.
 * @param {string} userId
 */
export async function fetchFollowers(userId) {
  return supabase.from('follows').select('follower_id, created_at').eq('followee_id', userId).order('created_at', { ascending: false })
}

/** @param {string} userId */
export async function fetchFollowing(userId) {
  return supabase.from('follows').select('followee_id, created_at').eq('follower_id', userId).order('created_at', { ascending: false })
}

/** @param {string} userId @param {string} variantId */
export async function fetchWishlistMembership(userId, variantId) {
  return supabase.from('wishlist_items').select('id').eq('user_id', userId).eq('variant_id', variantId).maybeSingle()
}

/** Own wishlist, most recently added first. @param {string} userId */
export async function fetchWishlist(userId) {
  return supabase.from('wishlist_items').select('*, product_variants(*, products(*))').eq('user_id', userId).order('created_at', { ascending: false })
}

/** @param {string} userId @param {string} variantId */
export async function addToWishlist(userId, variantId) {
  return supabase.from('wishlist_items').insert({ user_id: userId, variant_id: variantId }).select().single()
}

/** @param {string} itemId */
export async function removeFromWishlist(itemId) {
  return supabase.from('wishlist_items').delete().eq('id', itemId)
}
