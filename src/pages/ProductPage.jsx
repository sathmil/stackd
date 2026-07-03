import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { Avatar, ScorePill, ScoreBars, Card, Divider, NavBar } from '../components/ui'
import { useAsync } from '../hooks/useAsync'
import { useCurrentUser } from '../hooks/useCurrentUser'
import { fetchVariantById, fetchRatingSummaries } from '../lib/api/products'
import { fetchReviewsForVariant, fetchProfilesByIds, fetchTagsForReviews, deleteReview } from '../lib/api/reviews'
import { fetchOwnLists, createList, addListItem } from '../lib/api/lists'
import { trackEvent } from '../lib/analytics'

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
  const user = useCurrentUser()
  const [deleting, setDeleting] = useState(false)
  const [showListPicker, setShowListPicker] = useState(false)
  const [ownLists, setOwnLists] = useState(null)
  const [addedToListId, setAddedToListId] = useState(null)
  const [newListName, setNewListName] = useState('')
  const [creatingList, setCreatingList] = useState(false)

  const openListPicker = async () => {
    setShowListPicker((v) => !v)
    if (!ownLists && user) {
      const { data } = await fetchOwnLists(user.id)
      setOwnLists(data || [])
    }
  }

  const handleAddToList = async (listId, variantId) => {
    const { error } = await addListItem(listId, variantId)
    if (!error) {
      setAddedToListId(listId)
      trackEvent('list_item_add', { list_id: listId, variant_id: variantId })
    }
  }

  const handleCreateAndAdd = async (variantId) => {
    if (!newListName.trim()) return
    setCreatingList(true)
    const { data: list, error } = await createList({ userId: user.id, name: newListName.trim(), isPublic: true })
    setCreatingList(false)
    if (!error) {
      trackEvent('list_create', { list_id: list.id, is_public: true })
      setOwnLists((prev) => [list, ...(prev || [])])
      setNewListName('')
      handleAddToList(list.id, variantId)
    }
  }

  const { data, loading, error, refetch } = useAsync(async () => {
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

  useEffect(() => {
    if (data?.variant) trackEvent('product_view', { variant_id: data.variant.id })
  }, [data?.variant])

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
  const ownReview = user ? reviews.find((r) => r.user_id === user.id) : null

  const handleDelete = async () => {
    if (!window.confirm('Delete your review? This cannot be undone.')) return
    setDeleting(true)
    await deleteReview(ownReview.id)
    setDeleting(false)
    refetch()
  }

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

        {user && (
          <div>
            <button
              onClick={openListPicker}
              style={{ background: 'none', border: '0.5px solid #2a2a2a', borderRadius: 20, padding: '8px 16px', fontSize: 12, color: '#ccc', cursor: 'pointer', ...sans }}
            >
              {showListPicker ? 'Close' : '+ Add to list'}
            </button>

            {showListPicker && (
              <div style={{ marginTop: 10, background: '#181818', border: '0.5px solid #222', borderRadius: 12, padding: 12, display: 'flex', flexDirection: 'column', gap: 8 }}>
                {ownLists === null && <div style={{ fontSize: 12, color: '#3a3a3a', ...sans }}>Loading your lists...</div>}
                {ownLists?.length === 0 && <div style={{ fontSize: 12, color: '#3a3a3a', ...sans }}>You don't have any lists yet -- make one below.</div>}
                {ownLists?.map((list) => (
                  <button
                    key={list.id}
                    onClick={() => handleAddToList(list.id, variant.id)}
                    disabled={addedToListId === list.id}
                    style={{
                      textAlign: 'left',
                      background: 'none',
                      border: 'none',
                      cursor: addedToListId === list.id ? 'default' : 'pointer',
                      fontSize: 13,
                      color: addedToListId === list.id ? '#5ecfcf' : '#ccc',
                      ...sans,
                      padding: '6px 0',
                    }}
                  >
                    {addedToListId === list.id ? `Added to ${list.name}` : list.name}
                  </button>
                ))}
                <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
                  <input
                    value={newListName}
                    onChange={(e) => setNewListName(e.target.value)}
                    placeholder="New list name"
                    style={{ flex: 1, background: '#1a1a1a', border: '0.5px solid #252525', borderRadius: 8, padding: '8px 10px', fontSize: 12, color: '#ccc', outline: 'none', ...sans }}
                  />
                  <button
                    onClick={() => handleCreateAndAdd(variant.id)}
                    disabled={creatingList || !newListName.trim()}
                    style={{
                      background: '#f0ece4',
                      color: '#111',
                      borderRadius: 8,
                      padding: '8px 12px',
                      fontSize: 12,
                      fontWeight: 500,
                      border: 'none',
                      cursor: 'pointer',
                      opacity: creatingList || !newListName.trim() ? 0.5 : 1,
                      ...sans,
                    }}
                  >
                    {creatingList ? '...' : 'Create'}
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        <Divider />

        {/* Reviews */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ ...serif, fontSize: 15, color: '#e8e4dc' }}>Reviews ({reviews.length})</span>
        </div>

        {reviews.length === 0 && <div style={{ textAlign: 'center', padding: '20px 0', color: '#3a3a3a', fontSize: 13, ...sans }}>No reviews yet. Be the first.</div>}

        {reviews.map((review) => {
          const isOwn = user && review.user_id === user.id
          return (
            <Card key={review.id} style={{ gap: 8, border: isOwn ? '0.5px solid #2a3a3a' : undefined }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                {review.reviewer && <Avatar user={{ avatar: review.reviewer.username.charAt(0).toUpperCase(), avatarColor: 'cyan' }} size="sm" />}
                <span style={{ ...serif, fontSize: 13, color: '#e8e4dc', letterSpacing: '-0.01em' }}>{isOwn ? 'You' : review.reviewer?.username || 'Unknown'}</span>
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
              {isOwn && (
                <div style={{ display: 'flex', gap: 14 }}>
                  <button
                    onClick={() => navigate(`/product/${variant.id}/review`)}
                    style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 12, color: '#5ecfcf', ...sans, padding: 0 }}
                  >
                    Edit
                  </button>
                  <button
                    onClick={handleDelete}
                    disabled={deleting}
                    style={{ background: 'none', border: 'none', cursor: deleting ? 'default' : 'pointer', fontSize: 12, color: '#ff6b6b', ...sans, padding: 0, opacity: deleting ? 0.5 : 1 }}
                  >
                    {deleting ? 'Deleting...' : 'Delete'}
                  </button>
                </div>
              )}
            </Card>
          )
        })}

        {/* CTA */}
        {!ownReview && (
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
        )}
      </div>
    </div>
  )
}
