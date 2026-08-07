import { useState, useEffect, useMemo, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { Contrast, Download, Trash2, ChevronRight, MapPin, LogOut, Crown, Folder, CheckCircle2, Trophy, Star, X, Camera } from 'lucide-react'
import { supabase } from '../lib/supabaseClient'
import { useAsync } from '../hooks/useAsync'
import { useCurrentUser } from '../hooks/useCurrentUser'
import { fetchProfileByUsername, fetchProfileStats, fetchReviewsForUser, updateProfile, deleteAccount, exportUserData } from '../lib/api/profiles'
import { fetchFollowCounts, fetchFollowStatus, followUser, unfollowUser, fetchWishlist, removeFromWishlist } from '../lib/api/social'
import { uploadImage } from '../lib/storage'
import { Avatar, ScorePill, Card, Skeleton, ErrorState, ThemeToggle } from '../components/ui'
import { useToast } from '../components/Toast'
import { useConfirm } from '../components/ConfirmDialog'
import AvatarCropModal from '../components/AvatarCropModal'
import { timeAgo } from '../utils/timeAgo'
import { categoryColor } from '../utils/categoryColor'

const serif = { fontFamily: 'var(--font-serif)' }
const sans = { fontFamily: 'var(--font-sans)', fontWeight: 500 }

function formatCategory(raw) {
  return raw.replace(/_/g, ' ').replace(/^\w/, (c) => c.toUpperCase())
}

const STAR_COLOR = '#FFC93C'

/** One star, filled left-to-right by `pct` (0-100) -- lets a 4.5/5 rating render a half-filled 5th star instead of only whole-star rounding. */
function PartialStar({ pct, size = 13 }) {
  return (
    <span style={{ position: 'relative', width: size, height: size, display: 'inline-block', flexShrink: 0 }}>
      <Star size={size} stroke={STAR_COLOR} fill="none" style={{ position: 'absolute', top: 0, left: 0 }} />
      <span style={{ position: 'absolute', top: 0, left: 0, width: `${pct}%`, overflow: 'hidden', height: size }}>
        <Star size={size} stroke={STAR_COLOR} fill={STAR_COLOR} />
      </span>
    </span>
  )
}

/** 5-star row for a 1.0-10.0 rating (halved to a 5-point scale). */
function StarRow({ rating, size = 13 }) {
  const fiveScale = rating / 2
  return (
    <div style={{ display: 'flex', gap: 2 }}>
      {[0, 1, 2, 3, 4].map((i) => (
        <PartialStar key={i} size={size} pct={Math.max(0, Math.min(100, (fiveScale - i) * 100))} />
      ))}
    </div>
  )
}

const inputStyle = {
  background: 'var(--bg-subtle)',
  border: '0.5px solid var(--border-input)',
  borderRadius: 8,
  padding: '10px 12px',
  fontSize: 14,
  color: 'var(--text-input)',
  outline: 'none',
  width: '100%',
  ...sans,
}

export default function Profile() {
  const { username } = useParams()
  const navigate = useNavigate()
  const currentUser = useCurrentUser()
  const showToast = useToast()
  const confirm = useConfirm()
  const [editing, setEditing] = useState(false)
  const [editUsername, setEditUsername] = useState('')
  const [editDisplayName, setEditDisplayName] = useState('')
  const [editLocation, setEditLocation] = useState('')
  const [editGoal, setEditGoal] = useState('')
  const [savingProfile, setSavingProfile] = useState(false)
  const [profileError, setProfileError] = useState('')
  const [uploadingAvatar, setUploadingAvatar] = useState(false)
  const [pendingAvatarFile, setPendingAvatarFile] = useState(null)
  const avatarInputRef = useRef(null)
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
    const [{ data: stats }, { data: reviews }, { data: social }] = await Promise.all([fetchProfileStats(profile.id), fetchReviewsForUser(profile.id), fetchFollowCounts(profile.id)])
    return { data: { profile, stats, reviews: reviews || [], social }, error: null }
  }, [username])

  const isOwn = !!(currentUser && data?.profile && currentUser.id === data.profile.id)

  const [isFollowing, setIsFollowing] = useState(null) // null = unknown/loading
  const [followBusy, setFollowBusy] = useState(false)

  useEffect(() => {
    if (!currentUser || !data?.profile || isOwn) return
    fetchFollowStatus(currentUser.id, data.profile.id).then(({ data: row }) => setIsFollowing(!!row))
  }, [currentUser, data?.profile, isOwn])

  const [followCounts, setFollowCounts] = useState(null)
  useEffect(() => {
    if (data?.social) setFollowCounts(data.social)
  }, [data?.social])

  const [wishlist, setWishlist] = useState(null)
  useEffect(() => {
    if (!isOwn || !currentUser) return
    fetchWishlist(currentUser.id).then(({ data: rows }) => setWishlist(rows || []))
  }, [isOwn, currentUser])

  const handleRemoveWishlistItem = async (itemId) => {
    setWishlist((prev) => prev.filter((w) => w.id !== itemId))
    const { error: removeErr } = await removeFromWishlist(itemId)
    if (removeErr) {
      showToast("Couldn't update Want to Try. Try again.", 'error')
      fetchWishlist(currentUser.id).then(({ data: rows }) => setWishlist(rows || []))
    }
  }

  const handleToggleFollow = async () => {
    if (!currentUser) {
      navigate('/auth')
      return
    }
    setFollowBusy(true)
    if (isFollowing) {
      setIsFollowing(false)
      setFollowCounts((c) => (c ? { ...c, followerCount: Math.max(0, c.followerCount - 1) } : c))
      const { error: unfollowErr } = await unfollowUser(currentUser.id, data.profile.id)
      if (unfollowErr) {
        setIsFollowing(true)
        setFollowCounts((c) => (c ? { ...c, followerCount: c.followerCount + 1 } : c))
        showToast("Couldn't unfollow. Try again.", 'error')
      }
    } else {
      setIsFollowing(true)
      setFollowCounts((c) => (c ? { ...c, followerCount: c.followerCount + 1 } : c))
      const { error: followErr } = await followUser(currentUser.id, data.profile.id)
      if (followErr) {
        setIsFollowing(false)
        setFollowCounts((c) => (c ? { ...c, followerCount: Math.max(0, c.followerCount - 1) } : c))
        showToast("Couldn't follow. Try again.", 'error')
      }
    }
    setFollowBusy(false)
  }

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
    if (
      !(await confirm("Your username, display name, avatar, and profile info will be permanently removed and you'll be signed out for good. This cannot be undone.", {
        title: 'Delete your account?',
        confirmLabel: 'Delete Account',
      }))
    )
      return
    setDeletingAccount(true)
    const { error: deleteError } = await deleteAccount()
    if (deleteError) {
      setDeletingAccount(false)
      showToast("Couldn't delete your account. Try again in a moment.", 'error')
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
      showToast("Couldn't export your data. Try again in a moment.", 'error')
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
    showToast('Your data export is ready.')
  }

  const handleAvatarFileSelected = (e) => {
    const file = e.target.files?.[0]
    e.target.value = '' // allow re-selecting the same file later
    if (file) setPendingAvatarFile(file)
  }

  const handleAvatarCropped = async (blob) => {
    setPendingAvatarFile(null)
    setUploadingAvatar(true)
    const path = `${currentUser.id}/avatar.webp`
    const { url, error: uploadError } = await uploadImage(blob, 'avatars', path, { upsert: true })
    if (!uploadError) {
      await updateProfile(currentUser.id, { avatar_url: `${url}?t=${Date.now()}` })
      refetch()
      showToast('Avatar updated.')
    } else {
      showToast("Couldn't upload your avatar. Try again in a moment.", 'error')
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
    showToast('Profile updated.')
    if (editUsername.trim() !== username) navigate(`/profile/${editUsername.trim()}`, { replace: true })
    else refetch()
  }

  if (loading) {
    return <Skeleton variant="detail" />
  }

  if (error) {
    return <ErrorState message="Couldn't load this profile. Try again in a moment." onRetry={refetch} />
  }

  if (!data) {
    return <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-quiet)', fontSize: 15, ...sans }}>Profile not found.</div>
  }

  const { profile, stats, reviews } = data

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      {/* Nav */}
      <div style={{ padding: '12px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '0.5px solid var(--border-subtle)', flexShrink: 0 }}>
        <div style={{ width: 32 }} />
        <span style={{ ...serif, fontWeight: 700, fontSize: 17, color: 'var(--text-heading)', letterSpacing: '-0.01em' }}>Stackd</span>
        <div style={{ width: 32, display: 'flex', justifyContent: 'flex-end' }}>
          {isOwn && (
            <button
              onClick={handleSignOut}
              title="Sign out"
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
                color: 'var(--text-muted)',
                flexShrink: 0,
              }}
            >
              <LogOut size={15} strokeWidth={2.25} />
            </button>
          )}
        </div>
      </div>

      <div style={{ flex: 1, overflowY: 'auto' }}>
        {/* Hero */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6, padding: '20px 16px 16px' }}>
          <div className="stackd-avatar-ring">
            <Avatar user={profile} size="xl" />
          </div>

          <>
            {isOwn && (
              <button
                onClick={() => setEditing(true)}
                className="stackd-press"
                style={{
                  background: 'none',
                  border: '0.5px solid var(--border-strong)',
                  borderRadius: 20,
                  padding: '7px 18px',
                  fontSize: 13,
                  color: 'var(--text-input)',
                  cursor: 'pointer',
                  ...sans,
                  marginTop: 6,
                }}
              >
                Edit Profile
              </button>
            )}
            {!isOwn && currentUser && (
              <button
                onClick={handleToggleFollow}
                disabled={followBusy || isFollowing === null}
                className="stackd-press"
                style={{
                  background: isFollowing ? 'none' : 'var(--text-heading)',
                  border: isFollowing ? '0.5px solid var(--border-strong)' : 'none',
                  borderRadius: 20,
                  padding: '7px 20px',
                  fontSize: 13,
                  fontWeight: 500,
                  color: isFollowing ? 'var(--text-input)' : 'var(--bg)',
                  cursor: followBusy ? 'default' : 'pointer',
                  opacity: followBusy ? 0.6 : 1,
                  ...sans,
                  marginTop: 6,
                }}
              >
                {isFollowing ? 'Following' : 'Follow'}
              </button>
            )}
            <div style={{ ...serif, fontWeight: 700, fontSize: 26, color: 'var(--text-heading)', letterSpacing: '-0.01em', marginTop: 10, textAlign: 'center' }}>
              {profile.display_name || profile.username}
            </div>
            <div style={{ fontSize: 14, color: 'var(--text-tertiary)', ...serif, textAlign: 'center' }}>
              @{profile.username}
              {(profile.goal || profile.location) && ' · '}
              {profile.goal}
              {profile.goal && profile.location ? ' · ' : ''}
              {profile.location}
            </div>

            {followCounts && (
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: 36, marginTop: 16 }}>
                <button
                  onClick={() => navigate(`/profile/${profile.username}/followers`)}
                  className="stackd-press"
                  style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2, background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
                >
                  <span style={{ ...serif, fontWeight: 700, fontSize: 18, color: 'var(--text-heading)' }}>{followCounts.followerCount.toLocaleString()}</span>
                  <span style={{ ...serif, fontSize: 12, color: 'var(--text-quiet)' }}>Followers</span>
                </button>
                <button
                  onClick={() => navigate(`/profile/${profile.username}/following`)}
                  className="stackd-press"
                  style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2, background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
                >
                  <span style={{ ...serif, fontWeight: 700, fontSize: 18, color: 'var(--text-heading)' }}>{followCounts.followingCount.toLocaleString()}</span>
                  <span style={{ ...serif, fontSize: 12, color: 'var(--text-quiet)' }}>Following</span>
                </button>
              </div>
            )}
          </>
        </div>

        {/* Stats -- two pill badges rather than a 3-box grid, matching the
            design reference. Avg rating is still shown elsewhere (Top
            Ranked's ScorePills), so it isn't duplicated here as its own tile. */}
        <div style={{ display: 'flex', justifyContent: 'center', gap: 8, padding: '2px 14px 16px', flexWrap: 'wrap' }}>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              background: 'var(--color-value-bg)',
              border: '0.5px solid var(--color-value-border)',
              borderRadius: 20,
              padding: '7px 14px',
              fontSize: 12,
              color: 'var(--color-value)',
              ...sans,
              fontWeight: 600,
            }}
          >
            <CheckCircle2 size={14} /> {stats.reviewCount} Product{stats.reviewCount === 1 ? '' : 's'} Tried
          </div>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              background: 'var(--tier-purple-bg)',
              border: '0.5px solid var(--tier-purple-border)',
              borderRadius: 20,
              padding: '7px 14px',
              fontSize: 12,
              color: 'var(--tier-purple)',
              ...sans,
              fontWeight: 600,
            }}
          >
            <Folder size={14} /> {stats.listCount} Stack{stats.listCount === 1 ? '' : 's'} Created
          </div>
        </div>

        {/* Top Ranked -- the 3 highest-rated products this profile has
            reviewed, derived from their reviews rather than a separate
            table, so it never drifts out of sync. */}
        {reviews.length > 0 && (
          <div style={{ padding: '4px 14px 22px', display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
              <span style={{ fontSize: 19, color: 'var(--text-heading)', ...serif }}>Top ranked</span>
              <button
                onClick={() => navigate(`/rated/${profile.username}`)}
                className="stackd-press"
                style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 14, color: 'var(--text-heading)', ...serif, textDecoration: 'underline', padding: 0 }}
              >
                View all
              </button>
            </div>
            {[...reviews]
              .filter((r) => r.product_variants?.products)
              .sort((a, b) => Number(b.overall_rating) - Number(a.overall_rating))
              .slice(0, 3)
              .map((review) => {
                const variant = review.product_variants
                const product = variant.products
                const color = categoryColor(product.category)
                return (
                  <button
                    key={review.id}
                    onClick={() => navigate(`/product/${variant.id}`)}
                    className="stackd-elevated stackd-press"
                    style={{
                      background: 'var(--bg-card)',
                      border: '0.5px solid var(--border)',
                      borderRadius: 18,
                      padding: 16,
                      cursor: 'pointer',
                      textAlign: 'left',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: 12,
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                      <span
                        style={{
                          ...serif,
                          fontWeight: 700,
                          fontSize: 12,
                          color,
                          background: `${color}26`,
                          border: `0.5px solid ${color}66`,
                          borderRadius: 6,
                          padding: '4px 9px',
                          textTransform: 'uppercase',
                          letterSpacing: '0.05em',
                        }}
                      >
                        {formatCategory(product.category)}
                      </span>
                      <ScorePill score={review.overall_rating} />
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'center', padding: '6px 0' }}>
                      {variant.image_url ? (
                        <img src={variant.image_url} alt={variant.image_alt || product.name} style={{ height: 110, objectFit: 'contain', filter: 'drop-shadow(0 10px 16px rgba(0,0,0,0.4))' }} />
                      ) : (
                        <div style={{ height: 110, width: 110, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 34, color: 'var(--text-tertiary)', ...serif }}>
                          {product.name.charAt(0)}
                        </div>
                      )}
                    </div>
                    <div>
                      <div style={{ ...serif, fontWeight: 600, fontSize: 17, color: 'var(--text-heading)', letterSpacing: '-0.01em' }}>{product.name}</div>
                      <div style={{ fontSize: 12, color: 'var(--text-tertiary)', ...sans, marginTop: 3 }}>{product.brand_name}</div>
                    </div>
                  </button>
                )
              })}
          </div>
        )}

        {/* Want to Try -- private save-for-later list, own profile only. */}
        {isOwn && wishlist && wishlist.length > 0 && (
          <div style={{ padding: '4px 14px 22px', display: 'flex', flexDirection: 'column', gap: 12 }}>
            <span style={{ ...serif, fontSize: 19, color: 'var(--text-heading)' }}>Want to Try</span>
            <div style={{ display: 'flex', gap: 10, overflowX: 'auto', paddingBottom: 4 }}>
              {wishlist.map((item) => {
                const variant = item.product_variants
                const product = variant?.products
                if (!product) return null
                return (
                  <div
                    key={item.id}
                    className="stackd-elevated"
                    style={{
                      background: 'var(--bg-card)',
                      border: '0.5px solid var(--border)',
                      borderRadius: 16,
                      padding: 10,
                      display: 'flex',
                      alignItems: 'center',
                      gap: 10,
                      flexShrink: 0,
                      width: 220,
                    }}
                  >
                    <button
                      onClick={() => navigate(`/product/${variant.id}`)}
                      style={{ display: 'flex', alignItems: 'center', gap: 10, background: 'none', border: 'none', padding: 0, cursor: 'pointer', flex: 1, minWidth: 0, textAlign: 'left' }}
                    >
                      {variant.image_url ? (
                        <img src={variant.image_url} alt={variant.image_alt || product.name} style={{ width: 36, height: 36, borderRadius: 8, objectFit: 'contain', flexShrink: 0 }} />
                      ) : (
                        <div
                          style={{
                            width: 36,
                            height: 36,
                            borderRadius: 8,
                            background: 'var(--bg-subtle)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontSize: 16,
                            color: 'var(--text-tertiary)',
                            flexShrink: 0,
                            ...serif,
                          }}
                        >
                          {product.name.charAt(0)}
                        </div>
                      )}
                      <div style={{ minWidth: 0 }}>
                        <div style={{ ...serif, fontSize: 13, color: 'var(--text-heading)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{product.name}</div>
                        <div style={{ fontSize: 11, color: 'var(--text-quiet)', ...sans, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{product.brand_name}</div>
                      </div>
                    </button>
                    <button
                      onClick={() => handleRemoveWishlistItem(item.id)}
                      title="Tried it -- remove from Want to Try"
                      style={{
                        width: 26,
                        height: 26,
                        borderRadius: '50%',
                        border: '0.5px solid var(--border-medium)',
                        background: 'none',
                        color: 'var(--text-muted)',
                        fontSize: 15,
                        cursor: 'pointer',
                        flexShrink: 0,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    >
                      ✓
                    </button>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* Recent Reviews -- plain section header + "View all" like Top
            Ranked, not a tab control. Lists moved off this page entirely
            (still reachable from the bottom-nav Stacks tab). */}
        <div style={{ padding: '16px 14px 0', display: 'flex', flexDirection: 'column', gap: 10 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
            <span style={{ fontSize: 19, color: 'var(--text-heading)', ...serif }}>Recent Reviews</span>
            {reviews.length > 3 && (
              <button
                onClick={() => navigate(`/rated/${profile.username}`)}
                className="stackd-press"
                style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 14, color: 'var(--text-heading)', ...serif, textDecoration: 'underline', padding: 0 }}
              >
                View all
              </button>
            )}
          </div>
        </div>

        <div style={{ padding: '14px', display: 'flex', flexDirection: 'column', gap: 20 }}>
          {reviews.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '32px 0', color: 'var(--text-quiet)', fontSize: 15, ...sans }}>No reviews yet.</div>
          ) : (
            reviews.slice(0, 3).map((review) => {
              const variant = review.product_variants
              const product = variant?.products
              if (!product) return null
              return (
                <Card
                  key={review.id}
                  className="stackd-elevated stackd-press"
                  style={{ cursor: 'pointer', gap: 12, padding: 16 }}
                  onClick={() => navigate(isOwn ? `/product/${variant.id}/review` : `/product/${variant.id}`)}
                >
                  <div style={{ display: 'flex', justifyContent: 'center', padding: '4px 0' }}>
                    {variant.image_url ? (
                      <img src={variant.image_url} alt={variant.image_alt || product.name} style={{ height: 100, objectFit: 'contain' }} />
                    ) : (
                      <div style={{ height: 100, width: 100, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 30, color: 'var(--text-tertiary)', ...serif }}>
                        {product.name.charAt(0)}
                      </div>
                    )}
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 10 }}>
                    <div style={{ minWidth: 0 }}>
                      <div style={{ ...serif, fontWeight: 700, fontSize: 18, color: 'var(--text-heading)', letterSpacing: '-0.01em', lineHeight: 1.25 }}>
                        {product.name}
                        {variant.flavor ? ` — ${variant.flavor}` : ''}
                      </div>
                      <div style={{ fontSize: 13, color: 'var(--text-tertiary)', ...sans, marginTop: 2 }}>{product.brand_name}</div>
                    </div>
                    <StarRow rating={review.overall_rating} />
                  </div>
                  {review.notes && <div style={{ fontSize: 14, color: 'var(--text-secondary)', ...sans, lineHeight: 1.6, fontStyle: 'italic' }}>"{review.notes}"</div>}
                  <div style={{ fontSize: 11, color: 'var(--text-quiet)', ...sans }}>{timeAgo(review.created_at)}</div>
                </Card>
              )
            })
          )}

          {/* Account settings -- moved to the bottom of the page, below
              tabs/reviews, rather than sitting above Top Ranked. */}
          {isOwn && (
            <div style={{ padding: '18px 0 4px' }}>
              <div className="stackd-elevated" style={{ background: 'var(--bg-card)', border: '0.5px solid var(--border)', borderRadius: 18, overflow: 'hidden' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '13px 16px', borderBottom: '0.5px solid var(--border-subtle)' }}>
                  <span style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 15, fontWeight: 600, color: 'var(--text-primary)', ...serif }}>
                    <Contrast size={17} color="var(--text-primary)" /> Appearance
                  </span>
                  <ThemeToggle />
                </div>
                <button
                  onClick={handleExportData}
                  disabled={exportingData}
                  className="stackd-press"
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 10,
                    width: '100%',
                    background: 'none',
                    border: 'none',
                    borderBottom: '0.5px solid var(--border-subtle)',
                    cursor: exportingData ? 'default' : 'pointer',
                    fontSize: 15,
                    fontWeight: 600,
                    color: 'var(--text-primary)',
                    ...serif,
                    padding: '13px 16px',
                    textAlign: 'left',
                    opacity: exportingData ? 0.5 : 1,
                  }}
                >
                  <Download size={17} color="var(--text-primary)" />
                  <span style={{ flex: 1 }}>{exportingData ? 'Preparing export...' : 'Export my data'}</span>
                  <ChevronRight size={17} color="var(--text-quiet)" />
                </button>
                <button
                  onClick={handleDeleteAccount}
                  disabled={deletingAccount}
                  className="stackd-press"
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 10,
                    width: '100%',
                    background: 'none',
                    border: 'none',
                    cursor: deletingAccount ? 'default' : 'pointer',
                    fontSize: 15,
                    fontWeight: 600,
                    color: 'var(--tier-red)',
                    ...serif,
                    padding: '13px 16px',
                    textAlign: 'left',
                    opacity: deletingAccount ? 0.5 : 1,
                  }}
                >
                  <Trash2 size={17} color="var(--tier-red)" /> {deletingAccount ? 'Deleting account...' : 'Delete my account'}
                </button>
              </div>
            </div>
          )}

          {isOwn && (
            <div style={{ textAlign: 'center', fontSize: 11, color: 'var(--text-quiet)', ...sans, padding: '16px 0 4px' }}>
              <button onClick={() => navigate('/terms')} style={{ background: 'none', border: 'none', padding: 0, font: 'inherit', color: 'inherit', cursor: 'pointer', textDecoration: 'underline' }}>
                Terms
              </button>
              {' · '}
              <button
                onClick={() => navigate('/privacy')}
                style={{ background: 'none', border: 'none', padding: 0, font: 'inherit', color: 'inherit', cursor: 'pointer', textDecoration: 'underline' }}
              >
                Privacy
              </button>
            </div>
          )}
        </div>
      </div>

      {pendingAvatarFile && <AvatarCropModal file={pendingAvatarFile} onCancel={() => setPendingAvatarFile(null)} onCropped={handleAvatarCropped} />}

      {editing && (
        <div
          onClick={() => !savingProfile && setEditing(false)}
          style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'flex-end', justifyContent: 'center', zIndex: 100 }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              background: 'var(--bg-modal)',
              border: '0.5px solid var(--border)',
              borderRadius: '20px 20px 0 0',
              padding: 20,
              width: '100%',
              maxWidth: 430,
              maxHeight: '85vh',
              overflowY: 'auto',
              display: 'flex',
              flexDirection: 'column',
              gap: 14,
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span style={{ ...serif, fontWeight: 700, fontSize: 19, color: 'var(--text-heading)' }}>Edit Profile</span>
              <button
                onClick={() => setEditing(false)}
                disabled={savingProfile}
                style={{
                  width: 30,
                  height: 30,
                  borderRadius: '50%',
                  background: 'var(--bg-subtle)',
                  border: '0.5px solid var(--border)',
                  color: 'var(--text-secondary)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: savingProfile ? 'default' : 'pointer',
                }}
              >
                <X size={15} strokeWidth={2.25} />
              </button>
            </div>

            <input ref={avatarInputRef} type="file" accept="image/*" onChange={handleAvatarFileSelected} disabled={uploadingAvatar} style={{ display: 'none' }} />
            <div style={{ display: 'flex', justifyContent: 'center' }}>
              <button
                onClick={() => avatarInputRef.current?.click()}
                disabled={uploadingAvatar}
                className="stackd-press"
                style={{ position: 'relative', background: 'none', border: 'none', cursor: uploadingAvatar ? 'default' : 'pointer', padding: 0, opacity: uploadingAvatar ? 0.5 : 1 }}
              >
                <Avatar user={profile} size="xl" />
                <span
                  style={{
                    position: 'absolute',
                    bottom: 0,
                    right: 0,
                    width: 32,
                    height: 32,
                    borderRadius: '50%',
                    background: 'var(--text-heading)',
                    border: '2px solid var(--bg-modal)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <Camera size={15} color="var(--bg-nav)" strokeWidth={2.25} />
                </span>
              </button>
            </div>
            {uploadingAvatar && <div style={{ fontSize: 12, color: 'var(--text-quiet)', ...sans, textAlign: 'center' }}>Uploading...</div>}

            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <input value={editUsername} onChange={(e) => setEditUsername(e.target.value)} placeholder="Username" style={inputStyle} />
              <input value={editDisplayName} onChange={(e) => setEditDisplayName(e.target.value)} placeholder="Display name (optional)" style={inputStyle} />
              <input value={editLocation} onChange={(e) => setEditLocation(e.target.value)} placeholder="Location (optional)" list="location-options" style={inputStyle} />
              <datalist id="location-options">
                {locationSuggestions.map((loc) => (
                  <option key={loc} value={loc} />
                ))}
              </datalist>
              <input value={editGoal} onChange={(e) => setEditGoal(e.target.value)} placeholder="Goal, e.g. Health-conscious (optional)" style={inputStyle} />
            </div>

            {profileError && <div style={{ fontSize: 13, color: 'var(--tier-red)', ...sans }}>{profileError}</div>}

            <button
              onClick={handleSaveProfile}
              disabled={savingProfile}
              className="stackd-press"
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 7,
                background: 'var(--text-heading)',
                color: 'var(--bg-nav)',
                borderRadius: 20,
                padding: '13px 0',
                fontSize: 14,
                fontWeight: 700,
                border: 'none',
                cursor: savingProfile ? 'default' : 'pointer',
                opacity: savingProfile ? 0.6 : 1,
                ...serif,
              }}
            >
              {savingProfile ? 'Saving...' : 'Save changes'}
              {!savingProfile && <CheckCircle2 size={16} />}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
