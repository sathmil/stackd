import { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { Share2, Check } from 'lucide-react'
import { NavBar, ScorePill, Skeleton, ErrorState } from '../components/ui'
import { useAsync } from '../hooks/useAsync'
import { fetchProfileByUsername, fetchRatedProductsForUser } from '../lib/api/profiles'
import { categoryColor } from '../utils/categoryColor'

const serif = { fontFamily: 'var(--font-serif)' }
const sans = { fontFamily: 'var(--font-sans)', fontWeight: 500 }

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
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-quiet)', fontSize: 15, ...sans }}>Profile not found.</div>
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
          <button
            onClick={handleShare}
            className="stackd-press"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 5,
              background: 'var(--tier-teal-bg)',
              border: '0.5px solid var(--tier-teal-border)',
              borderRadius: 20,
              padding: '7px 12px',
              cursor: 'pointer',
              fontSize: 12,
              fontWeight: 600,
              color: 'var(--tier-teal)',
              ...sans,
              flexShrink: 0,
            }}
          >
            {copied ? <Check size={13} /> : <Share2 size={13} />}
            {copied ? 'Copied' : 'Share'}
          </button>
        }
      />

      <div style={{ flex: 1, overflowY: 'auto', padding: '16px', display: 'flex', flexDirection: 'column', gap: 12 }}>
        {reviews.length === 0 && <div style={{ textAlign: 'center', padding: '48px 0', color: 'var(--text-quiet)', fontSize: 15, ...sans }}>No rated products yet.</div>}

        {reviews.map((review, i) => {
          const variant = review.product_variants
          const product = variant.products
          const color = categoryColor(product.category)
          const rankColor = i === 0 ? 'var(--tier-gold)' : i === 1 ? 'var(--text-input)' : i === 2 ? 'var(--color-taste)' : 'var(--text-quiet)'
          const rankBg = i === 0 ? 'var(--tier-gold-bg)' : i === 1 ? 'var(--bg-subtle)' : i === 2 ? 'var(--color-taste-bg)' : 'var(--bg-subtle)'
          const rankBorder = i === 0 ? 'var(--tier-gold-border)' : i === 1 ? 'var(--border-medium)' : i === 2 ? 'var(--color-taste-border)' : 'var(--border-medium)'
          return (
            <button
              key={review.id}
              onClick={() => navigate(`/product/${variant.id}`)}
              className="stackd-elevated stackd-press"
              style={{
                position: 'relative',
                background: 'var(--bg-card)',
                border: '0.5px solid var(--border)',
                borderRadius: 18,
                padding: '14px 16px',
                display: 'flex',
                alignItems: 'center',
                gap: 14,
                cursor: 'pointer',
                textAlign: 'left',
                width: '100%',
              }}
            >
              <div
                style={{
                  ...serif,
                  fontWeight: 700,
                  fontSize: 14,
                  color: rankColor,
                  background: rankBg,
                  border: `0.5px solid ${rankBorder}`,
                  width: 28,
                  height: 28,
                  borderRadius: '50%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                }}
              >
                {i + 1}
              </div>
              <div
                style={{
                  position: 'relative',
                  width: 60,
                  height: 60,
                  borderRadius: 14,
                  background: 'var(--bg-photo)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                  overflow: 'hidden',
                }}
              >
                {variant.image_url ? (
                  <img
                    src={variant.image_url}
                    alt={variant.image_alt || product.name}
                    style={{ maxWidth: '80%', maxHeight: '80%', objectFit: 'contain', filter: 'drop-shadow(0 6px 10px rgba(0,0,0,0.4))' }}
                  />
                ) : (
                  <span style={{ fontSize: 20, color: 'var(--text-tertiary)', ...serif }}>{product.name.charAt(0)}</span>
                )}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ ...serif, fontWeight: 600, fontSize: 16, color: 'var(--text-heading)', letterSpacing: '-0.01em', lineHeight: 1.25 }}>
                  {product.name}
                  {variant.flavor ? ` — ${variant.flavor}` : ''}
                </div>
                <div style={{ fontSize: 12, color: 'var(--text-tertiary)', ...sans, marginTop: 3 }}>{product.brand_name}</div>
                <span
                  style={{
                    ...sans,
                    display: 'inline-block',
                    marginTop: 6,
                    fontSize: 10,
                    fontWeight: 700,
                    color,
                    background: `${color}26`,
                    border: `0.5px solid ${color}66`,
                    borderRadius: 6,
                    padding: '2px 7px',
                    textTransform: 'uppercase',
                    letterSpacing: '0.05em',
                  }}
                >
                  {formatCategory(product.category)}
                </span>
              </div>
              <ScorePill score={review.overall_rating} />
            </button>
          )
        })}
      </div>
    </div>
  )
}
