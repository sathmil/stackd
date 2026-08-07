// One-off: curate-catalog.js's blank-slate re-curation cascade-deleted every
// review and list_item along with the products they pointed at (the "5
// preserved" variant IDs it tries to protect were already stale, deleted by
// an earlier trim-and-seed-demo.js run, so nothing matched and everything
// downstream of products got wiped too). This re-seeds reviews/tags across
// the full current catalog and recreates the two public lists Feed's
// Trending Stacks carousel showed before, using the same demo reviewer
// accounts trim-and-seed-demo.js already created (reused here, not
// recreated).
import dotenv from 'dotenv'
import { createClient } from '@supabase/supabase-js'

dotenv.config({ path: '.env.local' })

const admin = createClient(process.env.VITE_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY)

const DEMO_USERNAMES = ['sarah_j', 'mike_t', 'alex_curates', 'priya_fit', 'jordan_lifts']

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
  const { data: demoProfiles, error: profErr } = await admin.from('profiles').select('id, username').in('username', DEMO_USERNAMES)
  if (profErr) throw profErr
  if (demoProfiles.length !== DEMO_USERNAMES.length) throw new Error(`Expected ${DEMO_USERNAMES.length} demo users, found ${demoProfiles.length}`)
  const demoUserIds = demoProfiles.map((p) => p.id)
  console.log(`Found ${demoUserIds.length} demo reviewer accounts.`)

  const { data: variants, error: variantsErr } = await admin.from('product_variants').select('id, flavor, products(id, name, category, brand_name)').order('created_at')
  if (variantsErr) throw variantsErr
  console.log(`Seeding reviews across ${variants.length} variants...`)

  const { data: tags } = await admin.from('tags').select('id, label, sentiment').eq('is_active', true)
  const positiveTags = (tags || []).filter((t) => t.sentiment === 'positive')
  const negativeTags = (tags || []).filter((t) => t.sentiment === 'negative')

  const energyVariants = []
  for (const v of variants) {
    if (v.products.category === 'energy_drink') energyVariants.push(v)

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
    console.log(`  ${v.products.brand_name} - ${v.products.name}${v.flavor ? ' - ' + v.flavor : ''}: ${reviewerCount} reviews`)
  }

  console.log('\nCreating public lists...')
  const mikeId = demoProfiles.find((p) => p.username === 'mike_t').id
  const sarahId = demoProfiles.find((p) => p.username === 'sarah_j').id

  const { data: preworkout, error: preworkoutErr } = await admin.from('lists').insert({ user_id: mikeId, name: 'Morning Pre-Workout', is_public: true }).select('id').single()
  if (!preworkoutErr) {
    const picks = energyVariants.slice(0, 5)
    for (let i = 0; i < picks.length; i++) {
      await admin.from('list_items').insert({ list_id: preworkout.id, variant_id: picks[i].id, rank_position: i + 1 })
    }
    console.log(`  created "Morning Pre-Workout" with ${picks.length} items`)
  } else {
    console.log(`  skip "Morning Pre-Workout": ${preworkoutErr.message}`)
  }

  const { data: newInEnergy, error: newInEnergyErr } = await admin.from('lists').insert({ user_id: sarahId, name: 'New in Energy', is_public: true }).select('id').single()
  if (!newInEnergyErr) {
    const picks = energyVariants.slice(5, 10)
    for (let i = 0; i < picks.length; i++) {
      await admin.from('list_items').insert({ list_id: newInEnergy.id, variant_id: picks[i].id, rank_position: i + 1 })
    }
    console.log(`  created "New in Energy" with ${picks.length} items`)
  } else {
    console.log(`  skip "New in Energy": ${newInEnergyErr.message}`)
  }

  console.log('\nDone.')
}

main().catch((err) => {
  console.error('Failed:', err)
  process.exit(1)
})
