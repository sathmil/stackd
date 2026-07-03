import { supabase } from '../supabaseClient'

/**
 * @param {string} variantId
 * @param {{ limit?: number, offset?: number }} params
 */
export async function fetchReviewsForVariant(variantId, { limit = 10, offset = 0 } = {}) {
  return supabase
    .from('reviews')
    .select('*', { count: 'exact' })
    .eq('variant_id', variantId)
    .eq('status', 'visible')
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1)
}

/** @param {string[]} userIds */
export async function fetchProfilesByIds(userIds) {
  if (userIds.length === 0) return { data: [], error: null }
  return supabase.from('public_profiles').select('*').in('id', userIds)
}

/** @param {string[]} reviewIds */
export async function fetchTagsForReviews(reviewIds) {
  if (reviewIds.length === 0) return { data: [], error: null }
  return supabase.from('review_tags').select('review_id, tags(id, label, sentiment)').in('review_id', reviewIds)
}
