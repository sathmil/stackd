import { useState } from 'react'
import { Chip } from '../components/ui'

const serif = { fontFamily: 'Georgia, "Times New Roman", serif' }
const sans = { fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif' }

const CATEGORY_OPTIONS = ['Energy', 'Protein', 'Supps', 'Greens', 'Snacks']

const EXPLAINER = [
  { c: '#5ecfcf', t: 'Rate taste and value/effectiveness yourself -- 1 to 5, decimals allowed.' },
  { c: '#a78bfa', t: "AI reads the ingredient list and scores quality for you -- that part isn't a guess." },
  { c: '#ff6b6b', t: 'Save favorites to a ranked list and share it with a link.' },
]

export default function Onboarding({ onDone }) {
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
