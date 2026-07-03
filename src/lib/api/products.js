import { supabase } from '../supabaseClient'

/**
 * Approved variants matching a search query and/or a set of DB category
 * values (already resolved from the UI's display label -- see
 * CATEGORY_DB_VALUES in Search.jsx). Ratings aren't embeddable here since
 * variant_rating_summary is a plain view, not a FK relationship -- fetch
 * it separately via fetchRatingSummaries and merge client-side.
 * @param {{ query?: string, categories?: string[] | null }} params
 */
export async function fetchApprovedVariants({ query = '', categories = null } = {}) {
  let q = supabase.from('product_variants').select('*, products!inner(*, brands(*))').eq('status', 'approved')

  if (categories) q = q.in('products.category', categories)
  if (query) q = q.or(`name.ilike.%${query}%,brand_name.ilike.%${query}%`, { foreignTable: 'products' })

  return q
}

/** @param {string} variantId */
export async function fetchVariantById(variantId) {
  return supabase.from('product_variants').select('*, products(*, brands(*))').eq('id', variantId).maybeSingle()
}

/** @param {string[]} variantIds */
export async function fetchRatingSummaries(variantIds) {
  if (variantIds.length === 0) return { data: [], error: null }
  return supabase.from('variant_rating_summary').select('*').in('variant_id', variantIds)
}
