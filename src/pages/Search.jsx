import { useState, useEffect, useMemo, useRef, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { Search as SearchIcon, SlidersHorizontal, TrendingUp, Star, Clock, X } from 'lucide-react'
import { CATEGORIES } from '../data/placeholder'
import { ScorePill, Skeleton, ErrorState } from '../components/ui'
import { useAsync } from '../hooks/useAsync'
import { useInfiniteScroll } from '../hooks/useInfiniteScroll'
import { fetchVariantsForCatalog, fetchRatingSummaries } from '../lib/api/products'
import { trackEvent } from '../lib/analytics'
import { FILTER_CATEGORY_ICONS, FILTER_CATEGORY_COLORS, categoryIcon } from '../utils/categoryIcon'

const serif = { fontFamily: 'var(--font-serif)' }
const sans = { fontFamily: 'var(--font-sans)', fontWeight: 500 }

const CATEGORY_DB_VALUES = {
  Drinks: ['energy_drink', 'protein_shake'],
  Protein: ['protein_powder'],
  Supps: ['supplement', 'pre_workout'],
  Greens: ['greens_powder'],
  Food: ['snack', 'protein_bar'],
}

const SORTS = [
  ['popular', 'Popular', TrendingUp],
  ['rating', 'Highest-rated', Star],
  ['newest', 'Newest', Clock],
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

// Circular icon button with a label underneath -- groups categories by
// icon rather than color, and each one keeps its own accent when selected
// (from FILTER_CATEGORY_COLORS) instead of every filter sharing one flat
// purple, which read as monotonous rather than modern.
function CategoryIconButton({ label, active, onClick }) {
  const Icon = FILTER_CATEGORY_ICONS[label]
  const color = FILTER_CATEGORY_COLORS[label]
  return (
    <button
      onClick={onClick}
      className="stackd-press"
      style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6, background: 'none', border: 'none', cursor: 'pointer', flexShrink: 0 }}
    >
      <div
        style={{
          width: 52,
          height: 52,
          borderRadius: '50%',
          background: active ? `linear-gradient(145deg, ${color}, color-mix(in srgb, ${color} 70%, black))` : 'var(--bg-card)',
          border: active ? 'none' : '0.5px solid var(--border)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          boxShadow: 'none',
        }}
      >
        <Icon size={20} color={active ? (label === 'All' ? 'var(--bg)' : '#fff') : 'var(--text-muted)'} strokeWidth={active ? 2.25 : 1.75} />
      </div>
      <span style={{ fontSize: 11, ...sans, color: active ? 'var(--text-heading)' : 'var(--text-quiet)', fontWeight: active ? 600 : 500 }}>{label}</span>
    </button>
  )
}

// Sort chips use a single distinct teal accent (not the category colors, not
// the score color) so each control cluster on the page reads as its own
// group rather than everything competing for the same hue.
function SortChip({ label, Icon, active, onClick }) {
  return (
    <button
      onClick={onClick}
      className="stackd-press"
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 6,
        borderRadius: 20,
        padding: '7px 14px',
        fontSize: 13,
        cursor: 'pointer',
        ...sans,
        whiteSpace: 'nowrap',
        border: active ? 'none' : '0.5px solid var(--border-input)',
        background: active ? 'linear-gradient(145deg, var(--tier-teal), color-mix(in srgb, var(--tier-teal) 65%, black))' : 'transparent',
        color: active ? '#fff' : 'var(--text-muted)',
        fontWeight: active ? 600 : 400,
        boxShadow: 'none',
        flexShrink: 0,
      }}
    >
      <Icon size={13} />
      {label}
    </button>
  )
}

function CategoryBadge({ dbCategory }) {
  const Icon = categoryIcon(dbCategory)
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, background: 'var(--bg-subtle)', borderRadius: 20, padding: '3px 9px', fontSize: 10, color: 'var(--text-muted)', ...sans }}>
      <Icon size={10} />
      {formatCategory(dbCategory)}
    </span>
  )
}

function ProductRow({ variant }) {
  const navigate = useNavigate()
  const product = variant.products
  const summary = variant.summary
  return (
    <button
      onClick={() => navigate(`/product/${variant.id}`)}
      className="stackd-elevated stackd-press"
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 12,
        padding: 12,
        background: 'var(--bg-card)',
        border: '0.5px solid var(--border)',
        borderRadius: 18,
        cursor: 'pointer',
        width: '100%',
        textAlign: 'left',
      }}
    >
      {variant.image_url ? (
        <div style={{ width: 52, height: 52, borderRadius: 13, background: 'var(--bg-photo)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
          <img
            src={variant.image_url}
            alt={variant.image_alt || `${product.name}${variant.flavor ? ` ${variant.flavor}` : ''}`}
            style={{ maxWidth: '80%', maxHeight: '80%', objectFit: 'contain', filter: 'drop-shadow(0 4px 8px rgba(0,0,0,0.4))' }}
          />
        </div>
      ) : (
        <div
          style={{
            width: 52,
            height: 52,
            borderRadius: 13,
            background: 'var(--bg-subtle)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: 18,
            color: 'var(--text-tertiary)',
            flexShrink: 0,
            ...serif,
          }}
        >
          {product.name.charAt(0)}
        </div>
      )}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ ...serif, fontSize: 15, color: 'var(--text-heading)', letterSpacing: '-0.01em' }}>
          {product.name}
          {variant.flavor ? ` — ${variant.flavor}` : ''}
        </div>
        <div style={{ fontSize: 12, color: 'var(--text-tertiary)', ...sans, marginTop: 2 }}>
          {product.brand_name} · {formatCategory(product.category)}
        </div>
        <div style={{ marginTop: 6 }}>
          <CategoryBadge dbCategory={product.category} />
        </div>
      </div>
      <div style={{ flexShrink: 0 }}>
        {product.status !== 'approved' ? (
          <span
            style={{
              background: 'var(--tier-gold-bg)',
              border: '0.5px solid var(--tier-gold-border)',
              color: 'var(--tier-gold)',
              borderRadius: 20,
              padding: '2px 8px',
              fontSize: 10,
              fontWeight: 500,
              ...sans,
            }}
          >
            {product.status === 'pending' ? 'Pending' : formatCategory(product.status)}
          </span>
        ) : summary?.ratings_count ? (
          <ScorePill score={summary.overall_score} />
        ) : (
          <span style={{ fontSize: 11, color: 'var(--text-quiet)', ...sans }}>New</span>
        )}
      </div>
    </button>
  )
}

export default function Search() {
  const navigate = useNavigate()
  const [query, setQuery] = useState('')
  const [debouncedQuery, setDebouncedQuery] = useState('')
  const [cat, setCat] = useState('All')
  const [sort, setSort] = useState('popular')
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE)
  const [filtersOpen, setFiltersOpen] = useState(true)

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
    refetch,
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

  const handleLoadMore = useCallback(() => setVisibleCount((c) => c + PAGE_SIZE), [])
  const scrollRef = useRef(null)
  useInfiniteScroll(scrollRef, handleLoadMore, { enabled: !loading && visibleCount < sorted.length })

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <div style={{ padding: '14px', borderBottom: '0.5px solid var(--border-subtle)', flexShrink: 0, display: 'flex', flexDirection: 'column', gap: 14 }}>
        <div style={{ display: 'flex', gap: 8 }}>
          <div
            className="stackd-elevated stackd-pill-input"
            style={{ flex: 1, display: 'flex', alignItems: 'center', gap: 10, background: 'var(--bg-card)', border: '0.5px solid var(--border)', borderRadius: 24, padding: '12px 16px' }}
          >
            <SearchIcon size={17} color="var(--text-quiet)" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search products, brands..."
              style={{ flex: 1, background: 'none', border: 'none', outline: 'none', fontSize: 15, color: 'var(--text-input)', ...sans }}
            />
            {query && (
              <button onClick={() => setQuery('')} className="stackd-press" style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-quiet)', padding: 0, display: 'flex' }}>
                <X size={16} />
              </button>
            )}
          </div>
          <button
            onClick={() => setFiltersOpen((v) => !v)}
            className="stackd-elevated stackd-press"
            style={{
              width: 46,
              flexShrink: 0,
              background: filtersOpen ? 'var(--text-heading)' : 'var(--bg-card)',
              border: filtersOpen ? 'none' : '0.5px solid var(--border)',
              borderRadius: 24,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
            }}
          >
            <SlidersHorizontal size={18} color={filtersOpen ? 'var(--bg)' : 'var(--text-muted)'} />
          </button>
        </div>

        {filtersOpen && (
          <>
            <div style={{ display: 'flex', gap: 14, overflowX: 'auto', padding: '2px 2px 4px' }}>
              {CATEGORIES.map((c) => (
                <CategoryIconButton key={c} label={c} active={cat === c} onClick={() => setCat(c)} />
              ))}
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <div style={{ display: 'flex', gap: 7, overflowX: 'auto', flex: 1 }}>
                {SORTS.map(([key, label, Icon]) => (
                  <SortChip key={key} label={label} Icon={Icon} active={sort === key} onClick={() => setSort(key)} />
                ))}
              </div>
              {!loading && !error && (
                <span style={{ fontSize: 12, color: 'var(--text-quiet)', ...sans, flexShrink: 0, whiteSpace: 'nowrap' }}>
                  {sorted.length} product{sorted.length !== 1 ? 's' : ''}
                </span>
              )}
            </div>
          </>
        )}
      </div>

      <div ref={scrollRef} style={{ flex: 1, overflowY: 'auto', padding: '14px', display: 'flex', flexDirection: 'column', gap: 12 }}>
        {loading && <Skeleton variant="rows" />}

        {error && <ErrorState message="Couldn't load the catalog. Try again in a moment." onRetry={refetch} />}

        {!loading && !error && sorted.length === 0 && (
          <div style={{ textAlign: 'center', padding: '48px 0', color: 'var(--text-quiet)', fontSize: 15, ...sans, display: 'flex', flexDirection: 'column', gap: 10 }}>
            {debouncedQuery ? (
              <>
                <div>No products found for "{debouncedQuery}".</div>
                <button onClick={() => navigate('/add-product')} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 15, color: 'var(--tier-teal)', ...sans, padding: 0 }}>
                  Can't find it? Add a product.
                </button>
              </>
            ) : (
              <div>Nothing in the catalog yet.</div>
            )}
          </div>
        )}

        {!loading && !error && visible.map((v) => <ProductRow key={v.id} variant={v} />)}
      </div>
    </div>
  )
}
