// Replaces the 39 products deleted for being non-English/malformed OFF entries
// (see conversation: French/Polish/German flavor names, size-prefixed junk,
// truncated data). These are well-known real US-market products, hand-picked
// and hand-entered rather than pulled from an API.
//
// IMPORTANT CAVEAT: nutrition figures here are best-effort recall of commonly
// published label data for these mainstream products, not fetched from a
// live/verified source like the OFF and DSLD imports were. Treat as
// reasonable approximations, not verified facts -- spot-check before
// treating any single value as authoritative.
import dotenv from 'dotenv'
import { createClient } from '@supabase/supabase-js'

dotenv.config({ path: '.env.local' })

const admin = createClient(process.env.VITE_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY)

const CURATED_PRODUCTS = [
  // energy_drink (15)
  { category: 'energy_drink', brand: 'Bang Energy', name: 'Star Blast', serving_size: '16 fl oz can', calories: 0, protein_g: 0, carbs_g: 0, fat_g: 0, sugar_g: 0, caffeine_mg: 300, sodium_mg: 40 },
  {
    category: 'energy_drink',
    brand: 'Reign Total Body Fuel',
    name: 'Melon Mania',
    serving_size: '16 fl oz can',
    calories: 10,
    protein_g: 0,
    carbs_g: 3,
    fat_g: 0,
    sugar_g: 0,
    caffeine_mg: 300,
    sodium_mg: 200,
  },
  {
    category: 'energy_drink',
    brand: 'Alani Nu',
    name: 'Energy Drink - Hawaiian Shaved Ice',
    serving_size: '12 fl oz can',
    calories: 10,
    protein_g: 0,
    carbs_g: 3,
    fat_g: 0,
    sugar_g: 0,
    caffeine_mg: 200,
    sodium_mg: 20,
  },
  {
    category: 'energy_drink',
    brand: 'Rockstar',
    name: 'Original Energy Drink',
    serving_size: '16 fl oz can',
    calories: 140,
    protein_g: 0,
    carbs_g: 31,
    fat_g: 0,
    sugar_g: 31,
    caffeine_mg: 160,
    sodium_mg: 200,
  },
  {
    category: 'energy_drink',
    brand: 'NOS',
    name: 'Original Energy Drink',
    serving_size: '16 fl oz can',
    calories: 210,
    protein_g: 0,
    carbs_g: 54,
    fat_g: 0,
    sugar_g: 54,
    caffeine_mg: 160,
    sodium_mg: 180,
  },
  {
    category: 'energy_drink',
    brand: 'Full Throttle',
    name: 'Original Energy Drink',
    serving_size: '16 fl oz can',
    calories: 220,
    protein_g: 0,
    carbs_g: 58,
    fat_g: 0,
    sugar_g: 58,
    caffeine_mg: 160,
    sodium_mg: 200,
  },
  { category: 'energy_drink', brand: 'AMP Energy', name: 'Original', serving_size: '16 fl oz can', calories: 220, protein_g: 0, carbs_g: 58, fat_g: 0, sugar_g: 58, caffeine_mg: 142, sodium_mg: 65 },
  {
    category: 'energy_drink',
    brand: 'Xyience',
    name: 'Xenergy - Cherry Lime',
    serving_size: '16 fl oz can',
    calories: 10,
    protein_g: 0,
    carbs_g: 2,
    fat_g: 0,
    sugar_g: 0,
    caffeine_mg: 176,
    sodium_mg: 70,
  },
  {
    category: 'energy_drink',
    brand: '5-hour Energy',
    name: 'Extra Strength - Berry',
    serving_size: '1.93 fl oz shot',
    calories: 4,
    protein_g: 0,
    carbs_g: 1,
    fat_g: 0,
    sugar_g: 0,
    caffeine_mg: 230,
    sodium_mg: 20,
  },
  {
    category: 'energy_drink',
    brand: 'G Fuel',
    name: 'Sour Blue Chug Rug (RTD Can)',
    serving_size: '16 fl oz can',
    calories: 25,
    protein_g: 0,
    carbs_g: 6,
    fat_g: 0,
    sugar_g: 0,
    caffeine_mg: 300,
    sodium_mg: 200,
  },
  {
    category: 'energy_drink',
    brand: 'Rip It',
    name: 'Energy Fuel - Fruit Punch',
    serving_size: '16 fl oz can',
    calories: 190,
    protein_g: 0,
    carbs_g: 48,
    fat_g: 0,
    sugar_g: 48,
    caffeine_mg: 160,
    sodium_mg: 200,
  },
  {
    category: 'energy_drink',
    brand: 'V Energy',
    name: 'Original Energy Drink',
    serving_size: '500 ml can',
    calories: 220,
    protein_g: 0,
    carbs_g: 56,
    fat_g: 0,
    sugar_g: 56,
    caffeine_mg: 114,
    sodium_mg: 100,
  },
  {
    category: 'energy_drink',
    brand: 'Bang Energy',
    name: 'Purple Guava Pear',
    serving_size: '16 fl oz can',
    calories: 0,
    protein_g: 0,
    carbs_g: 0,
    fat_g: 0,
    sugar_g: 0,
    caffeine_mg: 300,
    sodium_mg: 40,
  },
  {
    category: 'energy_drink',
    brand: 'Kill Cliff',
    name: 'Recovery Energy - Original',
    serving_size: '12 fl oz can',
    calories: 20,
    protein_g: 0,
    carbs_g: 5,
    fat_g: 0,
    sugar_g: 1,
    caffeine_mg: 100,
    sodium_mg: 210,
  },
  {
    category: 'energy_drink',
    brand: 'Zoa Energy',
    name: 'Tropical Punch',
    serving_size: '16 fl oz can',
    calories: 20,
    protein_g: 0,
    carbs_g: 5,
    fat_g: 0,
    sugar_g: 0,
    caffeine_mg: 160,
    sodium_mg: 200,
  },

  // protein_bar (11)
  { category: 'protein_bar', brand: 'Quest Nutrition', name: 'Quest Bar - Cookies & Cream', serving_size: '1 bar (60g)', calories: 190, protein_g: 21, carbs_g: 22, fat_g: 8, sugar_g: 1, fiber_g: 14 },
  {
    category: 'protein_bar',
    brand: 'Quest Nutrition',
    name: 'Quest Bar - Chocolate Chip Cookie Dough',
    serving_size: '1 bar (60g)',
    calories: 200,
    protein_g: 21,
    carbs_g: 21,
    fat_g: 8,
    sugar_g: 1,
    fiber_g: 13,
  },
  { category: 'protein_bar', brand: 'Pure Protein', name: 'Chocolate Peanut Butter Bar', serving_size: '1 bar (50g)', calories: 200, protein_g: 20, carbs_g: 17, fat_g: 7, sugar_g: 2, fiber_g: 2 },
  {
    category: 'protein_bar',
    brand: 'Think!',
    name: 'Chunky Peanut Butter High Protein Bar',
    serving_size: '1 bar (60g)',
    calories: 210,
    protein_g: 20,
    carbs_g: 20,
    fat_g: 8,
    sugar_g: 1,
    fiber_g: 10,
  },
  {
    category: 'protein_bar',
    brand: 'Kirkland Signature',
    name: 'Protein Bars - Chocolate Chip Cookie Dough',
    serving_size: '1 bar (60g)',
    calories: 190,
    protein_g: 21,
    carbs_g: 22,
    fat_g: 7,
    sugar_g: 1,
    fiber_g: 12,
  },
  { category: 'protein_bar', brand: 'ONE Brands', name: 'Birthday Cake Protein Bar', serving_size: '1 bar (60g)', calories: 220, protein_g: 20, carbs_g: 24, fat_g: 8, sugar_g: 1, fiber_g: 14 },
  {
    category: 'protein_bar',
    brand: 'Optimum Nutrition',
    name: 'Gold Standard Protein Bar - Chocolate Brownie',
    serving_size: '1 bar (65g)',
    calories: 240,
    protein_g: 20,
    carbs_g: 26,
    fat_g: 8,
    sugar_g: 2,
    fiber_g: 8,
  },
  { category: 'protein_bar', brand: 'Built Bar', name: 'Built Puff - Birthday Cake', serving_size: '1 bar (49g)', calories: 130, protein_g: 15, carbs_g: 16, fat_g: 4, sugar_g: 0, fiber_g: 6 },
  { category: 'protein_bar', brand: 'Power Crunch', name: 'Protein Energy Bar - French Vanilla Creme', serving_size: '1 bar (40g)', calories: 200, protein_g: 13, carbs_g: 15, fat_g: 10, sugar_g: 8 },
  {
    category: 'protein_bar',
    brand: 'MusclePharm',
    name: 'Combat Crunch - Chocolate Peanut Butter',
    serving_size: '1 bar (63g)',
    calories: 200,
    protein_g: 20,
    carbs_g: 25,
    fat_g: 7,
    sugar_g: 1,
    fiber_g: 10,
  },
  { category: 'protein_bar', brand: 'Premier Protein', name: 'Chocolate Peanut Butter Bar', serving_size: '1 bar (65g)', calories: 220, protein_g: 20, carbs_g: 25, fat_g: 8, sugar_g: 1, fiber_g: 10 },

  // protein_powder (3)
  { category: 'protein_powder', brand: 'Dymatize', name: 'ISO100 - Gourmet Chocolate', serving_size: '1 scoop (32g)', calories: 110, protein_g: 25, carbs_g: 1, fat_g: 0, sugar_g: 1 },
  {
    category: 'protein_powder',
    brand: 'Garden of Life',
    name: 'Sport Organic Plant-Based Protein - Chocolate',
    serving_size: '1 scoop (39g)',
    calories: 140,
    protein_g: 30,
    carbs_g: 8,
    fat_g: 2,
    sugar_g: 1,
    fiber_g: 6,
  },
  { category: 'protein_powder', brand: 'Ghost', name: 'Whey Protein - Cereal Milk', serving_size: '1 scoop (32g)', calories: 130, protein_g: 25, carbs_g: 4, fat_g: 2.5, sugar_g: 2 },

  // supplement (10)
  { category: 'supplement', brand: 'Premier Protein', name: 'Chocolate Protein Shake', serving_size: '11 fl oz bottle', calories: 160, protein_g: 30, carbs_g: 5, fat_g: 3, sugar_g: 1 },
  { category: 'supplement', brand: 'Fairlife', name: 'Core Power Elite - Vanilla', serving_size: '14 fl oz bottle', calories: 170, protein_g: 42, carbs_g: 7, fat_g: 4.5, sugar_g: 3 },
  { category: 'supplement', brand: 'Nature Made', name: 'Creatine Monohydrate Capsules', serving_size: '2 capsules' },
  { category: 'supplement', brand: 'NOW Foods', name: 'Vitamin D3 5000 IU Softgels', serving_size: '1 softgel' },
  { category: 'supplement', brand: 'Optimum Nutrition', name: 'Micronized Creatine Powder - Unflavored', serving_size: '1 scoop (5g)' },
  { category: 'supplement', brand: 'Ancient Nutrition', name: 'Multi Collagen Protein Powder - Unflavored', serving_size: '2 scoops (14g)', calories: 45, protein_g: 11 },
  { category: 'supplement', brand: 'Ensure', name: 'Original Nutrition Shake - Chocolate', serving_size: '8 fl oz bottle', calories: 220, protein_g: 9, carbs_g: 33, fat_g: 6, sugar_g: 19 },
  {
    category: 'supplement',
    brand: 'Orgain',
    name: 'Organic Nutritional Shake - Creamy Chocolate Fudge',
    serving_size: '11 fl oz bottle',
    calories: 250,
    protein_g: 16,
    carbs_g: 33,
    fat_g: 7,
    sugar_g: 20,
    fiber_g: 5,
  },
  { category: 'supplement', brand: 'Bulletproof', name: 'Collagen Protein - Unflavored', serving_size: '2 scoops (20g)', calories: 70, protein_g: 18 },
  { category: 'supplement', brand: 'Nutricost', name: 'Creatine Monohydrate Micronized Powder - Unflavored', serving_size: '1 scoop (5g)' },
]

function titleCase(str) {
  return str
    .trim()
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .replace(/(^|\s)\S/g, (c) => c.toUpperCase())
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

async function main() {
  let imported = 0
  for (const item of CURATED_PRODUCTS) {
    const brand = await upsertBrand(item.brand)
    if (await alreadyExists(brand.id, item.name)) {
      console.log(`  skip (already exists): ${brand.name} - ${item.name}`)
      continue
    }

    const { data: product, error: productErr } = await admin
      .from('products')
      .insert({ brand_id: brand.id, brand_name: brand.name, name: item.name, category: item.category, status: 'approved' })
      .select('id')
      .single()
    if (productErr) {
      console.log(`  skip (product insert failed): ${brand.name} ${item.name} -- ${productErr.message}`)
      continue
    }

    const { error: variantErr } = await admin.from('product_variants').insert({
      product_id: product.id,
      serving_size: item.serving_size || null,
      calories: item.calories ?? null,
      protein_g: item.protein_g ?? null,
      carbs_g: item.carbs_g ?? null,
      fat_g: item.fat_g ?? null,
      sugar_g: item.sugar_g ?? null,
      fiber_g: item.fiber_g ?? null,
      caffeine_mg: item.caffeine_mg ?? null,
      sodium_mg: item.sodium_mg ?? null,
      data_source: 'manual',
      status: 'approved',
    })
    if (variantErr) {
      console.log(`  skip (variant insert failed): ${brand.name} ${item.name} -- ${variantErr.message}`)
      await admin.from('products').delete().eq('id', product.id)
      continue
    }

    imported++
    console.log(`  [${imported}/${CURATED_PRODUCTS.length}] ${brand.name} - ${item.name}`)
  }
  console.log(`\nTotal imported: ${imported}`)
}

main().catch((err) => {
  console.error('Seed failed:', err)
  process.exit(1)
})
