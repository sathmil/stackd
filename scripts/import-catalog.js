// Imports scripts/data/new-catalog-with-photos.csv into brands/products/
// product_variants as approved, real-world products -- the "remake the set
// of products" catalog rebuild. Follows CATALOG_STYLE.md's normalized-key
// dedup (case/whitespace/punctuation-insensitive), not a plain ilike match,
// since that's what actually catches things like "Sugar Free" vs
// "Sugarfree". Everything here is hand-curated (real products, nutrition
// facts, and ingredients entered by hand; photos sourced from each brand's
// own official site and cropped to a uniform square -- see
// process-catalog-photos.js), so data_source stays 'manual' throughout.
//
// AI ingredient analysis is NOT triggered here -- every new variant lands
// with the schema's default ai_analysis_status = 'pending', so a separate
// run of scripts/run-ingredient-analysis.js (Phase 8's existing batch
// script) picks all of them up in one pass afterward.
import dotenv from 'dotenv'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import { parse } from 'csv-parse/sync'
import { createClient } from '@supabase/supabase-js'

dotenv.config({ path: '.env.local' })

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const admin = createClient(process.env.VITE_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY)

function normalizedKey(s) {
  return s.toLowerCase().replace(/[^a-z0-9]/g, '')
}

function titleCase(str) {
  return str
    .trim()
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .replace(/(^|\s)\S/g, (c) => c.toUpperCase())
}

function num(v) {
  return v === '' || v == null ? null : Number(v)
}

const brandCache = new Map()

async function upsertBrand(rawName) {
  const name = titleCase(rawName)
  const key = normalizedKey(name)
  if (brandCache.has(key)) return brandCache.get(key)

  const { data: existing, error: findErr } = await admin.from('brands').select('id, name')
  if (findErr) throw findErr
  const match = (existing || []).find((b) => normalizedKey(b.name) === key)
  if (match) {
    brandCache.set(key, match)
    return match
  }

  const { data: created, error: insertErr } = await admin.from('brands').insert({ name }).select('id, name').single()
  if (insertErr) throw insertErr
  brandCache.set(key, created)
  return created
}

async function findExistingProduct(brandId, name) {
  const key = normalizedKey(name)
  const { data, error } = await admin.from('products').select('id, name').eq('brand_id', brandId)
  if (error) throw error
  return (data || []).find((p) => normalizedKey(p.name) === key) || null
}

async function main() {
  const csvPath = path.join(__dirname, 'data', 'new-catalog-with-photos.csv')
  const rows = parse(fs.readFileSync(csvPath, 'utf8'), { columns: true })

  let imported = 0
  let skipped = 0

  for (const row of rows) {
    const productName = titleCase(row.product_name)
    const brand = await upsertBrand(row.brand)

    let product = await findExistingProduct(brand.id, productName)
    if (!product) {
      const { data: created, error: productErr } = await admin
        .from('products')
        .insert({ brand_id: brand.id, brand_name: brand.name, name: productName, category: row.category, status: 'approved' })
        .select('id, name')
        .single()
      if (productErr) {
        console.log(`  skip (product insert failed): ${brand.name} - ${productName} -- ${productErr.message}`)
        skipped++
        continue
      }
      product = created
    }

    const flavor = row.flavor.trim() || null
    const size = row.size.trim() || null

    const { data: existingVariant } = await admin.from('product_variants').select('id').eq('product_id', product.id).eq('flavor', flavor).eq('size', size).maybeSingle()
    if (existingVariant) {
      console.log(`  skip (variant already exists): ${brand.name} - ${productName} - ${flavor}`)
      skipped++
      continue
    }

    const { error: variantErr } = await admin.from('product_variants').insert({
      product_id: product.id,
      flavor,
      size,
      serving_size: size,
      calories: num(row.calories),
      protein_g: num(row.protein_g),
      carbs_g: num(row.carbs_g),
      fat_g: num(row.fat_g),
      sugar_g: num(row.sugar_g),
      fiber_g: num(row.fiber_g),
      caffeine_mg: num(row.caffeine_mg),
      sodium_mg: num(row.sodium_mg),
      ingredients_text: row.ingredients.trim() || null,
      image_url: row.photo_url.trim() || null,
      image_alt: row.photo_url.trim() ? `${productName}${flavor ? ` ${flavor}` : ''}` : null,
      data_source: 'manual',
      status: 'approved',
    })
    if (variantErr) {
      console.log(`  skip (variant insert failed): ${brand.name} - ${productName} - ${flavor} -- ${variantErr.message}`)
      skipped++
      continue
    }

    imported++
    console.log(`  [${imported}] ${brand.name} - ${productName}${flavor ? ` — ${flavor}` : ''}`)
  }

  console.log(`\nDone. Imported: ${imported}, skipped: ${skipped}`)
}

main().catch((err) => {
  console.error('Import failed:', err)
  process.exit(1)
})
