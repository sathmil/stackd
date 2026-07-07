import { useState, useEffect } from 'react'
import Cropper from 'react-easy-crop'
import { cropImageToBlob } from '../lib/storage'

const sans = { fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif', fontWeight: 500 }
const serif = { fontFamily: 'Georgia, "Times New Roman", serif' }

/**
 * Full-screen crop/zoom step between picking a photo and uploading it as
 * an avatar. Uses `position: absolute` (not `fixed`) since it needs to
 * cover the app shell, which is itself a centered, max-430px-wide
 * `position: relative` container rather than the full browser viewport --
 * see App.jsx's AppShell.
 * @param {{ file: File, onCancel: () => void, onCropped: (blob: Blob) => void }} props
 */
export default function AvatarCropModal({ file, onCancel, onCropped }) {
  const [imageSrc, setImageSrc] = useState(null)
  const [crop, setCrop] = useState({ x: 0, y: 0 })
  const [zoom, setZoom] = useState(1)
  const [croppedAreaPixels, setCroppedAreaPixels] = useState(null)
  const [saving, setSaving] = useState(false)

  // Object URL is created (and revoked) inside the effect itself, not via
  // useMemo -- StrictMode's dev-mode double-invoke would otherwise run the
  // cleanup from the first (throwaway) pass and revoke the URL the second,
  // real pass still needs, leaving the image permanently broken.
  useEffect(() => {
    const url = URL.createObjectURL(file)
    setImageSrc(url)
    return () => URL.revokeObjectURL(url)
  }, [file])

  const handleSave = async () => {
    if (!croppedAreaPixels || !imageSrc) return
    setSaving(true)
    const blob = await cropImageToBlob(imageSrc, croppedAreaPixels)
    setSaving(false)
    onCropped(blob)
  }

  return (
    <div style={{ position: 'absolute', inset: 0, background: '#111', display: 'flex', flexDirection: 'column', zIndex: 200 }}>
      <div style={{ padding: '12px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '0.5px solid #1e1e1e', flexShrink: 0 }}>
        <button onClick={onCancel} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 14, color: '#8f8f8f', ...sans, padding: 0 }}>
          Cancel
        </button>
        <span style={{ ...serif, fontSize: 16, color: '#e8e4dc' }}>Adjust photo</span>
        <button
          onClick={handleSave}
          disabled={saving || !croppedAreaPixels}
          style={{ background: 'none', border: 'none', cursor: saving ? 'default' : 'pointer', fontSize: 14, color: '#5ecfcf', ...sans, fontWeight: 500, padding: 0, opacity: saving ? 0.5 : 1 }}
        >
          {saving ? 'Saving...' : 'Save'}
        </button>
      </div>

      <div style={{ position: 'relative', flex: 1, background: '#000' }}>
        {imageSrc && (
          <Cropper
            image={imageSrc}
            crop={crop}
            zoom={zoom}
            aspect={1}
            cropShape="round"
            showGrid={false}
            onCropChange={setCrop}
            onZoomChange={setZoom}
            onCropComplete={(_, pixels) => setCroppedAreaPixels(pixels)}
          />
        )}
      </div>

      <div style={{ padding: '16px 20px 24px', display: 'flex', alignItems: 'center', gap: 12, flexShrink: 0 }}>
        <span style={{ fontSize: 17, color: '#8f8f8f' }}>−</span>
        <input type="range" min={1} max={3} step={0.01} value={zoom} onChange={(e) => setZoom(Number(e.target.value))} style={{ flex: 1 }} aria-label="Zoom" />
        <span style={{ fontSize: 17, color: '#8f8f8f' }}>+</span>
      </div>
    </div>
  )
}
