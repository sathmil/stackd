import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabaseClient'
import { trackEvent } from '../lib/analytics'

const serif = { fontFamily: 'Georgia, "Times New Roman", serif' }
const sans = { fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif' }

export default function Auth({ onSignedUp }) {
  const navigate = useNavigate()
  const [isLogin, setIsLogin] = useState(true)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [disclaimerAccepted, setDisclaimerAccepted] = useState(false)
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [resetSent, setResetSent] = useState(false)

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

  const handleSubmit = async () => {
    setError('')
    if (!email || !password) {
      setError('Please fill in all fields.')
      return
    }
    if (!isLogin && !disclaimerAccepted) {
      setError('Please accept the disclaimer to continue.')
      return
    }

    setSubmitting(true)
    if (isLogin) {
      const { error: signInError } = await supabase.auth.signInWithPassword({ email, password })
      if (signInError) setError(signInError.message)
    } else {
      const { data, error: signUpError } = await supabase.auth.signUp({ email, password })
      if (signUpError) {
        setError(signUpError.code === 'user_already_exists' ? 'You already have an account with this email -- log in instead.' : signUpError.message)
      } else if (data.user) {
        await supabase.from('profiles').update({ disclaimer_accepted_at: new Date().toISOString() }).eq('id', data.user.id)
        trackEvent('signup')
        onSignedUp?.()
      }
    }
    setSubmitting(false)
  }

  const handleForgotPassword = async () => {
    setError('')
    if (!email) {
      setError('Enter your email above first, then tap "Forgot password?" again.')
      return
    }
    const { error: resetError } = await supabase.auth.resetPasswordForEmail(email, { redirectTo: window.location.origin })
    if (resetError) setError(resetError.message)
    else setResetSent(true)
  }

  if (resetSent) {
    return (
      <div style={{ minHeight: '100dvh', background: '#111', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '24px 20px' }}>
        <div
          style={{
            width: '100%',
            maxWidth: 380,
            background: '#181818',
            border: '0.5px solid #222',
            borderRadius: 16,
            padding: '24px 20px',
            display: 'flex',
            flexDirection: 'column',
            gap: 12,
            textAlign: 'center',
          }}
        >
          <div style={{ ...serif, fontSize: 16, color: '#e8e4dc' }}>Check your email</div>
          <div style={{ fontSize: 13, color: '#888', ...sans, lineHeight: 1.6 }}>We sent a password reset link to {email}.</div>
          <button onClick={() => setResetSent(false)} style={{ marginTop: 8, background: 'none', border: 'none', cursor: 'pointer', fontSize: 13, color: '#5ecfcf', ...sans }}>
            Back to login
          </button>
        </div>
      </div>
    )
  }

  return (
    <div style={{ minHeight: '100dvh', background: '#111', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '24px 20px' }}>
      <div style={{ width: '100%', maxWidth: 380 }}>
        {/* Logo */}
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <div style={{ ...serif, fontStyle: 'italic', fontSize: 42, color: '#f0ece4', letterSpacing: '-0.02em', lineHeight: 1 }}>Stackd</div>
          <div style={{ color: '#555', fontSize: 13, marginTop: 7, ...sans }}>Rate what fuels you.</div>
        </div>

        {/* Form card */}
        <div style={{ background: '#181818', border: '0.5px solid #222', borderRadius: 16, padding: '24px 20px', display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div style={{ ...serif, fontSize: 16, color: '#e8e4dc', letterSpacing: '-0.01em' }}>{isLogin ? 'Welcome back' : 'Create your account'}</div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <label style={{ fontSize: 11, color: '#555', ...sans }}>Email</label>
              <input type="email" placeholder="you@email.com" value={email} onChange={(e) => setEmail(e.target.value)} style={inputStyle} />
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <label style={{ fontSize: 11, color: '#555', ...sans }}>Password</label>
              <input type="password" placeholder="••••••••" value={password} onChange={(e) => setPassword(e.target.value)} style={inputStyle} />
            </div>
          </div>

          {!isLogin && (
            <label style={{ display: 'flex', alignItems: 'flex-start', gap: 8, cursor: 'pointer' }}>
              <input type="checkbox" checked={disclaimerAccepted} onChange={(e) => setDisclaimerAccepted(e.target.checked)} style={{ marginTop: 2 }} />
              <span style={{ fontSize: 11, color: '#666', ...sans, lineHeight: 1.5 }}>High-caffeine products aren't recommended for minors -- I confirm I'm old enough to use this app.</span>
            </label>
          )}

          {error && <div style={{ fontSize: 12, color: '#ff6b6b', ...sans }}>{error}</div>}

          <button
            onClick={handleSubmit}
            disabled={submitting}
            style={{
              background: '#f0ece4',
              color: '#111',
              borderRadius: 20,
              padding: '13px 0',
              fontSize: 14,
              fontWeight: 500,
              border: 'none',
              cursor: submitting ? 'default' : 'pointer',
              opacity: submitting ? 0.6 : 1,
              ...serif,
            }}
          >
            {submitting ? 'Please wait...' : isLogin ? 'Log in' : 'Sign up'}
          </button>

          {isLogin && (
            <button onClick={handleForgotPassword} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 12, color: '#555', ...sans, padding: 0 }}>
              Forgot password?
            </button>
          )}

          <div style={{ textAlign: 'center', fontSize: 12, color: '#444', ...sans }}>
            {isLogin ? "Don't have an account? " : 'Already have an account? '}
            <span
              onClick={() => {
                setIsLogin(!isLogin)
                setError('')
              }}
              style={{ color: '#5ecfcf', cursor: 'pointer', fontWeight: 500 }}
            >
              {isLogin ? 'Sign up' : 'Log in'}
            </span>
          </div>

          <div style={{ textAlign: 'center', fontSize: 10, color: '#3a3a3a', ...sans }}>
            <span onClick={() => navigate('/terms')} style={{ cursor: 'pointer', textDecoration: 'underline' }}>
              Terms
            </span>
            {' · '}
            <span onClick={() => navigate('/privacy')} style={{ cursor: 'pointer', textDecoration: 'underline' }}>
              Privacy
            </span>
          </div>
        </div>

        {/* Value props */}
        <div style={{ marginTop: 14, background: '#181818', border: '0.5px solid #222', borderRadius: 12, padding: '16px 18px', display: 'flex', flexDirection: 'column', gap: 10 }}>
          <div style={{ fontSize: 9, color: '#444', textTransform: 'uppercase', letterSpacing: '0.07em', ...sans }}>What you'll get</div>
          {[
            { c: '#5ecfcf', t: 'See what the crowd is rating' },
            { c: '#a78bfa', t: 'Honest multi-dimensional scores' },
            { c: '#ff6b6b', t: 'AI-analyzed ingredient quality' },
          ].map(({ c, t }) => (
            <div key={t} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div style={{ width: 6, height: 6, borderRadius: '50%', background: c, flexShrink: 0 }} />
              <span style={{ fontSize: 13, color: '#666', ...sans }}>{t}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
