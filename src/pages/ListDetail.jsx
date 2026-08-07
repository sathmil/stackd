import { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { Share2, Check, Globe, Lock, Plus, Trash2 } from 'lucide-react'
import { NavBar, ScorePill, Skeleton, ErrorState } from '../components/ui'
import { useConfirm } from '../components/ConfirmDialog'
import { useAsync } from '../hooks/useAsync'
import { useCurrentUser } from '../hooks/useCurrentUser'
import { fetchListById, fetchListItems, removeListItem, deleteList, updateListVisibility } from '../lib/api/lists'

const serif = { fontFamily: 'var(--font-serif)' }
const sans = { fontFamily: 'var(--font-sans)', fontWeight: 500 }

function formatCategory(raw) {
  return raw.replace(/_/g, ' ').replace(/^\w/, (c) => c.toUpperCase())
}

export default function ListDetail() {
  const { listId } = useParams()
  const navigate = useNavigate()
  const user = useCurrentUser()
  const confirm = useConfirm()
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
    if (!(await confirm('Remove this product from the list?', { title: 'Remove product?', confirmLabel: 'Remove' }))) return
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
    if (!(await confirm('This cannot be undone.', { title: 'Delete this list?', confirmLabel: 'Delete List' }))) return
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
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-quiet)', fontSize: 15, ...sans }}>List not found, or it's private.</div>
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

      <div style={{ flex: 1, overflowY: 'auto', padding: '16px', display: 'flex', flexDirection: 'column', gap: 14 }}>
        {isOwn && (
          <>
            <div style={{ display: 'flex', gap: 8 }}>
              {[
                [true, Globe, 'Public'],
                [false, Lock, 'Private'],
              ].map(([val, Icon, label]) => {
                const on = list.is_public === val
                return (
                  <button
                    key={label}
                    onClick={() => (togglingVisibility || on ? null : handleToggleVisibility())}
                    disabled={togglingVisibility}
                    className="stackd-press"
                    style={{
                      flex: 1,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: 6,
                      borderRadius: 10,
                      padding: '9px 0',
                      fontSize: 13,
                      fontWeight: 600,
                      cursor: togglingVisibility ? 'default' : 'pointer',
                      ...sans,
                      background: on ? 'var(--tier-teal-bg)' : 'var(--bg-subtle)',
                      border: `0.5px solid ${on ? 'var(--tier-teal-border)' : 'var(--border)'}`,
                      color: on ? 'var(--tier-teal)' : 'var(--text-quiet)',
                      opacity: togglingVisibility ? 0.6 : 1,
                    }}
                  >
                    <Icon size={14} /> {label}
                  </button>
                )
              })}
            </div>
            <button
              onClick={() => navigate('/search')}
              className="stackd-press"
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 6,
                alignSelf: 'stretch',
                background: 'var(--bg-subtle)',
                border: '1.5px dashed var(--border-strong)',
                borderRadius: 12,
                padding: '11px 0',
                fontSize: 13,
                fontWeight: 700,
                color: 'var(--text-input)',
                cursor: 'pointer',
                ...sans,
              }}
            >
              <Plus size={15} strokeWidth={2.5} /> Add Products
            </button>
          </>
        )}

        {items.length === 0 && (
          <div style={{ textAlign: 'center', padding: '48px 0', color: 'var(--text-quiet)', fontSize: 15, ...sans }}>
            {isOwn ? 'Nothing here yet. Add products from their page.' : 'This list is empty.'}
          </div>
        )}

        {items.map((item, i) => {
          const variant = item.product_variants
          const product = variant.products
          const rankColor = i === 0 ? 'var(--tier-gold)' : i === 1 ? 'var(--text-input)' : i === 2 ? 'var(--color-taste)' : 'var(--text-quiet)'
          const rankBg = i === 0 ? 'var(--tier-gold-bg)' : i === 1 ? 'var(--bg-subtle)' : i === 2 ? 'var(--color-taste-bg)' : 'var(--bg-subtle)'
          const rankBorder = i === 0 ? 'var(--tier-gold-border)' : i === 1 ? 'var(--border-medium)' : i === 2 ? 'var(--color-taste-border)' : 'var(--border-medium)'
          return (
            <div
              key={item.id}
              className="stackd-elevated"
              style={{ background: 'var(--bg-card)', border: '0.5px solid var(--border)', borderRadius: 18, padding: '14px 16px', display: 'flex', alignItems: 'center', gap: 12 }}
            >
              <div
                style={{
                  ...serif,
                  fontWeight: 700,
                  fontSize: 13,
                  color: rankColor,
                  background: rankBg,
                  border: `0.5px solid ${rankBorder}`,
                  width: 26,
                  height: 26,
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
                  width: 52,
                  height: 52,
                  borderRadius: 12,
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
                    style={{ maxWidth: '80%', maxHeight: '80%', objectFit: 'contain', filter: 'drop-shadow(0 5px 8px rgba(0,0,0,0.4))' }}
                  />
                ) : (
                  <span style={{ fontSize: 18, color: 'var(--text-tertiary)', ...serif }}>{product.name.charAt(0)}</span>
                )}
              </div>
              <button onClick={() => navigate(`/product/${variant.id}`)} style={{ flex: 1, minWidth: 0, cursor: 'pointer', background: 'none', border: 'none', padding: 0, textAlign: 'left' }}>
                <div style={{ ...serif, fontWeight: 600, fontSize: 15, color: 'var(--text-primary)', letterSpacing: '-0.01em' }}>
                  {product.name}
                  {variant.flavor ? ` — ${variant.flavor}` : ''}
                </div>
                <div style={{ fontSize: 12, color: 'var(--text-tertiary)', ...sans, marginTop: 2 }}>
                  {product.brand_name} · {formatCategory(product.category)}
                </div>
              </button>
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 6, flexShrink: 0 }}>
                {item.ownerRating != null && <ScorePill score={item.ownerRating} />}
                {isOwn && (
                  <button
                    onClick={() => handleRemove(item.id)}
                    disabled={removingId === item.id}
                    className="stackd-press"
                    style={{
                      width: 26,
                      height: 26,
                      borderRadius: '50%',
                      background: 'none',
                      border: '0.5px solid var(--border-medium)',
                      color: 'var(--tier-red)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      cursor: 'pointer',
                      opacity: removingId === item.id ? 0.5 : 1,
                    }}
                  >
                    <Trash2 size={13} />
                  </button>
                )}
              </div>
            </div>
          )
        })}

        {isOwn && (
          <button
            onClick={handleDeleteList}
            className="stackd-press"
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 7,
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              fontSize: 13,
              fontWeight: 600,
              color: 'var(--tier-red)',
              ...sans,
              padding: '12px 0',
              marginTop: 8,
            }}
          >
            <Trash2 size={14} /> Delete List
          </button>
        )}
      </div>
    </div>
  )
}
