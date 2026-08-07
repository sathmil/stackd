// One-off: posts 6 real reviews from the account owner's own profile
// (Harsha) across a spread of categories, so their own Profile page has
// real "Top Ranked" / "Recent Reviews" content to preview alongside the
// demo reviewer accounts seeded in trim-and-seed-demo.js.
import dotenv from 'dotenv'
import { createClient } from '@supabase/supabase-js'

dotenv.config({ path: '.env.local' })

const admin = createClient(process.env.VITE_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY)

const OWNER_USERNAME = 'Harsha'

const PICKS = [
  { variantName: 'Alani Energy', taste: 8.7, value: 7.5, effectiveness: 8.9, buyAgain: true, notes: 'Great taste, clean energy without the crash. My go-to now.' },
  { variantName: 'Original Protein Bar', taste: 8.2, value: 8.0, effectiveness: 7.8, buyAgain: true, notes: 'Soft texture, doesn’t taste like a protein bar at all.' },
  { variantName: 'Gold Standard 100% Whey', taste: 7.9, value: 8.4, effectiveness: 9.0, buyAgain: true, notes: 'Classic for a reason. Mixes easily, solid protein content.' },
  { variantName: 'Protein Pastry', taste: 9.0, value: 6.8, effectiveness: 7.5, buyAgain: true, notes: 'Tastes like a real pastry, hard to believe it’s high protein.' },
  { variantName: 'High Energy Pre-workout', taste: 7.0, value: 7.2, effectiveness: 8.8, buyAgain: false, notes: 'Strong focus boost, but a bit too jittery for me personally.' },
  { variantName: 'Quest Protein Shake (rtd)', taste: 6.9, value: 6.5, effectiveness: 8.0, buyAgain: true, notes: 'Convenient for on the go, taste is fine but not amazing.' },
]

async function main() {
  const { data: owner, error: ownerErr } = await admin.from('profiles').select('id, username').eq('username', OWNER_USERNAME).single()
  if (ownerErr) throw ownerErr
  console.log(`Posting reviews as ${owner.username} (${owner.id})`)

  const { data: variants, error: variantsErr } = await admin.from('product_variants').select('id, flavor, products(name, brand_name)')
  if (variantsErr) throw variantsErr

  const { data: tags } = await admin.from('tags').select('id, label, sentiment').eq('is_active', true)
  const positiveTags = (tags || []).filter((t) => t.sentiment === 'positive')

  let posted = 0
  for (const pick of PICKS) {
    const variant = variants.find((v) => v.products.name === pick.variantName)
    if (!variant) {
      console.log(`  skip (not found): ${pick.variantName}`)
      continue
    }

    const overall = Math.round(((pick.taste + pick.value + pick.effectiveness) / 3) * 10) / 10
    const { data: review, error: reviewErr } = await admin
      .from('reviews')
      .upsert(
        {
          variant_id: variant.id,
          user_id: owner.id,
          taste_rating: pick.taste,
          value_rating: pick.value,
          effectiveness_rating: pick.effectiveness,
          overall_rating: overall,
          would_buy_again: pick.buyAgain,
          notes: pick.notes,
          status: 'visible',
        },
        { onConflict: 'variant_id,user_id' },
      )
      .select('id')
      .single()
    if (reviewErr) {
      console.log(`  skip (${pick.variantName}): ${reviewErr.message}`)
      continue
    }

    if (positiveTags.length > 0 && Math.random() > 0.3) {
      const tag = positiveTags[Math.floor(Math.random() * positiveTags.length)]
      await admin.from('review_tags').upsert({ review_id: review.id, tag_id: tag.id })
    }

    posted++
    console.log(`  [${posted}/6] ${variant.products.brand_name} - ${variant.products.name} -- ${overall}`)
  }

  console.log(`\nDone. Posted ${posted} reviews as ${owner.username}.`)
}

main().catch((err) => {
  console.error('Failed:', err)
  process.exit(1)
})
