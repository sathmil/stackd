import { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { products, reviews, users, influencerPicks } from '../data/placeholder'
import { Avatar, ScorePill, ScoreBars, Card, Divider, NavBar } from '../components/ui'

const serif = { fontFamily: 'Georgia, "Times New Roman", serif' }
const sans  = { fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif' }

export default function ProductPage() {
  const { variantId } = useParams()
  const navigate = useNavigate()
  const product  = products.find(p => p.id === variantId) || products[0]
  const pReviews = reviews.filter(r => r.productId === product.id)
  const influencer = influencerPicks[product.id]
  const [liked, setLiked] = useState({})
  const communityAgrees = influencer && Math.abs(influencer.score - product.overallScore) < 1.5

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <NavBar
        title="Product"
        onBack={() => navigate(-1)}
        rightEl={<button style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 18, color: '#555', padding: 0 }}>•••</button>}
      />

      <div style={{ flex: 1, overflowY: 'auto', padding: '16px', display: 'flex', flexDirection: 'column', gap: 16 }}>

        {/* Hero */}
        <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
          <div style={{ width: 54, height: 54, borderRadius: 10, background: '#1a1a1a', border: '0.5px solid #222', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 26, flexShrink: 0 }}>{product.icon}</div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ ...serif, fontSize: 17, color: '#f0ece4', letterSpacing: '-0.01em', lineHeight: 1.3 }}>{product.name}</div>
            <div style={{ fontSize: 12, color: '#4a4a4a', ...sans, marginTop: 3, marginBottom: 8 }}>{product.variant} · {product.category}</div>
            <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap' }}>
              {product.tags.map(tag => (
                <span key={tag} style={{ background: '#1a1a1a', border: '0.5px solid #222', borderRadius: 10, padding: '2px 8px', fontSize: 10, color: '#4a4a4a', ...sans }}>{tag}</span>
              ))}
            </div>
          </div>
          <div style={{ textAlign: 'center', flexShrink: 0 }}>
            <div style={{ ...serif, fontSize: 36, color: '#5ecfcf', letterSpacing: '-0.03em', lineHeight: 1 }}>{product.overallScore.toFixed(1)}</div>
            <div style={{ fontSize: 10, color: '#3a3a3a', ...sans, marginTop: 3 }}>{product.ratingsCount.toLocaleString()} ratings</div>
          </div>
        </div>

        {/* Score bars */}
        <ScoreBars scores={product.scores} />

        {/* Influencer badge */}
        {influencer && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: '#181410', border: '0.5px solid #2e2818', borderRadius: 10, padding: '10px 12px' }}>
            <div style={{ width: 7, height: 7, borderRadius: '50%', background: '#e8c97a', flexShrink: 0 }} />
            <span style={{ fontSize: 12, color: '#5a5a5a', ...sans, flex: 1, lineHeight: 1.5 }}>
              {influencer.name} rated this {influencer.score.toFixed(1)}{communityAgrees ? ' · community agrees ✓' : ''}
            </span>
            <span style={{ ...serif, fontSize: 14, color: '#e8c97a', fontWeight: 500 }}>{influencer.score.toFixed(1)}</span>
          </div>
        )}

        <Divider />

        {/* Reviews */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ ...serif, fontSize: 15, color: '#e8e4dc' }}>Reviews ({pReviews.length})</span>
          <span style={{ fontSize: 12, color: '#5ecfcf', ...sans, cursor: 'pointer' }}>See all</span>
        </div>

        {pReviews.length === 0 && (
          <div style={{ textAlign: 'center', padding: '20px 0', color: '#3a3a3a', fontSize: 13, ...sans }}>No reviews yet. Be the first.</div>
        )}

        {pReviews.map(review => {
          const reviewer = users.find(u => u.id === review.userId)
          if (!reviewer) return null
          return (
            <Card key={review.id} style={{ gap: 8 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                <Avatar user={reviewer} size="sm" />
                <span style={{ ...serif, fontSize: 13, color: '#e8e4dc', letterSpacing: '-0.01em' }}>{reviewer.username}</span>
                <ScorePill score={review.overallScore} extraStyle={{ marginLeft: 'auto' }} />
              </div>
              {review.text && <div style={{ fontSize: 13, color: '#5a5a5a', ...sans, lineHeight: 1.6, fontStyle: 'italic' }}>"{review.text}"</div>}
              {review.tags?.length > 0 && (
                <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap' }}>
                  {review.tags.map(tag => <span key={tag} style={{ border: '0.5px solid #222', borderRadius: 20, padding: '2px 8px', fontSize: 10, color: '#4a4a4a', ...sans }}>{tag}</span>)}
                </div>
              )}
              <Divider />
              <button onClick={() => setLiked(l => ({ ...l, [review.id]: !l[review.id] }))}
                style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 13, color: liked[review.id] ? '#ff6b6b' : '#3a3a3a', ...sans, padding: 0, textAlign: 'left' }}>
                {liked[review.id] ? '♥' : '♡'} {review.likes + (liked[review.id] ? 1 : 0)}
              </button>
            </Card>
          )
        })}

        {/* CTA */}
        <button onClick={() => navigate(`/product/${product.id}/review`)} style={{ background: '#f0ece4', color: '#111', borderRadius: 20, padding: '14px 0', fontSize: 15, fontWeight: 500, border: 'none', cursor: 'pointer', ...serif, letterSpacing: '-0.01em', marginTop: 4 }}>
          Rate this product
        </button>
      </div>
    </div>
  )
}
