import { useState, useEffect, useMemo } from 'react'
import { Chip } from '../components/ui'
import { useCurrentUser } from '../hooks/useCurrentUser'
import { updateProfile } from '../lib/api/profiles'

const serif = { fontFamily: 'Georgia, "Times New Roman", serif' }
const sans = { fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif' }

const CATEGORY_OPTIONS = ['Energy', 'Protein', 'Supps', 'Greens', 'Snacks']

const EXPLAINER = [
  { c: '#5ecfcf', t: 'Rate taste and value/effectiveness yourself -- 1 to 5, decimals allowed.' },
  { c: '#a78bfa', t: "AI reads the ingredient list and scores quality for you -- that part isn't a guess." },
  { c: '#ff6b6b', t: 'Save favorites to a ranked list and share it with a link.' },
]

const inputStyle = {
  background: '#1a1a1a',
  border: '0.5px solid #252525',
  borderRadius: 8,
  padding: '11px 13px',
  fontSize: 14,
  color: '#ccc',
  outline: 'none',
  width: '100%',
  ...sans,
}

function ProfileInfoStep({ onDone }) {
  const currentUser = useCurrentUser()
  const [username, setUsername] = useState('')
  const [displayName, setDisplayName] = useState('')
  const [location, setLocation] = useState('')
  const [goal, setGoal] = useState('')
  const [worldCities, setWorldCities] = useState(null)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  // ~33k entries, population >= 15,000 (GeoNames, CC-BY 4.0) -- same lazy
  // load as Profile.jsx's edit form, so this list is never fetched unless
  // someone actually reaches this step.
  useEffect(() => {
    if (worldCities) return
    import('../data/worldCities.json').then((mod) => setWorldCities(mod.default))
  }, [worldCities])

  const locationSuggestions = useMemo(() => {
    if (!worldCities || !location.trim()) return []
    const query = location.trim().toLowerCase()
    const matches = []
    for (const city of worldCities) {
      if (city.toLowerCase().includes(query)) {
        matches.push(city)
        if (matches.length >= 50) break
      }
    }
    return matches
  }, [worldCities, location])

  const handleSubmit = async () => {
    setError('')
    if (!username.trim()) {
      setError('Pick a username to continue.')
      return
    }
    if (!currentUser) return
    setSaving(true)
    const { error: updateError } = await updateProfile(currentUser.id, {
      username: username.trim(),
      display_name: displayName.trim() || null,
      location: location.trim() || null,
      goal: goal.trim() || null,
    })
    setSaving(false)
    if (updateError) {
      setError(updateError.message.includes('duplicate') ? 'That username is already taken.' : updateError.message)
      return
    }
    onDone()
  }

  return (
    <div style={{ minHeight: '100dvh', background: '#111', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '24px 20px' }}>
      <div style={{ width: '100%', maxWidth: 380, display: 'flex', flexDirection: 'column', gap: 24 }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ ...serif, fontSize: 22, color: '#f0ece4', letterSpacing: '-0.01em' }}>Set up your profile</div>
          <div style={{ color: '#8f8f8f', fontSize: 13, marginTop: 6, ...sans }}>Pick a username -- everything else is optional.</div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <label style={{ fontSize: 11, color: '#8f8f8f', ...sans }}>Username</label>
            <input value={username} onChange={(e) => setUsername(e.target.value)} placeholder="e.g. proteinpapi" style={inputStyle} />
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <label style={{ fontSize: 11, color: '#8f8f8f', ...sans }}>Display name (optional)</label>
            <input value={displayName} onChange={(e) => setDisplayName(e.target.value)} placeholder="Shown instead of your username" style={inputStyle} />
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <label style={{ fontSize: 11, color: '#8f8f8f', ...sans }}>Location (optional)</label>
            <input value={location} onChange={(e) => setLocation(e.target.value)} placeholder="City" list="onboarding-location-options" style={inputStyle} />
            <datalist id="onboarding-location-options">
              {locationSuggestions.map((loc) => (
                <option key={loc} value={loc} />
              ))}
            </datalist>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <label style={{ fontSize: 11, color: '#8f8f8f', ...sans }}>Goal (optional)</label>
            <input value={goal} onChange={(e) => setGoal(e.target.value)} placeholder="e.g. Health-conscious" style={inputStyle} />
          </div>
        </div>

        {error && <div style={{ fontSize: 12, color: '#ff6b6b', ...sans }}>{error}</div>}

        <button
          onClick={handleSubmit}
          disabled={saving}
          style={{
            background: '#f0ece4',
            color: '#111',
            borderRadius: 20,
            padding: '14px 0',
            fontSize: 15,
            fontWeight: 500,
            border: 'none',
            cursor: saving ? 'default' : 'pointer',
            opacity: saving ? 0.6 : 1,
            ...serif,
          }}
        >
          {saving ? 'Saving...' : 'Continue'}
        </button>
      </div>
    </div>
  )
}

function ExplainerStep({ onDone }) {
  const [selected, setSelected] = useState([])

  const toggle = (category) => setSelected((s) => (s.includes(category) ? s.filter((c) => c !== category) : [...s, category]))

  return (
    <div style={{ minHeight: '100dvh', background: '#111', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '24px 20px' }}>
      <div style={{ width: '100%', maxWidth: 380, display: 'flex', flexDirection: 'column', gap: 24 }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ ...serif, fontSize: 22, color: '#f0ece4', letterSpacing: '-0.01em' }}>Welcome to Stackd</div>
          <div style={{ color: '#8f8f8f', fontSize: 13, marginTop: 6, ...sans }}>A quick look at how rating works here.</div>
        </div>

        <div style={{ background: '#181818', border: '0.5px solid #222', borderRadius: 16, padding: '18px 20px', display: 'flex', flexDirection: 'column', gap: 12 }}>
          {EXPLAINER.map(({ c, t }) => (
            <div key={t} style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
              <div style={{ width: 6, height: 6, borderRadius: '50%', background: c, flexShrink: 0, marginTop: 6 }} />
              <span style={{ fontSize: 13, color: '#888', ...sans, lineHeight: 1.6 }}>{t}</span>
            </div>
          ))}
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <span style={{ fontSize: 11, color: '#8f8f8f', ...sans }}>What are you into? (optional)</span>
          <div style={{ display: 'flex', gap: 7, flexWrap: 'wrap' }}>
            {CATEGORY_OPTIONS.map((category) => (
              <Chip key={category} label={category} active={selected.includes(category)} onClick={() => toggle(category)} />
            ))}
          </div>
        </div>

        <button onClick={onDone} style={{ background: '#f0ece4', color: '#111', borderRadius: 20, padding: '14px 0', fontSize: 15, fontWeight: 500, border: 'none', cursor: 'pointer', ...serif }}>
          Start exploring
        </button>
      </div>
    </div>
  )
}

export default function Onboarding({ onDone }) {
  const [step, setStep] = useState('profile')

  if (step === 'profile') {
    return <ProfileInfoStep onDone={() => setStep('explainer')} />
  }

  return <ExplainerStep onDone={onDone} />
}
