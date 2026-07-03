import { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { NavBar } from '../components/ui'
import { useAsync } from '../hooks/useAsync'
import { useCurrentUser } from '../hooks/useCurrentUser'
import { fetchListById, fetchListItems, removeListItem, deleteList, updateListVisibility, swapListItemRanks } from '../lib/api/lists'

const serif = { fontFamily: 'Georgia, "Times New Roman", serif' }
const sans = { fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif' }

function formatCategory(raw) {
  return raw.replace(/_/g, ' ').replace(/^\w/, (c) => c.toUpperCase())
}

export default function ListDetail() {
  const { listId } = useParams()
  const navigate = useNavigate()
  const user = useCurrentUser()
  const [copied, setCopied] = useState(false)
  const [removingId, setRemovingId] = useState(null)
  const [reorderingId, setReorderingId] = useState(null)
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
    const visible = (items || []).filter((item) => item.product_variants?.products)
    return { data: { list, items: visible }, error: null }
  }, [listId])

  const handleShare = async () => {
    await navigator.clipboard.writeText(window.location.href)
    setCopied(true)
    setTimeout(() => setCopied(false), 1500)
  }

  const handleRemove = async (itemId) => {
    setRemovingId(itemId)
    await removeListItem(itemId)
    setRemovingId(null)
    refetch()
  }

  const handleMove = async (index, direction) => {
    const items = data.items
    const otherIndex = index + direction
    if (otherIndex < 0 || otherIndex >= items.length) return
    setReorderingId(items[index].id)
    await swapListItemRanks(items[index], items[otherIndex])
    setReorderingId(null)
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
    return <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#3a3a3a', fontSize: 14, ...sans }}>Loading...</div>
  }

  if (error) {
    return (
      <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#ff6b6b', fontSize: 14, ...sans }}>Couldn't load this list. Try again in a moment.</div>
    )
  }

  if (!data) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
        <NavBar title="List" onBack={() => navigate(-1)} />
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#3a3a3a', fontSize: 14, ...sans }}>List not found, or it's private.</div>
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
          <button onClick={handleShare} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 12, color: '#5ecfcf', ...sans, padding: 0 }}>
            {copied ? 'Copied!' : 'Share'}
          </button>
        }
      />

      <div style={{ flex: 1, overflowY: 'auto', padding: '16px', display: 'flex', flexDirection: 'column', gap: 10 }}>
        {isOwn && (
          <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: togglingVisibility ? 'default' : 'pointer', marginBottom: 4 }}>
            <input type="checkbox" checked={list.is_public} disabled={togglingVisibility} onChange={handleToggleVisibility} />
            <span style={{ fontSize: 12, color: '#888', ...sans }}>Public (anyone with the link can view it)</span>
          </label>
        )}

        {items.length === 0 && (
          <div style={{ textAlign: 'center', padding: '48px 0', color: '#3a3a3a', fontSize: 14, ...sans }}>{isOwn ? 'Nothing here yet. Add products from their page.' : 'This list is empty.'}</div>
        )}

        {items.map((item, i) => {
          const variant = item.product_variants
          const product = variant?.products
          return (
            <div key={item.id} style={{ background: '#181818', border: '0.5px solid #222', borderRadius: 12, padding: '12px 14px', display: 'flex', alignItems: 'center', gap: 12 }}>
              <span style={{ ...serif, fontSize: 13, color: '#3a3a3a', width: 16, flexShrink: 0 }}>{i + 1}</span>
              <div onClick={() => navigate(`/product/${variant.id}`)} style={{ flex: 1, minWidth: 0, cursor: 'pointer' }}>
                <div style={{ ...serif, fontSize: 14, color: '#e8e4dc', letterSpacing: '-0.01em' }}>
                  {product.name}
                  {variant.flavor ? ` — ${variant.flavor}` : ''}
                </div>
                <div style={{ fontSize: 11, color: '#4a4a4a', ...sans, marginTop: 2 }}>
                  {product.brand_name} · {formatCategory(product.category)}
                </div>
              </div>
              {isOwn && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0 }}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                    <button
                      onClick={() => handleMove(i, -1)}
                      disabled={i === 0 || reorderingId != null}
                      style={{ background: 'none', border: 'none', cursor: i === 0 ? 'default' : 'pointer', fontSize: 12, color: i === 0 ? '#2a2a2a' : '#666', padding: 0, lineHeight: 1 }}
                    >
                      ▲
                    </button>
                    <button
                      onClick={() => handleMove(i, 1)}
                      disabled={i === items.length - 1 || reorderingId != null}
                      style={{
                        background: 'none',
                        border: 'none',
                        cursor: i === items.length - 1 ? 'default' : 'pointer',
                        fontSize: 12,
                        color: i === items.length - 1 ? '#2a2a2a' : '#666',
                        padding: 0,
                        lineHeight: 1,
                      }}
                    >
                      ▼
                    </button>
                  </div>
                  <button
                    onClick={() => handleRemove(item.id)}
                    disabled={removingId === item.id}
                    style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 11, color: '#ff6b6b', ...sans, padding: 0, opacity: removingId === item.id ? 0.5 : 1 }}
                  >
                    Remove
                  </button>
                </div>
              )}
            </div>
          )
        })}

        {isOwn && (
          <button onClick={handleDeleteList} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 12, color: '#4a4a4a', ...sans, padding: '12px 0', marginTop: 8 }}>
            Delete list
          </button>
        )}
      </div>
    </div>
  )
}
