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

/**
 * Global reverse-chronological feed -- no follow graph (see DECISIONS.md:
 * "aggregate-only ratings, no follow graph, for MVP"). Products/variants
 * pending approval aren't excluded server-side (reviews RLS only cares
 * about the review's own status, not the underlying product's), so the
 * caller filters those out client-side the same way ListDetail.jsx does
 * for RLS-hidden list items.
 * @param {{ limit?: number, offset?: number }} params
 */
export async function fetchRecentReviews({ limit = 15, offset = 0 } = {}) {
  return supabase
    .from('reviews')
    .select('*, product_variants(*, products(*))')
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
 * Creates a new global tag (or returns the existing one if the label
 * already exists -- `label` is unique, so a race/duplicate submit just
 * resolves to the same row instead of erroring the user).
 * @param {string} label
 */
export async function createTag(label) {
  const trimmed = label.trim()
  if (!trimmed) return { data: null, error: new Error('Tag label is required.') }
  const { data: created, error } = await supabase.from('tags').insert({ label: trimmed, sentiment: 'neutral' }).select('id, label, sentiment').single()
  if (!error) return { data: created, error: null }
  if (error.code === '23505') return supabase.from('tags').select('id, label, sentiment').eq('label', trimmed).single()
  return { data: null, error }
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
 * rather than erroring or duplicating. overall_rating is derived here (the
 * average of the three sub-ratings, rounded to 1 decimal) rather than in
 * SQL, so every existing aggregate view/sort/ScorePill that reads
 * overall_rating keeps working unchanged.
 * @param {{ variantId: string, userId: string, tasteRating: number, valueRating: number, effectivenessRating: number, wouldBuyAgain: boolean|null, notes: string }} params
 */
export async function upsertReview({ variantId, userId, tasteRating, valueRating, effectivenessRating, wouldBuyAgain, notes }) {
  const overallRating = Math.round(((tasteRating + valueRating + effectivenessRating) / 3) * 10) / 10
  return supabase
    .from('reviews')
    .upsert(
      {
        variant_id: variantId,
        user_id: userId,
        taste_rating: tasteRating,
        value_rating: valueRating,
        effectiveness_rating: effectivenessRating,
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

/**
 * No select policy on review_reports -- moderation happens by reading the
 * table directly in Studio, not through the app. A unique(review_id,
 * reporter_id) constraint on the table stops the same person reporting the
 * same review twice; the caller should treat a unique-violation error as
 * "already reported" rather than a real failure.
 * @param {string} reviewId @param {string} reporterId @param {string} reason
 */
export async function reportReview(reviewId, reporterId, reason) {
  return supabase.from('review_reports').insert({ review_id: reviewId, reporter_id: reporterId, reason: reason || null })
}
