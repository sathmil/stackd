import { useState, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { Plus, X, Trophy, Layers, ChevronRight, Globe, Lock, CheckCircle2, ImagePlus } from 'lucide-react'
import { useAsync } from '../hooks/useAsync'
import { useCurrentUser } from '../hooks/useCurrentUser'
import { useOwnUsername } from '../hooks/useOwnUsername'
import { fetchOwnLists, createList } from '../lib/api/lists'
import { uploadImage } from '../lib/storage'
import { trackEvent } from '../lib/analytics'
import { Skeleton, ErrorState } from '../components/ui'
import { useToast } from '../components/Toast'
import ImageCropModal from '../components/ImageCropModal'

const serif = { fontFamily: 'var(--font-serif)' }
const sans = { fontFamily: 'var(--font-sans)', fontWeight: 500 }

export default function Lists() {
  const navigate = useNavigate()
  const user = useCurrentUser()
  const showToast = useToast()
  const ownUsername = useOwnUsername(!!user)
  const [creating, setCreating] = useState(false)
  const [name, setName] = useState('')
  const [isPublic, setIsPublic] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [coverFile, setCoverFile] = useState(null)
  const [coverPreview, setCoverPreview] = useState(null)
  const [pendingCoverFile, setPendingCoverFile] = useState(null)
  const coverInputRef = useRef(null)

  const {
    data: lists,
    loading,
    error,
    refetch,
  } = useAsync(async () => {
    if (!user) return { data: null, error: null }
    return fetchOwnLists(user.id)
  }, [user])

  const handleCoverChange = (e) => {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (file) setPendingCoverFile(file)
  }

  const handleCoverCropped = (blob) => {
    setPendingCoverFile(null)
    setCoverFile(blob)
    setCoverPreview(URL.createObjectURL(blob))
  }

  const handleRemoveCover = () => {
    setCoverFile(null)
    setCoverPreview(null)
  }

  const handleCreate = async () => {
    if (!name.trim()) return
    setSubmitting(true)

    let coverImageUrl = null
    if (coverFile) {
      // coverFile is already a cropped, correctly-sized WebP blob straight out
      // of ImageCropModal -- no separate compressImage pass needed (that's
      // for raw camera-roll files, and running it again here was not just
      // redundant but a silent failure point with no error surfaced).
      const path = `${user.id}/list-${Date.now()}.webp`
      const { url, error: uploadError } = await uploadImage(coverFile, 'product-images', path)
      if (uploadError) {
        setSubmitting(false)
        showToast("Couldn't upload the cover photo. Try again.", 'error')
        return
      }
      coverImageUrl = url
    }

    const { data: list, error } = await createList({ userId: user.id, name: name.trim(), isPublic, coverImageUrl })
    setSubmitting(false)
    if (error) {
      showToast("Couldn't create the list. Try again.", 'error')
      return
    }
    trackEvent('list_create', { list_id: list.id, is_public: isPublic })
    setName('')
    setCreating(false)
    handleRemoveCover()
    refetch()
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <div style={{ padding: '12px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '0.5px solid var(--border-subtle)', flexShrink: 0 }}>
        <span style={{ ...serif, fontWeight: 700, fontSize: 17, color: 'var(--text-heading)', letterSpacing: '-0.01em' }}>My Lists</span>
        <button
          onClick={() => setCreating((c) => !c)}
          className="stackd-press"
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 5,
            background: creating ? 'var(--bg-subtle)' : 'var(--tier-teal-bg)',
            border: `0.5px solid ${creating ? 'var(--border)' : 'var(--tier-teal-border)'}`,
            borderRadius: 20,
            padding: '7px 13px',
            cursor: 'pointer',
            fontSize: 12,
            fontWeight: 700,
            color: creating ? 'var(--text-input)' : 'var(--tier-teal)',
            ...sans,
          }}
        >
          {creating ? <X size={14} /> : <Plus size={14} strokeWidth={2.5} />}
          {creating ? 'Cancel' : 'New List'}
        </button>
      </div>

      <div style={{ flex: 1, overflowY: 'auto', padding: '16px', display: 'flex', flexDirection: 'column', gap: 14 }}>
        {creating && (
          <div
            className="stackd-elevated"
            style={{ background: 'var(--bg-card)', border: '0.5px solid var(--border)', borderRadius: 18, padding: 16, display: 'flex', flexDirection: 'column', gap: 12 }}
          >
            <input
              autoFocus
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="List name, e.g. My pre-workout stack"
              style={{
                background: 'var(--bg-subtle)',
                border: '0.5px solid var(--border-input)',
                borderRadius: 10,
                padding: '11px 13px',
                fontSize: 14,
                color: 'var(--text-input)',
                outline: 'none',
                ...sans,
              }}
            />
            <div style={{ display: 'flex', gap: 8 }}>
              {[
                [true, Globe, 'Public'],
                [false, Lock, 'Private'],
              ].map(([val, Icon, label]) => {
                const on = isPublic === val
                return (
                  <button
                    key={label}
                    onClick={() => setIsPublic(val)}
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
                      cursor: 'pointer',
                      ...sans,
                      background: on ? 'var(--tier-teal-bg)' : 'var(--bg-subtle)',
                      border: `0.5px solid ${on ? 'var(--tier-teal-border)' : 'var(--border)'}`,
                      color: on ? 'var(--tier-teal)' : 'var(--text-quiet)',
                    }}
                  >
                    <Icon size={14} /> {label}
                  </button>
                )
              })}
            </div>
            <span style={{ fontSize: 12, color: 'var(--text-quiet)', ...sans }}>{isPublic ? 'Anyone with the link can view it.' : 'Only visible to you.'}</span>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <label style={{ fontSize: 12, color: 'var(--text-muted)', ...sans }}>Cover photo (optional)</label>
              <input ref={coverInputRef} type="file" accept="image/*" onChange={handleCoverChange} style={{ display: 'none' }} />
              {coverPreview ? (
                <div style={{ position: 'relative', height: 100, borderRadius: 12, overflow: 'hidden' }}>
                  <img src={coverPreview} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  <button
                    onClick={handleRemoveCover}
                    className="stackd-press"
                    style={{
                      position: 'absolute',
                      top: 8,
                      right: 8,
                      width: 26,
                      height: 26,
                      borderRadius: '50%',
                      background: 'rgba(0,0,0,0.55)',
                      border: '0.5px solid rgba(255,255,255,0.3)',
                      color: '#fff',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      cursor: 'pointer',
                    }}
                  >
                    <X size={13} strokeWidth={2.25} />
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => coverInputRef.current?.click()}
                  className="stackd-press"
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 6,
                    background: 'var(--bg-nav)',
                    border: '1.5px dashed var(--border-strong)',
                    borderRadius: 12,
                    padding: '16px 14px',
                    fontSize: 12,
                    fontWeight: 600,
                    color: 'var(--text-quiet)',
                    cursor: 'pointer',
                    ...sans,
                  }}
                >
                  <ImagePlus size={20} strokeWidth={1.75} />
                  Add a cover photo
                </button>
              )}
              <span style={{ fontSize: 11, color: 'var(--text-faint)', ...sans, lineHeight: 1.4 }}>No photo? The Feed shows your first product's photo instead.</span>
            </div>

            <button
              onClick={handleCreate}
              disabled={submitting || !name.trim()}
              className="stackd-press"
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 7,
                background: 'var(--text-heading)',
                color: 'var(--bg-nav)',
                borderRadius: 20,
                padding: '12px 0',
                fontSize: 13,
                fontWeight: 700,
                textTransform: 'uppercase',
                letterSpacing: '0.04em',
                border: 'none',
                cursor: submitting ? 'default' : 'pointer',
                opacity: submitting || !name.trim() ? 0.5 : 1,
                ...sans,
              }}
            >
              {submitting ? 'Creating...' : 'Create List'}
              {!submitting && <CheckCircle2 size={15} />}
            </button>
          </div>
        )}

        {ownUsername && (
          <button
            onClick={() => navigate(`/rated/${ownUsername}`)}
            className="stackd-elevated stackd-press"
            style={{
              background: 'var(--bg-card)',
              border: '0.5px solid var(--tier-teal-border)',
              borderRadius: 18,
              padding: '16px',
              display: 'flex',
              alignItems: 'center',
              gap: 14,
              cursor: 'pointer',
              width: '100%',
              textAlign: 'left',
            }}
          >
            <div
              style={{
                width: 44,
                height: 44,
                borderRadius: '50%',
                background: 'var(--tier-teal-bg)',
                border: '0.5px solid var(--tier-teal-border)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
              }}
            >
              <Trophy size={20} color="var(--tier-teal)" strokeWidth={2} />
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ ...serif, fontWeight: 600, fontSize: 16, color: 'var(--tier-teal)', letterSpacing: '-0.01em' }}>My rated products</div>
              <div style={{ fontSize: 12, color: 'var(--text-quiet)', ...sans, marginTop: 3 }}>Everything you've rated, ranked automatically</div>
            </div>
            <ChevronRight size={18} color="var(--text-quiet)" />
          </button>
        )}

        {loading && <Skeleton variant="rows" count={3} />}

        {error && <ErrorState message="Couldn't load your lists. Try again in a moment." onRetry={refetch} />}

        {!loading && !error && lists?.length === 0 && !creating && (
          <div style={{ textAlign: 'center', padding: '48px 0', color: 'var(--text-quiet)', fontSize: 15, ...sans }}>You haven't made any lists yet.</div>
        )}

        {!loading &&
          !error &&
          lists?.map((list) => (
            <button
              key={list.id}
              onClick={() => navigate(`/lists/${list.id}`)}
              className="stackd-elevated stackd-press"
              style={{
                background: 'var(--bg-card)',
                border: '0.5px solid var(--border)',
                borderRadius: 18,
                padding: '16px',
                display: 'flex',
                alignItems: 'center',
                gap: 14,
                cursor: 'pointer',
                width: '100%',
                textAlign: 'left',
              }}
            >
              <div
                style={{
                  width: 44,
                  height: 44,
                  borderRadius: '50%',
                  background: 'var(--bg-subtle)',
                  border: '0.5px solid var(--border)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                }}
              >
                <Layers size={19} color="var(--text-tertiary)" strokeWidth={2} />
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ ...serif, fontWeight: 600, fontSize: 16, color: 'var(--text-primary)', letterSpacing: '-0.01em' }}>{list.name}</div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 12, color: 'var(--text-quiet)', ...sans, marginTop: 3 }}>
                  {list.list_items?.[0]?.count || 0} product{(list.list_items?.[0]?.count || 0) !== 1 ? 's' : ''}
                  <span style={{ color: 'var(--text-faint)' }}>·</span>
                  {list.is_public ? <Globe size={11} /> : <Lock size={11} />}
                  {list.is_public ? 'Public' : 'Private'}
                </div>
              </div>
              <ChevronRight size={18} color="var(--text-quiet)" />
            </button>
          ))}
      </div>

      {pendingCoverFile && <ImageCropModal file={pendingCoverFile} aspect={3 / 2} onCancel={() => setPendingCoverFile(null)} onCropped={handleCoverCropped} />}
    </div>
  )
}
