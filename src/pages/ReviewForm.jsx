import { useState } from 'react'
import { products, DIM_COLOR, QUICK_TAGS } from '../data/placeholder'
import { Divider } from '../components/ui'

const serif = { fontFamily: 'Georgia, "Times New Roman", serif' }
const sans  = { fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif' }

function Slider({ label, dimKey, value, onChange }) {
  const color = DIM_COLOR[dimKey]
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span style={{ fontSize: 13, color: '#5a5a5a', ...sans }}>{label}</span>
        <span style={{ ...serif, fontSize: 14, color }}>{value.toFixed(1)}</span>
      </div>
      <div style={{ position: 'relative', height: 22, display: 'flex', alignItems: 'center' }}>
        <div style={{ position: 'absolute', left: 0, right: 0, height: 3, background: '#1e1e1e', borderRadius: 2 }}>
          <div style={{ height: '100%', width: `${(value / 10) * 100}%`, background: color, borderRadius: 2 }} />
        </div>
        <input type="range" min="1" max="10" step="0.1" value={value} onChange={e => onChange(parseFloat(e.target.value))}
          style={{ position: 'absolute', left: 0, right: 0, width: '100%', opacity: 0, height: 22, cursor: 'pointer', margin: 0 }} />
        <div style={{ position: 'absolute', left: `${(value / 10) * 100}%`, transform: 'translateX(-50%)', width: 15, height: 15, borderRadius: '50%', background: '#111', border: `2px solid ${color}`, pointerEvents: 'none' }} />
      </div>
    </div>
  )
}

export default function ReviewForm({ productId, onBack }) {
  const product = products.find(p => p.id === productId) || products[0]
  const [scores, setScores]         = useState({ taste: 7.0, effectiveness: 7.0, ingredients: 7.0, value: 7.0 })
  const [note, setNote]             = useState('')
  const [selectedTags, setTags]     = useState([])
  const [done, setDone]             = useState(false)
  const overall = Object.values(scores).reduce((a, b) => a + b, 0) / 4
  const toggleTag = tag => setTags(t => t.includes(tag) ? t.filter(x => x !== tag) : [...t, tag])

  if (done) return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 12, background: '#111' }}>
      <div style={{ ...serif, fontSize: 52, color: '#5ecfcf', letterSpacing: '-0.04em' }}>{overall.toFixed(1)}</div>
      <div style={{ ...serif, fontSize: 20, color: '#e8e4dc' }}>Review posted!</div>
      <div style={{ fontSize: 13, color: '#555', ...sans }}>Thanks for rating {product.name}</div>
      <button onClick={onBack} style={{ marginTop: 16, background: '#f0ece4', color: '#111', border: 'none', borderRadius: 20, padding: '11px 28px', fontSize: 14, cursor: 'pointer', ...serif }}>Back to product</button>
    </div>
  )

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      {/* Nav */}
      <div style={{ padding: '12px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '0.5px solid #1e1e1e', flexShrink: 0 }}>
        <button onClick={onBack} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 13, color: '#555', ...sans, padding: 0 }}>Cancel</button>
        <span style={{ ...serif, fontSize: 15, color: '#e8e4dc' }}>Rate it</span>
        <button onClick={() => setDone(true)} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 13, color: '#5ecfcf', ...sans, fontWeight: 500, padding: 0 }}>Post</button>
      </div>

      <div style={{ flex: 1, overflowY: 'auto', padding: '16px', display: 'flex', flexDirection: 'column', gap: 16 }}>

        {/* Product */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ width: 36, height: 36, borderRadius: 8, background: '#1a1a1a', border: '0.5px solid #222', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, flexShrink: 0 }}>{product.icon}</div>
          <div>
            <div style={{ ...serif, fontSize: 15, color: '#e8e4dc', letterSpacing: '-0.01em' }}>{product.name}</div>
            <div style={{ fontSize: 11, color: '#4a4a4a', ...sans, marginTop: 2 }}>{product.variant} · {product.brand}</div>
          </div>
        </div>

        <Divider />

        {/* Overall */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, padding: '8px 0' }}>
          <div style={{ ...serif, fontSize: 52, color: '#5ecfcf', letterSpacing: '-0.04em', lineHeight: 1 }}>{overall.toFixed(1)}</div>
          <div style={{ fontSize: 11, color: '#3a3a3a', ...sans }}>overall score</div>
        </div>

        {/* Sliders */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {[['taste','Taste'],['effectiveness','Effectiveness'],['ingredients','Ingredients'],['value','Value']].map(([key, label]) => (
            <Slider key={key} label={label} dimKey={key} value={scores[key]} onChange={v => setScores(s => ({ ...s, [key]: v }))} />
          ))}
        </div>

        <Divider />

        {/* Note */}
        <textarea
          placeholder="Add a note — what stood out?"
          value={note} onChange={e => setNote(e.target.value)} rows={3}
          style={{ background: '#181818', border: '0.5px solid #222', borderRadius: 10, padding: '11px 13px', fontSize: 13, color: '#888', lineHeight: 1.6, outline: 'none', ...sans }}
        />

        {/* Quick tags */}
        <div style={{ display: 'flex', gap: 7, flexWrap: 'wrap' }}>
          {QUICK_TAGS.map(tag => {
            const on = selectedTags.includes(tag)
            return (
              <button key={tag} onClick={() => toggleTag(tag)} style={{ borderRadius: 20, padding: '5px 12px', fontSize: 12, cursor: 'pointer', ...sans, background: on ? '#1e0c0c' : 'transparent', border: on ? '0.5px solid #3a1515' : '0.5px solid #222', color: on ? '#ff6b6b' : '#555' }}>
                {tag}
              </button>
            )
          })}
        </div>

        {/* Submit */}
        <button onClick={() => setDone(true)} style={{ background: '#f0ece4', color: '#111', borderRadius: 20, padding: '14px 0', fontSize: 15, fontWeight: 500, border: 'none', cursor: 'pointer', ...serif }}>
          Post review
        </button>
      </div>
    </div>
  )
}
