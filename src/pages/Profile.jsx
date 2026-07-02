import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabaseClient'
import { currentUser, products, reviews, TRIED_IDS, USER_SCORES } from '../data/placeholder'
import { Avatar, ScorePill, Card } from '../components/ui'

const serif = { fontFamily: 'Georgia, "Times New Roman", serif' }
const sans = { fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif' }

const LISTS = [
  { name: 'My morning stack', count: 4, icon: '🌅' },
  { name: 'Best pre-workouts', count: 7, icon: '💪' },
  { name: 'Clean label picks', count: 5, icon: '🌿' },
]

export default function Profile() {
  const navigate = useNavigate()
  const [tab, setTab] = useState('tried')
  const triedProducts = products.filter((p) => TRIED_IDS.includes(p.id))
  const userReviews = reviews.filter((r) => r.userId === 'u1')

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      {/* Nav */}
      <div style={{ padding: '12px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '0.5px solid #1e1e1e', flexShrink: 0 }}>
        <div style={{ width: 60 }} />
        <span style={{ ...serif, fontSize: 15, color: '#e8e4dc' }}>Profile</span>
        <button onClick={() => supabase.auth.signOut()} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 12, color: '#555', ...sans, padding: 0 }}>
          Sign out
        </button>
      </div>

      <div style={{ flex: 1, overflowY: 'auto' }}>
        {/* Hero */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6, padding: '20px 16px 16px' }}>
          <Avatar user={currentUser} size="lg" />
          <div style={{ ...serif, fontSize: 20, color: '#f0ece4', letterSpacing: '-0.01em', marginTop: 4 }}>{currentUser.username}</div>
          <div style={{ fontSize: 12, color: '#4a4a4a', ...sans }}>
            {currentUser.goal} · {currentUser.location}
          </div>
        </div>

        {/* Stats */}
        <div style={{ display: 'flex', margin: '0 14px', background: '#181818', border: '0.5px solid #222', borderRadius: 12, overflow: 'hidden' }}>
          {[
            { val: triedProducts.length, label: 'Rated' },
            { val: currentUser.followers, label: 'Followers' },
            { val: currentUser.following, label: 'Following' },
            { val: currentUser.avgScore.toFixed(1), label: 'Avg', color: '#5ecfcf' },
          ].map((s, i) => (
            <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '12px 4px', borderLeft: i > 0 ? '0.5px solid #1e1e1e' : 'none' }}>
              <span style={{ ...serif, fontSize: 20, color: s.color || '#e8e4dc', letterSpacing: '-0.02em' }}>{s.val}</span>
              <span style={{ fontSize: 9, color: '#444', ...sans, marginTop: 2 }}>{s.label}</span>
            </div>
          ))}
        </div>

        {/* Tabs */}
        <div style={{ display: 'flex', borderBottom: '0.5px solid #1e1e1e', margin: '16px 0 0' }}>
          {[
            ['tried', 'Tried'],
            ['lists', 'Lists'],
            ['reviews', 'Reviews'],
          ].map(([key, label]) => (
            <button
              key={key}
              onClick={() => setTab(key)}
              style={{
                flex: 1,
                background: 'none',
                border: 'none',
                borderBottom: tab === key ? '1.5px solid #e8e4dc' : 'none',
                cursor: 'pointer',
                padding: '11px 0',
                fontSize: 12,
                ...sans,
                color: tab === key ? '#e8e4dc' : '#444',
                fontWeight: tab === key ? 500 : 400,
              }}
            >
              {label}
            </button>
          ))}
        </div>

        <div style={{ padding: '14px', display: 'flex', flexDirection: 'column', gap: 8 }}>
          {tab === 'tried' && (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
              {triedProducts.map((p) => (
                <div
                  key={p.id}
                  onClick={() => navigate(`/product/${p.id}`)}
                  style={{ background: '#181818', border: '0.5px solid #222', borderRadius: 10, padding: '12px', display: 'flex', flexDirection: 'column', gap: 6, cursor: 'pointer' }}
                >
                  <div style={{ fontSize: 24 }}>{p.icon}</div>
                  <div style={{ ...serif, fontSize: 13, color: '#e8e4dc', letterSpacing: '-0.01em', lineHeight: 1.4 }}>{p.name}</div>
                  <div style={{ fontSize: 10, color: '#3a3a3a', ...sans }}>{p.variant}</div>
                  <ScorePill score={USER_SCORES[p.id] || p.overallScore} extraStyle={{ alignSelf: 'flex-start', fontSize: 11 }} />
                </div>
              ))}
            </div>
          )}

          {tab === 'lists' &&
            LISTS.map((list) => (
              <div key={list.name} style={{ background: '#181818', border: '0.5px solid #222', borderRadius: 10, padding: '14px', display: 'flex', alignItems: 'center', gap: 12, cursor: 'pointer' }}>
                <span style={{ fontSize: 24 }}>{list.icon}</span>
                <div>
                  <div style={{ ...serif, fontSize: 14, color: '#e8e4dc', letterSpacing: '-0.01em' }}>{list.name}</div>
                  <div style={{ fontSize: 11, color: '#3a3a3a', ...sans, marginTop: 3 }}>{list.count} products</div>
                </div>
                <span style={{ marginLeft: 'auto', color: '#2e2e2e', fontSize: 18 }}>›</span>
              </div>
            ))}

          {tab === 'reviews' &&
            (userReviews.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '32px 0', color: '#3a3a3a', fontSize: 14, ...sans }}>No reviews yet.</div>
            ) : (
              userReviews.map((review) => {
                const p = products.find((x) => x.id === review.productId)
                if (!p) return null
                return (
                  <Card key={review.id} style={{ cursor: 'pointer', gap: 8 }} onClick={() => navigate(`/product/${p.id}`)}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <div style={{ fontSize: 20 }}>{p.icon}</div>
                      <div style={{ flex: 1 }}>
                        <div style={{ ...serif, fontSize: 14, color: '#e8e4dc', letterSpacing: '-0.01em' }}>{p.name}</div>
                        <div style={{ fontSize: 10, color: '#3a3a3a', ...sans }}>{review.createdAt}</div>
                      </div>
                      <ScorePill score={review.overallScore} />
                    </div>
                    {review.text && <div style={{ fontSize: 13, color: '#5a5a5a', ...sans, lineHeight: 1.6, fontStyle: 'italic' }}>"{review.text}"</div>}
                  </Card>
                )
              })
            ))}
        </div>
      </div>
    </div>
  )
}
