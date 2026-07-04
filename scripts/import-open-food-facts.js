// One-time Phase 7 catalog seed: pulls real products from the free Open Food
// Facts API into our catalog directly as status: 'approved' (bypassing manual
// review), so Search/Feed have enough density to be meaningful.
//
// Only 4 of our 7 categories have a clean, populated OFF taxonomy tag
// (validated via scripts/off-explore.js and off-explore2.js, both throwaway):
// pre_workout, greens_powder, and snack returned zero/noise results and are
// skipped here -- OFF is a general grocery database, not a fitness-specific
// one. Those categories will fill in via manual Add Product.
import dotenv from 'dotenv'
import { createClient } from '@supabase/supabase-js'

dotenv.config({ path: '.env.local' })

const USER_AGENT = 'Stackd-VibeCoding-Project/1.0 (sathmi@stanford.edu)'
const DELAY_MS = 12000
const PAGE_SIZE = 50
const TARGET_PER_CATEGORY = 50

const CATEGORY_TAGS = {
  energy_drink: 'Energy-drinks',
  protein_bar: 'Protein-bars',
  protein_powder: 'Protein-powders',
  supplement: 'Dietary-supplements',
}

const FIELDS = 'code,product_name,brands,image_front_url,ingredients_text,serving_size,nutriments'

const admin = createClient(process.env.VITE_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY)

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms))
}

async function fetchPage(tag, page) {
  const url = `https://world.openfoodfacts.org/api/v2/search?categories_tags_en=${encodeURIComponent(tag)}&fields=${FIELDS}&page_size=${PAGE_SIZE}&page=${page}&json=true`
  for (let attempt = 1; attempt <= 4; attempt++) {
    const res = await fetch(url, { headers: { 'User-Agent': USER_AGENT } })
    if (res.ok) return res.json()
    if (attempt === 4) throw new Error(`${tag} page ${page}: HTTP ${res.status} after ${attempt} attempts`)
    const backoff = DELAY_MS * attempt
    console.log(`  ${tag} page ${page}: HTTP ${res.status}, retrying in ${backoff / 1000}s (attempt ${attempt}/4)`)
    await sleep(backoff)
  }
}

function isUsable(p) {
  if (!p.product_name || p.product_name.trim().length < 2) return false
  if (!p.brands || p.brands.trim().length === 0) return false
  if (!p.image_front_url) return false
  const n = p.nutriments || {}
  if (n['energy-kcal_100g'] == null && n.proteins_100g == null) return false
  return true
}

function titleCase(str) {
  return str
    .trim()
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .replace(/(^|\s)\S/g, (c) => c.toUpperCase())
}

function num(v, decimals = 1) {
  if (v == null || Number.isNaN(v)) return null
  return Math.round(v * 10 ** decimals) / 10 ** decimals
}

function mapNutrition(p) {
  const n = p.nutriments || {}
  const pick = (base) => (n[`${base}_serving`] != null ? n[`${base}_serving`] : n[`${base}_100g`])

  return {
    calories: num(pick('energy-kcal'), 0),
    protein_g: num(pick('proteins')),
    carbs_g: num(pick('carbohydrates')),
    fat_g: num(pick('fat')),
    sugar_g: num(pick('sugars')),
    fiber_g: num(pick('fiber')),
    caffeine_mg: pick('caffeine') != null ? Math.round(pick('caffeine') * 1000) : null,
    sodium_mg: pick('sodium') != null ? Math.round(pick('sodium') * 1000) : null,
  }
}

async function upsertBrand(rawBrands) {
  const name = titleCase(rawBrands.split(',')[0])
  const { data: existing, error: findErr } = await admin.from('brands').select('id, name').ilike('name', name).maybeSingle()
  if (findErr) throw findErr
  if (existing) return existing

  const { data: created, error: insertErr } = await admin.from('brands').insert({ name }).select('id, name').single()
  if (insertErr) throw insertErr
  return created
}

async function alreadyExists(brandId, name) {
  const { data, error } = await admin.from('products').select('id').eq('brand_id', brandId).ilike('name', name.trim()).maybeSingle()
  if (error) throw error
  return !!data
}

async function importCategory(category, tag) {
  console.log(`\n--- ${category} (${tag}) ---`)
  let imported = 0
  let page = 1

  while (imported < TARGET_PER_CATEGORY && page <= 6) {
    const body = await fetchPage(tag, page)
    const products = body.products || []
    if (products.length === 0) break

    for (const p of products) {
      if (imported >= TARGET_PER_CATEGORY) break
      if (!isUsable(p)) continue

      const name = titleCase(p.product_name)
      const brand = await upsertBrand(p.brands)

      if (await alreadyExists(brand.id, name)) continue

      const { data: product, error: productErr } = await admin
        .from('products')
        .insert({
          brand_id: brand.id,
          brand_name: brand.name,
          name,
          category,
          status: 'approved',
        })
        .select('id')
        .single()
      if (productErr) {
        console.log(`  skip (product insert failed): ${brand.name} ${name} -- ${productErr.message}`)
        continue
      }

      const nutrition = mapNutrition(p)
      const { error: variantErr } = await admin.from('product_variants').insert({
        product_id: product.id,
        upc: p.code || null,
        image_url: p.image_front_url,
        image_alt: `${brand.name} ${name}`,
        serving_size: p.serving_size || null,
        ingredients_text: p.ingredients_text || null,
        ...nutrition,
        data_source: 'external_api',
        status: 'approved',
      })
      if (variantErr) {
        console.log(`  skip (variant insert failed): ${brand.name} ${name} -- ${variantErr.message}`)
        continue
      }

      imported++
      console.log(`  [${imported}/${TARGET_PER_CATEGORY}] ${brand.name} - ${name}`)
    }

    page++
    if (imported < TARGET_PER_CATEGORY) await sleep(DELAY_MS)
  }

  console.log(`${category}: imported ${imported}`)
  return imported
}

async function main() {
  let total = 0
  const entries = Object.entries(CATEGORY_TAGS)
  for (let i = 0; i < entries.length; i++) {
    const [category, tag] = entries[i]
    total += await importCategory(category, tag)
    if (i < entries.length - 1) await sleep(DELAY_MS)
  }
  console.log(`\nTotal imported: ${total}`)
}

main().catch((err) => {
  console.error('Import failed:', err)
  process.exit(1)
})
