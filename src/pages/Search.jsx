import { useState, useEffect, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { CATEGORIES } from '../data/placeholder'
import { ScorePill, SectionLabel, Chip } from '../components/ui'
import { useAsync } from '../hooks/useAsync'
import { fetchVariantsForCatalog, fetchRatingSummaries } from '../lib/api/products'
import { trackEvent } from '../lib/analytics'

const serif = { fontFamily: 'Georgia, "Times New Roman", serif' }
const sans = { fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif' }

const CATEGORY_DB_VALUES = {
  Energy: ['energy_drink'],
  Protein: ['protein_bar', 'protein_powder'],
  Supps: ['supplement', 'pre_workout'],
  Greens: ['greens_powder'],
  Snacks: ['snack'],
}

const SORTS = [
  ['popular', 'Popular'],
  ['rating', 'Highest-rated'],
  ['newest', 'Newest'],
]

const PAGE_SIZE = 10

function formatCategory(raw) {
  return raw.replace(/_/g, ' ').replace(/^\w/, (c) => c.toUpperCase())
}

function sortVariants(variants, sort) {
  if (sort === 'newest') {
    return [...variants].sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
  }
  if (sort === 'rating') {
    const eligible = variants.filter((v) => (v.summary?.ratings_count || 0) >= 3)
    const rest = variants.filter((v) => (v.summary?.ratings_count || 0) < 3)
    eligible.sort((a, b) => (b.summary?.overall_score || 0) - (a.summary?.overall_score || 0))
    rest.sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
    return [...eligible, ...rest]
  }
  // popular
  return [...variants].sort((a, b) => (b.summary?.ratings_count || 0) - (a.summary?.ratings_count || 0))
}

function ProductRow({ variant }) {
  const navigate = useNavigate()
  const product = variant.products
  const summary = variant.summary
  return (
    <div onClick={() => navigate(`/product/${variant.id}`)} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '11px 0', borderBottom: '0.5px solid #1a1a1a', cursor: 'pointer' }}>
      {variant.image_url ? (
        <img
          src={variant.image_url}
          alt={variant.image_alt || `${product.name}${variant.flavor ? ` ${variant.flavor}` : ''}`}
          style={{ width: 36, height: 36, borderRadius: 8, objectFit: 'cover', flexShrink: 0 }}
        />
      ) : (
        <div
          style={{
            width: 36,
            height: 36,
            borderRadius: 8,
            background: '#1a1a1a',
            border: '0.5px solid #222',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: 14,
            color: '#4a4a4a',
            flexShrink: 0,
            ...serif,
          }}
        >
          {product.name.charAt(0)}
        </div>
      )}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ ...serif, fontSize: 14, color: '#e8e4dc', letterSpacing: '-0.01em' }}>
          {product.name}
          {variant.flavor ? ` — ${variant.flavor}` : ''}
        </div>
        <div style={{ fontSize: 11, color: '#4a4a4a', ...sans, marginTop: 2 }}>
          {product.brand_name} · {formatCategory(product.category)}
        </div>
      </div>
      {product.status !== 'approved' && (
        <span style={{ background: '#252010', border: '0.5px solid #352f1a', color: '#e8c97a', borderRadius: 20, padding: '2px 8px', fontSize: 9, fontWeight: 500, ...sans, flexShrink: 0 }}>
          {product.status === 'pending' ? 'Pending' : formatCategory(product.status)}
        </span>
      )}
      {product.status === 'approved' && (summary?.ratings_count ? <ScorePill score={summary.overall_score} /> : <span style={{ fontSize: 10, color: '#3a3a3a', ...sans }}>New</span>)}
    </div>
  )
}

export default function Search() {
  const [query, setQuery] = useState('')
  const [debouncedQuery, setDebouncedQuery] = useState('')
  const [cat, setCat] = useState('All')
  const [sort, setSort] = useState('popular')
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE)

  useEffect(() => {
    const id = setTimeout(() => setDebouncedQuery(query), 300)
    return () => clearTimeout(id)
  }, [query])

  useEffect(() => setVisibleCount(PAGE_SIZE), [debouncedQuery, cat, sort])

  useEffect(() => {
    if (debouncedQuery) trackEvent('search', { query: debouncedQuery, category: cat })
    // eslint-disable-next-line react-hooks/exhaustive-deps -- only fire when the query itself changes, not the category alone
  }, [debouncedQuery])

  const {
    data: variants,
    loading,
    error,
  } = useAsync(async () => {
    const { data: rows, error } = await fetchVariantsForCatalog({
      query: debouncedQuery,
      categories: cat === 'All' ? null : CATEGORY_DB_VALUES[cat],
    })
    if (error) return { data: null, error }
    const ids = (rows || []).map((v) => v.id)
    const { data: summaries } = await fetchRatingSummaries(ids)
    const summaryMap = Object.fromEntries((summaries || []).map((s) => [s.variant_id, s]))
    return { data: (rows || []).map((v) => ({ ...v, summary: summaryMap[v.id] || null })), error: null }
  }, [debouncedQuery, cat])

  const sorted = useMemo(() => sortVariants(variants || [], sort), [variants, sort])
  const visible = sorted.slice(0, visibleCount)

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <div style={{ padding: '12px 14px', borderBottom: '0.5px solid #1e1e1e', flexShrink: 0, display: 'flex', flexDirection: 'column', gap: 10 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: '#181818', border: '0.5px solid #222', borderRadius: 20, padding: '10px 14px' }}>
          <span style={{ fontSize: 16, color: '#3a3a3a' }}>⌕</span>
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search products, brands..."
            style={{ flex: 1, background: 'none', border: 'none', outline: 'none', fontSize: 14, color: '#ccc', ...sans }}
          />
          {query && (
            <button onClick={() => setQuery('')} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#3a3a3a', fontSize: 16, padding: 0 }}>
              ✕
            </button>
          )}
        </div>
        <div style={{ display: 'flex', gap: 6, overflowX: 'auto' }}>
          {CATEGORIES.map((c) => (
            <Chip key={c} label={c} active={cat === c} onClick={() => setCat(c)} />
          ))}
        </div>
        <div style={{ display: 'flex', gap: 6, overflowX: 'auto' }}>
          {SORTS.map(([key, label]) => (
            <Chip key={key} label={label} active={sort === key} onClick={() => setSort(key)} />
          ))}
        </div>
      </div>

      <div style={{ flex: 1, overflowY: 'auto', padding: '12px 14px', display: 'flex', flexDirection: 'column', gap: 4 }}>
        {loading && <div style={{ textAlign: 'center', padding: '48px 0', color: '#3a3a3a', fontSize: 14, ...sans }}>Loading...</div>}

        {error && <div style={{ textAlign: 'center', padding: '48px 0', color: '#ff6b6b', fontSize: 14, ...sans }}>Couldn't load the catalog. Try again in a moment.</div>}

        {!loading && !error && sorted.length === 0 && (
          <div style={{ textAlign: 'center', padding: '48px 0', color: '#3a3a3a', fontSize: 14, ...sans, display: 'flex', flexDirection: 'column', gap: 10 }}>
            {debouncedQuery ? (
              <>
                <div>No products found for "{debouncedQuery}".</div>
                <div style={{ color: '#5ecfcf' }}>Can't find it? Add a product.</div>
              </>
            ) : (
              <div>Nothing in the catalog yet.</div>
            )}
          </div>
        )}

        {!loading && !error && sorted.length > 0 && (
          <>
            <SectionLabel>
              {sorted.length} product{sorted.length !== 1 ? 's' : ''}
            </SectionLabel>
            {visible.map((v) => (
              <ProductRow key={v.id} variant={v} />
            ))}
            {visibleCount < sorted.length && (
              <button
                onClick={() => setVisibleCount((c) => c + PAGE_SIZE)}
                style={{ background: 'none', border: '0.5px solid #222', borderRadius: 20, padding: '10px 0', fontSize: 13, color: '#888', cursor: 'pointer', ...sans, marginTop: 8 }}
              >
                Load more
              </button>
            )}
          </>
        )}
      </div>
    </div>
  )
}
