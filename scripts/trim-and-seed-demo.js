// One-off: trims the catalog down to 20 real, real-image products (one per
// category-diverse pick from the 432-row import) and seeds realistic
// multi-user ratings across all 20, so the redesigned Feed/ProductPage/
// Profile screens have real data to render instead of empty states.
//
// Demo reviewer accounts are real auth.users rows (created via the admin
// API, not fabricated client-side), each with a normal profile -- same
// mechanism a real signup uses, just scripted. Their reviews are seed
// content for local/dev use, not real user opinions.
import dotenv from 'dotenv'
import { createClient } from '@supabase/supabase-js'

dotenv.config({ path: '.env.local' })

const admin = createClient(process.env.VITE_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY)

const CATEGORY_QUOTAS = {
  energy_drink: 4,
  protein_bar: 3,
  protein_powder: 3,
  snack: 3,
  pre_workout: 3,
  greens_powder: 2,
  supplement: 1,
  protein_shake: 1,
}

const DEMO_USERS = [
  { email: 'demo.sarah@stackd.seed', username: 'sarah_j', display_name: 'Sarah J.' },
  { email: 'demo.mike@stackd.seed', username: 'mike_t', display_name: 'Mike T.' },
  { email: 'demo.alex@stackd.seed', username: 'alex_curates', display_name: 'Alex Sterling' },
  { email: 'demo.priya@stackd.seed', username: 'priya_fit', display_name: 'Priya R.' },
  { email: 'demo.jordan@stackd.seed', username: 'jordan_lifts', display_name: 'Jordan K.' },
]

const NOTES_POOL = [
  'Honestly one of the better ones I have tried. Would buy again.',
  'Solid pick. Does what it says without being overwhelming.',
  'Good taste, does the job. Nothing life-changing but reliable.',
  "Texture took some getting used to but it's grown on me.",
  'Perfect for my routine. Consistent quality every time.',
  'A bit too sweet for me but effective.',
  'Mixes well, no clumping, tastes clean.',
  'Great value for what you get. Repeat purchase for sure.',
  'Does the job, though I have had better in this category.',
  'Surprisingly good for the price point.',
]

function randChoice(arr) {
  return arr[Math.floor(Math.random() * arr.length)]
}

function randRating(min, max) {
  return Math.round((min + Math.random() * (max - min)) * 10) / 10
}

async function main() {
  console.log('Fetching catalog with images...')
  const { data: variants, error: fetchErr } = await admin
    .from('product_variants')
    .select('id, flavor, image_url, products(id, name, category, brand_name)')
    .not('image_url', 'is', null)
    .order('created_at')
  if (fetchErr) throw fetchErr

  // One variant per distinct product (first seen), grouped by category.
  const seenProducts = new Set()
  const byCategory = {}
  for (const v of variants) {
    if (seenProducts.has(v.products.id)) continue
    seenProducts.add(v.products.id)
    const cat = v.products.category
    ;(byCategory[cat] ||= []).push(v)
  }

  const keep = []
  for (const [cat, quota] of Object.entries(CATEGORY_QUOTAS)) {
    keep.push(...(byCategory[cat] || []).slice(0, quota))
  }
  console.log(`Keeping ${keep.length} products:`)
  keep.forEach((v) => console.log(`  - ${v.products.brand_name} - ${v.products.name}`))

  const keepVariantIds = keep.map((v) => v.id)
  const keepProductIds = [...new Set(keep.map((v) => v.products.id))]

  // 1. Delete every variant not kept (cascades its reviews/list_items).
  console.log('\nDeleting non-kept variants...')
  const { error: delVariantsErr } = await admin
    .from('product_variants')
    .delete()
    .not('id', 'in', `(${keepVariantIds.join(',')})`)
  if (delVariantsErr) throw delVariantsErr

  // 2. Delete now-orphaned products.
  console.log('Deleting orphaned products...')
  const { error: delProductsErr } = await admin
    .from('products')
    .delete()
    .not('id', 'in', `(${keepProductIds.join(',')})`)
  if (delProductsErr) throw delProductsErr

  // 3. Delete now-orphaned brands.
  console.log('Deleting orphaned brands...')
  const { data: remainingProducts } = await admin.from('products').select('brand_id')
  const keepBrandIds = [...new Set((remainingProducts || []).map((p) => p.brand_id).filter(Boolean))]
  if (keepBrandIds.length > 0) {
    await admin
      .from('brands')
      .delete()
      .not('id', 'in', `(${keepBrandIds.join(',')})`)
  } else {
    await admin.from('brands').delete().neq('id', '00000000-0000-0000-0000-000000000000')
  }

  // 4. Create (or reuse) demo reviewer accounts.
  console.log('\nSetting up demo reviewer accounts...')
  const demoUserIds = []
  for (const du of DEMO_USERS) {
    const { data: existing } = await admin.from('profiles').select('id').eq('username', du.username).maybeSingle()
    if (existing) {
      demoUserIds.push(existing.id)
      console.log(`  reusing ${du.username}`)
      continue
    }
    const { data: created, error: createErr } = await admin.auth.admin.createUser({
      email: du.email,
      email_confirm: true,
      password: crypto.randomUUID(),
      user_metadata: { seed: true },
    })
    if (createErr) throw createErr
    await admin.from('profiles').update({ username: du.username, display_name: du.display_name }).eq('id', created.user.id)
    demoUserIds.push(created.user.id)
    console.log(`  created ${du.username}`)
  }

  // 5. Fetch active tags split by sentiment, for realistic review_tags.
  const { data: tags } = await admin.from('tags').select('id, label, sentiment').eq('is_active', true)
  const positiveTags = (tags || []).filter((t) => t.sentiment === 'positive')
  const negativeTags = (tags || []).filter((t) => t.sentiment === 'negative')

  // 6. Seed 2-3 reviews per kept product from distinct random demo users.
  console.log('\nSeeding reviews...')
  for (const v of keep) {
    const reviewerCount = 2 + Math.floor(Math.random() * 2) // 2-3
    const reviewers = [...demoUserIds].sort(() => Math.random() - 0.5).slice(0, reviewerCount)

    for (const userId of reviewers) {
      const taste = randRating(6.5, 9.8)
      const value = randRating(5.5, 9.2)
      const effectiveness = randRating(6.0, 9.5)
      const overall = Math.round(((taste + value + effectiveness) / 3) * 10) / 10

      const { data: review, error: reviewErr } = await admin
        .from('reviews')
        .insert({
          variant_id: v.id,
          user_id: userId,
          taste_rating: taste,
          value_rating: value,
          effectiveness_rating: effectiveness,
          overall_rating: overall,
          would_buy_again: Math.random() > 0.2,
          notes: randChoice(NOTES_POOL),
          status: 'visible',
        })
        .select('id')
        .single()
      if (reviewErr) {
        console.log(`  skip review (${v.products.name}): ${reviewErr.message}`)
        continue
      }

      const tagPicks = [...(Math.random() > 0.3 ? [randChoice(positiveTags)] : []), ...(Math.random() > 0.7 ? [randChoice(negativeTags)] : [])].filter(Boolean)
      if (tagPicks.length > 0) {
        await admin.from('review_tags').insert(tagPicks.map((t) => ({ review_id: review.id, tag_id: t.id })))
      }
    }
    console.log(`  ${v.products.brand_name} - ${v.products.name}: ${reviewerCount} reviews`)
  }

  // 7. One public list from a demo user so Feed's "added to X" activity has
  //    something real to show.
  console.log('\nCreating a demo public list...')
  const { data: list, error: listErr } = await admin.from('lists').insert({ user_id: demoUserIds[1], name: 'Morning Pre-Workout', is_public: true }).select('id').single()
  if (!listErr) {
    const picks = keep.slice(0, 5)
    for (let i = 0; i < picks.length; i++) {
      await admin.from('list_items').insert({ list_id: list.id, variant_id: picks[i].id, rank_position: i + 1 })
    }
    console.log(`  created "Morning Pre-Workout" with ${picks.length} items`)
  }

  console.log('\nDone.')
}

main().catch((err) => {
  console.error('Failed:', err)
  process.exit(1)
})
