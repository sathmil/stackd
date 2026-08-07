import { useState, useEffect, useRef, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { Search, Bookmark } from 'lucide-react'
import { Avatar, ScorePill, Skeleton, ErrorState, Divider } from '../components/ui'
import { useToast } from '../components/Toast'
import { useCurrentUser } from '../hooks/useCurrentUser'
import { useOwnProfile } from '../hooks/useOwnProfile'
import { useInfiniteScroll } from '../hooks/useInfiniteScroll'
import { fetchRecentReviews, fetchProfilesByIds, fetchTagsForReviews } from '../lib/api/reviews'
import { fetchRecentPublicListAdditions, fetchOwnLists, fetchListMembership, addListItem, removeListItem, fetchTrendingLists } from '../lib/api/lists'
import { timeAgo } from '../utils/timeAgo'
import { trackEvent } from '../lib/analytics'
import { categoryColor } from '../utils/categoryColor'

const serif = { fontFamily: 'var(--font-serif)' }
const sans = { fontFamily: 'var(--font-sans)', fontWeight: 500 }

const PAGE_SIZE = 15

function formatCategory(raw) {
  return raw.replace(/_/g, ' ').replace(/^\w/, (c) => c.toUpperCase())
}

function TrendingStacks({ lists }) {
  const navigate = useNavigate()
  if (lists.length === 0) return null
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      <span style={{ ...serif, fontSize: 19, color: 'var(--text-heading)' }}>Trending Stacks</span>
      <div
        style={{
          display: 'flex',
          gap: 10,
          overflowX: 'auto',
          paddingBottom: 4,
          margin: '0 -14px',
          padding: '0 14px 4px',
          WebkitOverflowScrolling: 'touch',
          overscrollBehaviorX: 'contain',
          touchAction: 'pan-x',
        }}
      >
        {lists.map((list) => {
          const { cover } = list
          const product = cover.products
          const color = categoryColor(product.category)
          const photoUrl = list.cover_image_url || cover.image_url
          return (
            <button
              key={list.id}
              onClick={() => navigate(`/lists/${list.id}`)}
              className="stackd-elevated stackd-press"
              style={{
                position: 'relative',
                flexShrink: 0,
                width: 'calc(100vw - 90px)',
                maxWidth: 300,
                height: 200,
                borderRadius: 14,
                overflow: 'hidden',
                border: 'none',
                cursor: 'pointer',
                padding: 0,
                background: 'var(--bg-card)',
              }}
            >
              {/* These cover photos are product-on-plain-background shots (a
                  can, a tub), not lifestyle scenes -- object-fit:cover crops
                  them tightly and cuts the product off. contain shows the
                  whole product instead, centered with room to breathe.
                  No z-index on any of these layers -- an element's own
                  `background` CSS always paints below its children
                  regardless of DOM order, so plain DOM order (image,
                  gradient, text) does the stacking correctly. */}
              {photoUrl && <img src={photoUrl} alt="" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }} />}
              <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(180deg, transparent 55%, rgba(0,0,0,0.85) 100%)' }} />
              <div style={{ position: 'absolute', bottom: 12, left: 12, right: 12, display: 'flex', flexDirection: 'column', gap: 6, alignItems: 'flex-start' }}>
                <span
                  style={{
                    background: color,
                    color: '#111',
                    borderRadius: 6,
                    padding: '2px 8px',
                    fontSize: 10,
                    fontWeight: 700,
                    textTransform: 'uppercase',
                    letterSpacing: '0.04em',
                    ...sans,
                  }}
                >
                  {formatCategory(product.category)}
                </span>
                <span
                  style={{
                    ...serif,
                    fontSize: 20,
                    fontWeight: 600,
                    color: '#fff',
                    textAlign: 'left',
                    lineHeight: 1.2,
                  }}
                >
                  {list.name}
                </span>
              </div>
            </button>
          )
        })}
      </div>
    </div>
  )
}

function BookmarkButton({ variantId, isSaved, onToggle }) {
  return (
    <button
      onClick={(e) => {
        e.stopPropagation()
        onToggle(variantId)
      }}
      className="stackd-press"
      style={{
        width: 34,
        height: 34,
        borderRadius: '50%',
        background: isSaved ? 'var(--color-taste-bg)' : 'var(--bg-subtle)',
        border: isSaved ? '0.5px solid var(--color-taste-border)' : '0.5px solid var(--border)',
        color: isSaved ? 'var(--color-taste)' : 'var(--text-primary)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        cursor: 'pointer',
        flexShrink: 0,
      }}
    >
      <Bookmark size={15} fill={isSaved ? 'currentColor' : 'none'} strokeWidth={2} />
    </button>
  )
}

function ActivityCard({ item, isSaved, onToggleSave }) {
  const navigate = useNavigate()
  const { variant, product } = item

  return (
    // No outer card here -- only the product photo below gets the
    // card/rounded-corner treatment. The header, title, quote, and tags
    // sit directly on the feed's own background, matching the design
    // reference (a card around the whole activity item reads as "boxed
    // in twice" once the photo already has its own rounded panel).
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10, flexShrink: 0 }}>
      {item.actor ? (
        <button
          onClick={() => navigate(`/profile/${item.actor.username}`)}
          style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', background: 'none', border: 'none', padding: 0, width: '100%', textAlign: 'left' }}
        >
          <Avatar user={item.actor} size="sm" />
          <span style={{ color: 'var(--text-input)', ...sans }}>
            <span style={{ fontWeight: 600 }}>{item.actor.username}</span>{' '}
            {item.type === 'review' ? (
              <>
                just rated <span style={{ color: 'var(--text-primary)' }}>{product.name}</span>
              </>
            ) : (
              `added to ${item.listName}`
            )}
          </span>
          {/* <span style={{ marginLeft: 'auto', fontSize: 11, color: 'var(--text-quiet)', ...sans, flexShrink: 0 }}>{timeAgo(item.created_at)}</span> */}
        </button>
      ) : (
        <div style={{ display: 'flex', alignItems: 'center' }}>
          <span style={{ fontSize: 13, color: 'var(--text-input)', ...sans }}>Someone {item.type === 'review' ? 'rated' : `added to ${item.listName}`}</span>
          <span style={{ marginLeft: 'auto', fontSize: 11, color: 'var(--text-quiet)', ...sans }}>{timeAgo(item.created_at)}</span>
        </div>
      )}

      {/* div, not button -- a <button> with display:flex;flexDirection:column
          doesn't reliably size to its children's content height in Chromium
          (a known UA-stylesheet quirk with button as a flex container), which
          silently collapsed this whole block to ~0 height while the DOM
          content was still technically present. role="button" + onKeyDown
          keeps it keyboard-accessible without the native element's quirks. */}
      <div
        role="button"
        tabIndex={0}
        onClick={() => navigate(`/product/${variant.id}`)}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') navigate(`/product/${variant.id}`)
        }}
        style={{ cursor: 'pointer', textAlign: 'left', display: 'flex', flexDirection: 'column', gap: 10, background: 'none', border: 'none', padding: 0 }}
      >
        <div
          className="stackd-elevated"
          style={{
            position: 'relative',
            background: 'var(--bg-photo)',
            borderRadius: 14,
            aspectRatio: '16 / 9',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            overflow: 'hidden',
          }}
        >
          {variant.image_url ? (
            <img
              src={variant.image_url}
              alt={variant.image_alt || product.name}
              style={{ maxHeight: '85%', maxWidth: '85%', objectFit: 'contain', filter: 'drop-shadow(0 12px 20px rgba(0,0,0,0.45))' }}
            />
          ) : (
            <span style={{ fontSize: 34, color: 'var(--text-tertiary)', ...serif }}>{product.name.charAt(0)}</span>
          )}
          {item.type === 'review' && <ScorePill score={item.overall_rating} extraStyle={{ position: 'absolute', top: 10, right: 10 }} />}
        </div>

        <div>
          <div style={{ ...serif, fontSize: 20, color: 'var(--text-heading)', letterSpacing: '-0.01em' }}>
            {product.name}
            {variant.flavor ? ` — ${variant.flavor}` : ''}
          </div>
          <div style={{ fontSize: 12, color: 'var(--text-tertiary)', ...sans, marginTop: 2 }}>
            {product.brand_name} · {formatCategory(product.category)}
          </div>
          {product.description && <div style={{ fontSize: 13, color: 'var(--text-body)', ...sans, lineHeight: 1.5, marginTop: 6 }}>{product.description}</div>}
        </div>

        {item.type === 'review' && item.notes && <div style={{ fontSize: 14, color: 'var(--text-secondary)', ...sans, lineHeight: 1.6, fontStyle: 'italic' }}>"{item.notes}"</div>}
      </div>

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
        <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap' }}>
          {item.type === 'review' &&
            item.tags.map((tag) => (
              <span key={tag.id} style={{ border: '1px solid rgba(255,255,255,0.22)', borderRadius: 20, padding: '4px 10px', fontSize: 11, color: 'var(--text-input)', ...sans }}>
                {tag.label}
              </span>
            ))}
        </div>
        <BookmarkButton variantId={variant.id} isSaved={isSaved} onToggle={onToggleSave} />
      </div>

      <Divider />
    </div>
  )
}

export default function Feed() {
  const navigate = useNavigate()
  const user = useCurrentUser()
  const ownProfile = useOwnProfile(!!user)
  const showToast = useToast()
  const [items, setItems] = useState([])
  const [offset, setOffset] = useState(0)
  const [hasMore, setHasMore] = useState(true)
  const [loading, setLoading] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [error, setError] = useState(null)
  const [trendingLists, setTrendingLists] = useState([])
  // Guards against React StrictMode's dev-mode double-invoke of the mount
  // effect (and any other overlapping loadPage calls): each call gets an
  // id, and a call only commits its result if it's still the most recent
  // one in flight. Without this, two concurrent runs -- one that resolves
  // with a transient error, one that succeeds -- could apply in either
  // order, leaving a stale error banner on screen above otherwise-loaded
  // content.
  const requestIdRef = useRef(0)

  useEffect(() => {
    fetchTrendingLists(8).then(({ data }) => setTrendingLists(data || []))
  }, [])

  // Quick-save (bookmark) state -- one shared list-cache for every card,
  // fetched lazily on first save tap rather than per-card, then diffed
  // in-memory per variant just like ProductPage's "Add to Stack" picker.
  const [ownLists, setOwnLists] = useState(null)
  const [savedVariants, setSavedVariants] = useState(new Set())

  const loadPage = async (currentOffset, replace) => {
    const requestId = ++requestIdRef.current
    const setPageLoading = replace ? setLoading : setLoadingMore
    setPageLoading(true)
    setError(null)

    const [{ data: reviewRows, error: reviewErr }, { data: listRows }] = await Promise.all([
      fetchRecentReviews({ limit: PAGE_SIZE, offset: currentOffset }),
      fetchRecentPublicListAdditions({ limit: PAGE_SIZE, offset: currentOffset }),
    ])
    if (requestId !== requestIdRef.current) return // a newer call already took over
    if (reviewErr) {
      setError(reviewErr)
      setPageLoading(false)
      return
    }

    // Pending products' own-reviews/list-adds slip through RLS (which only
    // cares about the row's own status, not the underlying product's) --
    // filtered here the same way ListDetail.jsx filters RLS-hidden items.
    const visibleReviews = (reviewRows || [])
      .filter((r) => r.product_variants?.products?.status === 'approved')
      .map((r) => ({
        type: 'review',
        id: `review-${r.id}`,
        created_at: r.created_at,
        user_id: r.user_id,
        variant: r.product_variants,
        product: r.product_variants.products,
        overall_rating: r.overall_rating,
        notes: r.notes,
        review_id: r.id,
      }))

    const visibleAdds = (listRows || [])
      .filter((i) => i.product_variants?.products?.status === 'approved')
      .map((i) => ({
        type: 'list_add',
        id: `add-${i.id}`,
        created_at: i.added_at,
        user_id: i.lists.user_id,
        variant: i.product_variants,
        product: i.product_variants.products,
        listName: i.lists.name,
      }))

    const combined = [...visibleReviews, ...visibleAdds].sort((a, b) => new Date(b.created_at) - new Date(a.created_at))

    const userIds = [...new Set(combined.map((i) => i.user_id))]
    const reviewIds = visibleReviews.map((r) => r.review_id)
    const [{ data: profiles }, { data: reviewTags }] = await Promise.all([fetchProfilesByIds(userIds), fetchTagsForReviews(reviewIds)])
    if (requestId !== requestIdRef.current) return
    const profileMap = Object.fromEntries((profiles || []).map((p) => [p.id, p]))
    const tagsByReview = {}
    for (const rt of reviewTags || []) {
      if (!tagsByReview[rt.review_id]) tagsByReview[rt.review_id] = []
      if (rt.tags) tagsByReview[rt.review_id].push(rt.tags)
    }
    const enriched = combined.map((i) => ({ ...i, actor: profileMap[i.user_id], tags: i.type === 'review' ? tagsByReview[i.review_id] || [] : [] }))

    setItems((prev) => (replace ? enriched : [...prev, ...enriched]))
    // Either source still returning a full page means there's likely more.
    setHasMore((reviewRows || []).length === PAGE_SIZE || (listRows || []).length === PAGE_SIZE)
    setPageLoading(false)
  }

  useEffect(() => {
    trackEvent('feed_view')
    loadPage(0, true)
    // eslint-disable-next-line react-hooks/exhaustive-deps -- only run once on mount
  }, [])

  const handleLoadMore = useCallback(() => {
    const nextOffset = offset + PAGE_SIZE
    setOffset(nextOffset)
    loadPage(nextOffset, false)
    // eslint-disable-next-line react-hooks/exhaustive-deps -- loadPage is recreated every render but is stable in behavior for a given offset
  }, [offset])

  const scrollRef = useRef(null)
  useInfiniteScroll(scrollRef, handleLoadMore, { enabled: hasMore && !loading && !loadingMore && items.length > 0 })

  const handleToggleSave = async (variantId) => {
    if (!user) {
      navigate('/auth')
      return
    }
    let lists = ownLists
    if (!lists) {
      const { data } = await fetchOwnLists(user.id)
      lists = data || []
      setOwnLists(lists)
    }
    if (lists.length === 0) {
      showToast('Create a list from a product page first.', 'error')
      return
    }
    // Quick-save always targets the most recently created list -- a
    // lightweight "default stack" rather than opening a full picker inline
    // in the feed.
    const targetList = lists[0]
    const { data: existing } = await fetchListMembership([targetList.id], variantId)
    const existingItem = existing?.[0]

    if (existingItem) {
      setSavedVariants((s) => {
        const next = new Set(s)
        next.delete(variantId)
        return next
      })
      const { error } = await removeListItem(existingItem.id)
      if (error) {
        setSavedVariants((s) => new Set(s).add(variantId))
        showToast("Couldn't remove. Try again.", 'error')
      } else {
        showToast(`Removed from ${targetList.name}.`)
      }
    } else {
      setSavedVariants((s) => new Set(s).add(variantId))
      const { error } = await addListItem(targetList.id, variantId)
      if (error) {
        setSavedVariants((s) => {
          const next = new Set(s)
          next.delete(variantId)
          return next
        })
        showToast("Couldn't save. Try again.", 'error')
      } else {
        trackEvent('list_item_add', { list_id: targetList.id, variant_id: variantId, source: 'feed_bookmark' })
        showToast(`Saved to ${targetList.name}.`)
      }
    }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <div style={{ padding: '12px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '0.5px solid var(--border-subtle)', flexShrink: 0 }}>
        <button
          onClick={() => navigate('/search')}
          className="stackd-press"
          style={{
            width: 32,
            height: 32,
            borderRadius: '50%',
            background: 'var(--bg-subtle)',
            border: '0.5px solid var(--border)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
            flexShrink: 0,
          }}
        >
          <Search size={16} color="var(--text-primary)" strokeWidth={2.25} />
        </button>
        <span style={{ ...serif, fontWeight: 700, fontSize: 17, color: 'var(--text-heading)', letterSpacing: '-0.01em' }}>Stackd</span>
        {ownProfile ? (
          <button onClick={() => navigate(`/profile/${ownProfile.username}`)} className="stackd-press" style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>
            <Avatar user={ownProfile} size="sm" />
          </button>
        ) : (
          <div style={{ width: 28 }} />
        )}
      </div>

      <div ref={scrollRef} style={{ flex: 1, overflowY: 'auto', padding: '14px', display: 'flex', flexDirection: 'column', gap: 14 }}>
        <TrendingStacks lists={trendingLists} />

        {!loading && !error && items.length > 0 && <span style={{ ...serif, fontSize: 19, color: 'var(--text-heading)' }}>Social Feed</span>}

        {loading && <Skeleton variant="rows" />}

        {error && <ErrorState message="Couldn't load the feed. Try again in a moment." onRetry={() => loadPage(0, true)} />}

        {!loading && !error && items.length === 0 && (
          <div style={{ textAlign: 'center', padding: '48px 0', color: 'var(--text-quiet)', fontSize: 15, ...sans }}>No activity yet. Be the first to rate something.</div>
        )}

        {items.map((item) => (
          <ActivityCard key={item.id} item={item} isSaved={savedVariants.has(item.variant.id)} onToggleSave={handleToggleSave} />
        ))}

        {loadingMore && <div style={{ textAlign: 'center', padding: '10px 0', fontSize: 13, color: 'var(--text-quiet)', ...sans }}>Loading more...</div>}
      </div>
    </div>
  )
}
