import { supabase } from '../supabaseClient'

/** @param {string} userId */
export async function fetchOwnLists(userId) {
  return supabase.from('lists').select('*, list_items(count)').eq('user_id', userId).order('created_at', { ascending: false })
}

/**
 * Which of a user's own lists already contain a given variant, and the
 * list_item id for each -- lets the "add to list" picker show current
 * membership and remove without a separate lookup.
 * @param {string[]} listIds
 * @param {string} variantId
 */
export async function fetchListMembership(listIds, variantId) {
  if (listIds.length === 0) return { data: [], error: null }
  return supabase.from('list_items').select('id, list_id').eq('variant_id', variantId).in('list_id', listIds)
}

/** @param {string} listId */
export async function fetchListById(listId) {
  return supabase.from('lists').select('*').eq('id', listId).maybeSingle()
}

/**
 * Embeds every review on each variant (not filtered to the list owner --
 * PostgREST can't filter two embed levels deep in one query) so the caller
 * can pick out the owner's own overall_rating and sort by it client-side.
 * Still ordered by rank_position (insertion order) as the base order, which
 * becomes the stable tiebreak for equal/missing ratings after that sort.
 * @param {string} listId
 */
export async function fetchListItems(listId) {
  return supabase.from('list_items').select('*, product_variants(*, products(*), reviews(user_id, overall_rating))').eq('list_id', listId).order('rank_position', { ascending: true })
}

/** @param {{ userId: string, name: string, isPublic: boolean }} params */
export async function createList({ userId, name, isPublic }) {
  return supabase.from('lists').insert({ user_id: userId, name, is_public: isPublic }).select().single()
}

/** @param {string} listId */
export async function deleteList(listId) {
  return supabase.from('lists').delete().eq('id', listId)
}

/** @param {string} listId @param {boolean} isPublic */
export async function updateListVisibility(listId, isPublic) {
  return supabase.from('lists').update({ is_public: isPublic }).eq('id', listId).select().single()
}

/**
 * Appends to the end of the list -- no drag-to-reorder in this phase, just
 * add/remove, so the next rank is always (current max + 1).
 * @param {string} listId
 * @param {string} variantId
 */
export async function addListItem(listId, variantId) {
  const { data: existing } = await supabase.from('list_items').select('rank_position').eq('list_id', listId).order('rank_position', { ascending: false }).limit(1).maybeSingle()
  const nextRank = (existing?.rank_position || 0) + 1
  return supabase.from('list_items').insert({ list_id: listId, variant_id: variantId, rank_position: nextRank }).select().single()
}

/** @param {string} itemId */
export async function removeListItem(itemId) {
  return supabase.from('list_items').delete().eq('id', itemId)
}
