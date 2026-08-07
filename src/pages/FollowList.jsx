import { useParams, useNavigate } from 'react-router-dom'
import { NavBar, Avatar, Skeleton, ErrorState } from '../components/ui'
import { useAsync } from '../hooks/useAsync'
import { fetchProfileByUsername } from '../lib/api/profiles'
import { fetchFollowers, fetchFollowing } from '../lib/api/social'
import { fetchProfilesByIds } from '../lib/api/reviews'

const sans = { fontFamily: 'var(--font-sans)', fontWeight: 500 }
const serif = { fontFamily: 'var(--font-serif)' }

/** @param {{ kind: 'followers'|'following' }} props */
export default function FollowList({ kind }) {
  const { username } = useParams()
  const navigate = useNavigate()

  const { data, loading, error, refetch } = useAsync(async () => {
    const { data: profile, error: pErr } = await fetchProfileByUsername(username)
    if (pErr) return { data: null, error: pErr }
    if (!profile) return { data: null, error: null }

    const { data: rows, error: rowsErr } = kind === 'followers' ? await fetchFollowers(profile.id) : await fetchFollowing(profile.id)
    if (rowsErr) return { data: null, error: rowsErr }

    const ids = (rows || []).map((r) => (kind === 'followers' ? r.follower_id : r.followee_id))
    const { data: profiles } = await fetchProfilesByIds(ids)
    const profileMap = Object.fromEntries((profiles || []).map((p) => [p.id, p]))
    const people = ids.map((id) => profileMap[id]).filter(Boolean)

    return { data: { profile, people }, error: null }
  }, [username, kind])

  if (loading) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
        <NavBar title={kind === 'followers' ? 'Followers' : 'Following'} onBack={() => navigate(-1)} />
        <Skeleton variant="rows" />
      </div>
    )
  }

  if (error || !data) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
        <NavBar title={kind === 'followers' ? 'Followers' : 'Following'} onBack={() => navigate(-1)} />
        <ErrorState message="Couldn't load this. Try again in a moment." onRetry={refetch} />
      </div>
    )
  }

  const { people } = data

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <NavBar title={kind === 'followers' ? 'Followers' : 'Following'} onBack={() => navigate(-1)} />
      <div style={{ flex: 1, overflowY: 'auto', padding: '10px 14px', display: 'flex', flexDirection: 'column', gap: 4 }}>
        {people.length === 0 && (
          <div style={{ textAlign: 'center', padding: '48px 0', color: 'var(--text-quiet)', fontSize: 15, ...sans }}>{kind === 'followers' ? 'No followers yet.' : 'Not following anyone yet.'}</div>
        )}
        {people.map((person) => (
          <button
            key={person.id}
            onClick={() => navigate(`/profile/${person.username}`)}
            style={{ display: 'flex', alignItems: 'center', gap: 10, background: 'none', border: 'none', padding: '8px 4px', cursor: 'pointer', width: '100%', textAlign: 'left' }}
          >
            <Avatar user={person} size="md" />
            <div>
              <div style={{ ...serif, fontSize: 15, color: 'var(--text-heading)' }}>{person.display_name || person.username}</div>
              <div style={{ fontSize: 12, color: 'var(--text-quiet)', ...sans }}>@{person.username}</div>
            </div>
          </button>
        ))}
      </div>
    </div>
  )
}
