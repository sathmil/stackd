import { useState, useEffect, useMemo } from 'react'
import { Chip } from '../components/ui'
import { useCurrentUser } from '../hooks/useCurrentUser'
import { updateProfile } from '../lib/api/profiles'

const serif = { fontFamily: 'var(--font-serif)' }
const sans = { fontFamily: 'var(--font-sans)', fontWeight: 500 }

const CATEGORY_OPTIONS = ['Energy', 'Protein', 'Supps', 'Greens', 'Snacks']

const EXPLAINER = [
  { c: 'var(--tier-teal)', t: 'Rate taste and value/effectiveness yourself -- 1 to 5, decimals allowed.' },
  { c: 'var(--tier-purple)', t: "AI reads the ingredient list and scores quality for you -- that part isn't a guess." },
  { c: 'var(--tier-red)', t: 'Save favorites to a ranked list and share it with a link.' },
]

const inputStyle = {
  background: 'var(--bg-subtle)',
  border: '0.5px solid var(--border-input)',
  borderRadius: 8,
  padding: '11px 13px',
  fontSize: 15,
  color: 'var(--text-input)',
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
    <div style={{ minHeight: '100dvh', background: 'var(--bg-nav)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '24px 20px' }}>
      <div style={{ width: '100%', maxWidth: 380, display: 'flex', flexDirection: 'column', gap: 24 }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ ...serif, fontSize: 22, color: 'var(--text-heading)', letterSpacing: '-0.01em' }}>Set up your profile</div>
          <div style={{ color: 'var(--text-muted)', fontSize: 14, marginTop: 6, ...sans }}>Pick a username -- everything else is optional.</div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <label style={{ fontSize: 12, color: 'var(--text-muted)', ...sans }}>Username</label>
            <input value={username} onChange={(e) => setUsername(e.target.value)} placeholder="e.g. proteinpapi" style={inputStyle} />
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <label style={{ fontSize: 12, color: 'var(--text-muted)', ...sans }}>Display name (optional)</label>
            <input value={displayName} onChange={(e) => setDisplayName(e.target.value)} placeholder="Shown instead of your username" style={inputStyle} />
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <label style={{ fontSize: 12, color: 'var(--text-muted)', ...sans }}>Location (optional)</label>
            <input value={location} onChange={(e) => setLocation(e.target.value)} placeholder="City" list="onboarding-location-options" style={inputStyle} />
            <datalist id="onboarding-location-options">
              {locationSuggestions.map((loc) => (
                <option key={loc} value={loc} />
              ))}
            </datalist>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <label style={{ fontSize: 12, color: 'var(--text-muted)', ...sans }}>Goal (optional)</label>
            <input value={goal} onChange={(e) => setGoal(e.target.value)} placeholder="e.g. Health-conscious" style={inputStyle} />
          </div>
        </div>

        {error && <div style={{ fontSize: 13, color: 'var(--tier-red)', ...sans }}>{error}</div>}

        <button
          onClick={handleSubmit}
          disabled={saving}
          style={{
            background: 'var(--text-heading)',
            color: 'var(--bg-nav)',
            borderRadius: 20,
            padding: '14px 0',
            fontSize: 16,
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
    <div style={{ minHeight: '100dvh', background: 'var(--bg-nav)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '24px 20px' }}>
      <div style={{ width: '100%', maxWidth: 380, display: 'flex', flexDirection: 'column', gap: 24 }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ ...serif, fontSize: 22, color: 'var(--text-heading)', letterSpacing: '-0.01em' }}>Welcome to Stackd</div>
          <div style={{ color: 'var(--text-muted)', fontSize: 14, marginTop: 6, ...sans }}>A quick look at how rating works here.</div>
        </div>

        <div style={{ background: 'var(--bg-card)', border: '0.5px solid var(--border)', borderRadius: 16, padding: '18px 20px', display: 'flex', flexDirection: 'column', gap: 12 }}>
          {EXPLAINER.map(({ c, t }) => (
            <div key={t} style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
              <div style={{ width: 6, height: 6, borderRadius: '50%', background: c, flexShrink: 0, marginTop: 6 }} />
              <span style={{ fontSize: 14, color: 'var(--text-body)', ...sans, lineHeight: 1.6 }}>{t}</span>
            </div>
          ))}
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <span style={{ fontSize: 12, color: 'var(--text-muted)', ...sans }}>What are you into? (optional)</span>
          <div style={{ display: 'flex', gap: 7, flexWrap: 'wrap' }}>
            {CATEGORY_OPTIONS.map((category) => (
              <Chip key={category} label={category} active={selected.includes(category)} onClick={() => toggle(category)} />
            ))}
          </div>
        </div>

        <button
          onClick={onDone}
          style={{ background: 'var(--text-heading)', color: 'var(--bg-nav)', borderRadius: 20, padding: '14px 0', fontSize: 16, fontWeight: 500, border: 'none', cursor: 'pointer', ...serif }}
        >
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
