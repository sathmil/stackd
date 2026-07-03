import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAsync } from '../hooks/useAsync'
import { useCurrentUser } from '../hooks/useCurrentUser'
import { fetchOwnLists, createList } from '../lib/api/lists'
import { trackEvent } from '../lib/analytics'

const serif = { fontFamily: 'Georgia, "Times New Roman", serif' }
const sans = { fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif' }

export default function Lists() {
  const navigate = useNavigate()
  const user = useCurrentUser()
  const [creating, setCreating] = useState(false)
  const [name, setName] = useState('')
  const [isPublic, setIsPublic] = useState(true)
  const [submitting, setSubmitting] = useState(false)

  const {
    data: lists,
    loading,
    error,
    refetch,
  } = useAsync(async () => {
    if (!user) return { data: null, error: null }
    return fetchOwnLists(user.id)
  }, [user])

  const handleCreate = async () => {
    if (!name.trim()) return
    setSubmitting(true)
    const { data: list, error } = await createList({ userId: user.id, name: name.trim(), isPublic })
    setSubmitting(false)
    if (!error) {
      trackEvent('list_create', { list_id: list.id, is_public: isPublic })
      setName('')
      setCreating(false)
      refetch()
    }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <div style={{ padding: '12px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '0.5px solid #1e1e1e', flexShrink: 0 }}>
        <span style={{ ...serif, fontSize: 15, color: '#e8e4dc' }}>My lists</span>
        <button onClick={() => setCreating((c) => !c)} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 13, color: '#5ecfcf', ...sans, fontWeight: 500, padding: 0 }}>
          {creating ? 'Cancel' : '+ New list'}
        </button>
      </div>

      <div style={{ flex: 1, overflowY: 'auto', padding: '16px', display: 'flex', flexDirection: 'column', gap: 10 }}>
        {creating && (
          <div style={{ background: '#181818', border: '0.5px solid #222', borderRadius: 12, padding: 14, display: 'flex', flexDirection: 'column', gap: 10 }}>
            <input
              autoFocus
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="List name, e.g. My pre-workout stack"
              style={{ background: '#1a1a1a', border: '0.5px solid #252525', borderRadius: 8, padding: '10px 12px', fontSize: 13, color: '#ccc', outline: 'none', ...sans }}
            />
            <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
              <input type="checkbox" checked={isPublic} onChange={(e) => setIsPublic(e.target.checked)} />
              <span style={{ fontSize: 12, color: '#888', ...sans }}>Public (anyone with the link can view it)</span>
            </label>
            <button
              onClick={handleCreate}
              disabled={submitting || !name.trim()}
              style={{
                background: '#f0ece4',
                color: '#111',
                borderRadius: 20,
                padding: '10px 0',
                fontSize: 13,
                fontWeight: 500,
                border: 'none',
                cursor: submitting ? 'default' : 'pointer',
                opacity: submitting || !name.trim() ? 0.5 : 1,
                ...serif,
              }}
            >
              {submitting ? 'Creating...' : 'Create list'}
            </button>
          </div>
        )}

        {loading && <div style={{ textAlign: 'center', padding: '48px 0', color: '#3a3a3a', fontSize: 14, ...sans }}>Loading...</div>}

        {error && <div style={{ textAlign: 'center', padding: '48px 0', color: '#ff6b6b', fontSize: 14, ...sans }}>Couldn't load your lists. Try again in a moment.</div>}

        {!loading && !error && lists?.length === 0 && !creating && (
          <div style={{ textAlign: 'center', padding: '48px 0', color: '#3a3a3a', fontSize: 14, ...sans }}>You haven't made any lists yet.</div>
        )}

        {!loading &&
          !error &&
          lists?.map((list) => (
            <div
              key={list.id}
              onClick={() => navigate(`/lists/${list.id}`)}
              style={{ background: '#181818', border: '0.5px solid #222', borderRadius: 12, padding: '14px', display: 'flex', alignItems: 'center', gap: 12, cursor: 'pointer' }}
            >
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ ...serif, fontSize: 14, color: '#e8e4dc', letterSpacing: '-0.01em' }}>{list.name}</div>
                <div style={{ fontSize: 11, color: '#3a3a3a', ...sans, marginTop: 3 }}>
                  {list.list_items?.[0]?.count || 0} product{(list.list_items?.[0]?.count || 0) !== 1 ? 's' : ''} · {list.is_public ? 'Public' : 'Private'}
                </div>
              </div>
              <span style={{ color: '#2e2e2e', fontSize: 18 }}>›</span>
            </div>
          ))}
      </div>
    </div>
  )
}
