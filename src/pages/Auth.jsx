import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabaseClient'
import { trackEvent } from '../lib/analytics'

const serif = { fontFamily: 'var(--font-serif)' }
const sans = { fontFamily: 'var(--font-sans)', fontWeight: 500 }

const VALUE_PROPS = [
  { icon: '👀', color: 'var(--tier-teal)', bg: 'var(--tier-teal-bg)', t: 'See what the crowd is rating' },
  { icon: '📊', color: 'var(--tier-purple)', bg: 'var(--tier-purple-bg)', t: 'Honest multi-dimensional scores' },
  { icon: '🧪', color: 'var(--tier-red)', bg: 'var(--tier-red-bg)', t: 'AI-analyzed ingredient quality' },
]

export default function Auth({ onSignedUp }) {
  const navigate = useNavigate()
  const [isLogin, setIsLogin] = useState(true)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [disclaimerAccepted, setDisclaimerAccepted] = useState(false)
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [resetSent, setResetSent] = useState(false)

  // Supabase's own default minimum -- validating client-side against the
  // same floor the server will enforce anyway, so a too-short password
  // fails fast instead of round-tripping to the API first.
  const MIN_PASSWORD_LENGTH = 6

  const inputStyle = {
    background: 'var(--bg-subtle)',
    border: '0.5px solid var(--border-input)',
    borderRadius: 12,
    padding: '13px 15px',
    fontSize: 15,
    color: 'var(--text-input)',
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
    if (!isLogin) {
      if (password.length < MIN_PASSWORD_LENGTH) {
        setError(`Password must be at least ${MIN_PASSWORD_LENGTH} characters.`)
        return
      }
      if (password !== confirmPassword) {
        setError('Passwords don’t match.')
        return
      }
      if (!disclaimerAccepted) {
        setError('Please accept the disclaimer to continue.')
        return
      }
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

  // Soft multicolor glow wash behind the page, echoing the avatar ring
  // gradient elsewhere in the app, instead of a flat single-color bg.
  const pageBackground = {
    minHeight: '100dvh',
    background: `
      radial-gradient(circle at 15% 0%, color-mix(in srgb, var(--color-taste) 16%, transparent), transparent 45%),
      radial-gradient(circle at 85% 15%, color-mix(in srgb, var(--color-value) 14%, transparent), transparent 45%),
      radial-gradient(circle at 50% 100%, color-mix(in srgb, var(--color-effect) 12%, transparent), transparent 50%),
      var(--bg-nav)
    `,
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '24px 20px',
  }

  if (resetSent) {
    return (
      <div style={pageBackground}>
        <div
          className="stackd-elevated"
          style={{
            width: '100%',
            maxWidth: 380,
            background: 'var(--bg-card)',
            border: '0.5px solid var(--border)',
            borderRadius: 20,
            padding: '28px 22px',
            display: 'flex',
            flexDirection: 'column',
            gap: 12,
            textAlign: 'center',
          }}
        >
          <div style={{ fontSize: 32 }}>📬</div>
          <div style={{ ...serif, fontSize: 18, color: 'var(--text-heading)' }}>Check your email</div>
          <div style={{ fontSize: 14, color: 'var(--text-body)', ...sans, lineHeight: 1.6 }}>We sent a password reset link to {email}.</div>
          <button
            onClick={() => setResetSent(false)}
            className="stackd-press"
            style={{ marginTop: 8, background: 'none', border: 'none', cursor: 'pointer', fontSize: 14, color: 'var(--tier-teal)', ...sans }}
          >
            Back to login
          </button>
        </div>
      </div>
    )
  }

  return (
    <div style={pageBackground}>
      <div style={{ width: '100%', maxWidth: 380 }}>
        {/* Logo */}
        <div style={{ textAlign: 'center', marginBottom: 28 }}>
          <div style={{ ...serif, fontStyle: 'italic', fontSize: 44, color: 'var(--text-heading)', letterSpacing: '-0.02em', lineHeight: 1 }}>Stackd</div>
          <div style={{ color: 'var(--text-muted)', fontSize: 14, marginTop: 8, ...sans }}>Rate what fuels you.</div>
        </div>

        {/* Form card */}
        <div
          className="stackd-elevated"
          style={{ background: 'var(--bg-card)', border: '0.5px solid var(--border)', borderRadius: 20, padding: '20px', display: 'flex', flexDirection: 'column', gap: 16 }}
        >
          {/* Segmented Login/Sign up toggle, matching Profile's tab style */}
          <div style={{ display: 'flex', gap: 4, background: 'var(--bg-subtle)', borderRadius: 24, padding: 4 }}>
            {[
              [true, 'Log in'],
              [false, 'Sign up'],
            ].map(([val, label]) => (
              <button
                key={label}
                onClick={() => {
                  setIsLogin(val)
                  setError('')
                  setConfirmPassword('')
                }}
                className="stackd-press"
                style={{
                  flex: 1,
                  background: isLogin === val ? 'var(--bg-card)' : 'none',
                  border: 'none',
                  borderRadius: 20,
                  cursor: 'pointer',
                  padding: '9px 0',
                  fontSize: 13,
                  ...sans,
                  color: isLogin === val ? 'var(--text-primary)' : 'var(--text-quiet)',
                  fontWeight: isLogin === val ? 500 : 400,
                  boxShadow: isLogin === val ? '0 1px 3px rgba(0,0,0,0.15)' : 'none',
                }}
              >
                {label}
              </button>
            ))}
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <label style={{ fontSize: 12, color: 'var(--text-muted)', ...sans }}>Email</label>
              <div style={{ position: 'relative' }}>
                <span style={{ position: 'absolute', left: 15, top: '50%', transform: 'translateY(-50%)', fontSize: 14, opacity: 0.6 }}>✉</span>
                <input type="email" placeholder="you@email.com" value={email} onChange={(e) => setEmail(e.target.value)} style={{ ...inputStyle, paddingLeft: 38 }} />
              </div>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <label style={{ fontSize: 12, color: 'var(--text-muted)', ...sans }}>Password</label>
              <div style={{ position: 'relative' }}>
                <span style={{ position: 'absolute', left: 15, top: '50%', transform: 'translateY(-50%)', fontSize: 14, opacity: 0.6 }}>🔒</span>
                <input
                  type={showPassword ? 'text' : 'password'}
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  style={{ ...inputStyle, paddingLeft: 38, paddingRight: 44 }}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  className="stackd-press"
                  tabIndex={-1}
                  style={{
                    position: 'absolute',
                    right: 6,
                    top: '50%',
                    transform: 'translateY(-50%)',
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    fontSize: 13,
                    color: 'var(--text-muted)',
                    padding: '6px 8px',
                  }}
                >
                  {showPassword ? 'Hide' : 'Show'}
                </button>
              </div>
              {!isLogin && (
                <span style={{ fontSize: 11, color: password.length > 0 && password.length < MIN_PASSWORD_LENGTH ? 'var(--tier-red)' : 'var(--text-faint)', ...sans }}>
                  At least {MIN_PASSWORD_LENGTH} characters
                </span>
              )}
            </div>

            {!isLogin && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                <label style={{ fontSize: 12, color: 'var(--text-muted)', ...sans }}>Confirm password</label>
                <div style={{ position: 'relative' }}>
                  <span style={{ position: 'absolute', left: 15, top: '50%', transform: 'translateY(-50%)', fontSize: 14, opacity: 0.6 }}>🔒</span>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    placeholder="••••••••"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    style={{
                      ...inputStyle,
                      paddingLeft: 38,
                      border: confirmPassword.length > 0 && confirmPassword !== password ? '0.5px solid var(--tier-red-border)' : inputStyle.border,
                    }}
                  />
                </div>
                {confirmPassword.length > 0 && confirmPassword !== password && <span style={{ fontSize: 11, color: 'var(--tier-red)', ...sans }}>Passwords don’t match</span>}
              </div>
            )}
          </div>

          {!isLogin && (
            <label style={{ display: 'flex', alignItems: 'flex-start', gap: 8, cursor: 'pointer' }}>
              <input type="checkbox" checked={disclaimerAccepted} onChange={(e) => setDisclaimerAccepted(e.target.checked)} style={{ marginTop: 2 }} />
              <span style={{ fontSize: 12, color: 'var(--text-faint)', ...sans, lineHeight: 1.5 }}>
                High-caffeine products aren't recommended for minors -- I confirm I'm old enough to use this app.
              </span>
            </label>
          )}

          {error && (
            <div style={{ background: 'var(--tier-red-bg)', border: '0.5px solid var(--tier-red-border)', borderRadius: 10, padding: '10px 12px', fontSize: 13, color: 'var(--tier-red)', ...sans }}>
              {error}
            </div>
          )}

          <button
            onClick={handleSubmit}
            disabled={submitting}
            className="stackd-press"
            style={{
              background: 'var(--text-heading)',
              color: 'var(--bg-nav)',
              borderRadius: 20,
              padding: '14px 0',
              fontSize: 15,
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
            <button
              onClick={handleForgotPassword}
              className="stackd-press"
              style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 13, color: 'var(--text-muted)', ...sans, padding: 0 }}
            >
              Forgot password?
            </button>
          )}

          <div style={{ textAlign: 'center', fontSize: 11, color: 'var(--text-quiet)', ...sans }}>
            <button onClick={() => navigate('/terms')} style={{ background: 'none', border: 'none', padding: 0, font: 'inherit', color: 'inherit', cursor: 'pointer', textDecoration: 'underline' }}>
              Terms
            </button>
            {' · '}
            <button onClick={() => navigate('/privacy')} style={{ background: 'none', border: 'none', padding: 0, font: 'inherit', color: 'inherit', cursor: 'pointer', textDecoration: 'underline' }}>
              Privacy
            </button>
          </div>
        </div>

        {/* Value props */}
        <div
          className="stackd-elevated"
          style={{ marginTop: 14, background: 'var(--bg-card)', border: '0.5px solid var(--border)', borderRadius: 16, padding: '18px 20px', display: 'flex', flexDirection: 'column', gap: 12 }}
        >
          <div style={{ fontSize: 10, color: 'var(--text-quiet)', textTransform: 'uppercase', letterSpacing: '0.07em', ...sans }}>What you'll get</div>
          {VALUE_PROPS.map(({ icon, color, bg, t }) => (
            <div key={t} style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <div
                style={{
                  width: 30,
                  height: 30,
                  borderRadius: 9,
                  background: bg,
                  border: `0.5px solid ${color}`,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: 14,
                  flexShrink: 0,
                }}
              >
                {icon}
              </div>
              <span style={{ fontSize: 14, color: 'var(--text-primary)', ...sans }}>{t}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
