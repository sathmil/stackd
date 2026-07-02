import { describe, it, expect, beforeAll } from 'vitest'
import { getTestClient, serviceClient } from './helpers.js'

let userA, userB

beforeAll(async () => {
  userA = await getTestClient(0)
  userB = await getTestClient(1)
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

    const { data: ownView } = await userA.from('products').select().eq('id', product.id)
    expect(ownView).toHaveLength(1)

    const { data: otherView } = await userB.from('products').select().eq('id', product.id)
    expect(otherView).toHaveLength(0)
  })
})

describe('reviews', () => {
  it('upserting a review for the same (variant_id, user_id) updates rather than duplicates', async () => {
    const { data: userAId } = await userA.auth.getUser()
    const { data: variants } = await userA.from('product_variants').select('id').limit(1)
    const variantId = variants[0].id

    const first = await userA
      .from('reviews')
      .upsert({ variant_id: variantId, user_id: userAId.user.id, taste_rating: 4.0, value_effectiveness_rating: 4.0 }, { onConflict: 'variant_id,user_id' })
      .select()
      .single()
    expect(first.error).toBeNull()

    const second = await userA
      .from('reviews')
      .upsert({ variant_id: variantId, user_id: userAId.user.id, taste_rating: 4.5, value_effectiveness_rating: 3.5 }, { onConflict: 'variant_id,user_id' })
      .select()
      .single()
    expect(second.error).toBeNull()
    expect(second.data.id).toBe(first.data.id)
    expect(Number(second.data.taste_rating)).toBe(4.5)

    const { data: allMine } = await userA.from('reviews').select().eq('variant_id', variantId)
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

    const { data: otherView } = await userB.from('lists').select().eq('id', list.id)
    expect(otherView).toHaveLength(0)

    const { data: variants } = await userA.from('product_variants').select('id').limit(1)
    const { error: otherInsertError } = await userB
      .from('list_items')
      .insert({ list_id: list.id, variant_id: variants[0].id, rank_position: 1 })
    expect(otherInsertError).not.toBeNull()
  })
})

describe('profiles', () => {
  it('only the owner can update their own profile row', async () => {
    const { data: userAId } = await userA.auth.getUser()

    const { error: selfUpdateError } = await userA
      .from('profiles')
      .update({ display_name: 'Test User A' })
      .eq('id', userAId.user.id)
    expect(selfUpdateError).toBeNull()

    const { error: otherUpdateError } = await userB
      .from('profiles')
      .update({ display_name: 'Hijacked' })
      .eq('id', userAId.user.id)
    // RLS silently filters rows rather than erroring -- confirm zero rows were touched.
    const { data: check } = await userA.from('profiles').select('display_name').eq('id', userAId.user.id).single()
    expect(check.display_name).toBe('Test User A')
  })
})

describe('AI field protection', () => {
  it('a non-service-role client cannot change ai_ingredient_* fields directly', async () => {
    const { data: variant } = await userA
      .from('product_variants')
      .select('id, product_id, ai_ingredient_quality_score')
      .limit(1)
      .single()

    // only allowed if this row was created by userA -- create one to be sure
    const { data: userAId } = await userA.auth.getUser()
    const { data: ownVariant } = await userA
      .from('product_variants')
      .select('id')
      .eq('created_by', userAId.user.id)
      .limit(1)
      .maybeSingle()

    const targetId = ownVariant?.id ?? variant.id
    const before = await userA.from('product_variants').select('ai_ingredient_quality_score').eq('id', targetId).single()

    await userA.from('product_variants').update({ ai_ingredient_quality_score: 5.0 }).eq('id', targetId)

    const after = await userA.from('product_variants').select('ai_ingredient_quality_score').eq('id', targetId).single()
    expect(after.data.ai_ingredient_quality_score).toBe(before.data.ai_ingredient_quality_score)
  })

  it('the service role CAN set ai_ingredient_* fields (this is how Phase 8 writes)', async () => {
    const admin = serviceClient()
    const { data: variant } = await admin.from('product_variants').select('id').limit(1).single()

    const { error } = await admin
      .from('product_variants')
      .update({ ai_ingredient_quality_score: 4.2, ai_analysis_status: 'succeeded' })
      .eq('id', variant.id)
    expect(error).toBeNull()

    const { data: after } = await admin.from('product_variants').select('ai_ingredient_quality_score').eq('id', variant.id).single()
    expect(Number(after.ai_ingredient_quality_score)).toBe(4.2)
  })
})

describe('variant_rating_summary', () => {
  it('returns a row for a variant with zero reviews', async () => {
    const { data: userAId } = await userA.auth.getUser()
    const { data: variant } = await userA
      .from('product_variants')
      .insert({
        product_id: (await userA.from('products').select('id').limit(1).single()).data.id,
        flavor: `Zero Review Test ${Date.now()}`,
        created_by: userAId.user.id,
      })
      .select()
      .single()

    const { data: summary, error } = await userA.from('variant_rating_summary').select().eq('variant_id', variant.id).maybeSingle()
    expect(error).toBeNull()
    expect(summary).not.toBeNull()
    expect(summary.ratings_count).toBe(0)
  })
})
