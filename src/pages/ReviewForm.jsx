import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { X, CheckCircle2, Plus } from 'lucide-react'
import { Skeleton, ErrorState } from '../components/ui'
import { useToast } from '../components/Toast'
import { useConfirm } from '../components/ConfirmDialog'
import { useAsync } from '../hooks/useAsync'
import { useCurrentUser } from '../hooks/useCurrentUser'
import { fetchVariantById } from '../lib/api/products'
import { fetchActiveTags, fetchOwnReview, upsertReview, syncReviewTags, deleteReview, createTag } from '../lib/api/reviews'
import { fetchReviewsForUser } from '../lib/api/profiles'
import { trackEvent } from '../lib/analytics'

const serif = { fontFamily: 'var(--font-serif)' }
const sans = { fontFamily: 'var(--font-sans)', fontWeight: 500 }

// Two color choices per sentiment (positive: green/blue, negative:
// pink/gold) so tag chips read as varied and lively rather than a strict
// two-color split, while staying true to the tag's actual sentiment.
const POSITIVE_COLORS = [
  ['var(--color-effect)', 'var(--color-effect-bg)', 'var(--color-effect-border)'],
  ['var(--color-value)', 'var(--color-value-bg)', 'var(--color-value-border)'],
]
const NEGATIVE_COLORS = [
  ['var(--color-taste)', 'var(--color-taste-bg)', 'var(--color-taste-border)'],
  ['var(--tier-gold)', 'var(--tier-gold-bg)', 'var(--tier-gold-border)'],
]

function hashIndex(id, mod) {
  let h = 0
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) >>> 0
  return h % mod
}

function tagColors(tag) {
  const palette = tag.sentiment === 'positive' ? POSITIVE_COLORS : NEGATIVE_COLORS
  return palette[hashIndex(tag.id, palette.length)]
}

const DIMENSIONS = [
  { key: 'taste', label: 'Taste', question: 'How enjoyable was it?', lo: 'Chalky', hi: 'Delicious', color: 'var(--color-taste)' },
  { key: 'value', label: 'Value', question: 'Worth the price?', lo: 'Overpriced', hi: 'Steal', color: 'var(--color-value)' },
  { key: 'effectiveness', label: 'Effectiveness', question: 'Did it deliver results?', lo: 'Placebo', hi: 'Game Changer', color: 'var(--color-effect)' },
]

function Slider({ dimension, value, onChange }) {
  const pct = ((value - 1) / 9) * 100
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 4, background: 'var(--bg-card)', border: '0.5px solid var(--border)', borderRadius: 14, padding: 16 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
        <div>
          <div style={{ ...serif, fontSize: 17, color: 'var(--text-heading)' }}>{dimension.label}</div>
          <div style={{ fontSize: 12, color: 'var(--text-tertiary)', ...sans }}>{dimension.question}</div>
        </div>
        <span style={{ ...serif, fontSize: 20, color: dimension.color, letterSpacing: '-0.02em' }}>{value.toFixed(1)}</span>
      </div>
      <div style={{ position: 'relative', height: 22, display: 'flex', alignItems: 'center', marginTop: 4 }}>
        <div style={{ position: 'absolute', left: 0, right: 0, height: 5, background: 'var(--border-subtle)', borderRadius: 3 }}>
          <div style={{ height: '100%', width: `${pct}%`, background: dimension.color, borderRadius: 3 }} />
        </div>
        <input
          type="range"
          min="1"
          max="10"
          step="0.1"
          value={value}
          onChange={(e) => onChange(parseFloat(e.target.value))}
          style={{ position: 'absolute', left: 0, right: 0, width: '100%', opacity: 0, height: 22, cursor: 'pointer', margin: 0 }}
        />
        <div
          style={{
            position: 'absolute',
            left: `${pct}%`,
            transform: 'translateX(-50%)',
            width: 16,
            height: 16,
            borderRadius: '50%',
            background: dimension.color,
            pointerEvents: 'none',
          }}
        />
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
        <span style={{ fontSize: 11, color: 'var(--text-faint)', ...sans }}>{dimension.lo}</span>
        <span style={{ fontSize: 11, color: 'var(--text-faint)', ...sans }}>{dimension.hi}</span>
      </div>
    </div>
  )
}

function CompareChart({ bars }) {
  if (bars.length < 2) return null
  const max = Math.max(10, ...bars.map((b) => b.value))
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      <div>
        <div style={{ ...serif, fontSize: 16, color: 'var(--text-primary)' }}>Compare to your stack</div>
        <div style={{ fontSize: 12, color: 'var(--text-tertiary)', ...sans, marginTop: 2 }}>See how this stacks up against your previously rated products in this category.</div>
      </div>
      <div style={{ display: 'flex', alignItems: 'flex-end', gap: 10, height: 90, padding: '0 4px' }}>
        {bars.map((bar, i) => (
          <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, height: '100%', justifyContent: 'flex-end' }}>
            {bar.current && (
              <span style={{ fontSize: 10, color: 'var(--color-taste)', ...sans, whiteSpace: 'nowrap' }}>
                {bar.label} ({bar.value.toFixed(1)})
              </span>
            )}
            <div
              style={{
                width: '100%',
                maxWidth: 34,
                height: `${(bar.value / max) * 100}%`,
                minHeight: 4,
                borderRadius: '4px 4px 0 0',
                background: bar.current ? 'var(--color-taste)' : 'var(--border-strong)',
              }}
            />
          </div>
        ))}
      </div>
    </div>
  )
}

export default function ReviewForm() {
  const { variantId } = useParams()
  const navigate = useNavigate()
  const user = useCurrentUser()
  const showToast = useToast()
  const confirm = useConfirm()
  // navigate(-1), not navigate(`/product/${variantId}`) -- this route is only
  // ever reached by pushing from the product page, so going back should pop
  // that entry rather than push a new one. Pushing here made the history
  // stack grow every round trip (product -> review -> product -> review...),
  // so the back button would land back on this review form instead of
  // actually leaving.
  const goBack = () => navigate(-1)

  const { data, loading, error, refetch } = useAsync(async () => {
    if (!user) return { data: null, error: null }
    const [{ data: variant, error: vErr }, { data: tags }, { data: ownReview }, { data: ownReviews }] = await Promise.all([
      fetchVariantById(variantId),
      fetchActiveTags(),
      fetchOwnReview(variantId, user.id),
      fetchReviewsForUser(user.id),
    ])
    if (vErr) return { data: null, error: vErr }
    return { data: { variant, tags: tags || [], ownReview, ownReviews: ownReviews || [] }, error: null }
  }, [variantId, user])

  const [taste, setTaste] = useState(6.0)
  const [value, setValueRating] = useState(6.0)
  const [effectiveness, setEffectiveness] = useState(6.0)
  const [wouldBuyAgain, setWouldBuyAgain] = useState(null)
  const [notes, setNotes] = useState('')
  const [selectedTagIds, setSelectedTagIds] = useState([])
  const [submitting, setSubmitting] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [done, setDone] = useState(false)
  const [localTags, setLocalTags] = useState(null)
  const [addingTag, setAddingTag] = useState(false)
  const [newTagLabel, setNewTagLabel] = useState('')
  const [creatingTag, setCreatingTag] = useState(false)

  useEffect(() => {
    if (data?.tags) setLocalTags(data.tags)
  }, [data?.tags])

  useEffect(() => {
    if (!data?.ownReview) return
    const r = data.ownReview
    setTaste(Number(r.taste_rating))
    setValueRating(Number(r.value_rating))
    setEffectiveness(Number(r.effectiveness_rating))
    setWouldBuyAgain(r.would_buy_again)
    setNotes(r.notes || '')
    setSelectedTagIds(r.review_tags.map((rt) => rt.tag_id))
  }, [data?.ownReview])

  const toggleTag = (tagId) => setSelectedTagIds((t) => (t.includes(tagId) ? t.filter((x) => x !== tagId) : [...t, tagId]))

  const handleCreateTag = async () => {
    if (!newTagLabel.trim()) {
      setAddingTag(false)
      return
    }
    setCreatingTag(true)
    const { data: tag, error } = await createTag(newTagLabel)
    setCreatingTag(false)
    if (error || !tag) {
      showToast("Couldn't add that tag. Try again.", 'error')
      return
    }
    setLocalTags((prev) => (prev.some((t) => t.id === tag.id) ? prev : [...prev, tag]))
    setSelectedTagIds((t) => (t.includes(tag.id) ? t : [...t, tag.id]))
    setNewTagLabel('')
    setAddingTag(false)
  }

  const handleSubmit = async () => {
    setSubmitting(true)
    // Optimistic: show the "done" screen right away: this is the highest-feel
    // write in the app, and the round trip (upsert + tag sync) shouldn't be
    // what the user waits on. Roll back to the form and toast on failure.
    setDone(true)
    const { data: review, error } = await upsertReview({
      variantId,
      userId: user.id,
      tasteRating: taste,
      valueRating: value,
      effectivenessRating: effectiveness,
      wouldBuyAgain,
      notes,
    })
    if (!error) await syncReviewTags(review.id, selectedTagIds)
    setSubmitting(false)
    if (error) {
      setDone(false)
      showToast("Couldn't save your review. Try again.", 'error')
      return
    }
    trackEvent('review_submit', { variant_id: variantId, is_edit: isEditing })
  }

  const handleDelete = async () => {
    if (!(await confirm('This cannot be undone.', { title: 'Delete your review?', confirmLabel: 'Delete Review' }))) return
    setDeleting(true)
    await deleteReview(data.ownReview.id)
    setDeleting(false)
    goBack()
  }

  if (loading || user === undefined) {
    return <Skeleton variant="detail" />
  }

  if (error || !data?.variant) {
    return <ErrorState message="Couldn't load this product. Try again in a moment." onRetry={refetch} />
  }

  const { variant, ownReviews } = data
  const tags = localTags || data.tags
  const product = variant.products
  const isEditing = !!data.ownReview

  const overallRating = Math.round(((taste + value + effectiveness) / 3) * 10) / 10
  const priorInCategory = ownReviews
    .filter((r) => r.variant_id !== variantId && r.product_variants?.products?.category === product.category)
    .slice(0, 3)
    .reverse()
  const compareBars = [...priorInCategory.map((r) => ({ label: r.product_variants.products.name, value: Number(r.overall_rating) })), { label: product.name, value: overallRating, current: true }]

  if (done) {
    return (
      <div style={{ height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 16, background: 'var(--bg-nav)', padding: '0 24px' }}>
        <div
          style={{
            width: 72,
            height: 72,
            borderRadius: '50%',
            background: 'var(--color-effect-bg)',
            border: '1px solid var(--color-effect-border)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <CheckCircle2 size={34} color="var(--color-effect)" strokeWidth={2} />
        </div>
        <div style={{ ...serif, fontWeight: 700, fontSize: 24, color: 'var(--text-heading)', textAlign: 'center', letterSpacing: '-0.01em' }}>{isEditing ? 'Review updated!' : 'Review posted!'}</div>
        <div style={{ fontSize: 14, color: 'var(--text-muted)', ...sans, textAlign: 'center' }}>Thanks for rating {product.name}</div>
        <button
          onClick={goBack}
          className="stackd-press"
          style={{
            marginTop: 16,
            background: 'var(--text-heading)',
            color: 'var(--bg-nav)',
            border: 'none',
            borderRadius: 20,
            padding: '13px 30px',
            fontSize: 15,
            fontWeight: 700,
            cursor: 'pointer',
            ...serif,
          }}
        >
          Back to product
        </button>
      </div>
    )
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      {/* Nav */}
      <div style={{ padding: '12px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '0.5px solid var(--border-subtle)', flexShrink: 0 }}>
        <button
          onClick={goBack}
          className="stackd-press"
          style={{
            width: 32,
            height: 32,
            borderRadius: '50%',
            background: 'var(--bg-subtle)',
            border: '0.5px solid var(--border)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
            color: 'var(--text-primary)',
            flexShrink: 0,
          }}
        >
          <X size={16} strokeWidth={2.25} />
        </button>
        <span style={{ ...serif, fontWeight: 700, fontSize: 17, color: 'var(--text-heading)', letterSpacing: '-0.01em' }}>Stackd</span>
        <div style={{ width: 32 }} />
      </div>

      <div style={{ flex: 1, overflowY: 'auto', padding: '20px 16px', display: 'flex', flexDirection: 'column', gap: 22 }}>
        <div>
          <div style={{ ...serif, fontSize: 26, color: 'var(--text-heading)', letterSpacing: '-0.01em' }}>Rate Your Stack</div>
          <div style={{ fontSize: 13, color: 'var(--text-tertiary)', ...sans, marginTop: 4, lineHeight: 1.5 }}>
            How did this product perform? Your review helps the community discover better wellness.
          </div>
        </div>

        {/* Product */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 14, background: 'var(--bg-card)', border: '0.5px solid var(--border)', borderRadius: 12, padding: 14 }}>
          {variant.image_url ? (
            <img src={variant.image_url} alt="" style={{ width: 64, height: 64, borderRadius: 8, objectFit: 'contain', flexShrink: 0 }} />
          ) : (
            <div
              style={{
                width: 64,
                height: 64,
                borderRadius: 8,
                background: 'var(--bg-subtle)',
                border: '0.5px solid var(--border)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: 24,
                color: 'var(--text-tertiary)',
                flexShrink: 0,
                ...serif,
              }}
            >
              {product.name.charAt(0)}
            </div>
          )}
          <div>
            <div style={{ fontSize: 10, color: 'var(--text-quiet)', textTransform: 'uppercase', letterSpacing: '0.07em', ...sans }}>{product.category.replace(/_/g, ' ')}</div>
            <div style={{ ...serif, fontSize: 16, color: 'var(--text-primary)', letterSpacing: '-0.01em', marginTop: 1 }}>
              {product.name}
              {variant.flavor ? ` — ${variant.flavor}` : ''}
            </div>
            <div style={{ fontSize: 12, color: 'var(--text-tertiary)', ...sans, marginTop: 1 }}>by {product.brand_name}</div>
          </div>
        </div>

        {/* Three rating dimensions */}
        {DIMENSIONS.map((dim) => (
          <Slider key={dim.key} dimension={dim} value={{ taste, value, effectiveness }[dim.key]} onChange={{ taste: setTaste, value: setValueRating, effectiveness: setEffectiveness }[dim.key]} />
        ))}

        {/* Tags */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <span style={{ ...serif, fontSize: 20, color: 'var(--text-heading)' }}>Quick Tags</span>
          <div style={{ display: 'flex', gap: 7, flexWrap: 'wrap' }}>
            {tags.map((tag) => {
              const on = selectedTagIds.includes(tag.id)
              const [color, bg] = tagColors(tag)
              return (
                <button
                  key={tag.id}
                  onClick={() => toggleTag(tag.id)}
                  style={{
                    borderRadius: 20,
                    padding: '8px 16px',
                    fontSize: 14,
                    cursor: 'pointer',
                    ...sans,
                    fontWeight: 700,
                    background: on ? bg : 'var(--bg-subtle)',
                    border: 'none',
                    color: on ? color : 'var(--text-quiet)',
                  }}
                >
                  {tag.label}
                </button>
              )
            })}

            {addingTag ? (
              <input
                autoFocus
                value={newTagLabel}
                onChange={(e) => setNewTagLabel(e.target.value)}
                onBlur={handleCreateTag}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') e.currentTarget.blur()
                  if (e.key === 'Escape') {
                    setNewTagLabel('')
                    setAddingTag(false)
                  }
                }}
                disabled={creatingTag}
                placeholder="New tag..."
                maxLength={30}
                style={{
                  borderRadius: 20,
                  padding: '8px 16px',
                  fontSize: 14,
                  fontWeight: 700,
                  ...sans,
                  background: 'var(--bg-subtle)',
                  border: '1.5px dashed var(--border-strong)',
                  color: 'var(--text-primary)',
                  outline: 'none',
                  width: 120,
                }}
              />
            ) : (
              <button
                onClick={() => setAddingTag(true)}
                className="stackd-press"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 5,
                  borderRadius: 20,
                  padding: '8px 16px',
                  fontSize: 14,
                  fontWeight: 700,
                  cursor: 'pointer',
                  ...sans,
                  background: 'none',
                  border: '1.5px dashed var(--border-strong)',
                  color: 'var(--text-input)',
                }}
              >
                <Plus size={15} strokeWidth={2.5} /> Add Tag
              </button>
            )}
          </div>
        </div>

        {/* Note -- minHeight, not rows: rows' native height calc doesn't
            account for box-sizing:border-box (set globally), so with rows
            alone the box renders far shorter than 3 lines actually need. */}
        <textarea
          placeholder="Add a quick note about your experience..."
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          style={{
            background: 'var(--bg-card)',
            border: '0.5px solid var(--border)',
            borderRadius: 10,
            padding: '11px 13px',
            fontSize: 14,
            color: 'var(--text-body)',
            lineHeight: 1.6,
            outline: 'none',
            minHeight: 84,
            ...sans,
          }}
        />

        {/* Would buy again -- kept compact/low-emphasis to match the
            redesign's flow; still real data feeding the product page's
            "buy again %" stat, not decorative. */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{ fontSize: 13, color: 'var(--text-tertiary)', ...sans }}>Buy again?</span>
          {[
            ['Yes', true],
            ['No', false],
          ].map(([label, val]) => {
            const on = wouldBuyAgain === val
            return (
              <button
                key={label}
                onClick={() => setWouldBuyAgain(on ? null : val)}
                style={{
                  borderRadius: 20,
                  padding: '5px 14px',
                  fontSize: 12,
                  cursor: 'pointer',
                  ...sans,
                  background: on ? 'var(--color-value-bg)' : 'transparent',
                  border: on ? '0.5px solid var(--color-value-border)' : '0.5px solid var(--border-medium)',
                  color: on ? 'var(--color-value)' : 'var(--text-muted)',
                }}
              >
                {label}
              </button>
            )
          })}
        </div>

        <CompareChart bars={compareBars} />

        {isEditing && (
          <button
            onClick={handleDelete}
            disabled={deleting}
            style={{
              background: 'none',
              border: 'none',
              cursor: deleting ? 'default' : 'pointer',
              fontSize: 13,
              color: 'var(--tier-red)',
              ...sans,
              padding: '4px 0',
              opacity: deleting ? 0.5 : 1,
              alignSelf: 'center',
            }}
          >
            {deleting ? 'Deleting...' : 'Delete review'}
          </button>
        )}

        {/* Spacer so content isn't hidden behind the sticky footer */}
        <div style={{ height: 8 }} />
      </div>

      {/* Sticky footer */}
      <div
        style={{
          flexShrink: 0,
          borderTop: '0.5px solid var(--border-subtle)',
          padding: '12px 16px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 12,
          background: 'var(--bg-nav)',
        }}
      >
        <button onClick={goBack} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 14, color: 'var(--text-muted)', ...sans, padding: 0 }}>
          {isEditing ? 'Cancel' : 'Skip'}
        </button>
        <button
          onClick={handleSubmit}
          disabled={submitting}
          style={{
            background: 'var(--border-medium)',
            color: 'var(--text-primary)',
            borderRadius: 20,
            padding: '11px 22px',
            fontSize: 13,
            fontWeight: 700,
            textTransform: 'uppercase',
            letterSpacing: '0.04em',
            border: 'none',
            cursor: submitting ? 'default' : 'pointer',
            ...sans,
            opacity: submitting ? 0.6 : 1,
            display: 'flex',
            alignItems: 'center',
            gap: 7,
          }}
        >
          {submitting ? 'Saving...' : isEditing ? 'Update Rating' : 'Save Rating'}
          {!submitting && <CheckCircle2 size={15} />}
        </button>
      </div>
    </div>
  )
}
