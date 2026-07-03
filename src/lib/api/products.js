import { supabase } from '../supabaseClient'

/**
 * Approved variants matching a search query and/or a set of DB category
 * values (already resolved from the UI's display label -- see
 * CATEGORY_DB_VALUES in Search.jsx), plus the current user's own
 * not-yet-approved submissions -- no explicit status filter here at all,
 * relying entirely on RLS ("approved or own") to decide what comes back,
 * so a logged-out visitor only ever gets approved rows for free. Ratings
 * aren't embeddable here since variant_rating_summary is a plain view, not
 * a FK relationship -- fetch it separately via fetchRatingSummaries and
 * merge client-side.
 * @param {{ query?: string, categories?: string[] | null }} params
 */
export async function fetchVariantsForCatalog({ query = '', categories = null } = {}) {
  let q = supabase.from('product_variants').select('*, products!inner(*, brands(*))')

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

/** All brand names, for the add-product form's autocomplete -- steers people toward an existing brand instead of typing a near-duplicate. */
export async function fetchAllBrands() {
  return supabase.from('brands').select('id, name').order('name')
}

/**
 * Case-insensitive lookup, creates one if no match -- avoids near-duplicate
 * brand rows for casing/whitespace variants of the same real brand.
 * @param {string} name
 */
export async function fetchOrCreateBrand(name) {
  const trimmed = name.trim()
  const { data: existing, error: findError } = await supabase.from('brands').select('*').ilike('name', trimmed).maybeSingle()
  if (findError) return { data: null, error: findError }
  if (existing) return { data: existing, error: null }
  return supabase.from('brands').insert({ name: trimmed }).select().single()
}

/** @param {{ brandId: string, brandName: string, name: string, category: string, description?: string, createdBy: string }} params */
export async function createProduct({ brandId, brandName, name, category, description, createdBy }) {
  return supabase
    .from('products')
    .insert({ brand_id: brandId, brand_name: brandName, name, category, description: description || null, created_by: createdBy })
    .select()
    .single()
}

/** @param {object} fields -- product_id, flavor, size, nutrition columns, ingredients_text, image_url, created_by */
export async function createProductVariant(fields) {
  return supabase
    .from('product_variants')
    .insert({ ...fields, data_source: 'manual' })
    .select()
    .single()
}

/** @param {string} productId @param {{ brandId: string, brandName: string, name: string, category: string, description?: string }} fields */
export async function updateProduct(productId, { brandId, brandName, name, category, description }) {
  return supabase
    .from('products')
    .update({ brand_id: brandId, brand_name: brandName, name, category, description: description || null })
    .eq('id', productId)
    .select()
    .single()
}

/** @param {string} variantId @param {object} fields -- flavor, nutrition columns, ingredients_text, image_url */
export async function updateProductVariant(variantId, fields) {
  return supabase.from('product_variants').update(fields).eq('id', variantId).select().single()
}

/** @param {string} key */
export async function fetchFeatureFlag(key) {
  return supabase.from('feature_flags').select('enabled').eq('key', key).maybeSingle()
}
