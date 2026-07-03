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

/** @param {string} listId */
export async function fetchListItems(listId) {
  return supabase.from('list_items').select('*, product_variants(*, products(*))').eq('list_id', listId).order('rank_position', { ascending: true })
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
 * Swaps rank_position between two items -- used by the up/down move
 * buttons. Two updates rather than one to avoid violating the
 * (list_id, vacant rank) uniqueness expectations mid-write.
 * @param {{ id: string, rank_position: number }} itemA
 * @param {{ id: string, rank_position: number }} itemB
 */
export async function swapListItemRanks(itemA, itemB) {
  const { error: errA } = await supabase.from('list_items').update({ rank_position: itemB.rank_position }).eq('id', itemA.id)
  if (errA) return { error: errA }
  return supabase.from('list_items').update({ rank_position: itemA.rank_position }).eq('id', itemB.id)
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
