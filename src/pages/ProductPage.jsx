import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { Heart, Bookmark, Ban, Candy, Zap, Dumbbell, Leaf, WheatOff, Flame, CheckCircle2, Sparkles } from 'lucide-react'
import { Avatar, ScorePill, Card, Divider, NavBar, Skeleton, ErrorState } from '../components/ui'
import { useToast } from '../components/Toast'
import { useConfirm } from '../components/ConfirmDialog'
import { useAsync } from '../hooks/useAsync'
import { useCurrentUser } from '../hooks/useCurrentUser'
import { fetchVariantById, fetchRatingSummaries } from '../lib/api/products'
import { fetchReviewsForVariant, fetchProfilesByIds, fetchTagsForReviews, deleteReview, reportReview } from '../lib/api/reviews'
import { fetchOwnLists, fetchListMembership, createList, addListItem, removeListItem } from '../lib/api/lists'
import { fetchWishlistMembership, addToWishlist, removeFromWishlist } from '../lib/api/social'
import { trackEvent } from '../lib/analytics'
import { scoreStyle } from '../utils/scoreStyle'

const serif = { fontFamily: 'var(--font-serif)' }
const sans = { fontFamily: 'var(--font-sans)', fontWeight: 500 }

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

const BADGE_COLORS = ['var(--tier-purple)', 'var(--color-taste)', 'var(--color-effect)', 'var(--color-value)']

/**
 * "Ingredient Deep Dive" grid entries -- built entirely from real structured
 * fields (nutrition facts, dietary flags, AI-generated ingredient flags),
 * not free-form tags the schema doesn't have. Order: the most notable
 * nutrition facts first, then dietary flags, then AI flags.
 * @param {object} variant
 */
function ingredientBadges(variant) {
  const badges = []
  if (variant.sugar_g === 0) badges.push({ Icon: Ban, label: 'No Sugar' })
  else if (variant.sugar_g != null) badges.push({ Icon: Candy, label: `${variant.sugar_g}g Sugar` })
  if (variant.caffeine_mg) badges.push({ Icon: Zap, label: `${variant.caffeine_mg}mg Caffeine` })
  if (variant.protein_g) badges.push({ Icon: Dumbbell, label: `${variant.protein_g}g Protein` })
  if (variant.is_vegan) badges.push({ Icon: Leaf, label: 'Vegan' })
  if (variant.is_gluten_free) badges.push({ Icon: WheatOff, label: 'Gluten-Free' })
  if (variant.is_keto) badges.push({ Icon: Flame, label: 'Keto' })
  for (const cert of variant.certifications || []) badges.push({ Icon: CheckCircle2, label: cert })
  // "no red flags" etc are a null-result flag, not a notable ingredient fact
  for (const flag of variant.ai_ingredient_flags || []) {
    if (!/no (red flags|major (concerns|issues))/i.test(flag)) badges.push({ Icon: Sparkles, label: flag })
  }
  return badges.map((b, i) => ({ ...b, color: BADGE_COLORS[i % BADGE_COLORS.length] }))
}

export default function ProductPage() {
  const { variantId } = useParams()
  const navigate = useNavigate()
  const user = useCurrentUser()
  const showToast = useToast()
  const confirm = useConfirm()
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
  const [showAllReviews, setShowAllReviews] = useState(false)
  const [wishlistItemId, setWishlistItemId] = useState(undefined) // undefined = unknown/loading, null = not on wishlist
  const [wishlistBusy, setWishlistBusy] = useState(false)

  useEffect(() => {
    if (!user) return
    fetchWishlistMembership(user.id, variantId).then(({ data: row }) => setWishlistItemId(row?.id ?? null))
  }, [user, variantId])

  const handleToggleWishlist = async () => {
    if (!user) {
      navigate('/auth')
      return
    }
    setWishlistBusy(true)
    if (wishlistItemId) {
      const prevId = wishlistItemId
      setWishlistItemId(null)
      const { error: removeErr } = await removeFromWishlist(prevId)
      if (removeErr) {
        setWishlistItemId(prevId)
        showToast("Couldn't update Want to Try. Try again.", 'error')
      }
    } else {
      const { data: item, error: addErr } = await addToWishlist(user.id, variantId)
      if (addErr) {
        showToast("Couldn't update Want to Try. Try again.", 'error')
      } else {
        setWishlistItemId(item.id)
        trackEvent('wishlist_add', { variant_id: variantId })
      }
    }
    setWishlistBusy(false)
  }

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
    const listName = ownLists?.find((l) => l.id === listId)?.name || 'list'
    const itemId = membership[listId]
    if (itemId) {
      // Optimistic: drop it from membership immediately, restore on failure.
      setMembership((m) => {
        const next = { ...m }
        delete next[listId]
        return next
      })
      const { error } = await removeListItem(itemId)
      if (!error) {
        trackEvent('list_item_remove', { list_id: listId, variant_id: targetVariantId })
        showToast(`Removed from ${listName}.`)
      } else {
        setMembership((m) => ({ ...m, [listId]: itemId }))
        showToast(`Couldn't remove from ${listName}. Try again.`, 'error')
      }
    } else {
      // Optimistic: mark added immediately with a placeholder id, replace
      // with the real item id (or roll back entirely) once the call resolves.
      const placeholderId = `pending-${Date.now()}`
      setMembership((m) => ({ ...m, [listId]: placeholderId }))
      const { data: item, error } = await addListItem(listId, targetVariantId)
      if (!error) {
        setMembership((m) => ({ ...m, [listId]: item.id }))
        trackEvent('list_item_add', { list_id: listId, variant_id: targetVariantId })
        showToast(`Added to ${listName}.`)
      } else {
        setMembership((m) => {
          const next = { ...m }
          delete next[listId]
          return next
        })
        showToast(`Couldn't add to ${listName}. Try again.`, 'error')
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
    return (
      <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
        <NavBar title="Product" onBack={() => navigate(-1)} />
        <Skeleton variant="detail" />
      </div>
    )
  }

  if (error) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
        <NavBar title="Product" onBack={() => navigate(-1)} />
        <ErrorState message="Couldn't load this product. Try again in a moment." onRetry={refetch} />
      </div>
    )
  }

  if (!data) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
        <NavBar title="Product" onBack={() => navigate(-1)} />
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-quiet)', fontSize: 15, ...sans }}>Product not found.</div>
      </div>
    )
  }

  const { variant, summary, reviews } = data
  const product = variant.products
  const brand = product.brands
  const ownReview = user ? reviews.find((r) => r.user_id === user.id) : null

  const handleDelete = async () => {
    if (!(await confirm('This cannot be undone.', { title: 'Delete your review?', confirmLabel: 'Delete Review' }))) return
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
  const badges = ingredientBadges(variant)
  const attributePills = [formatCategory(product.category), variant.is_vegan && 'Vegan', variant.is_keto && 'Keto', variant.is_gluten_free && 'Gluten-Free'].filter(Boolean)

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <NavBar
        title="Stackd"
        onBack={() => navigate(-1)}
        rightEl={
          <button
            onClick={user ? openListPicker : undefined}
            disabled={!user}
            className="stackd-press"
            style={{
              width: 32,
              height: 32,
              borderRadius: '50%',
              background: Object.keys(membership).length > 0 ? 'var(--color-taste-bg)' : 'var(--bg-subtle)',
              border: `0.5px solid ${Object.keys(membership).length > 0 ? 'var(--color-taste-border)' : 'var(--border)'}`,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: user ? 'pointer' : 'default',
              color: Object.keys(membership).length > 0 ? 'var(--color-taste)' : 'var(--text-muted)',
              flexShrink: 0,
            }}
          >
            <Heart size={16} strokeWidth={2.25} fill={Object.keys(membership).length > 0 ? 'currentColor' : 'none'} />
          </button>
        }
      />

      <div style={{ flex: 1, overflowY: 'auto', padding: '16px', display: 'flex', flexDirection: 'column', gap: 16 }}>
        {/* Hero image */}
        <div
          style={{ background: 'var(--bg-card)', border: '0.5px solid var(--border)', borderRadius: 14, padding: 24, display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: 208 }}
        >
          {variant.image_url ? (
            <img src={variant.image_url} alt={variant.image_alt || `${product.name}${variant.flavor ? ` ${variant.flavor}` : ''}`} style={{ maxHeight: 160, maxWidth: '100%', objectFit: 'contain' }} />
          ) : (
            <div style={{ fontSize: 40, color: 'var(--text-tertiary)', ...serif }}>{product.name.charAt(0)}</div>
          )}
        </div>

        {/* Title */}
        <div>
          {product.status !== 'approved' && (
            <div
              style={{
                display: 'inline-block',
                background: 'var(--tier-gold-bg)',
                border: '0.5px solid var(--tier-gold-border)',
                color: 'var(--tier-gold)',
                borderRadius: 20,
                padding: '2px 9px',
                fontSize: 11,
                fontWeight: 500,
                ...sans,
                marginBottom: 6,
              }}
            >
              Pending review
            </div>
          )}
          <div style={{ ...serif, fontSize: 24, color: 'var(--text-heading)', letterSpacing: '-0.01em', lineHeight: 1.2 }}>
            {product.name}
            {variant.flavor ? ` — ${variant.flavor}` : ''}
          </div>
          <div style={{ fontSize: 13, color: 'var(--text-tertiary)', ...sans, marginTop: 4 }}>
            {brand?.name || product.brand_name} · {formatCategory(product.category)}
            {variant.size ? ` · ${variant.size}` : ''}
          </div>
        </div>

        {/* Attribute pills */}
        <div style={{ display: 'flex', gap: 7, flexWrap: 'wrap' }}>
          {attributePills.map((label) => (
            <span key={label} style={{ border: '0.5px solid var(--border-medium)', borderRadius: 20, padding: '5px 13px', fontSize: 12, color: 'var(--text-input)', ...sans }}>
              {label}
            </span>
          ))}
        </div>

        {/* Stackd Score */}
        <div style={{ background: 'var(--bg-card)', border: '0.5px solid var(--border)', borderRadius: 14, padding: 16, display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
            <span style={{ ...serif, fontSize: 16, color: 'var(--text-primary)' }}>Stackd Score</span>
            {summary?.ratings_count ? (
              <span>
                <span style={{ ...serif, fontSize: 30, color: 'var(--text-heading)', letterSpacing: '-0.02em' }}>{summary.overall_score.toFixed(1)}</span>
                <span style={{ fontSize: 13, color: 'var(--text-quiet)', ...sans }}> /10</span>
              </span>
            ) : (
              <span style={{ fontSize: 13, color: 'var(--text-quiet)', ...sans }}>New</span>
            )}
          </div>

          {summary?.ratings_count > 0 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {[
                ['Taste', summary.taste_score, 'var(--color-taste)'],
                ['Value', summary.value_score, 'var(--color-value)'],
                ['Effect', summary.effectiveness_score, 'var(--color-effect)'],
              ].map(([label, score, color]) => (
                <div key={label} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <span style={{ width: 44, fontSize: 12, color: 'var(--text-secondary)', ...sans, flexShrink: 0 }}>{label}</span>
                  <div style={{ flex: 1, height: 10, borderRadius: 5, background: 'var(--bg-subtle)', overflow: 'hidden' }}>
                    <div style={{ height: '100%', width: `${(Number(score || 0) / 10) * 100}%`, background: color, borderRadius: 5 }} />
                  </div>
                  <span style={{ width: 28, textAlign: 'right', fontSize: 12, color: 'var(--text-input)', ...sans, flexShrink: 0 }}>{Number(score || 0).toFixed(1)}</span>
                </div>
              ))}
            </div>
          )}

          {summary?.ratings_count > 0 && (
            <div style={{ fontSize: 12, color: 'var(--text-quiet)', ...sans }}>
              {summary.ratings_count.toLocaleString()} rating{summary.ratings_count !== 1 ? 's' : ''}
              {summary.buy_again_pct != null ? ` · ${summary.buy_again_pct}% would buy again` : ''}
            </div>
          )}
        </div>

        {/* Add to Stack / Want to Try */}
        {user && (
          <div style={{ display: 'flex', gap: 8 }}>
            <button
              onClick={openListPicker}
              style={{
                flex: 1,
                background: showListPicker ? 'var(--border)' : 'var(--border-medium)',
                color: 'var(--text-primary)',
                border: 'none',
                borderRadius: 20,
                padding: '13px 0',
                fontSize: 15,
                fontWeight: 700,
                cursor: 'pointer',
                ...serif,
              }}
            >
              {showListPicker ? 'Close' : '+ Add to Stack'}
            </button>
            {!ownReview && (
              <button
                onClick={handleToggleWishlist}
                disabled={wishlistBusy || wishlistItemId === undefined}
                title="Want to try"
                className="stackd-press"
                style={{
                  width: 50,
                  flexShrink: 0,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  background: wishlistItemId ? 'var(--color-taste-bg)' : 'none',
                  border: wishlistItemId ? '0.5px solid var(--color-taste-border)' : '0.5px solid var(--border-medium)',
                  color: wishlistItemId ? 'var(--color-taste)' : 'var(--text-input)',
                  borderRadius: 20,
                  cursor: wishlistBusy ? 'default' : 'pointer',
                  opacity: wishlistBusy ? 0.6 : 1,
                }}
              >
                <Bookmark size={17} fill={wishlistItemId ? 'currentColor' : 'none'} strokeWidth={2} />
              </button>
            )}
          </div>
        )}

        {user && showListPicker && (
          <div style={{ background: 'var(--bg-card)', border: '0.5px solid var(--border)', borderRadius: 12, padding: 12, display: 'flex', flexDirection: 'column', gap: 8, marginTop: -8 }}>
            {ownLists === null && <div style={{ fontSize: 13, color: 'var(--text-quiet)', ...sans }}>Loading your lists...</div>}
            {ownLists?.length === 0 && <div style={{ fontSize: 13, color: 'var(--text-quiet)', ...sans }}>You don't have any lists yet -- make one below.</div>}
            {ownLists?.map((list) => {
              const isAdded = !!membership[list.id]
              return (
                <div key={list.id} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ flex: 1, fontSize: 14, color: 'var(--text-input)', ...sans }}>
                    {list.name}
                    {isAdded && <span style={{ color: 'var(--tier-teal)', fontSize: 12, marginLeft: 6 }}>(Added)</span>}
                  </span>
                  <button
                    onClick={() => handleToggleList(list.id, variant.id)}
                    style={{
                      background: isAdded ? 'transparent' : 'var(--text-heading)',
                      color: isAdded ? 'var(--tier-red)' : 'var(--bg-nav)',
                      border: isAdded ? '0.5px solid var(--tier-red-border)' : 'none',
                      borderRadius: 8,
                      padding: '6px 12px',
                      fontSize: 12,
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
                style={{
                  flex: 1,
                  background: 'var(--bg-subtle)',
                  border: '0.5px solid var(--border-input)',
                  borderRadius: 8,
                  padding: '8px 10px',
                  fontSize: 13,
                  color: 'var(--text-input)',
                  outline: 'none',
                  ...sans,
                }}
              />
              <button
                onClick={() => handleCreateAndAdd(variant.id)}
                disabled={creatingList || !newListName.trim()}
                style={{
                  background: 'var(--text-heading)',
                  color: 'var(--bg-nav)',
                  borderRadius: 8,
                  padding: '8px 12px',
                  fontSize: 13,
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
              <span style={{ fontSize: 12, color: 'var(--text-faint)', ...sans }}>Public (anyone with the link can view it)</span>
            </label>
          </div>
        )}

        <Divider />

        {/* Ingredient Deep Dive -- badge cards only (icon-in-circle, matching
            the design reference); raw nutrition numbers get their own
            "Nutrition Facts" section below instead of being merged in here,
            since several of them (protein) already appear as a badge and
            showing both was a duplicate. */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <span style={{ ...serif, fontSize: 18, color: 'var(--text-primary)' }}>Ingredient Deep Dive</span>

          {badges.length > 0 && (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
              {badges.map((b, i) => (
                <div
                  key={i}
                  style={{
                    background: 'var(--bg-card)',
                    border: '0.5px solid var(--border)',
                    borderRadius: 12,
                    padding: '16px 10px',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    gap: 8,
                  }}
                >
                  <b.Icon size={22} color={b.color} strokeWidth={2} />
                  <span style={{ fontSize: 12, color: 'var(--text-input)', ...sans, textAlign: 'center' }}>{b.label}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {nutrition.length > 0 && (
          <>
            <Divider />
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <span style={{ ...serif, fontSize: 18, color: 'var(--text-primary)' }}>Nutrition Facts</span>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                {nutrition.map(([key, label, unit]) => (
                  <div key={key} style={{ background: 'var(--bg-card)', border: '0.5px solid var(--border)', borderRadius: 10, padding: '8px 12px', flex: '1 0 40%' }}>
                    <div style={{ ...serif, fontSize: 16, color: 'var(--text-primary)' }}>
                      {variant[key]}
                      {unit}
                    </div>
                    <div style={{ fontSize: 11, color: 'var(--text-tertiary)', ...sans, marginTop: 2 }}>{label}</div>
                  </div>
                ))}
              </div>
            </div>
          </>
        )}

        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <button
            onClick={() => setShowScoreInfo(true)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              background: 'var(--bg-card)',
              border: '0.5px solid var(--border)',
              borderRadius: 10,
              padding: '10px 12px',
              cursor: 'pointer',
              alignSelf: 'stretch',
              textAlign: 'left',
            }}
          >
            <span style={{ fontSize: 12, color: 'var(--text-secondary)', ...sans }}>Ingredient quality (AI)</span>
            {variant.ai_ingredient_quality_score != null ? (
              <ScorePill score={variant.ai_ingredient_quality_score} extraStyle={{ marginLeft: 'auto' }} />
            ) : (
              <span style={{ fontSize: 11, color: 'var(--text-quiet)', ...sans, marginLeft: 'auto' }}>Not yet analyzed</span>
            )}
          </button>
          {variant.ai_ingredient_summary && <div style={{ fontSize: 13, color: 'var(--text-secondary)', ...sans, lineHeight: 1.6 }}>{variant.ai_ingredient_summary}</div>}
        </div>

        {showScoreInfo && (
          <div
            onClick={() => setShowScoreInfo(false)}
            style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'flex-end', justifyContent: 'center', zIndex: 100 }}
          >
            <div
              onClick={(e) => e.stopPropagation()}
              style={{
                background: 'var(--bg-modal)',
                border: '0.5px solid var(--border)',
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
                <span style={{ ...serif, fontSize: 17, color: 'var(--text-primary)' }}>Ingredient quality score</span>
                <button onClick={() => setShowScoreInfo(false)} style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', fontSize: 18, cursor: 'pointer', padding: 0 }}>
                  ✕
                </button>
              </div>
              <div style={{ fontSize: 14, color: 'var(--text-body)', ...sans, lineHeight: 1.6 }}>
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
                          fontSize: 13,
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
                      <span style={{ fontSize: 13, color: 'var(--text-body)', ...sans }}>{desc}</span>
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
            style={{
              alignSelf: 'flex-start',
              background: 'none',
              border: '0.5px solid var(--border-medium)',
              borderRadius: 20,
              padding: '8px 16px',
              fontSize: 13,
              color: 'var(--text-input)',
              cursor: 'pointer',
              ...sans,
            }}
          >
            Edit product
          </button>
        )}

        <Divider />

        {/* Reviews -- "What people think", not "What your friends think": there's
            no follow graph yet (aggregate-only ratings for MVP, see DECISIONS.md),
            so this is every review, not a friends-filtered subset. */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ ...serif, fontSize: 18, color: 'var(--text-primary)' }}>What people think</span>
          {reviews.length > 3 ? (
            <button
              onClick={() => setShowAllReviews((v) => !v)}
              className="stackd-press"
              style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 13, fontWeight: 600, color: 'var(--tier-purple)', ...sans, padding: 0 }}
            >
              {showAllReviews ? 'Show less' : `See all ${reviews.length}`}
            </button>
          ) : (
            <span style={{ fontSize: 12, color: 'var(--text-quiet)', ...sans }}>{reviews.length}</span>
          )}
        </div>

        {reviews.length === 0 && <div style={{ textAlign: 'center', padding: '20px 0', color: 'var(--text-quiet)', fontSize: 14, ...sans }}>No reviews yet. Be the first.</div>}

        {(showAllReviews ? reviews : reviews.slice(0, 3)).map((review) => {
          const isOwn = user && review.user_id === user.id
          return (
            <Card key={review.id} style={{ gap: 8, border: isOwn ? '0.5px solid var(--tier-teal-border)' : undefined }}>
              {review.reviewer ? (
                <button
                  onClick={() => navigate(`/profile/${review.reviewer.username}`)}
                  style={{ display: 'flex', alignItems: 'center', gap: 7, cursor: 'pointer', background: 'none', border: 'none', padding: 0, width: '100%', textAlign: 'left' }}
                >
                  <Avatar user={review.reviewer} size="sm" />
                  <span style={{ ...serif, fontSize: 14, color: 'var(--text-primary)', letterSpacing: '-0.01em' }}>{isOwn ? 'You' : review.reviewer.username}</span>
                  <ScorePill score={review.overall_rating} extraStyle={{ marginLeft: 'auto' }} />
                </button>
              ) : (
                <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                  <span style={{ ...serif, fontSize: 14, color: 'var(--text-primary)', letterSpacing: '-0.01em' }}>Unknown</span>
                  <ScorePill score={review.overall_rating} extraStyle={{ marginLeft: 'auto' }} />
                </div>
              )}
              {review.notes && <div style={{ fontSize: 14, color: 'var(--text-secondary)', ...sans, lineHeight: 1.6, fontStyle: 'italic' }}>"{review.notes}"</div>}
              {review.tags.length > 0 && (
                <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap' }}>
                  {review.tags.map((tag) => (
                    <span key={tag.id} style={{ border: '0.5px solid var(--border)', borderRadius: 20, padding: '2px 8px', fontSize: 11, color: 'var(--text-tertiary)', ...sans }}>
                      {tag.label}
                    </span>
                  ))}
                </div>
              )}
              {isOwn && (
                <div style={{ display: 'flex', gap: 8 }}>
                  <button
                    onClick={() => navigate(`/product/${variant.id}/review`)}
                    className="stackd-press"
                    style={{
                      background: 'var(--tier-teal-bg)',
                      border: '0.5px solid var(--tier-teal-border)',
                      borderRadius: 20,
                      cursor: 'pointer',
                      fontSize: 13,
                      fontWeight: 500,
                      color: 'var(--tier-teal)',
                      ...sans,
                      padding: '7px 16px',
                    }}
                  >
                    Edit
                  </button>
                  <button
                    onClick={handleDelete}
                    disabled={deleting}
                    className="stackd-press"
                    style={{
                      background: 'var(--tier-red-bg)',
                      border: '0.5px solid var(--tier-red-border)',
                      borderRadius: 20,
                      cursor: deleting ? 'default' : 'pointer',
                      fontSize: 13,
                      fontWeight: 500,
                      color: 'var(--tier-red)',
                      ...sans,
                      padding: '7px 16px',
                      opacity: deleting ? 0.5 : 1,
                    }}
                  >
                    {deleting ? 'Deleting...' : 'Delete'}
                  </button>
                </div>
              )}

              {!isOwn && user && (
                <div>
                  {reportedIds.has(review.id) ? (
                    <span style={{ fontSize: 12, color: 'var(--text-quiet)', ...sans }}>Reported</span>
                  ) : (
                    <button onClick={() => toggleReport(review.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 12, color: 'var(--text-quiet)', ...sans, padding: 0 }}>
                      {reportingId === review.id ? 'Cancel' : 'Report'}
                    </button>
                  )}

                  {reportingId === review.id && (
                    <div style={{ marginTop: 8, display: 'flex', flexDirection: 'column', gap: 6 }}>
                      <input
                        value={reportReason}
                        onChange={(e) => setReportReason(e.target.value)}
                        placeholder="What's wrong with this review? (optional)"
                        style={{
                          background: 'var(--bg-subtle)',
                          border: '0.5px solid var(--border-input)',
                          borderRadius: 8,
                          padding: '8px 10px',
                          fontSize: 13,
                          color: 'var(--text-input)',
                          outline: 'none',
                          ...sans,
                        }}
                      />
                      <button
                        onClick={() => handleSubmitReport(review.id)}
                        disabled={submittingReport}
                        style={{
                          alignSelf: 'flex-start',
                          background: 'none',
                          border: '0.5px solid var(--tier-red-border)',
                          color: 'var(--tier-red)',
                          borderRadius: 8,
                          padding: '6px 12px',
                          fontSize: 12,
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
              background: 'var(--text-heading)',
              color: 'var(--bg-nav)',
              borderRadius: 20,
              padding: '14px 0',
              fontSize: 16,
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
