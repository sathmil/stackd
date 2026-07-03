import { useParams, useNavigate } from 'react-router-dom'
import { Avatar, ScorePill, ScoreBars, Card, Divider, NavBar } from '../components/ui'
import { useAsync } from '../hooks/useAsync'
import { fetchVariantById, fetchRatingSummaries } from '../lib/api/products'
import { fetchReviewsForVariant, fetchProfilesByIds, fetchTagsForReviews } from '../lib/api/reviews'

const serif = { fontFamily: 'Georgia, "Times New Roman", serif' }
const sans = { fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif' }

const DIM_COLOR = { taste: '#ff6b6b', valueEffectiveness: '#5ecfcf', ingredientQuality: '#a78bfa' }

function formatCategory(raw) {
  return raw.replace(/_/g, ' ').replace(/^\w/, (c) => c.toUpperCase())
}

const NUTRITION_FIELDS = [
  ['calories', 'Calories', ''],
  ['protein_g', 'Protein', 'g'],
  ['sugar_g', 'Sugar', 'g'],
  ['caffeine_mg', 'Caffeine', 'mg'],
]

export default function ProductPage() {
  const { variantId } = useParams()
  const navigate = useNavigate()

  const { data, loading, error } = useAsync(async () => {
    const { data: variant, error: vErr } = await fetchVariantById(variantId)
    if (vErr) return { data: null, error: vErr }
    if (!variant) return { data: null, error: null }

    const [{ data: summaries }, { data: reviews }] = await Promise.all([fetchRatingSummaries([variantId]), fetchReviewsForVariant(variantId, { limit: 10, offset: 0 })])

    const userIds = [...new Set((reviews || []).map((r) => r.user_id))]
    const reviewIds = (reviews || []).map((r) => r.id)
    const [{ data: profiles }, { data: reviewTags }] = await Promise.all([fetchProfilesByIds(userIds), fetchTagsForReviews(reviewIds)])

    const profileMap = Object.fromEntries((profiles || []).map((p) => [p.id, p]))
    const tagsByReview = {}
    for (const rt of reviewTags || []) {
      if (!tagsByReview[rt.review_id]) tagsByReview[rt.review_id] = []
      if (rt.tags) tagsByReview[rt.review_id].push(rt.tags)
    }

    return {
      data: {
        variant,
        summary: summaries?.[0] || null,
        reviews: (reviews || []).map((r) => ({ ...r, reviewer: profileMap[r.user_id], tags: tagsByReview[r.id] || [] })),
      },
      error: null,
    }
  }, [variantId])

  if (loading) {
    return <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#3a3a3a', fontSize: 14, ...sans }}>Loading...</div>
  }

  if (error) {
    return (
      <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#ff6b6b', fontSize: 14, ...sans }}>Couldn't load this product. Try again in a moment.</div>
    )
  }

  if (!data) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
        <NavBar title="Product" onBack={() => navigate(-1)} />
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#3a3a3a', fontSize: 14, ...sans }}>Product not found.</div>
      </div>
    )
  }

  const { variant, summary, reviews } = data
  const product = variant.products
  const brand = product.brands

  const dims = [
    { key: 'taste', label: 'Taste', value: summary?.avg_taste ?? null, color: DIM_COLOR.taste },
    { key: 'valueEffectiveness', label: 'Value/effectiveness', value: summary?.avg_value_effectiveness ?? null, color: DIM_COLOR.valueEffectiveness },
    { key: 'ingredientQuality', label: 'Ingredients (AI)', value: summary?.ai_ingredient_quality_score ?? null, color: DIM_COLOR.ingredientQuality },
  ]

  const nutrition = NUTRITION_FIELDS.filter(([key]) => variant[key] != null)

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <NavBar title="Product" onBack={() => navigate(-1)} />

      <div style={{ flex: 1, overflowY: 'auto', padding: '16px', display: 'flex', flexDirection: 'column', gap: 16 }}>
        {/* Hero */}
        <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
          {variant.image_url ? (
            <img src={variant.image_url} alt={`${product.name}${variant.flavor ? ` ${variant.flavor}` : ''}`} style={{ width: 54, height: 54, borderRadius: 10, objectFit: 'cover', flexShrink: 0 }} />
          ) : (
            <div
              style={{
                width: 54,
                height: 54,
                borderRadius: 10,
                background: '#1a1a1a',
                border: '0.5px solid #222',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: 22,
                color: '#4a4a4a',
                flexShrink: 0,
                ...serif,
              }}
            >
              {product.name.charAt(0)}
            </div>
          )}
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ ...serif, fontSize: 17, color: '#f0ece4', letterSpacing: '-0.01em', lineHeight: 1.3 }}>
              {product.name}
              {variant.flavor ? ` — ${variant.flavor}` : ''}
            </div>
            <div style={{ fontSize: 12, color: '#4a4a4a', ...sans, marginTop: 3 }}>
              {brand?.name || product.brand_name} · {formatCategory(product.category)}
            </div>
          </div>
          <div style={{ textAlign: 'center', flexShrink: 0 }}>
            {summary?.ratings_count ? (
              <>
                <div style={{ ...serif, fontSize: 36, color: '#5ecfcf', letterSpacing: '-0.03em', lineHeight: 1 }}>{summary.overall_score.toFixed(1)}</div>
                <div style={{ fontSize: 10, color: '#3a3a3a', ...sans, marginTop: 3 }}>{summary.ratings_count.toLocaleString()} ratings</div>
              </>
            ) : (
              <div style={{ fontSize: 12, color: '#3a3a3a', ...sans }}>New</div>
            )}
          </div>
        </div>

        <ScoreBars dims={dims} />

        {nutrition.length > 0 && (
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {nutrition.map(([key, label, unit]) => (
              <div key={key} style={{ background: '#181818', border: '0.5px solid #222', borderRadius: 10, padding: '8px 12px', flex: '1 0 40%' }}>
                <div style={{ ...serif, fontSize: 15, color: '#e8e4dc' }}>
                  {variant[key]}
                  {unit}
                </div>
                <div style={{ fontSize: 10, color: '#4a4a4a', ...sans, marginTop: 2 }}>{label}</div>
              </div>
            ))}
          </div>
        )}

        {summary?.ratings_count > 0 && summary.buy_again_pct != null && <div style={{ fontSize: 12, color: '#5a5a5a', ...sans }}>{summary.buy_again_pct}% would buy again</div>}

        <Divider />

        {/* Reviews */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ ...serif, fontSize: 15, color: '#e8e4dc' }}>Reviews ({reviews.length})</span>
        </div>

        {reviews.length === 0 && <div style={{ textAlign: 'center', padding: '20px 0', color: '#3a3a3a', fontSize: 13, ...sans }}>No reviews yet. Be the first.</div>}

        {reviews.map((review) => (
          <Card key={review.id} style={{ gap: 8 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
              {review.reviewer && <Avatar user={{ avatar: review.reviewer.username.charAt(0).toUpperCase(), avatarColor: 'cyan' }} size="sm" />}
              <span style={{ ...serif, fontSize: 13, color: '#e8e4dc', letterSpacing: '-0.01em' }}>{review.reviewer?.username || 'Unknown'}</span>
              <ScorePill score={(review.taste_rating + review.value_effectiveness_rating) / 2} extraStyle={{ marginLeft: 'auto' }} />
            </div>
            {review.notes && <div style={{ fontSize: 13, color: '#5a5a5a', ...sans, lineHeight: 1.6, fontStyle: 'italic' }}>"{review.notes}"</div>}
            {review.tags.length > 0 && (
              <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap' }}>
                {review.tags.map((tag) => (
                  <span key={tag.id} style={{ border: '0.5px solid #222', borderRadius: 20, padding: '2px 8px', fontSize: 10, color: '#4a4a4a', ...sans }}>
                    {tag.label}
                  </span>
                ))}
              </div>
            )}
          </Card>
        ))}

        {/* CTA */}
        <button
          onClick={() => navigate(`/product/${variant.id}/review`)}
          style={{
            background: '#f0ece4',
            color: '#111',
            borderRadius: 20,
            padding: '14px 0',
            fontSize: 15,
            fontWeight: 500,
            border: 'none',
            cursor: 'pointer',
            ...serif,
            letterSpacing: '-0.01em',
            marginTop: 4,
          }}
        >
          Rate this product
        </button>
      </div>
    </div>
  )
}
