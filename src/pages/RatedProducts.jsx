import { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { NavBar, ScorePill, Skeleton, ErrorState } from '../components/ui'
import { useAsync } from '../hooks/useAsync'
import { fetchProfileByUsername, fetchRatedProductsForUser } from '../lib/api/profiles'

const serif = { fontFamily: 'Georgia, "Times New Roman", serif' }
const sans = { fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif', fontWeight: 500 }

function formatCategory(raw) {
  return raw.replace(/_/g, ' ').replace(/^\w/, (c) => c.toUpperCase())
}

/**
 * Every product a user has rated, ranked by their own score -- unlike
 * regular lists, this isn't a real row in `lists`/`list_items`. It's derived
 * straight from `reviews` on every load, so it can never drift out of sync
 * and there's nothing to maintain when a review is added, edited, or
 * deleted.
 */
export default function RatedProducts() {
  const { username } = useParams()
  const navigate = useNavigate()
  const [copied, setCopied] = useState(false)

  const { data, loading, error, refetch } = useAsync(async () => {
    const { data: profile, error: pErr } = await fetchProfileByUsername(username)
    if (pErr) return { data: null, error: pErr }
    if (!profile) return { data: null, error: null }
    const { data: reviews, error: rErr } = await fetchRatedProductsForUser(profile.id)
    if (rErr) return { data: null, error: rErr }
    // RLS returns a null product for anything the current viewer isn't
    // allowed to see yet (e.g. someone else's still-pending submission) --
    // filter those out before ranking so position numbers stay contiguous,
    // same as ListDetail.jsx.
    const visible = (reviews || []).filter((r) => r.product_variants?.products)
    return { data: { profile, reviews: visible }, error: null }
  }, [username])

  const handleShare = async () => {
    await navigator.clipboard.writeText(window.location.href)
    setCopied(true)
    setTimeout(() => setCopied(false), 1500)
  }

  if (loading) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
        <NavBar title="Rated products" onBack={() => navigate(-1)} />
        <Skeleton variant="rows" count={4} />
      </div>
    )
  }

  if (error) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
        <NavBar title="Rated products" onBack={() => navigate(-1)} />
        <ErrorState message="Couldn't load these ratings. Try again in a moment." onRetry={refetch} />
      </div>
    )
  }

  if (!data) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
        <NavBar title="Rated products" onBack={() => navigate(-1)} />
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#828282', fontSize: 15, ...sans }}>Profile not found.</div>
      </div>
    )
  }

  const { profile, reviews } = data

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <NavBar
        title={`${profile.display_name || profile.username}'s rated products`}
        onBack={() => navigate(-1)}
        rightEl={
          <button onClick={handleShare} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 13, color: '#5ecfcf', ...sans, padding: 0 }}>
            {copied ? 'Copied!' : 'Share'}
          </button>
        }
      />

      <div style={{ flex: 1, overflowY: 'auto', padding: '16px', display: 'flex', flexDirection: 'column', gap: 10 }}>
        {reviews.length === 0 && <div style={{ textAlign: 'center', padding: '48px 0', color: '#828282', fontSize: 15, ...sans }}>No rated products yet.</div>}

        {reviews.map((review, i) => {
          const variant = review.product_variants
          const product = variant.products
          return (
            <div key={review.id} style={{ background: '#181818', border: '0.5px solid #222', borderRadius: 12, padding: '12px 14px', display: 'flex', alignItems: 'center', gap: 12 }}>
              <span style={{ ...serif, fontSize: 14, color: '#828282', width: 16, flexShrink: 0 }}>{i + 1}</span>
              <button onClick={() => navigate(`/product/${variant.id}`)} style={{ flex: 1, minWidth: 0, cursor: 'pointer', background: 'none', border: 'none', padding: 0, textAlign: 'left' }}>
                <div style={{ ...serif, fontSize: 15, color: '#e8e4dc', letterSpacing: '-0.01em' }}>
                  {product.name}
                  {variant.flavor ? ` — ${variant.flavor}` : ''}
                </div>
                <div style={{ fontSize: 12, color: '#868686', ...sans, marginTop: 2 }}>
                  {product.brand_name} · {formatCategory(product.category)}
                </div>
              </button>
              <ScorePill score={review.overall_rating} />
            </div>
          )
        })}
      </div>
    </div>
  )
}
