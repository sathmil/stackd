import { AVATAR_STYLE, SCORE_STYLE, DIM_COLOR } from '../data/placeholder'

const serif = { fontFamily: 'Georgia, "Times New Roman", serif' }
const sans  = { fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif' }

export function Avatar({ user, size = 'sm' }) {
  const px    = { sm: 28, md: 36, lg: 48 }[size]
  const fs    = { sm: 10, md: 12, lg: 15 }[size]
  const style = AVATAR_STYLE[user.avatarColor] || AVATAR_STYLE.cyan
  return (
    <div style={{ width: px, height: px, borderRadius: '50%', background: style.background, color: style.color, display: 'flex', alignItems: 'center', justifyContent: 'center', ...serif, fontStyle: 'italic', fontSize: fs, fontWeight: 500, flexShrink: 0 }}>
      {user.avatar}
    </div>
  )
}

export function ScorePill({ score, extraStyle }) {
  const s = SCORE_STYLE(score)
  return (
    <span style={{ background: s.bg, color: s.color, border: `0.5px solid ${s.border}`, borderRadius: 20, fontSize: 12, fontWeight: 500, padding: '3px 10px', ...serif, letterSpacing: '-0.01em', flexShrink: 0, ...extraStyle }}>
      {score.toFixed(1)}
    </span>
  )
}

export function ScoreBars({ scores }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      {[['taste','Taste'],['effectiveness','Effectiveness'],['ingredients','Ingredients'],['value','Value']].map(([key, label]) => (
        <div key={key} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ width: 70, flexShrink: 0, fontSize: 11, color: '#5a5a5a', ...sans }}>{label}</span>
          <div style={{ flex: 1, height: 3, background: '#1e1e1e', borderRadius: 2, overflow: 'hidden' }}>
            <div style={{ height: '100%', width: `${(scores[key] / 10) * 100}%`, background: DIM_COLOR[key], borderRadius: 2 }} />
          </div>
          <span style={{ width: 28, textAlign: 'right', fontSize: 11, color: DIM_COLOR[key], ...serif, fontWeight: 500 }}>{scores[key].toFixed(1)}</span>
        </div>
      ))}
    </div>
  )
}

export function BottomNav({ active, onNavigate }) {
  const items = [
    { key: 'feed',    label: 'Feed',    icon: '⌂' },
    { key: 'search',  label: 'Search',  icon: '⌕' },
    { key: 'scan',    label: 'Scan',    icon: '▣' },
    { key: 'lists',   label: 'Lists',   icon: '☰' },
    { key: 'profile', label: 'Profile', icon: '◯' },
  ]
  return (
    <div style={{ display: 'flex', justifyContent: 'space-around', alignItems: 'center', padding: '10px 0 16px', borderTop: '0.5px solid #1e1e1e', background: '#111', flexShrink: 0 }}>
      {items.map(item => (
        <button key={item.key} onClick={() => onNavigate(item.key)} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3, background: 'none', border: 'none', cursor: 'pointer', padding: '0 10px' }}>
          <span style={{ fontSize: 20, color: active === item.key ? '#f0ece4' : '#2e2e2e', lineHeight: 1 }}>{item.icon}</span>
          <span style={{ fontSize: 9, ...sans, color: active === item.key ? '#f0ece4' : '#2e2e2e' }}>{item.label}</span>
        </button>
      ))}
    </div>
  )
}

export function Card({ children, style: extra = {} }) {
  return (
    <div style={{ background: '#181818', border: '0.5px solid #222', borderRadius: 12, padding: '12px', display: 'flex', flexDirection: 'column', gap: 8, ...extra }}>
      {children}
    </div>
  )
}

export function Divider() {
  return <div style={{ height: '0.5px', background: '#1e1e1e', flexShrink: 0 }} />
}

export function SectionLabel({ children }) {
  return <span style={{ fontSize: 9, color: '#444', textTransform: 'uppercase', letterSpacing: '0.07em', ...sans }}>{children}</span>
}

export function Chip({ label, active, onClick }) {
  return (
    <button onClick={onClick} style={{ borderRadius: 20, padding: '5px 13px', fontSize: 11, cursor: 'pointer', ...sans, whiteSpace: 'nowrap', border: active ? 'none' : '0.5px solid #252525', background: active ? '#f0ece4' : 'transparent', color: active ? '#111' : '#555', fontWeight: active ? 500 : 400 }}>
      {label}
    </button>
  )
}

export function NavBar({ title, onBack, rightEl }) {
  return (
    <div style={{ padding: '12px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '0.5px solid #1e1e1e', flexShrink: 0 }}>
      {onBack
        ? <button onClick={onBack} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 20, color: '#555', padding: 0, lineHeight: 1 }}>←</button>
        : <div style={{ width: 28 }} />
      }
      <span style={{ ...{ fontFamily: 'Georgia, serif' }, fontSize: 15, color: '#e8e4dc' }}>{title}</span>
      {rightEl || <div style={{ width: 28 }} />}
    </div>
  )
}
