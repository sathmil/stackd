import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Avatar, ScorePill, Card, Skeleton, ErrorState } from '../components/ui'
import { fetchRecentReviews, fetchProfilesByIds, fetchTagsForReviews } from '../lib/api/reviews'
import { timeAgo } from '../utils/timeAgo'
import { trackEvent } from '../lib/analytics'

const serif = { fontFamily: 'Georgia, "Times New Roman", serif' }
const sans = { fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif', fontWeight: 500 }

const PAGE_SIZE = 15

function formatCategory(raw) {
  return raw.replace(/_/g, ' ').replace(/^\w/, (c) => c.toUpperCase())
}

function FeedCard({ review }) {
  const navigate = useNavigate()
  const variant = review.product_variants
  const product = variant.products

  return (
    <Card>
      {review.reviewer ? (
        <button
          onClick={() => navigate(`/profile/${review.reviewer.username}`)}
          style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', background: 'none', border: 'none', padding: 0, width: '100%', textAlign: 'left' }}
        >
          <Avatar user={review.reviewer} size="sm" />
          <span style={{ fontSize: 15, color: '#e8e4dc', ...serif, letterSpacing: '-0.01em' }}>{review.reviewer.username}</span>
          <span style={{ marginLeft: 'auto', fontSize: 11, color: '#828282', ...sans }}>{timeAgo(review.created_at)}</span>
        </button>
      ) : (
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: 15, color: '#e8e4dc', ...serif, letterSpacing: '-0.01em' }}>Unknown</span>
          <span style={{ marginLeft: 'auto', fontSize: 11, color: '#828282', ...sans }}>{timeAgo(review.created_at)}</span>
        </div>
      )}

      <span style={{ fontSize: 13, color: '#868686', ...sans }}>rated a product</span>

      <button
        onClick={() => navigate(`/product/${variant.id}`)}
        style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer', background: 'none', border: 'none', padding: 0, width: '100%', textAlign: 'left' }}
      >
        {variant.image_url ? (
          <img src={variant.image_url} alt={variant.image_alt || product.name} style={{ width: 34, height: 34, borderRadius: 8, objectFit: 'cover', flexShrink: 0 }} />
        ) : (
          <div
            style={{
              width: 34,
              height: 34,
              borderRadius: 8,
              background: '#1a1a1a',
              border: '0.5px solid #222',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 16,
              color: '#868686',
              flexShrink: 0,
              ...serif,
            }}
          >
            {product.name.charAt(0)}
          </div>
        )}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 15, color: '#e8e4dc', ...serif, letterSpacing: '-0.01em' }}>
            {product.name}
            {variant.flavor ? ` — ${variant.flavor}` : ''}
          </div>
          <div style={{ fontSize: 12, color: '#868686', ...sans, marginTop: 1 }}>
            {product.brand_name} · {formatCategory(product.category)}
          </div>
        </div>
        <ScorePill score={review.overall_rating} />
      </button>

      {review.notes && <div style={{ fontSize: 14, color: '#969696', ...sans, lineHeight: 1.6, fontStyle: 'italic' }}>"{review.notes}"</div>}

      {review.tags.length > 0 && (
        <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap' }}>
          {review.tags.map((tag) => (
            <span key={tag.id} style={{ border: '0.5px solid #222', borderRadius: 20, padding: '2px 8px', fontSize: 11, color: '#868686', ...sans }}>
              {tag.label}
            </span>
          ))}
        </div>
      )}
    </Card>
  )
}

export default function Feed() {
  const navigate = useNavigate()
  const [reviews, setReviews] = useState([])
  const [offset, setOffset] = useState(0)
  const [hasMore, setHasMore] = useState(true)
  const [loading, setLoading] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [error, setError] = useState(null)

  const loadPage = async (currentOffset, replace) => {
    const setPageLoading = replace ? setLoading : setLoadingMore
    setPageLoading(true)
    setError(null)

    const { data: rows, error: fetchError } = await fetchRecentReviews({ limit: PAGE_SIZE, offset: currentOffset })
    if (fetchError) {
      setError(fetchError)
      setPageLoading(false)
      return
    }

    // Pending products' own-reviews slip through reviews RLS (which only
    // cares about the review's status, not the underlying product's) --
    // filtered here the same way ListDetail.jsx filters RLS-hidden items.
    const visible = (rows || []).filter((r) => r.product_variants?.products?.status === 'approved')

    const userIds = [...new Set(visible.map((r) => r.user_id))]
    const reviewIds = visible.map((r) => r.id)
    const [{ data: profiles }, { data: reviewTags }] = await Promise.all([fetchProfilesByIds(userIds), fetchTagsForReviews(reviewIds)])
    const profileMap = Object.fromEntries((profiles || []).map((p) => [p.id, p]))
    const tagsByReview = {}
    for (const rt of reviewTags || []) {
      if (!tagsByReview[rt.review_id]) tagsByReview[rt.review_id] = []
      if (rt.tags) tagsByReview[rt.review_id].push(rt.tags)
    }
    const enriched = visible.map((r) => ({ ...r, reviewer: profileMap[r.user_id], tags: tagsByReview[r.id] || [] }))

    setReviews((prev) => (replace ? enriched : [...prev, ...enriched]))
    setHasMore((rows || []).length === PAGE_SIZE)
    setPageLoading(false)
  }

  useEffect(() => {
    trackEvent('feed_view')
    loadPage(0, true)
    // eslint-disable-next-line react-hooks/exhaustive-deps -- only run once on mount
  }, [])

  const handleLoadMore = () => {
    const nextOffset = offset + PAGE_SIZE
    setOffset(nextOffset)
    loadPage(nextOffset, false)
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <div style={{ padding: '12px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '0.5px solid #1e1e1e', flexShrink: 0 }}>
        <span style={{ ...serif, fontStyle: 'italic', fontSize: 22, color: '#f0ece4', letterSpacing: '-0.01em' }}>Stackd</span>
        <div style={{ display: 'flex', gap: 14 }}>
          <button onClick={() => navigate('/scan')} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 20, color: '#828282', padding: 0 }}>
            ▣
          </button>
        </div>
      </div>

      <div style={{ flex: 1, overflowY: 'auto', padding: '12px 14px', display: 'flex', flexDirection: 'column', gap: 10 }}>
        {loading && <Skeleton variant="rows" />}

        {error && <ErrorState message="Couldn't load the feed. Try again in a moment." onRetry={() => loadPage(0, true)} />}

        {!loading && !error && reviews.length === 0 && (
          <div style={{ textAlign: 'center', padding: '48px 0', color: '#828282', fontSize: 15, ...sans }}>No activity yet. Be the first to rate something.</div>
        )}

        {reviews.map((review) => (
          <FeedCard key={review.id} review={review} />
        ))}

        {!loading && hasMore && reviews.length > 0 && (
          <button
            onClick={handleLoadMore}
            disabled={loadingMore}
            style={{ background: 'none', border: '0.5px solid #222', borderRadius: 20, padding: '10px 0', fontSize: 14, color: '#888', cursor: 'pointer', ...sans, marginTop: 4 }}
          >
            {loadingMore ? 'Loading...' : 'Load more'}
          </button>
        )}
      </div>
    </div>
  )
}
