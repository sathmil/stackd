// Phase 8: batch-runs the analyze-ingredients Edge Function against every
// variant that needs it -- 'pending' (never analyzed) or 'failed' (retry).
// Calls the deployed function over HTTP rather than duplicating the OpenAI
// call here, so the OPENAI_API_KEY only ever lives in one place (the Edge
// Function's Supabase secret), never in this script or .env.local.
import dotenv from 'dotenv'
import { createClient } from '@supabase/supabase-js'

dotenv.config({ path: '.env.local' })

const DELAY_MS = 500

const admin = createClient(process.env.VITE_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY)
const functionUrl = `${process.env.VITE_SUPABASE_URL}/functions/v1/analyze-ingredients`

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms))
}

async function main() {
  const { data: variants, error } = await admin.from('product_variants').select('id, ai_analysis_status').in('ai_analysis_status', ['pending', 'failed'])
  if (error) throw error

  console.log(`Found ${variants.length} variant(s) needing analysis.`)

  let succeeded = 0
  let failed = 0
  for (const v of variants) {
    const res = await fetch(functionUrl, {
      method: 'POST',
      headers: { Authorization: `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ variantId: v.id }),
    })
    const body = await res.json()
    if (body.error) {
      console.log(`  [failed] ${v.id} -- ${body.error}`)
      failed++
    } else {
      console.log(`  [ok] ${v.id} -- score ${body.quality_score}`)
      succeeded++
    }
    await sleep(DELAY_MS)
  }

  console.log(`\nDone. ${succeeded} succeeded, ${failed} failed/skipped.`)
}

main().catch((err) => {
  console.error('Batch analysis failed:', err)
  process.exit(1)
})
