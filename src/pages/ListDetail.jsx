import { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { NavBar, ScorePill, Skeleton, ErrorState } from '../components/ui'
import { useAsync } from '../hooks/useAsync'
import { useCurrentUser } from '../hooks/useCurrentUser'
import { fetchListById, fetchListItems, removeListItem, deleteList, updateListVisibility } from '../lib/api/lists'

const serif = { fontFamily: 'Georgia, "Times New Roman", serif' }
const sans = { fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif', fontWeight: 500 }

function formatCategory(raw) {
  return raw.replace(/_/g, ' ').replace(/^\w/, (c) => c.toUpperCase())
}

export default function ListDetail() {
  const { listId } = useParams()
  const navigate = useNavigate()
  const user = useCurrentUser()
  const [copied, setCopied] = useState(false)
  const [removingId, setRemovingId] = useState(null)
  const [togglingVisibility, setTogglingVisibility] = useState(false)

  const { data, loading, error, refetch } = useAsync(async () => {
    const { data: list, error: listErr } = await fetchListById(listId)
    if (listErr) return { data: null, error: listErr }
    if (!list) return { data: null, error: null }
    const { data: items, error: itemsErr } = await fetchListItems(listId)
    if (itemsErr) return { data: null, error: itemsErr }

    // RLS returns a null product for anything the current viewer isn't
    // allowed to see yet (e.g. someone else's still-pending submission) --
    // show nothing for that row rather than an "Unknown product" stub.
    const visible = (items || [])
      .filter((item) => item.product_variants?.products)
      .map((item) => ({
        ...item,
        ownerRating: item.product_variants.reviews.find((r) => r.user_id === list.user_id)?.overall_rating ?? null,
      }))

    // Ranked by the list owner's own rating -- this is a "my ranked
    // favorites" list, not an arbitrary bag, so order is derived rather
    // than manually dragged. Not-yet-rated items sink to the bottom in
    // insertion order (the query's rank_position order, preserved by
    // Array.sort's stability) rather than being excluded.
    visible.sort((a, b) => (b.ownerRating ?? -1) - (a.ownerRating ?? -1))

    return { data: { list, items: visible }, error: null }
  }, [listId])

  const handleShare = async () => {
    await navigator.clipboard.writeText(window.location.href)
    setCopied(true)
    setTimeout(() => setCopied(false), 1500)
  }

  const handleRemove = async (itemId) => {
    if (!window.confirm('Remove this product from the list?')) return
    setRemovingId(itemId)
    await removeListItem(itemId)
    setRemovingId(null)
    refetch()
  }

  const handleToggleVisibility = async () => {
    setTogglingVisibility(true)
    await updateListVisibility(listId, !data.list.is_public)
    setTogglingVisibility(false)
    refetch()
  }

  const handleDeleteList = async () => {
    if (!window.confirm('Delete this list? This cannot be undone.')) return
    await deleteList(listId)
    navigate('/lists')
  }

  if (loading) {
    return <Skeleton variant="rows" count={4} />
  }

  if (error) {
    return <ErrorState message="Couldn't load this list. Try again in a moment." onRetry={refetch} />
  }

  if (!data) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
        <NavBar title="List" onBack={() => navigate(-1)} />
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#828282', fontSize: 15, ...sans }}>List not found, or it's private.</div>
      </div>
    )
  }

  const { list, items } = data
  const isOwn = user && list.user_id === user.id

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <NavBar
        title={list.name}
        onBack={() => navigate(-1)}
        rightEl={
          <button onClick={handleShare} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 13, color: '#5ecfcf', ...sans, padding: 0 }}>
            {copied ? 'Copied!' : 'Share'}
          </button>
        }
      />

      <div style={{ flex: 1, overflowY: 'auto', padding: '16px', display: 'flex', flexDirection: 'column', gap: 10 }}>
        {isOwn && (
          <>
            <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: togglingVisibility ? 'default' : 'pointer' }}>
              <input type="checkbox" checked={list.is_public} disabled={togglingVisibility} onChange={handleToggleVisibility} />
              <span style={{ fontSize: 13, color: '#888', ...sans }}>Public (anyone with the link can view it)</span>
            </label>
            <button
              onClick={() => navigate('/search')}
              style={{
                alignSelf: 'flex-start',
                background: 'none',
                border: '0.5px solid #2a2a2a',
                borderRadius: 20,
                padding: '8px 16px',
                fontSize: 13,
                color: '#ccc',
                cursor: 'pointer',
                marginBottom: 4,
                ...sans,
              }}
            >
              + Add products
            </button>
          </>
        )}

        {items.length === 0 && (
          <div style={{ textAlign: 'center', padding: '48px 0', color: '#828282', fontSize: 15, ...sans }}>{isOwn ? 'Nothing here yet. Add products from their page.' : 'This list is empty.'}</div>
        )}

        {items.map((item, i) => {
          const variant = item.product_variants
          const product = variant.products
          return (
            <div key={item.id} style={{ background: '#181818', border: '0.5px solid #222', borderRadius: 12, padding: '12px 14px', display: 'flex', alignItems: 'center', gap: 12 }}>
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
              {item.ownerRating != null && <ScorePill score={item.ownerRating} />}
              {isOwn && (
                <button
                  onClick={() => handleRemove(item.id)}
                  disabled={removingId === item.id}
                  style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 12, color: '#ff6b6b', ...sans, padding: 0, opacity: removingId === item.id ? 0.5 : 1, flexShrink: 0 }}
                >
                  Remove
                </button>
              )}
            </div>
          )
        })}

        {isOwn && (
          <button onClick={handleDeleteList} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 13, color: '#868686', ...sans, padding: '12px 0', marginTop: 8 }}>
            Delete list
          </button>
        )}
      </div>
    </div>
  )
}
