import { useState } from 'react'
import { products, CATEGORIES } from '../data/placeholder'
import { ScorePill, SectionLabel, Chip } from '../components/ui'

const serif = { fontFamily: 'Georgia, "Times New Roman", serif' }
const sans  = { fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif' }
const FRIEND_TRIED = { p1: 3, p2: 1, p6: 2 }

function ProductRow({ product, onClick }) {
  const friendCount = FRIEND_TRIED[product.id] || 0
  return (
    <div onClick={onClick} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '11px 0', borderBottom: '0.5px solid #1a1a1a', cursor: 'pointer' }}>
      <div style={{ width: 36, height: 36, borderRadius: 8, background: '#1a1a1a', border: '0.5px solid #222', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, flexShrink: 0 }}>{product.icon}</div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ ...serif, fontSize: 14, color: '#e8e4dc', letterSpacing: '-0.01em' }}>{product.name}</div>
        <div style={{ fontSize: 11, color: '#4a4a4a', ...sans, marginTop: 2 }}>
          {product.category}
          {friendCount > 0
            ? <span style={{ color: '#5ecfcf' }}> · {friendCount} friend{friendCount > 1 ? 's' : ''} tried</span>
            : <span> · {product.ratingsCount.toLocaleString()} ratings</span>
          }
        </div>
      </div>
      {friendCount > 0 && <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#5ecfcf', flexShrink: 0 }} />}
      <ScorePill score={product.overallScore} />
    </div>
  )
}

export default function Search({ onProductClick }) {
  const [query, setQuery] = useState('')
  const [cat, setCat]     = useState('All')

  const filtered = products.filter(p => {
    const q = query.toLowerCase()
    const matchQ = !q || p.name.toLowerCase().includes(q) || p.brand.toLowerCase().includes(q) || p.category.toLowerCase().includes(q)
    const matchC = cat === 'All' || p.category.toLowerCase().includes(cat.toLowerCase())
    return matchQ && matchC
  })

  const friendTried = filtered.filter(p => FRIEND_TRIED[p.id])
  const rest        = filtered.filter(p => !FRIEND_TRIED[p.id]).sort((a, b) => b.overallScore - a.overallScore)

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <div style={{ padding: '12px 14px', borderBottom: '0.5px solid #1e1e1e', flexShrink: 0, display: 'flex', flexDirection: 'column', gap: 10 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: '#181818', border: '0.5px solid #222', borderRadius: 20, padding: '10px 14px' }}>
          <span style={{ fontSize: 16, color: '#3a3a3a' }}>⌕</span>
          <input value={query} onChange={e => setQuery(e.target.value)} placeholder="Search products, brands..."
            style={{ flex: 1, background: 'none', border: 'none', outline: 'none', fontSize: 14, color: '#ccc', ...sans }} />
          {query && <button onClick={() => setQuery('')} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#3a3a3a', fontSize: 16, padding: 0 }}>✕</button>}
        </div>
        <div style={{ display: 'flex', gap: 6, overflowX: 'auto' }}>
          {CATEGORIES.map(c => <Chip key={c} label={c} active={cat === c} onClick={() => setCat(c)} />)}
        </div>
      </div>

      <div style={{ flex: 1, overflowY: 'auto', padding: '12px 14px', display: 'flex', flexDirection: 'column', gap: 4 }}>
        {query === '' ? (
          <>
            {friendTried.length > 0 && <>
              <SectionLabel>Friends tried</SectionLabel>
              {friendTried.map(p => <ProductRow key={p.id} product={p} onClick={() => onProductClick(p.id)} />)}
              <div style={{ height: 8 }} />
            </>}
            <SectionLabel>Trending this week</SectionLabel>
            {rest.map(p => <ProductRow key={p.id} product={p} onClick={() => onProductClick(p.id)} />)}
          </>
        ) : filtered.length > 0 ? (
          <>
            <SectionLabel>{filtered.length} result{filtered.length !== 1 ? 's' : ''}</SectionLabel>
            {filtered.map(p => <ProductRow key={p.id} product={p} onClick={() => onProductClick(p.id)} />)}
          </>
        ) : (
          <div style={{ textAlign: 'center', padding: '48px 0', color: '#3a3a3a', fontSize: 14, ...sans }}>No products found for "{query}"</div>
        )}
      </div>
    </div>
  )
}
