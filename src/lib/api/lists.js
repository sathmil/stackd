import { supabase } from '../supabaseClient'

/** @param {string} userId */
export async function fetchOwnLists(userId) {
  return supabase.from('lists').select('*, list_items(count)').eq('user_id', userId).order('created_at', { ascending: false })
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
