import { useState, useRef, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { BrowserMultiFormatReader } from '@zxing/browser'
import { Barcode, Pencil, Search, ShieldCheck, HelpCircle, ChevronRight } from 'lucide-react'
import { fetchVariantByUpc } from '../lib/api/products'
import { trackEvent } from '../lib/analytics'

const serif = { fontFamily: 'var(--font-serif)' }
const sans = { fontFamily: 'var(--font-sans)', fontWeight: 500 }

function CornerBracket({ position }) {
  const base = { position: 'absolute', width: 22, height: 22, borderColor: 'var(--tier-teal)', borderStyle: 'solid' }
  const styles = {
    tl: { ...base, top: 14, left: 14, borderWidth: '2px 0 0 2px', borderRadius: '8px 0 0 0' },
    tr: { ...base, top: 14, right: 14, borderWidth: '2px 2px 0 0', borderRadius: '0 8px 0 0' },
    bl: { ...base, bottom: 14, left: 14, borderWidth: '0 0 2px 2px', borderRadius: '0 0 0 8px' },
    br: { ...base, bottom: 14, right: 14, borderWidth: '0 2px 2px 0', borderRadius: '0 0 8px 0' },
  }
  return <div style={styles[position]} />
}

function OptionCard({ icon, iconColor, iconBg, title, description, onClick }) {
  return (
    <button
      onClick={onClick}
      className="stackd-elevated stackd-press"
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 14,
        width: '100%',
        background: 'var(--bg-card)',
        border: '0.5px solid var(--border)',
        borderRadius: 16,
        padding: 16,
        cursor: 'pointer',
        textAlign: 'left',
      }}
    >
      <div style={{ width: 46, height: 46, borderRadius: 13, background: iconBg, color: iconColor, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>{icon}</div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ ...serif, fontSize: 16, color: 'var(--text-heading)', letterSpacing: '-0.01em' }}>{title}</div>
        <div style={{ fontSize: 13, color: 'var(--text-tertiary)', ...sans, marginTop: 2, lineHeight: 1.4 }}>{description}</div>
      </div>
      <ChevronRight size={18} color="var(--text-quiet)" style={{ flexShrink: 0 }} />
    </button>
  )
}

// idle -> requesting -> active -> (found | not-found | denied | unsupported)
export default function Scan() {
  const navigate = useNavigate()
  const [showHelp, setShowHelp] = useState(false)
  const [status, setStatus] = useState('idle')
  const [lookingUp, setLookingUp] = useState(false)
  const [scannedUpc, setScannedUpc] = useState(null)
  const videoRef = useRef(null)
  const controlsRef = useRef(null)
  const handledRef = useRef(false) // guards against decoding the same/another barcode again while a lookup is already in flight

  const handleDetected = useCallback(
    async (code) => {
      if (handledRef.current) return
      handledRef.current = true
      controlsRef.current?.stop()
      setLookingUp(true)
      trackEvent('barcode_scanned', { upc: code })

      const { data: variant } = await fetchVariantByUpc(code)
      setLookingUp(false)
      if (variant) {
        navigate(`/product/${variant.id}`)
      } else {
        setScannedUpc(code)
        setStatus('not-found')
      }
    },
    [navigate],
  )

  const startScanning = useCallback(async () => {
    if (!navigator.mediaDevices?.getUserMedia || !window.isSecureContext) {
      setStatus('unsupported')
      return
    }
    setStatus('requesting')
    handledRef.current = false
    const reader = new BrowserMultiFormatReader()
    try {
      // decodeFromVideoDevice(undefined, ...) lets the browser pick any
      // camera with no preference, which on phones with multiple cameras
      // often lands on the front-facing one -- useless for scanning a
      // barcode held up to the device. decodeFromConstraints lets a real
      // facingMode preference be passed instead.
      const controls = await reader.decodeFromConstraints({ video: { facingMode: { ideal: 'environment' } } }, videoRef.current, (result) => {
        if (result) handleDetected(result.getText())
      })
      controlsRef.current = controls
      setStatus('active')
    } catch {
      setStatus('denied')
    }
  }, [handleDetected])

  // Camera only opens from startScanning() being called directly inside a
  // click handler (see the idle-state button below) -- NOT from an effect
  // on mount. iOS Safari (and other browsers) silently block getUserMedia
  // when it isn't triggered by a direct user gesture, so auto-starting on
  // mount would just fail there with no visible camera and a confusing
  // "denied" state the user never actually saw a permission prompt for.
  useEffect(() => () => controlsRef.current?.stop(), [])

  const cameraLive = status === 'active' || status === 'requesting'

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', overflowY: 'auto' }}>
      <div style={{ padding: '24px 20px 8px', position: 'relative' }}>
        <button
          onClick={() => setShowHelp((v) => !v)}
          className="stackd-press"
          style={{
            position: 'absolute',
            top: 20,
            right: 20,
            width: 38,
            height: 38,
            borderRadius: '50%',
            background: 'var(--bg-card)',
            border: '0.5px solid var(--border)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
          }}
        >
          <HelpCircle size={19} color="var(--text-muted)" />
        </button>

        <div style={{ ...serif, fontSize: 28, color: 'var(--text-heading)', textAlign: 'center', letterSpacing: '-0.01em' }}>Scan</div>
        <div style={{ fontSize: 14, color: 'var(--text-tertiary)', ...sans, textAlign: 'center', marginTop: 4 }}>Quickly look up health products</div>

        {showHelp && (
          <div
            style={{
              marginTop: 12,
              background: 'var(--tier-teal-bg)',
              border: '0.5px solid var(--tier-teal-border)',
              borderRadius: 12,
              padding: '12px 14px',
              fontSize: 13,
              color: 'var(--text-primary)',
              ...sans,
              lineHeight: 1.5,
            }}
          >
            Point your camera at a product's barcode (UPC/EAN). If it's already in Stackd, you'll land straight on its page -- otherwise you can add it.
          </div>
        )}
      </div>

      <div style={{ padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: 20, flex: 1 }}>
        {/* Scanner frame -- live camera feed with a corner-bracket viewfinder
            overlay while scanning; falls back to a static message if the
            camera is denied/unavailable rather than pretending it's live. */}
        <div
          onClick={status === 'idle' ? startScanning : undefined}
          className={status === 'idle' ? 'stackd-press' : undefined}
          style={{
            position: 'relative',
            background: 'var(--tier-teal-bg)',
            border: '1px solid var(--tier-teal-border)',
            borderRadius: 20,
            overflow: 'hidden',
            minHeight: 260,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 14,
            cursor: status === 'idle' ? 'pointer' : 'default',
          }}
        >
          {status === 'idle' && (
            <>
              <CornerBracket position="tl" />
              <CornerBracket position="tr" />
              <CornerBracket position="bl" />
              <CornerBracket position="br" />
              <div
                className="stackd-scan-glow"
                style={{
                  width: 84,
                  height: 84,
                  borderRadius: '50%',
                  background: 'radial-gradient(circle, color-mix(in srgb, var(--tier-teal) 35%, transparent), transparent 70%)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <div
                  style={{
                    width: 56,
                    height: 56,
                    borderRadius: '50%',
                    background: 'var(--tier-teal-bg)',
                    border: '1px solid var(--tier-teal-border)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <Barcode size={26} color="var(--tier-teal)" />
                </div>
              </div>
              <div style={{ ...serif, fontSize: 19, color: 'var(--text-heading)', letterSpacing: '-0.01em' }}>Scan a barcode</div>
              <div style={{ fontSize: 13, color: 'var(--text-tertiary)', ...sans, textAlign: 'center', lineHeight: 1.6, maxWidth: 260, padding: '0 20px' }}>
                Tap to open your camera and point it at any health product barcode to instantly pull up its <span style={{ color: 'var(--tier-teal)', fontWeight: 600 }}>Stackd</span> page.
              </div>
            </>
          )}

          <video
            ref={videoRef}
            muted
            playsInline
            style={{
              position: 'absolute',
              inset: 0,
              width: '100%',
              height: '100%',
              objectFit: 'cover',
              display: cameraLive ? 'block' : 'none',
            }}
          />
          {cameraLive && <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(180deg, rgba(0,0,0,0.35), transparent 30%, transparent 70%, rgba(0,0,0,0.35))' }} />}

          {cameraLive && (
            <>
              <CornerBracket position="tl" />
              <CornerBracket position="tr" />
              <CornerBracket position="bl" />
              <CornerBracket position="br" />
              <div
                style={{
                  position: 'relative',
                  ...serif,
                  fontSize: 15,
                  color: '#fff',
                  textShadow: '0 1px 4px rgba(0,0,0,0.6)',
                }}
              >
                {status === 'requesting' ? 'Starting camera...' : 'Point at a barcode'}
              </div>
            </>
          )}

          {lookingUp && (
            <div
              style={{
                position: 'absolute',
                inset: 0,
                background: 'rgba(0,0,0,0.55)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                ...serif,
                fontSize: 15,
                color: '#fff',
              }}
            >
              Looking it up...
            </div>
          )}

          {(status === 'denied' || status === 'unsupported' || status === 'not-found') && (
            <div style={{ padding: '32px 24px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10, textAlign: 'center' }}>
              <div style={{ ...serif, fontSize: 17, color: 'var(--text-heading)' }}>
                {status === 'denied' && 'Camera access denied'}
                {status === 'unsupported' && "Camera isn't available here"}
                {status === 'not-found' && 'Barcode not found'}
              </div>
              <div style={{ fontSize: 13, color: 'var(--text-tertiary)', ...sans, lineHeight: 1.6, maxWidth: 260 }}>
                {status === 'denied' && 'Allow camera access in your browser settings, then try again -- or add the product manually below.'}
                {status === 'unsupported' && "This device or browser can't open the camera. Add the product manually below instead."}
                {status === 'not-found' && "That barcode isn't in Stackd yet. Add it manually and it'll be searchable for everyone once approved."}
              </div>
              {status === 'not-found' ? (
                <button
                  onClick={() => navigate('/add-product', { state: { upc: scannedUpc } })}
                  className="stackd-press"
                  style={{
                    marginTop: 4,
                    background: 'var(--tier-teal)',
                    color: 'var(--bg)',
                    border: 'none',
                    borderRadius: 20,
                    padding: '10px 20px',
                    fontSize: 14,
                    fontWeight: 600,
                    cursor: 'pointer',
                    ...sans,
                  }}
                >
                  Add this product
                </button>
              ) : (
                <button
                  onClick={startScanning}
                  className="stackd-press"
                  style={{
                    marginTop: 4,
                    background: 'none',
                    border: '0.5px solid var(--tier-teal-border)',
                    color: 'var(--tier-teal)',
                    borderRadius: 20,
                    padding: '10px 20px',
                    fontSize: 14,
                    fontWeight: 600,
                    cursor: 'pointer',
                    ...sans,
                  }}
                >
                  Try again
                </button>
              )}
            </div>
          )}
        </div>

        {/* OR divider */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ flex: 1, height: 1, background: 'var(--border-subtle)' }} />
          <span style={{ fontSize: 11, color: 'var(--text-quiet)', ...sans, letterSpacing: '0.08em' }}>OR</span>
          <div style={{ flex: 1, height: 1, background: 'var(--border-subtle)' }} />
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <OptionCard
            icon={<Pencil size={20} />}
            iconColor="var(--tier-purple)"
            iconBg="var(--tier-purple-bg)"
            title="Add manually"
            description="Enter the product details yourself."
            onClick={() => navigate('/add-product')}
          />
          <OptionCard
            icon={<Search size={20} />}
            iconColor="var(--tier-teal)"
            iconBg="var(--tier-teal-bg)"
            title="Search products"
            description="Search our database for your product."
            onClick={() => navigate('/search')}
          />
        </div>

        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 14,
            background: 'var(--bg-card)',
            border: '0.5px solid var(--border)',
            borderRadius: 16,
            padding: 16,
            marginTop: 4,
          }}
        >
          <div
            style={{
              width: 40,
              height: 40,
              borderRadius: 12,
              background: 'var(--bg-subtle)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
            }}
          >
            <ShieldCheck size={19} color="var(--text-primary)" />
          </div>
          <div>
            <div style={{ ...serif, fontSize: 15, color: 'var(--text-heading)' }}>We've got your back</div>
            <div style={{ fontSize: 12, color: 'var(--text-tertiary)', ...sans, marginTop: 2, lineHeight: 1.4 }}>All products are verified and reviewed for your health and safety.</div>
          </div>
        </div>
      </div>
    </div>
  )
}
