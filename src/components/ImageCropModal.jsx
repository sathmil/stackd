import { useState, useEffect } from 'react'
import Cropper from 'react-easy-crop'
import { X, Check, ZoomIn, ZoomOut } from 'lucide-react'
import { cropImageToBlob } from '../lib/storage'

const sans = { fontFamily: 'var(--font-sans)', fontWeight: 500 }
const serif = { fontFamily: 'var(--font-serif)' }

const OUTPUT_SIZE = 800

/**
 * Same crop/zoom flow as AvatarCropModal, but a rectangular (not round) crop
 * -- own component rather than a shared one with a `cropShape` prop since
 * the two call sites want different chrome (this one has icon buttons, not
 * text links) and diverging further later is likely. `aspect` defaults to a
 * square (product photos); pass e.g. 3/2 for a landscape cover photo so it
 * isn't over-cropped when shown in a wide card.
 * @param {{ file: File, aspect?: number, onCancel: () => void, onCropped: (blob: Blob) => void }} props
 */
export default function ImageCropModal({ file, aspect = 1, onCancel, onCropped }) {
  const [imageSrc, setImageSrc] = useState(null)
  const [crop, setCrop] = useState({ x: 0, y: 0 })
  const [zoom, setZoom] = useState(1)
  const [croppedAreaPixels, setCroppedAreaPixels] = useState(null)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    const url = URL.createObjectURL(file)
    setImageSrc(url)
    return () => URL.revokeObjectURL(url)
  }, [file])

  const handleSave = async () => {
    if (!croppedAreaPixels || !imageSrc) return
    setSaving(true)
    const blob = await cropImageToBlob(imageSrc, croppedAreaPixels, OUTPUT_SIZE, Math.round(OUTPUT_SIZE / aspect))
    setSaving(false)
    onCropped(blob)
  }

  return (
    <div style={{ position: 'absolute', inset: 0, background: 'var(--bg-nav)', display: 'flex', flexDirection: 'column', zIndex: 200 }}>
      <div style={{ padding: '12px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '0.5px solid var(--border-subtle)', flexShrink: 0 }}>
        <button
          onClick={onCancel}
          style={{
            width: 32,
            height: 32,
            borderRadius: '50%',
            background: 'var(--bg-subtle)',
            border: '0.5px solid var(--border)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
            color: 'var(--text-primary)',
          }}
        >
          <X size={16} strokeWidth={2.25} />
        </button>
        <span style={{ ...serif, fontWeight: 700, fontSize: 17, color: 'var(--text-heading)', letterSpacing: '-0.01em' }}>Adjust Photo</span>
        <button
          onClick={handleSave}
          disabled={saving || !croppedAreaPixels}
          className="stackd-press"
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 5,
            background: 'var(--tier-teal-bg)',
            border: '0.5px solid var(--tier-teal-border)',
            borderRadius: 20,
            padding: '7px 13px',
            cursor: saving ? 'default' : 'pointer',
            fontSize: 12,
            fontWeight: 700,
            color: 'var(--tier-teal)',
            ...sans,
            opacity: saving ? 0.5 : 1,
          }}
        >
          {saving ? 'Saving...' : <Check size={14} />}
          {!saving && 'Save'}
        </button>
      </div>

      <div style={{ position: 'relative', flex: 1, background: '#000' }}>
        {imageSrc && (
          <Cropper
            image={imageSrc}
            crop={crop}
            zoom={zoom}
            aspect={aspect}
            cropShape="rect"
            showGrid={true}
            onCropChange={setCrop}
            onZoomChange={setZoom}
            onCropComplete={(_, pixels) => setCroppedAreaPixels(pixels)}
          />
        )}
      </div>

      <div style={{ padding: '16px 20px 24px', display: 'flex', alignItems: 'center', gap: 12, flexShrink: 0 }}>
        <ZoomOut size={18} color="var(--text-muted)" />
        <input type="range" min={1} max={3} step={0.01} value={zoom} onChange={(e) => setZoom(Number(e.target.value))} style={{ flex: 1 }} aria-label="Zoom" />
        <ZoomIn size={18} color="var(--text-muted)" />
      </div>
    </div>
  )
}
