import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { Avatar, ScorePill, Card, Divider, NavBar } from '../components/ui'
import { useAsync } from '../hooks/useAsync'
import { useCurrentUser } from '../hooks/useCurrentUser'
import { fetchVariantById, fetchRatingSummaries } from '../lib/api/products'
import { fetchReviewsForVariant, fetchProfilesByIds, fetchTagsForReviews, deleteReview, reportReview } from '../lib/api/reviews'
import { fetchOwnLists, fetchListMembership, createList, addListItem, removeListItem } from '../lib/api/lists'
import { trackEvent } from '../lib/analytics'
import { scoreStyle } from '../utils/scoreStyle'

const serif = { fontFamily: 'Georgia, "Times New Roman", serif' }
const sans = { fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif' }

function formatCategory(raw) {
  return raw.replace(/_/g, ' ').replace(/^\w/, (c) => c.toUpperCase())
}

const NUTRITION_FIELDS = [
  ['calories', 'Calories', ''],
  ['protein_g', 'Protein', 'g'],
  ['carbs_g', 'Carbs', 'g'],
  ['fat_g', 'Fat', 'g'],
  ['sugar_g', 'Sugar', 'g'],
  ['fiber_g', 'Fiber', 'g'],
  ['caffeine_mg', 'Caffeine', 'mg'],
  ['sodium_mg', 'Sodium', 'mg'],
]

export default function ProductPage() {
  const { variantId } = useParams()
  const navigate = useNavigate()
  const user = useCurrentUser()
  const [deleting, setDeleting] = useState(false)
  const [showListPicker, setShowListPicker] = useState(false)
  const [showScoreInfo, setShowScoreInfo] = useState(false)
  const [ownLists, setOwnLists] = useState(null)
  const [membership, setMembership] = useState({}) // listId -> list_item id, for lists that already contain this variant
  const [newListName, setNewListName] = useState('')
  const [newListPublic, setNewListPublic] = useState(true)
  const [creatingList, setCreatingList] = useState(false)
  const [reportingId, setReportingId] = useState(null)
  const [reportReason, setReportReason] = useState('')
  const [submittingReport, setSubmittingReport] = useState(false)
  const [reportedIds, setReportedIds] = useState(new Set())

  const openListPicker = async () => {
    setShowListPicker((v) => !v)
    if (!ownLists && user) {
      const { data: lists } = await fetchOwnLists(user.id)
      setOwnLists(lists || [])
      const { data: items } = await fetchListMembership(
        (lists || []).map((l) => l.id),
        variantId,
      )
      setMembership(Object.fromEntries((items || []).map((i) => [i.list_id, i.id])))
    }
  }

  const handleToggleList = async (listId, targetVariantId) => {
    const itemId = membership[listId]
    if (itemId) {
      const { error } = await removeListItem(itemId)
      if (!error) {
        setMembership((m) => {
          const next = { ...m }
          delete next[listId]
          return next
        })
        trackEvent('list_item_remove', { list_id: listId, variant_id: targetVariantId })
      }
    } else {
      const { data: item, error } = await addListItem(listId, targetVariantId)
      if (!error) {
        setMembership((m) => ({ ...m, [listId]: item.id }))
        trackEvent('list_item_add', { list_id: listId, variant_id: targetVariantId })
      }
    }
  }

  const handleCreateAndAdd = async (targetVariantId) => {
    if (!newListName.trim()) return
    setCreatingList(true)
    const { data: list, error } = await createList({ userId: user.id, name: newListName.trim(), isPublic: newListPublic })
    setCreatingList(false)
    if (!error) {
      trackEvent('list_create', { list_id: list.id, is_public: newListPublic })
      setOwnLists((prev) => [list, ...(prev || [])])
      setNewListName('')
      const { data: item, error: addErr } = await addListItem(list.id, targetVariantId)
      if (!addErr) {
        setMembership((m) => ({ ...m, [list.id]: item.id }))
        trackEvent('list_item_add', { list_id: list.id, variant_id: targetVariantId })
      }
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

  const toggleReport = (reviewId) => {
    setReportingId((id) => (id === reviewId ? null : reviewId))
    setReportReason('')
  }

  const handleSubmitReport = async (reviewId) => {
    setSubmittingReport(true)
    const { error: reportError } = await reportReview(reviewId, user.id, reportReason)
    setSubmittingReport(false)
    // 23505 = unique_violation -- already reported this review, treat as success
    if (!reportError || reportError.code === '23505') {
      setReportedIds((ids) => new Set(ids).add(reviewId))
      setReportingId(null)
    }
  }

  const nutrition = NUTRITION_FIELDS.filter(([key]) => variant[key] != null)

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <NavBar title="Product" onBack={() => navigate(-1)} />

      <div style={{ flex: 1, overflowY: 'auto', padding: '16px', display: 'flex', flexDirection: 'column', gap: 16 }}>
        {/* Hero */}
        <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
          {variant.image_url ? (
            <img
              src={variant.image_url}
              alt={variant.image_alt || `${product.name}${variant.flavor ? ` ${variant.flavor}` : ''}`}
              style={{ width: 54, height: 54, borderRadius: 10, objectFit: 'cover', flexShrink: 0 }}
            />
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
            {product.status !== 'approved' && (
              <div
                style={{
                  display: 'inline-block',
                  background: '#252010',
                  border: '0.5px solid #352f1a',
                  color: '#e8c97a',
                  borderRadius: 20,
                  padding: '2px 9px',
                  fontSize: 10,
                  fontWeight: 500,
                  ...sans,
                  marginBottom: 5,
                }}
              >
                Pending review
              </div>
            )}
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

        {summary?.ratings_count > 0 && summary.buy_again_pct != null && <div style={{ fontSize: 12, color: '#5a5a5a', ...sans }}>{summary.buy_again_pct}% would buy again</div>}

        {/* Objective info -- nutrition facts and AI ingredient analysis are
            facts about the product, not anyone's subjective rating, so they
            live here rather than blended into the score above. */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <span style={{ fontSize: 9, color: '#444', textTransform: 'uppercase', letterSpacing: '0.07em', ...sans }}>Nutrition & ingredients</span>

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

          <div style={{ background: '#181818', border: '0.5px solid #222', borderRadius: 10, padding: '10px 12px', display: 'flex', flexDirection: 'column', gap: 4 }}>
            <button
              onClick={() => setShowScoreInfo(true)}
              style={{ display: 'flex', alignItems: 'center', gap: 8, background: 'none', border: 'none', padding: 0, cursor: 'pointer', alignSelf: 'flex-start' }}
            >
              <span style={{ fontSize: 11, color: '#5a5a5a', ...sans }}>Ingredient quality (AI)</span>
              <span
                style={{
                  width: 14,
                  height: 14,
                  borderRadius: '50%',
                  border: '0.5px solid #3a3a3a',
                  color: '#5a5a5a',
                  fontSize: 9,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  ...sans,
                }}
              >
                i
              </span>
              {variant.ai_ingredient_quality_score != null ? (
                <ScorePill score={variant.ai_ingredient_quality_score} />
              ) : (
                <span style={{ fontSize: 10, color: '#3a3a3a', ...sans }}>Not yet analyzed</span>
              )}
            </button>
            {variant.ai_ingredient_summary && <div style={{ fontSize: 12, color: '#5a5a5a', ...sans, lineHeight: 1.6 }}>{variant.ai_ingredient_summary}</div>}
            {variant.ai_ingredient_quality_score != null && (
              <div style={{ fontSize: 10, color: '#3a3a3a', ...sans, fontStyle: 'italic' }}>AI-generated estimate, not medical or nutritional advice.</div>
            )}
          </div>
        </div>

        {showScoreInfo && (
          <div
            onClick={() => setShowScoreInfo(false)}
            style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'flex-end', justifyContent: 'center', zIndex: 100 }}
          >
            <div
              onClick={(e) => e.stopPropagation()}
              style={{
                background: '#161616',
                border: '0.5px solid #262626',
                borderRadius: '16px 16px 0 0',
                padding: 20,
                width: '100%',
                maxWidth: 430,
                maxHeight: '80vh',
                overflowY: 'auto',
                display: 'flex',
                flexDirection: 'column',
                gap: 12,
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span style={{ ...serif, fontSize: 16, color: '#e8e4dc' }}>Ingredient quality score</span>
                <button onClick={() => setShowScoreInfo(false)} style={{ background: 'none', border: 'none', color: '#5a5a5a', fontSize: 18, cursor: 'pointer', padding: 0 }}>
                  ✕
                </button>
              </div>
              <div style={{ fontSize: 13, color: '#999', ...sans, lineHeight: 1.6 }}>
                An AI model reads this variant's ingredient list and rates it 1.0 (poor) to 10.0 (excellent) based on things like added sugars, artificial sweeteners/colors/flavors, proprietary blends
                that hide dosages, and genuinely beneficial ingredients. It's a read on the ingredients only -- not your personal taste or value rating, and not medical or nutritional advice.
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {[
                  [9.0, 10.0, 'Excellent -- clean ingredient list, minimal or no red flags'],
                  [7.0, 8.9, 'Good -- solid ingredients with a few minor additives'],
                  [5.0, 6.9, 'Mixed -- some real positives alongside notable additives'],
                  [1.0, 4.9, 'Poor -- heavy on artificial additives or hidden dosages'],
                ].map(([lo, hi, desc]) => {
                  const s = scoreStyle(hi)
                  return (
                    <div key={lo} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <span
                        style={{
                          background: s.bg,
                          color: s.color,
                          border: `0.5px solid ${s.border}`,
                          borderRadius: 20,
                          fontSize: 12,
                          fontWeight: 500,
                          padding: '3px 10px',
                          ...serif,
                          letterSpacing: '-0.01em',
                          minWidth: 76,
                          textAlign: 'center',
                          flexShrink: 0,
                        }}
                      >
                        {lo.toFixed(1)}–{hi.toFixed(1)}
                      </span>
                      <span style={{ fontSize: 12, color: '#888', ...sans }}>{desc}</span>
                    </div>
                  )
                })}
              </div>
            </div>
          </div>
        )}

        {user && variant.created_by === user.id && product.status === 'pending' && (
          <button
            onClick={() => navigate(`/product/${variant.id}/edit`, { replace: true })}
            style={{ alignSelf: 'flex-start', background: 'none', border: '0.5px solid #2a2a2a', borderRadius: 20, padding: '8px 16px', fontSize: 12, color: '#ccc', cursor: 'pointer', ...sans }}
          >
            Edit product
          </button>
        )}

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
                {ownLists?.map((list) => {
                  const isAdded = !!membership[list.id]
                  return (
                    <div key={list.id} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span style={{ flex: 1, fontSize: 13, color: '#ccc', ...sans }}>
                        {list.name}
                        {isAdded && <span style={{ color: '#5ecfcf', fontSize: 11, marginLeft: 6 }}>(Added)</span>}
                      </span>
                      <button
                        onClick={() => handleToggleList(list.id, variant.id)}
                        style={{
                          background: isAdded ? 'transparent' : '#f0ece4',
                          color: isAdded ? '#ff6b6b' : '#111',
                          border: isAdded ? '0.5px solid #3a1a1a' : 'none',
                          borderRadius: 8,
                          padding: '6px 12px',
                          fontSize: 11,
                          fontWeight: 500,
                          cursor: 'pointer',
                          flexShrink: 0,
                          ...sans,
                        }}
                      >
                        {isAdded ? 'Remove' : 'Add'}
                      </button>
                    </div>
                  )
                })}
                <div style={{ display: 'flex', gap: 8 }}>
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
                <label style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer' }}>
                  <input type="checkbox" checked={newListPublic} onChange={(e) => setNewListPublic(e.target.checked)} />
                  <span style={{ fontSize: 11, color: '#666', ...sans }}>Public (anyone with the link can view it)</span>
                </label>
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
              <div
                style={{ display: 'flex', alignItems: 'center', gap: 7, cursor: review.reviewer ? 'pointer' : 'default' }}
                onClick={() => review.reviewer && navigate(`/profile/${review.reviewer.username}`)}
              >
                {review.reviewer && <Avatar user={review.reviewer} size="sm" />}
                <span style={{ ...serif, fontSize: 13, color: '#e8e4dc', letterSpacing: '-0.01em' }}>{isOwn ? 'You' : review.reviewer?.username || 'Unknown'}</span>
                <ScorePill score={review.overall_rating} extraStyle={{ marginLeft: 'auto' }} />
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

              {!isOwn && user && (
                <div>
                  {reportedIds.has(review.id) ? (
                    <span style={{ fontSize: 11, color: '#3a3a3a', ...sans }}>Reported</span>
                  ) : (
                    <button onClick={() => toggleReport(review.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 11, color: '#3a3a3a', ...sans, padding: 0 }}>
                      {reportingId === review.id ? 'Cancel' : 'Report'}
                    </button>
                  )}

                  {reportingId === review.id && (
                    <div style={{ marginTop: 8, display: 'flex', flexDirection: 'column', gap: 6 }}>
                      <input
                        value={reportReason}
                        onChange={(e) => setReportReason(e.target.value)}
                        placeholder="What's wrong with this review? (optional)"
                        style={{ background: '#1a1a1a', border: '0.5px solid #252525', borderRadius: 8, padding: '8px 10px', fontSize: 12, color: '#ccc', outline: 'none', ...sans }}
                      />
                      <button
                        onClick={() => handleSubmitReport(review.id)}
                        disabled={submittingReport}
                        style={{
                          alignSelf: 'flex-start',
                          background: 'none',
                          border: '0.5px solid #3a1a1a',
                          color: '#ff6b6b',
                          borderRadius: 8,
                          padding: '6px 12px',
                          fontSize: 11,
                          fontWeight: 500,
                          cursor: submittingReport ? 'default' : 'pointer',
                          opacity: submittingReport ? 0.5 : 1,
                          ...sans,
                        }}
                      >
                        {submittingReport ? 'Submitting...' : 'Submit report'}
                      </button>
                    </div>
                  )}
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
