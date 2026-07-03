import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { getTestClient, serviceClient } from './helpers.js'

let userA, userB
// Dedicated fixtures owned by userA, isolated from the real seeded catalog --
// tests must never grab "whatever the first row happens to be" (that
// previously left permanent test pollution in the real dev database: a
// stray "RLS Test Product" row, an accumulating "Zero Review Test" variant
// created fresh on every run, and 3 real seeded products left with a fake
// ai_ingredient_quality_score/ai_analysis_status = 'succeeded' they never
// actually earned).
let testProductId, testVariantId
// Anything a single test creates beyond the shared fixture above, cleaned
// up alongside it.
const extraProductIds = []
const extraVariantIds = []
const extraListIds = []

beforeAll(async () => {
  userA = await getTestClient(0)
  userB = await getTestClient(1)

  const { data: userAId } = await userA.auth.getUser()
  const { data: product } = await userA
    .from('products')
    .insert({ brand_name: 'RLS Test Fixtures', name: `Test Product ${Date.now()}`, category: 'other', created_by: userAId.user.id })
    .select()
    .single()
  testProductId = product.id

  const { data: variant } = await userA.from('product_variants').insert({ product_id: testProductId, flavor: 'Test Variant', created_by: userAId.user.id }).select().single()
  testVariantId = variant.id
})

afterAll(async () => {
  const admin = serviceClient()
  // cascades clean up variants/reviews/list_items/review_tags tied to these
  await admin
    .from('products')
    .delete()
    .in('id', [testProductId, ...extraProductIds])
  if (extraVariantIds.length > 0) {
    await admin.from('product_variants').delete().in('id', extraVariantIds)
  }
  if (extraListIds.length > 0) {
    await admin.from('lists').delete().in('id', extraListIds)
  }
})

describe('products / product_variants moderation visibility', () => {
  it('a pending product is visible to its creator but not to a second account', async () => {
    const { data: userAId } = await userA.auth.getUser()

    const { data: product, error } = await userA
      .from('products')
      .insert({ brand_name: 'Test Brand', name: `RLS Test Product ${Date.now()}`, category: 'other', created_by: userAId.user.id })
      .select()
      .single()
    expect(error).toBeNull()
    expect(product.status).toBe('pending')
    extraProductIds.push(product.id)

    const { data: ownView } = await userA.from('products').select().eq('id', product.id)
    expect(ownView).toHaveLength(1)

    const { data: otherView } = await userB.from('products').select().eq('id', product.id)
    expect(otherView).toHaveLength(0)
  })
})

describe('reviews', () => {
  it('upserting a review for the same (variant_id, user_id) updates rather than duplicates', async () => {
    const { data: userAId } = await userA.auth.getUser()

    const first = await userA.from('reviews').upsert({ variant_id: testVariantId, user_id: userAId.user.id, overall_rating: 8.0 }, { onConflict: 'variant_id,user_id' }).select().single()
    expect(first.error).toBeNull()

    const second = await userA.from('reviews').upsert({ variant_id: testVariantId, user_id: userAId.user.id, overall_rating: 9.0 }, { onConflict: 'variant_id,user_id' }).select().single()
    expect(second.error).toBeNull()
    expect(second.data.id).toBe(first.data.id)
    expect(Number(second.data.overall_rating)).toBe(9.0)

    const { data: allMine } = await userA.from('reviews').select().eq('variant_id', testVariantId)
    expect(allMine).toHaveLength(1)
  })
})

describe('lists / list_items privacy', () => {
  it('a private list is invisible to a second account; only the owner can insert items into it', async () => {
    const { data: userAId } = await userA.auth.getUser()
    const { data: list, error } = await userA
      .from('lists')
      .insert({ user_id: userAId.user.id, name: `Private list ${Date.now()}`, is_public: false })
      .select()
      .single()
    expect(error).toBeNull()
    extraListIds.push(list.id)

    const { data: otherView } = await userB.from('lists').select().eq('id', list.id)
    expect(otherView).toHaveLength(0)

    const { error: otherInsertError } = await userB.from('list_items').insert({ list_id: list.id, variant_id: testVariantId, rank_position: 1 })
    expect(otherInsertError).not.toBeNull()
  })
})

describe('profiles', () => {
  it('only the owner can update their own profile row', async () => {
    const { data: userAId } = await userA.auth.getUser()

    const { error: selfUpdateError } = await userA.from('profiles').update({ display_name: 'Test User A' }).eq('id', userAId.user.id)
    expect(selfUpdateError).toBeNull()

    await userB.from('profiles').update({ display_name: 'Hijacked' }).eq('id', userAId.user.id)
    // RLS silently filters rows rather than erroring -- confirm zero rows were touched.
    const { data: check } = await userA.from('profiles').select('display_name').eq('id', userAId.user.id).single()
    expect(check.display_name).toBe('Test User A')
  })
})

describe('AI field protection', () => {
  it('a non-service-role client cannot change ai_ingredient_* fields directly', async () => {
    const before = await userA.from('product_variants').select('ai_ingredient_quality_score').eq('id', testVariantId).single()

    await userA.from('product_variants').update({ ai_ingredient_quality_score: 5.0 }).eq('id', testVariantId)

    const after = await userA.from('product_variants').select('ai_ingredient_quality_score').eq('id', testVariantId).single()
    expect(after.data.ai_ingredient_quality_score).toBe(before.data.ai_ingredient_quality_score)
  })

  it('the service role CAN set ai_ingredient_* fields (this is how Phase 8 writes)', async () => {
    const admin = serviceClient()

    const { error } = await admin.from('product_variants').update({ ai_ingredient_quality_score: 4.2, ai_analysis_status: 'succeeded' }).eq('id', testVariantId)
    expect(error).toBeNull()

    const { data: after } = await admin.from('product_variants').select('ai_ingredient_quality_score').eq('id', testVariantId).single()
    expect(Number(after.ai_ingredient_quality_score)).toBe(4.2)
  })
})

describe('variant_rating_summary', () => {
  it('returns a row for a variant with zero reviews', async () => {
    const { data: userAId } = await userA.auth.getUser()
    const { data: variant } = await userA
      .from('product_variants')
      .insert({ product_id: testProductId, flavor: `Zero Review Test ${Date.now()}`, created_by: userAId.user.id })
      .select()
      .single()
    extraVariantIds.push(variant.id)

    const { data: summary, error } = await userA.from('variant_rating_summary').select().eq('variant_id', variant.id).maybeSingle()
    expect(error).toBeNull()
    expect(summary).not.toBeNull()
    expect(summary.ratings_count).toBe(0)
  })
})
