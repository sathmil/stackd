import { useState } from 'react'

const serif = { fontFamily: 'Georgia, "Times New Roman", serif' }
const sans  = { fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif' }

export default function Auth({ onLogin }) {
  const [isLogin, setIsLogin] = useState(true)
  const [email, setEmail]     = useState('')
  const [password, setPassword] = useState('')
  const [error, setError]     = useState('')

  const inputStyle = {
    background: '#1a1a1a', border: '0.5px solid #252525', borderRadius: 8,
    padding: '11px 13px', fontSize: 14, color: '#ccc', outline: 'none', width: '100%', ...sans,
  }

  const handleSubmit = () => {
    if (!email || !password) { setError('Please fill in all fields.'); return }
    onLogin({ email })
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
          <div style={{ ...serif, fontSize: 16, color: '#e8e4dc', letterSpacing: '-0.01em' }}>
            {isLogin ? 'Welcome back' : 'Create your account'}
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <label style={{ fontSize: 11, color: '#555', ...sans }}>Email</label>
              <input type="email" placeholder="you@email.com" value={email} onChange={e => setEmail(e.target.value)} style={inputStyle} />
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <label style={{ fontSize: 11, color: '#555', ...sans }}>Password</label>
              <input type="password" placeholder="••••••••" value={password} onChange={e => setPassword(e.target.value)} style={inputStyle} />
            </div>
          </div>

          {error && <div style={{ fontSize: 12, color: '#ff6b6b', ...sans }}>{error}</div>}

          <button onClick={handleSubmit} style={{ background: '#f0ece4', color: '#111', borderRadius: 20, padding: '13px 0', fontSize: 14, fontWeight: 500, border: 'none', cursor: 'pointer', ...serif }}>
            {isLogin ? 'Log in' : 'Sign up'}
          </button>

          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ flex: 1, height: '0.5px', background: '#1e1e1e' }} />
            <span style={{ fontSize: 11, color: '#444', ...sans }}>or</span>
            <div style={{ flex: 1, height: '0.5px', background: '#1e1e1e' }} />
          </div>

          <button style={{ background: '#1a1a1a', border: '0.5px solid #222', borderRadius: 8, padding: '11px 0', fontSize: 13, color: '#777', cursor: 'pointer', ...sans }}>
            Continue with Google
          </button>

          <div style={{ textAlign: 'center', fontSize: 12, color: '#444', ...sans }}>
            {isLogin ? "Don't have an account? " : 'Already have an account? '}
            <span onClick={() => { setIsLogin(!isLogin); setError('') }} style={{ color: '#5ecfcf', cursor: 'pointer', fontWeight: 500 }}>
              {isLogin ? 'Sign up' : 'Log in'}
            </span>
          </div>
        </div>

        {/* Value props */}
        <div style={{ marginTop: 14, background: '#181818', border: '0.5px solid #222', borderRadius: 12, padding: '16px 18px', display: 'flex', flexDirection: 'column', gap: 10 }}>
          <div style={{ fontSize: 9, color: '#444', textTransform: 'uppercase', letterSpacing: '0.07em', ...sans }}>What you'll get</div>
          {[{ c: '#5ecfcf', t: 'See what friends are rating' }, { c: '#a78bfa', t: 'Honest multi-dimensional scores' }, { c: '#ff6b6b', t: 'Scan any product barcode' }].map(({ c, t }) => (
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
