import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { Divider } from '../components/ui'
import { useAsync } from '../hooks/useAsync'
import { useCurrentUser } from '../hooks/useCurrentUser'
import { fetchVariantById } from '../lib/api/products'
import { fetchActiveTags, fetchOwnReview, upsertReview, syncReviewTags } from '../lib/api/reviews'
import { trackEvent } from '../lib/analytics'

const serif = { fontFamily: 'Georgia, "Times New Roman", serif' }
const sans = { fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif' }

const RATING_COLOR = '#5ecfcf'

function Slider({ label, value, onChange }) {
  const pct = ((value - 1) / 9) * 100
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span style={{ fontSize: 13, color: '#5a5a5a', ...sans }}>{label}</span>
        <span style={{ ...serif, fontSize: 14, color: RATING_COLOR }}>{value.toFixed(1)}</span>
      </div>
      <div style={{ position: 'relative', height: 22, display: 'flex', alignItems: 'center' }}>
        <div style={{ position: 'absolute', left: 0, right: 0, height: 3, background: '#1e1e1e', borderRadius: 2 }}>
          <div style={{ height: '100%', width: `${pct}%`, background: RATING_COLOR, borderRadius: 2 }} />
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
            width: 15,
            height: 15,
            borderRadius: '50%',
            background: '#111',
            border: `2px solid ${RATING_COLOR}`,
            pointerEvents: 'none',
          }}
        />
      </div>
    </div>
  )
}

export default function ReviewForm() {
  const { variantId } = useParams()
  const navigate = useNavigate()
  const user = useCurrentUser()
  // navigate(-1), not navigate(`/product/${variantId}`) -- this route is only
  // ever reached by pushing from the product page, so going back should pop
  // that entry rather than push a new one. Pushing here made the history
  // stack grow every round trip (product -> review -> product -> review...),
  // so the back button would land back on this review form instead of
  // actually leaving.
  const goBack = () => navigate(-1)

  const { data, loading, error } = useAsync(async () => {
    if (!user) return { data: null, error: null }
    const [{ data: variant, error: vErr }, { data: tags }, { data: ownReview }] = await Promise.all([fetchVariantById(variantId), fetchActiveTags(), fetchOwnReview(variantId, user.id)])
    if (vErr) return { data: null, error: vErr }
    return { data: { variant, tags: tags || [], ownReview }, error: null }
  }, [variantId, user])

  const [overallRating, setOverallRating] = useState(6.0)
  const [wouldBuyAgain, setWouldBuyAgain] = useState(null)
  const [notes, setNotes] = useState('')
  const [selectedTagIds, setSelectedTagIds] = useState([])
  const [submitting, setSubmitting] = useState(false)
  const [done, setDone] = useState(false)

  useEffect(() => {
    if (!data?.ownReview) return
    const r = data.ownReview
    setOverallRating(Number(r.overall_rating))
    setWouldBuyAgain(r.would_buy_again)
    setNotes(r.notes || '')
    setSelectedTagIds(r.review_tags.map((rt) => rt.tag_id))
  }, [data?.ownReview])

  const toggleTag = (tagId) => setSelectedTagIds((t) => (t.includes(tagId) ? t.filter((x) => x !== tagId) : [...t, tagId]))

  const handleSubmit = async () => {
    setSubmitting(true)
    const { data: review, error } = await upsertReview({
      variantId,
      userId: user.id,
      overallRating,
      wouldBuyAgain,
      notes,
    })
    if (!error) await syncReviewTags(review.id, selectedTagIds)
    setSubmitting(false)
    if (!error) {
      trackEvent('review_submit', { variant_id: variantId, is_edit: isEditing })
      setDone(true)
    }
  }

  if (loading || user === undefined) {
    return <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#3a3a3a', fontSize: 14, ...sans }}>Loading...</div>
  }

  if (error || !data?.variant) {
    return (
      <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#ff6b6b', fontSize: 14, ...sans }}>Couldn't load this product. Try again in a moment.</div>
    )
  }

  const { variant, tags } = data
  const product = variant.products
  const isEditing = !!data.ownReview
  const positiveTags = tags.filter((t) => t.sentiment === 'positive')
  const negativeTags = tags.filter((t) => t.sentiment === 'negative')

  if (done) {
    return (
      <div style={{ height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 12, background: '#111' }}>
        <div style={{ ...serif, fontSize: 20, color: '#e8e4dc' }}>{isEditing ? 'Review updated!' : 'Review posted!'}</div>
        <div style={{ fontSize: 13, color: '#555', ...sans }}>Thanks for rating {product.name}</div>
        <button onClick={goBack} style={{ marginTop: 16, background: '#f0ece4', color: '#111', border: 'none', borderRadius: 20, padding: '11px 28px', fontSize: 14, cursor: 'pointer', ...serif }}>
          Back to product
        </button>
      </div>
    )
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      {/* Nav */}
      <div style={{ padding: '12px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '0.5px solid #1e1e1e', flexShrink: 0 }}>
        <button onClick={goBack} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 13, color: '#555', ...sans, padding: 0 }}>
          Cancel
        </button>
        <span style={{ ...serif, fontSize: 15, color: '#e8e4dc' }}>{isEditing ? 'Edit rating' : 'Rate it'}</span>
        <button
          onClick={handleSubmit}
          disabled={submitting}
          style={{
            background: 'none',
            border: 'none',
            cursor: submitting ? 'default' : 'pointer',
            fontSize: 13,
            color: '#5ecfcf',
            ...sans,
            fontWeight: 500,
            padding: 0,
            opacity: submitting ? 0.5 : 1,
          }}
        >
          {isEditing ? 'Save' : 'Post'}
        </button>
      </div>

      <div style={{ flex: 1, overflowY: 'auto', padding: '16px', display: 'flex', flexDirection: 'column', gap: 16 }}>
        {/* Product */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
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
              fontSize: 15,
              color: '#4a4a4a',
              flexShrink: 0,
              ...serif,
            }}
          >
            {product.name.charAt(0)}
          </div>
          <div>
            <div style={{ ...serif, fontSize: 15, color: '#e8e4dc', letterSpacing: '-0.01em' }}>
              {product.name}
              {variant.flavor ? ` — ${variant.flavor}` : ''}
            </div>
            <div style={{ fontSize: 11, color: '#4a4a4a', ...sans, marginTop: 2 }}>{product.brand_name}</div>
          </div>
        </div>

        <Divider />

        {/* Rating */}
        <Slider label="Overall rating" value={overallRating} onChange={setOverallRating} />

        <Divider />

        {/* Would buy again */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <span style={{ fontSize: 13, color: '#5a5a5a', ...sans }}>Would you buy this again?</span>
          <div style={{ display: 'flex', gap: 8 }}>
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
                    flex: 1,
                    borderRadius: 20,
                    padding: '9px 0',
                    fontSize: 13,
                    cursor: 'pointer',
                    ...sans,
                    background: on ? '#0d2020' : 'transparent',
                    border: on ? '0.5px solid #1a3030' : '0.5px solid #222',
                    color: on ? '#5ecfcf' : '#555',
                  }}
                >
                  {label}
                </button>
              )
            })}
          </div>
        </div>

        {/* Note */}
        <textarea
          placeholder="What stood out? Taste, effects, value — would you buy it again?"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          rows={3}
          style={{ background: '#181818', border: '0.5px solid #222', borderRadius: 10, padding: '11px 13px', fontSize: 13, color: '#888', lineHeight: 1.6, outline: 'none', ...sans }}
        />
        <div style={{ fontSize: 10, color: '#3a3a3a', ...sans, marginTop: -10 }}>Share your experience — avoid medical claims.</div>

        {/* Tags */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <div style={{ display: 'flex', gap: 7, flexWrap: 'wrap' }}>
            {positiveTags.map((tag) => {
              const on = selectedTagIds.includes(tag.id)
              return (
                <button
                  key={tag.id}
                  onClick={() => toggleTag(tag.id)}
                  style={{
                    borderRadius: 20,
                    padding: '5px 12px',
                    fontSize: 12,
                    cursor: 'pointer',
                    ...sans,
                    background: on ? '#0d2020' : 'transparent',
                    border: on ? '0.5px solid #1a3030' : '0.5px solid #222',
                    color: on ? '#5ecfcf' : '#555',
                  }}
                >
                  {tag.label}
                </button>
              )
            })}
          </div>
          <div style={{ display: 'flex', gap: 7, flexWrap: 'wrap' }}>
            {negativeTags.map((tag) => {
              const on = selectedTagIds.includes(tag.id)
              return (
                <button
                  key={tag.id}
                  onClick={() => toggleTag(tag.id)}
                  style={{
                    borderRadius: 20,
                    padding: '5px 12px',
                    fontSize: 12,
                    cursor: 'pointer',
                    ...sans,
                    background: on ? '#1e0c0c' : 'transparent',
                    border: on ? '0.5px solid #3a1515' : '0.5px solid #222',
                    color: on ? '#ff6b6b' : '#555',
                  }}
                >
                  {tag.label}
                </button>
              )
            })}
          </div>
        </div>

        {/* Submit */}
        <button
          onClick={handleSubmit}
          disabled={submitting}
          style={{
            background: '#f0ece4',
            color: '#111',
            borderRadius: 20,
            padding: '14px 0',
            fontSize: 15,
            fontWeight: 500,
            border: 'none',
            cursor: submitting ? 'default' : 'pointer',
            ...serif,
            opacity: submitting ? 0.6 : 1,
          }}
        >
          {submitting ? 'Please wait...' : isEditing ? 'Update review' : 'Post review'}
        </button>
      </div>
    </div>
  )
}
