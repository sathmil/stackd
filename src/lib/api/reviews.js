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

/** All active tags, for the review form's tag picker. */
export async function fetchActiveTags() {
  return supabase.from('tags').select('id, label, sentiment').eq('is_active', true).order('label')
}

/**
 * The current user's own review for a variant, if any -- used to pre-fill
 * the form when editing rather than creating a duplicate.
 * @param {string} variantId
 * @param {string} userId
 */
export async function fetchOwnReview(variantId, userId) {
  return supabase.from('reviews').select('*, review_tags(tag_id)').eq('variant_id', variantId).eq('user_id', userId).maybeSingle()
}

/**
 * One review per (variant_id, user_id) -- upsert so re-rating updates
 * rather than erroring or duplicating.
 * @param {{ variantId: string, userId: string, overallRating: number, wouldBuyAgain: boolean|null, notes: string }} params
 */
export async function upsertReview({ variantId, userId, overallRating, wouldBuyAgain, notes }) {
  return supabase
    .from('reviews')
    .upsert(
      {
        variant_id: variantId,
        user_id: userId,
        overall_rating: overallRating,
        would_buy_again: wouldBuyAgain,
        notes: notes || null,
      },
      { onConflict: 'variant_id,user_id' },
    )
    .select()
    .single()
}

/**
 * Delete-and-reinsert rather than diffing -- simplest correct approach at
 * this scale (a handful of tags per review).
 * @param {string} reviewId
 * @param {string[]} tagIds
 */
export async function syncReviewTags(reviewId, tagIds) {
  const { error: deleteError } = await supabase.from('review_tags').delete().eq('review_id', reviewId)
  if (deleteError) return { error: deleteError }
  if (tagIds.length === 0) return { error: null }
  const { error } = await supabase.from('review_tags').insert(tagIds.map((tagId) => ({ review_id: reviewId, tag_id: tagId })))
  return { error }
}

/** @param {string} reviewId */
export async function deleteReview(reviewId) {
  return supabase.from('reviews').delete().eq('id', reviewId)
}
