import { supabase } from '../supabaseClient'

// `cover_image_url` may not exist yet in every environment (it ships in a
// migration that has to be run by hand -- see supabase/migrations). A
// `select('*')` is naturally resilient to that (it just returns whatever
// columns currently exist), but anywhere the column has to be named
// explicitly (a narrower select or an insert naming it, e.g. below) goes
// through this helper instead: try with the column named, and on a "column
// doesn't exist" error transparently retry without it, so a not-yet-applied
// migration can't take the whole query/insert down. Missing-column shows up
// as two different PostgREST error codes depending on the operation --
// 42703 (Postgres's own undefined_column) for select/filter, PGRST204
// ("column not found in schema cache") for insert/update -- so both are
// checked, not just one.
const MISSING_COLUMN_CODES = ['42703', 'PGRST204']
async function withOptionalCoverColumn(build) {
  const withCover = await build(true)
  if (!withCover.error || !MISSING_COLUMN_CODES.includes(withCover.error.code)) return withCover
  return build(false)
}

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

/** @param {{ userId: string, name: string, isPublic: boolean, coverImageUrl?: string|null }} params */
export async function createList({ userId, name, isPublic, coverImageUrl }) {
  const row = { user_id: userId, name, is_public: isPublic }
  if (!coverImageUrl) return supabase.from('lists').insert(row).select().single()
  return withOptionalCoverColumn((hasCover) =>
    supabase
      .from('lists')
      .insert(hasCover ? { ...row, cover_image_url: coverImageUrl } : row)
      .select()
      .single(),
  )
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

/**
 * "X added <product> to <list>" activity, for the Feed's activity stream
 * alongside reviews -- only from public lists, same visibility rule RLS
 * already enforces on list_items directly.
 * @param {{ limit?: number, offset?: number }} params
 */
export async function fetchRecentPublicListAdditions({ limit = 15, offset = 0 } = {}) {
  return supabase
    .from('list_items')
    .select('*, lists!inner(id, name, is_public, user_id), product_variants(*, products(*))')
    .eq('lists.is_public', true)
    .order('added_at', { ascending: false })
    .range(offset, offset + limit - 1)
}

/**
 * Feed's "Trending Stacks" carousel -- the most-populated public lists,
 * each with its first item as a cover image/category. Real lists people
 * actually made, not editorial content (there's no cover-image/category
 * field on `lists` for hand-curated collections -- see conversation).
 * @param {number} limit
 */
export async function fetchTrendingLists(limit = 8) {
  const { data: lists, error: listsErr } = await withOptionalCoverColumn((hasCover) =>
    supabase
      .from('lists')
      .select(hasCover ? 'id, name, cover_image_url, list_items(count)' : 'id, name, list_items(count)')
      .eq('is_public', true)
      .order('updated_at', { ascending: false })
      .limit(50),
  )
  if (listsErr) return { data: [], error: listsErr }

  const topLists = (lists || [])
    .map((l) => ({ ...l, itemCount: l.list_items?.[0]?.count || 0 }))
    .filter((l) => l.itemCount > 0)
    .sort((a, b) => b.itemCount - a.itemCount)
    .slice(0, limit)
  if (topLists.length === 0) return { data: [], error: null }

  const { data: covers, error: coversErr } = await supabase
    .from('list_items')
    .select('list_id, product_variants(*, products(*))')
    .in(
      'list_id',
      topLists.map((l) => l.id),
    )
    .eq('rank_position', 1)
  if (coversErr) return { data: [], error: coversErr }

  const coverByList = Object.fromEntries((covers || []).map((c) => [c.list_id, c.product_variants]))
  return { data: topLists.map((l) => ({ ...l, cover: coverByList[l.id] || null })).filter((l) => l.cover?.products), error: null }
}
