// Phase 8: AI ingredient analysis. Deno Edge Function, invoked either from
// AddProduct.jsx right after a new variant is submitted, or in batch by
// scripts/run-ingredient-analysis.js. Writes ai_ingredient_* fields back
// using the service-role key -- the only writer the Phase 0 trigger
// (protect_ai_fields) allows.
import { createClient } from 'jsr:@supabase/supabase-js@2'
import { corsHeaders } from '../_shared/cors.ts'

const OPENAI_MODEL = 'gpt-4o-mini'
const ANALYSIS_VERSION = 1

const RESPONSE_SCHEMA = {
  type: 'json_schema',
  json_schema: {
    name: 'ingredient_analysis',
    schema: {
      type: 'object',
      properties: {
        quality_score: { type: 'number', description: 'Overall ingredient quality, 1.0 (poor) to 10.0 (excellent)' },
        summary: { type: 'string', description: 'One or two sentence plain-English summary of the ingredient quality' },
        flags: { type: 'array', items: { type: 'string' }, description: 'Short specific flags, e.g. "high added sugar", "artificial sweeteners", "no red flags"' },
      },
      required: ['quality_score', 'summary', 'flags'],
      additionalProperties: false,
    },
    strict: true,
  },
}

async function analyzeWithOpenAI(productName: string, brandName: string, ingredientsText: string) {
  const apiKey = Deno.env.get('OPENAI_API_KEY')
  if (!apiKey) throw new Error('OPENAI_API_KEY is not set')

  const res = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: OPENAI_MODEL,
      messages: [
        {
          role: 'system',
          content:
            'You are a nutrition-focused ingredient quality assessor for a consumer product review app. Assess the ingredient list objectively: added sugars, artificial sweeteners/colors/flavors, proprietary blends that hide dosages, and genuinely beneficial ingredients all matter. Do not give medical advice. Be concise.',
        },
        {
          role: 'user',
          content: `Product: ${brandName} ${productName}\nIngredients: ${ingredientsText}`,
        },
      ],
      response_format: RESPONSE_SCHEMA,
    }),
  })

  if (!res.ok) {
    const body = await res.text()
    throw new Error(`OpenAI API error: ${res.status} ${body}`)
  }

  const data = await res.json()
  const parsed = JSON.parse(data.choices[0].message.content)
  return parsed
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  const admin = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!)

  try {
    const { variantId } = await req.json()
    if (!variantId) return new Response(JSON.stringify({ error: 'variantId required' }), { status: 400, headers: corsHeaders })

    const { data: flag } = await admin.from('feature_flags').select('enabled').eq('key', 'ai_ingredient_analysis').maybeSingle()
    if (flag && flag.enabled === false) {
      return new Response(JSON.stringify({ error: 'ai_ingredient_analysis is disabled' }), { status: 200, headers: corsHeaders })
    }

    const { data: variant, error: fetchErr } = await admin.from('product_variants').select('id, ingredients_text, products(name, brand_name)').eq('id', variantId).single()

    if (fetchErr || !variant) {
      return new Response(JSON.stringify({ error: 'variant not found' }), { status: 404, headers: corsHeaders })
    }

    if (!variant.ingredients_text || variant.ingredients_text.trim().length < 3) {
      await admin.from('product_variants').update({ ai_analysis_status: 'failed', ai_analysis_version: ANALYSIS_VERSION, ai_ingredient_analyzed_at: new Date().toISOString() }).eq('id', variantId)
      return new Response(JSON.stringify({ error: 'no ingredients_text to analyze' }), { status: 200, headers: corsHeaders })
    }

    const product = Array.isArray(variant.products) ? variant.products[0] : variant.products

    let result
    try {
      result = await analyzeWithOpenAI(product?.name ?? '', product?.brand_name ?? '', variant.ingredients_text)
    } catch (llmErr) {
      await admin.from('product_variants').update({ ai_analysis_status: 'failed', ai_analysis_version: ANALYSIS_VERSION, ai_ingredient_analyzed_at: new Date().toISOString() }).eq('id', variantId)
      return new Response(JSON.stringify({ error: String(llmErr) }), { status: 200, headers: corsHeaders })
    }

    const { error: updateErr } = await admin
      .from('product_variants')
      .update({
        ai_ingredient_quality_score: result.quality_score,
        ai_ingredient_summary: result.summary,
        ai_ingredient_flags: result.flags,
        ai_ingredient_analyzed_at: new Date().toISOString(),
        ai_model: OPENAI_MODEL,
        ai_analysis_version: ANALYSIS_VERSION,
        ai_analysis_status: 'succeeded',
      })
      .eq('id', variantId)

    if (updateErr) return new Response(JSON.stringify({ error: updateErr.message }), { status: 500, headers: corsHeaders })

    return new Response(JSON.stringify({ success: true, ...result }), { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
  } catch (err) {
    return new Response(JSON.stringify({ error: String(err) }), { status: 500, headers: corsHeaders })
  }
})
