// Phase 7 follow-up: pre_workout and greens_powder had no usable Open Food
// Facts taxonomy tag (OFF is a general grocery database, not fitness-specific).
// NIH's DSLD (Dietary Supplement Label Database) is the authoritative US
// source for exactly this category -- but its public API exposes no product
// images (every label's `thumbnail` field is empty, confirmed across dozens
// of samples), so these imports land with image_url: null. ProductPage
// already renders a placeholder box when image_url is missing, so this is a
// deliberate, accepted tradeoff for this category, not a bug.
import dotenv from 'dotenv'
import { createClient } from '@supabase/supabase-js'

dotenv.config({ path: '.env.local' })

const USER_AGENT = 'Stackd-VibeCoding-Project/1.0 (sathmi@stanford.edu)'
const DELAY_MS = 500
const PAGE_SIZE = 50
const TARGET_PER_CATEGORY = 50

const CATEGORY_QUERIES = {
  pre_workout: 'pre-workout',
  greens_powder: 'greens powder',
}

const admin = createClient(process.env.VITE_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY)

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms))
}

async function fetchJson(url) {
  const res = await fetch(url, { headers: { 'User-Agent': USER_AGENT } })
  if (!res.ok) throw new Error(`HTTP ${res.status} for ${url}`)
  return res.json()
}

async function searchPage(query, from) {
  const url = `https://api.ods.od.nih.gov/dsld/v9/search-filter?q=${encodeURIComponent(query)}&size=${PAGE_SIZE}&from=${from}`
  return fetchJson(url)
}

async function fetchLabel(id) {
  return fetchJson(`https://api.ods.od.nih.gov/dsld/v9/label/${id}`)
}

function flattenIngredientRows(rows, out = []) {
  for (const row of rows) {
    out.push(row)
    if (row.nestedRows?.length) flattenIngredientRows(row.nestedRows, out)
  }
  return out
}

function firstQuantity(row) {
  return row.quantity?.[0] || null
}

// DSLD label unit strings aren't consistent across entries -- some use
// short codes ('g', 'mg', '{Calories}'), others spell them out
// ('Gram(s)', 'Calorie(s)'). Normalize before comparing.
function normalizeUnit(rawUnit) {
  if (!rawUnit) return null
  const s = rawUnit.toLowerCase()
  if (s === 'np') return null
  if (s.includes('calorie')) return 'kcal'
  if (s.startsWith('mcg') || s.startsWith('microgram') || s === 'ug') return 'mcg'
  if (s.startsWith('mg') || s.startsWith('milligram')) return 'mg'
  if (s.startsWith('g') || s.startsWith('gram')) return 'g'
  return null
}

function toUnit(row, targetUnit) {
  const q = firstQuantity(row)
  if (!q || q.quantity == null) return null
  const unit = normalizeUnit(q.unit)
  if (!unit) return null

  if (targetUnit === 'mg') {
    if (unit === 'mg') return q.quantity
    if (unit === 'g') return q.quantity * 1000
    if (unit === 'mcg') return q.quantity / 1000
    return null
  }
  if (targetUnit === 'g') {
    if (unit === 'g') return q.quantity
    if (unit === 'mg') return q.quantity / 1000
    return null
  }
  if (targetUnit === 'kcal') {
    if (unit === 'kcal') return q.quantity
    return null
  }
  return null
}

function round(v, decimals) {
  if (v == null) return null
  return Math.round(v * 10 ** decimals) / 10 ** decimals
}

function findRow(flatRows, names) {
  return flatRows.find((r) => names.includes(r.name?.trim().toLowerCase()))
}

function mapNutrition(flatRows) {
  const calories = findRow(flatRows, ['calories'])
  const protein = findRow(flatRows, ['protein', 'total protein'])
  const carbs = findRow(flatRows, ['total carbohydrate', 'total carbohydrates'])
  const fat = findRow(flatRows, ['total fat'])
  const sugar = findRow(flatRows, ['sugar', 'sugars', 'total sugars'])
  const fiber = findRow(flatRows, ['dietary fiber'])
  const caffeine = findRow(flatRows, ['caffeine'])
  const sodium = findRow(flatRows, ['sodium'])

  return {
    calories: calories ? round(toUnit(calories, 'kcal'), 0) : null,
    protein_g: protein ? round(toUnit(protein, 'g'), 1) : null,
    carbs_g: carbs ? round(toUnit(carbs, 'g'), 1) : null,
    fat_g: fat ? round(toUnit(fat, 'g'), 1) : null,
    sugar_g: sugar ? round(toUnit(sugar, 'g'), 1) : null,
    fiber_g: fiber ? round(toUnit(fiber, 'g'), 1) : null,
    caffeine_mg: caffeine ? round(toUnit(caffeine, 'mg'), 1) : null,
    sodium_mg: sodium ? round(toUnit(sodium, 'mg'), 1) : null,
  }
}

function servingSizeText(label) {
  const s = label.servingSizes?.[0]
  if (!s) return null
  if (s.notes) return s.notes
  return `${s.minQuantity} ${s.unit}`
}

function ingredientsText(label) {
  const other = label.otheringredients
  if (!other) return null
  if (other.text) return other.text
  if (other.ingredients?.length) return other.ingredients.map((i) => i.name).join(', ')
  return null
}

function titleCase(str) {
  return str
    .trim()
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .replace(/(^|\s)\S/g, (c) => c.toUpperCase())
}

function isUsableLabel(label) {
  if (label.offMarket) return false
  if (!label.fullName || label.fullName.trim().length < 2) return false
  if (!label.brandName || label.brandName.trim().length === 0) return false
  if (!label.ingredientRows?.length) return false
  return true
}

async function upsertBrand(rawBrandName) {
  const name = titleCase(rawBrandName)
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

async function importCategory(category, query) {
  console.log(`\n--- ${category} (q=${query}) ---`)
  let imported = 0
  let from = 0

  while (imported < TARGET_PER_CATEGORY && from < 500) {
    const page = await searchPage(query, from)
    const hits = page.hits || []
    if (hits.length === 0) break

    for (const hit of hits) {
      if (imported >= TARGET_PER_CATEGORY) break
      const summary = hit._source
      if (summary.offMarket) continue

      await sleep(DELAY_MS)
      const label = await fetchLabel(hit._id)
      if (!isUsableLabel(label)) continue

      const name = titleCase(label.fullName)
      const brand = await upsertBrand(label.brandName)
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

      const flatRows = flattenIngredientRows(label.ingredientRows)
      const nutrition = mapNutrition(flatRows)
      const upc = label.upcSku ? label.upcSku.replace(/\D/g, '') : null

      const { error: variantErr } = await admin.from('product_variants').insert({
        product_id: product.id,
        upc: upc || null,
        image_url: null,
        serving_size: servingSizeText(label),
        ingredients_text: ingredientsText(label),
        ...nutrition,
        data_source: 'external_api',
        status: 'approved',
      })
      if (variantErr) {
        console.log(`  skip (variant insert failed): ${brand.name} ${name} -- ${variantErr.message}`)
        await admin.from('products').delete().eq('id', product.id)
        continue
      }

      imported++
      console.log(`  [${imported}/${TARGET_PER_CATEGORY}] ${brand.name} - ${name}`)
    }

    from += PAGE_SIZE
  }

  console.log(`${category}: imported ${imported}`)
  return imported
}

async function main() {
  let total = 0
  for (const [category, query] of Object.entries(CATEGORY_QUERIES)) {
    total += await importCategory(category, query)
  }
  console.log(`\nTotal imported: ${total}`)
}

main().catch((err) => {
  console.error('Import failed:', err)
  process.exit(1)
})
