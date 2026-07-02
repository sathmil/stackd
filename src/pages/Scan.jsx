import { useNavigate } from 'react-router-dom'

const serif = { fontFamily: 'Georgia, "Times New Roman", serif' }
const sans  = { fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif' }

export default function Scan() {
  const navigate = useNavigate()
  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', alignItems: 'center', justifyContent: 'center', gap: 16, padding: 28 }}>
      <div style={{ fontSize: 60, lineHeight: 1 }}>▣</div>
      <div style={{ ...serif, fontSize: 22, color: '#e8e4dc', letterSpacing: '-0.01em', textAlign: 'center' }}>Scan a barcode</div>
      <div style={{ fontSize: 14, color: '#4a4a4a', ...sans, textAlign: 'center', lineHeight: 1.7, maxWidth: 250 }}>
        Point your camera at any health product barcode to instantly pull up its Stackd page.
      </div>
      <div style={{ marginTop: 8, background: '#181818', border: '0.5px solid #222', borderRadius: 16, width: '100%', maxWidth: 280, aspectRatio: '4/3', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ border: '1.5px solid #2a2a2a', borderRadius: 8, width: '75%', height: '75%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <span style={{ fontSize: 12, color: '#333', ...sans }}>Camera coming soon</span>
        </div>
      </div>
      <button onClick={() => navigate('/search')} style={{ background: 'transparent', border: '0.5px solid #2a2a2a', borderRadius: 20, padding: '11px 24px', fontSize: 13, color: '#666', cursor: 'pointer', ...sans, marginTop: 8 }}>
        Search manually instead
      </button>
    </div>
  )
}
