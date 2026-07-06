import { useState, useEffect, useMemo } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabaseClient'
import { useAsync } from '../hooks/useAsync'
import { useCurrentUser } from '../hooks/useCurrentUser'
import { fetchProfileByUsername, fetchProfileStats, fetchReviewsForUser, fetchListsForUser, updateProfile, deleteAccount, exportUserData } from '../lib/api/profiles'
import { compressImage, uploadImage } from '../lib/storage'
import { Avatar, ScorePill, Card } from '../components/ui'
import { timeAgo } from '../utils/timeAgo'

const serif = { fontFamily: 'Georgia, "Times New Roman", serif' }
const sans = { fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif' }

const inputStyle = {
  background: '#1a1a1a',
  border: '0.5px solid #252525',
  borderRadius: 8,
  padding: '10px 12px',
  fontSize: 13,
  color: '#ccc',
  outline: 'none',
  width: '100%',
  ...sans,
}

export default function Profile() {
  const { username } = useParams()
  const navigate = useNavigate()
  const currentUser = useCurrentUser()
  const [tab, setTab] = useState('reviews')
  const [editing, setEditing] = useState(false)
  const [editUsername, setEditUsername] = useState('')
  const [editDisplayName, setEditDisplayName] = useState('')
  const [editLocation, setEditLocation] = useState('')
  const [editGoal, setEditGoal] = useState('')
  const [savingProfile, setSavingProfile] = useState(false)
  const [profileError, setProfileError] = useState('')
  const [uploadingAvatar, setUploadingAvatar] = useState(false)
  const [worldCities, setWorldCities] = useState(null)
  const [deletingAccount, setDeletingAccount] = useState(false)
  const [exportingData, setExportingData] = useState(false)

  // ~33k entries, population >= 15,000 (GeoNames, CC-BY 4.0) -- lazy-loaded
  // only once the edit form is actually open, as its own chunk, so it never
  // costs anything on a page that isn't editing a profile.
  useEffect(() => {
    if (!editing || worldCities) return
    import('../data/worldCities.json').then((mod) => setWorldCities(mod.default))
  }, [editing, worldCities])

  const locationSuggestions = useMemo(() => {
    if (!worldCities || !editLocation.trim()) return []
    const query = editLocation.trim().toLowerCase()
    const matches = []
    for (const city of worldCities) {
      if (city.toLowerCase().includes(query)) {
        matches.push(city)
        if (matches.length >= 50) break
      }
    }
    return matches
  }, [worldCities, editLocation])

  const { data, loading, error, refetch } = useAsync(async () => {
    const { data: profile, error: pErr } = await fetchProfileByUsername(username)
    if (pErr) return { data: null, error: pErr }
    if (!profile) return { data: null, error: null }
    const [{ data: stats }, { data: reviews }, { data: lists }] = await Promise.all([fetchProfileStats(profile.id), fetchReviewsForUser(profile.id), fetchListsForUser(profile.id)])
    return { data: { profile, stats, reviews: reviews || [], lists: lists || [] }, error: null }
  }, [username])

  const isOwn = !!(currentUser && data?.profile && currentUser.id === data.profile.id)

  useEffect(() => {
    if (!data?.profile) return
    setEditUsername(data.profile.username)
    setEditDisplayName(data.profile.display_name || '')
    setEditLocation(data.profile.location || '')
    setEditGoal(data.profile.goal || '')
  }, [data?.profile])

  const handleSignOut = async () => {
    await supabase.auth.signOut()
    navigate('/auth')
  }

  const handleDeleteAccount = async () => {
    if (!window.confirm("Delete your account? Your username, display name, avatar, and profile info will be permanently removed and you'll be signed out for good. This cannot be undone.")) return
    setDeletingAccount(true)
    const { error: deleteError } = await deleteAccount()
    if (deleteError) {
      setDeletingAccount(false)
      window.alert("Couldn't delete your account. Try again in a moment.")
      return
    }
    await supabase.auth.signOut()
    navigate('/auth')
  }

  const handleExportData = async () => {
    setExportingData(true)
    const { data: exportData, error: exportError } = await exportUserData(currentUser.id)
    setExportingData(false)
    if (exportError) {
      window.alert("Couldn't export your data. Try again in a moment.")
      return
    }
    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `stackd-data-export-${new Date().toISOString().slice(0, 10)}.json`
    document.body.appendChild(a)
    a.click()
    a.remove()
    URL.revokeObjectURL(url)
  }

  const handleAvatarChange = async (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    setUploadingAvatar(true)
    const blob = await compressImage(file)
    const path = `${currentUser.id}/avatar.webp`
    const { url, error: uploadError } = await uploadImage(blob, 'avatars', path, { upsert: true })
    if (!uploadError) {
      await updateProfile(currentUser.id, { avatar_url: `${url}?t=${Date.now()}` })
      refetch()
    }
    setUploadingAvatar(false)
  }

  const handleSaveProfile = async () => {
    setProfileError('')
    if (!editUsername.trim()) {
      setProfileError('Username is required.')
      return
    }
    setSavingProfile(true)
    const { error: updateError } = await updateProfile(currentUser.id, {
      username: editUsername.trim(),
      display_name: editDisplayName.trim() || null,
      location: editLocation.trim() || null,
      goal: editGoal.trim() || null,
    })
    setSavingProfile(false)
    if (updateError) {
      setProfileError(updateError.message.includes('duplicate') ? 'That username is already taken.' : updateError.message)
      return
    }
    setEditing(false)
    if (editUsername.trim() !== username) navigate(`/profile/${editUsername.trim()}`, { replace: true })
    else refetch()
  }

  if (loading) {
    return <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#3a3a3a', fontSize: 14, ...sans }}>Loading...</div>
  }

  if (error) {
    return (
      <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#ff6b6b', fontSize: 14, ...sans }}>Couldn't load this profile. Try again in a moment.</div>
    )
  }

  if (!data) {
    return <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#3a3a3a', fontSize: 14, ...sans }}>Profile not found.</div>
  }

  const { profile, stats, reviews, lists } = data

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      {/* Nav */}
      <div style={{ padding: '12px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '0.5px solid #1e1e1e', flexShrink: 0 }}>
        <div style={{ width: 60 }}>
          {isOwn && (
            <button onClick={() => setEditing((e) => !e)} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 12, color: '#5ecfcf', ...sans, padding: 0 }}>
              {editing ? 'Cancel' : 'Edit'}
            </button>
          )}
        </div>
        <span style={{ ...serif, fontSize: 15, color: '#e8e4dc' }}>Profile</span>
        <div style={{ width: 60, textAlign: 'right' }}>
          {isOwn && (
            <button onClick={handleSignOut} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 12, color: '#555', ...sans, padding: 0 }}>
              Sign out
            </button>
          )}
        </div>
      </div>

      <div style={{ flex: 1, overflowY: 'auto' }}>
        {/* Hero */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6, padding: '20px 16px 16px' }}>
          <Avatar user={profile} size="lg" />

          {editing ? (
            <div style={{ width: '100%', maxWidth: 300, display: 'flex', flexDirection: 'column', gap: 10, marginTop: 10 }}>
              <label style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                <input type="file" accept="image/*" onChange={handleAvatarChange} disabled={uploadingAvatar} style={{ fontSize: 11, color: '#888', ...sans }} />
              </label>
              <input value={editUsername} onChange={(e) => setEditUsername(e.target.value)} placeholder="Username" style={inputStyle} />
              <input value={editDisplayName} onChange={(e) => setEditDisplayName(e.target.value)} placeholder="Display name (optional)" style={inputStyle} />
              <input value={editLocation} onChange={(e) => setEditLocation(e.target.value)} placeholder="Location (optional)" list="location-options" style={inputStyle} />
              <datalist id="location-options">
                {locationSuggestions.map((loc) => (
                  <option key={loc} value={loc} />
                ))}
              </datalist>
              <input value={editGoal} onChange={(e) => setEditGoal(e.target.value)} placeholder="Goal, e.g. Health-conscious (optional)" style={inputStyle} />
              {profileError && <div style={{ fontSize: 12, color: '#ff6b6b', ...sans }}>{profileError}</div>}
              <button
                onClick={handleSaveProfile}
                disabled={savingProfile}
                style={{
                  background: '#f0ece4',
                  color: '#111',
                  borderRadius: 20,
                  padding: '10px 0',
                  fontSize: 13,
                  fontWeight: 500,
                  border: 'none',
                  cursor: savingProfile ? 'default' : 'pointer',
                  opacity: savingProfile ? 0.6 : 1,
                  ...serif,
                }}
              >
                {savingProfile ? 'Saving...' : 'Save changes'}
              </button>
            </div>
          ) : (
            <>
              <div style={{ ...serif, fontSize: 20, color: '#f0ece4', letterSpacing: '-0.01em', marginTop: 4 }}>{profile.display_name || profile.username}</div>
              {profile.display_name && <div style={{ fontSize: 12, color: '#4a4a4a', ...sans }}>@{profile.username}</div>}
              {(profile.goal || profile.location) && (
                <div style={{ fontSize: 12, color: '#4a4a4a', ...sans }}>
                  {profile.goal}
                  {profile.goal && profile.location ? ' · ' : ''}
                  {profile.location}
                </div>
              )}
            </>
          )}
        </div>

        {/* Stats */}
        <div style={{ display: 'flex', margin: '0 14px', background: '#181818', border: '0.5px solid #222', borderRadius: 12, overflow: 'hidden' }}>
          {[
            { val: stats.reviewCount, label: 'Reviews' },
            { val: stats.avgRating != null ? stats.avgRating.toFixed(1) : '—', label: 'Avg', color: '#5ecfcf' },
            { val: stats.listCount, label: 'Lists' },
          ].map((s, i) => (
            <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '12px 4px', borderLeft: i > 0 ? '0.5px solid #1e1e1e' : 'none' }}>
              <span style={{ ...serif, fontSize: 20, color: s.color || '#e8e4dc', letterSpacing: '-0.02em' }}>{s.val}</span>
              <span style={{ fontSize: 9, color: '#444', ...sans, marginTop: 2 }}>{s.label}</span>
            </div>
          ))}
        </div>

        {/* Tabs */}
        <div style={{ display: 'flex', borderBottom: '0.5px solid #1e1e1e', margin: '16px 0 0' }}>
          {[
            ['reviews', 'Reviews'],
            ['lists', 'Lists'],
          ].map(([key, label]) => (
            <button
              key={key}
              onClick={() => setTab(key)}
              style={{
                flex: 1,
                background: 'none',
                border: 'none',
                borderBottom: tab === key ? '1.5px solid #e8e4dc' : 'none',
                cursor: 'pointer',
                padding: '11px 0',
                fontSize: 12,
                ...sans,
                color: tab === key ? '#e8e4dc' : '#444',
                fontWeight: tab === key ? 500 : 400,
              }}
            >
              {label}
            </button>
          ))}
        </div>

        <div style={{ padding: '14px', display: 'flex', flexDirection: 'column', gap: 8 }}>
          {tab === 'reviews' &&
            (reviews.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '32px 0', color: '#3a3a3a', fontSize: 14, ...sans }}>No reviews yet.</div>
            ) : (
              reviews.map((review) => {
                const variant = review.product_variants
                const product = variant?.products
                if (!product) return null
                return (
                  <Card key={review.id} style={{ cursor: 'pointer', gap: 8 }} onClick={() => navigate(isOwn ? `/product/${variant.id}/review` : `/product/${variant.id}`)}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      {variant.image_url ? (
                        <img src={variant.image_url} alt={variant.image_alt || product.name} style={{ width: 30, height: 30, borderRadius: 6, objectFit: 'cover', flexShrink: 0 }} />
                      ) : (
                        <div
                          style={{
                            width: 30,
                            height: 30,
                            borderRadius: 6,
                            background: '#1a1a1a',
                            border: '0.5px solid #222',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontSize: 13,
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
                        <div style={{ fontSize: 10, color: '#3a3a3a', ...sans }}>{timeAgo(review.created_at)}</div>
                      </div>
                      <ScorePill score={review.overall_rating} />
                    </div>
                    {review.notes && <div style={{ fontSize: 13, color: '#5a5a5a', ...sans, lineHeight: 1.6, fontStyle: 'italic' }}>"{review.notes}"</div>}
                  </Card>
                )
              })
            ))}

          {tab === 'lists' &&
            (lists.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '32px 0', color: '#3a3a3a', fontSize: 14, ...sans }}>{isOwn ? "You haven't made any lists yet." : 'No public lists yet.'}</div>
            ) : (
              lists.map((list) => (
                <div
                  key={list.id}
                  onClick={() => navigate(`/lists/${list.id}`)}
                  style={{ background: '#181818', border: '0.5px solid #222', borderRadius: 10, padding: '14px', display: 'flex', alignItems: 'center', gap: 12, cursor: 'pointer' }}
                >
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ ...serif, fontSize: 14, color: '#e8e4dc', letterSpacing: '-0.01em' }}>{list.name}</div>
                    <div style={{ fontSize: 11, color: '#3a3a3a', ...sans, marginTop: 3 }}>
                      {list.list_items?.[0]?.count || 0} product{(list.list_items?.[0]?.count || 0) !== 1 ? 's' : ''} · {list.is_public ? 'Public' : 'Private'}
                    </div>
                  </div>
                  <span style={{ color: '#2e2e2e', fontSize: 18 }}>›</span>
                </div>
              ))
            ))}

          {isOwn && (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10, padding: '20px 0 4px' }}>
              <button
                onClick={handleExportData}
                disabled={exportingData}
                style={{ background: 'none', border: 'none', cursor: exportingData ? 'default' : 'pointer', fontSize: 12, color: '#5ecfcf', ...sans, padding: 0, opacity: exportingData ? 0.5 : 1 }}
              >
                {exportingData ? 'Preparing export...' : 'Export my data'}
              </button>
              <button
                onClick={handleDeleteAccount}
                disabled={deletingAccount}
                style={{ background: 'none', border: 'none', cursor: deletingAccount ? 'default' : 'pointer', fontSize: 12, color: '#ff6b6b', ...sans, padding: 0, opacity: deletingAccount ? 0.5 : 1 }}
              >
                {deletingAccount ? 'Deleting account...' : 'Delete my account'}
              </button>
            </div>
          )}

          {isOwn && (
            <div style={{ textAlign: 'center', fontSize: 10, color: '#3a3a3a', ...sans, padding: '4px 0 4px' }}>
              <span onClick={() => navigate('/terms')} style={{ cursor: 'pointer', textDecoration: 'underline' }}>
                Terms
              </span>
              {' · '}
              <span onClick={() => navigate('/privacy')} style={{ cursor: 'pointer', textDecoration: 'underline' }}>
                Privacy
              </span>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
