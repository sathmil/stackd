import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { feedItems, users, products, reviews, CATEGORIES } from '../data/placeholder'
import { Avatar, ScorePill, Card, Chip, Divider } from '../components/ui'

const serif = { fontFamily: 'Georgia, "Times New Roman", serif' }
const sans  = { fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif' }

function FeedCard({ item }) {
  const navigate = useNavigate()
  const user    = users.find(u => u.id === item.userId)
  const product = products.find(p => p.id === item.productId)
  const review  = reviews.find(r => r.id === item.reviewId)
  const [liked, setLiked] = useState(false)
  const [saved, setSaved] = useState(false)
  if (!user || !product) return null
  const score = review ? review.overallScore : product.overallScore

  return (
    <Card>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <Avatar user={user} size="sm" />
        <span style={{ fontSize: 14, color: '#e8e4dc', ...serif, letterSpacing: '-0.01em' }}>{user.username}</span>
        <span style={{ marginLeft: 'auto', fontSize: 10, color: '#3a3a3a', ...sans }}>{item.createdAt}</span>
      </div>

      <span style={{ fontSize: 12, color: '#4a4a4a', ...sans }}>{item.action}</span>

      <div onClick={() => navigate(`/product/${product.id}`)} style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer' }}>
        <div style={{ width: 34, height: 34, borderRadius: 8, background: '#1a1a1a', border: '0.5px solid #222', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, flexShrink: 0 }}>{product.icon}</div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 14, color: '#e8e4dc', ...serif, letterSpacing: '-0.01em' }}>{product.name}</div>
          <div style={{ fontSize: 11, color: '#4a4a4a', ...sans, marginTop: 1 }}>{product.variant} · {product.category}</div>
        </div>
        <ScorePill score={score} />
      </div>

      {review?.text && (
        <div style={{ fontSize: 13, color: '#5a5a5a', ...sans, lineHeight: 1.6, fontStyle: 'italic' }}>"{review.text}"</div>
      )}

      <Divider />
      <div style={{ display: 'flex', gap: 14, alignItems: 'center' }}>
        <button onClick={() => setLiked(!liked)} style={{ background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 5, color: liked ? '#ff6b6b' : '#3a3a3a', fontSize: 13, ...sans, padding: 0 }}>
          {liked ? '♥' : '♡'} <span style={{ fontSize: 11 }}>{(review?.likes || 0) + (liked ? 1 : 0)}</span>
        </button>
        <button style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#3a3a3a', fontSize: 13, ...sans, padding: 0 }}>◯ <span style={{ fontSize: 11 }}>0</span></button>
        <button onClick={() => setSaved(!saved)} style={{ background: 'none', border: 'none', cursor: 'pointer', marginLeft: 'auto', color: saved ? '#5ecfcf' : '#3a3a3a', fontSize: 15, padding: 0 }}>
          {saved ? '◈' : '◇'}
        </button>
      </div>
    </Card>
  )
}

export default function Feed() {
  const navigate = useNavigate()
  const [cat, setCat] = useState('All')
  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <div style={{ padding: '12px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '0.5px solid #1e1e1e', flexShrink: 0 }}>
        <span style={{ ...serif, fontStyle: 'italic', fontSize: 22, color: '#f0ece4', letterSpacing: '-0.01em' }}>Stackd</span>
        <div style={{ display: 'flex', gap: 14 }}>
          <button onClick={() => navigate('/scan')} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 20, color: '#3a3a3a', padding: 0 }}>▣</button>
          <button style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 18, color: '#3a3a3a', padding: 0 }}>🔔</button>
        </div>
      </div>
      <div style={{ display: 'flex', gap: 6, padding: '10px 14px', overflowX: 'auto', flexShrink: 0, borderBottom: '0.5px solid #1e1e1e' }}>
        {CATEGORIES.map(c => <Chip key={c} label={c} active={cat === c} onClick={() => setCat(c)} />)}
      </div>
      <div style={{ flex: 1, overflowY: 'auto', padding: '12px 14px', display: 'flex', flexDirection: 'column', gap: 10 }}>
        {feedItems.map(item => <FeedCard key={item.id} item={item} />)}
      </div>
    </div>
  )
}
