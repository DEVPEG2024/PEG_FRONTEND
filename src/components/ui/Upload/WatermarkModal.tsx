import { useState, useRef, useEffect, useCallback } from 'react'
import { HiX, HiPhotograph, HiCheck } from 'react-icons/hi'

const POSITIONS = [
  { key: 'nw', label: '↖', gravity: 'northwest' },
  { key: 'n',  label: '↑', gravity: 'north' },
  { key: 'ne', label: '↗', gravity: 'northeast' },
  { key: 'w',  label: '←', gravity: 'west' },
  { key: 'c',  label: '●', gravity: 'center' },
  { key: 'e',  label: '→', gravity: 'east' },
  { key: 'sw', label: '↙', gravity: 'southwest' },
  { key: 's',  label: '↓', gravity: 'south' },
  { key: 'se', label: '↘', gravity: 'southeast' },
] as const

type Position = typeof POSITIONS[number]['key']

const LOGO_STORAGE_KEY = 'peg_watermark_logo'

function saveLogo(dataUrl: string) {
  try { localStorage.setItem(LOGO_STORAGE_KEY, dataUrl) } catch { /* quota */ }
}
function loadLogo(): string | null {
  try { return localStorage.getItem(LOGO_STORAGE_KEY) } catch { return null }
}

interface WatermarkModalProps {
  file: File
  onApply: (watermarkedFile: File) => void
  onClose: () => void
}

export default function WatermarkModal({ file, onApply, onClose }: WatermarkModalProps) {
  const [logoSrc, setLogoSrc] = useState<string | null>(loadLogo)
  const [position, setPosition] = useState<Position>('se')
  const [scale, setScale] = useState(15) // % of image width
  const [opacity, setOpacity] = useState(100)
  const [applying, setApplying] = useState(false)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const logoInputRef = useRef<HTMLInputElement>(null)

  // Load the product image as HTMLImageElement
  const [productImg, setProductImg] = useState<HTMLImageElement | null>(null)
  const [logoImg, setLogoImg] = useState<HTMLImageElement | null>(null)
  const [loadError, setLoadError] = useState<string | null>(null)

  useEffect(() => {
    let blobUrl: string | null = null
    const previewUrl = (file as File & { previewUrl?: string }).previewUrl

    if (file.size > 0) {
      // File has actual content — use directly (local uploads, already fetched files)
      blobUrl = URL.createObjectURL(file)
      const img = new Image()
      img.onload = () => setProductImg(img)
      img.src = blobUrl
    } else if (previewUrl) {
      // S3 image: use <img crossOrigin="anonymous"> with cache-buster.
      // The cache-buster forces a fresh request so the browser sends the Origin header
      // and S3 returns CORS headers (without it, browser reuses a cached non-CORS response).
      const img = new Image()
      img.crossOrigin = 'anonymous'
      img.onload = () => setProductImg(img)
      img.onerror = () => setLoadError(
        'Impossible de charger l\'image pour modification. Vérifiez les CORS du bucket S3.'
      )
      img.src = previewUrl + (previewUrl.includes('?') ? '&' : '?') + '_w=' + Date.now()
    } else {
      setLoadError('Image vide — veuillez d\'abord enregistrer le produit')
    }

    return () => { if (blobUrl) URL.revokeObjectURL(blobUrl) }
  }, [file])

  useEffect(() => {
    if (!logoSrc) { setLogoImg(null); return }
    const img = new Image()
    img.onload = () => setLogoImg(img)
    img.src = logoSrc
  }, [logoSrc])

  const drawPreview = useCallback(() => {
    const canvas = canvasRef.current
    if (!canvas || !productImg) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const maxW = 500, maxH = 400
    const ratio = Math.min(maxW / productImg.width, maxH / productImg.height, 1)
    canvas.width = productImg.width * ratio
    canvas.height = productImg.height * ratio
    ctx.drawImage(productImg, 0, 0, canvas.width, canvas.height)

    if (!logoImg) return
    const logoW = canvas.width * (scale / 100)
    const logoH = (logoImg.height / logoImg.width) * logoW
    const margin = 10

    let x = margin, y = margin
    if (position.includes('e')) x = canvas.width - logoW - margin
    if (position === 'n' || position === 's' || position === 'c') x = (canvas.width - logoW) / 2
    if (position.includes('s')) y = canvas.height - logoH - margin
    if (position === 'w' || position === 'e' || position === 'c') y = (canvas.height - logoH) / 2

    ctx.globalAlpha = opacity / 100
    ctx.drawImage(logoImg, x, y, logoW, logoH)
    ctx.globalAlpha = 1
  }, [productImg, logoImg, position, scale, opacity])

  useEffect(() => { drawPreview() }, [drawPreview])

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0]
    if (!f) return
    const reader = new FileReader()
    reader.onload = () => {
      const dataUrl = reader.result as string
      setLogoSrc(dataUrl)
      saveLogo(dataUrl)
    }
    reader.readAsDataURL(f)
  }

  const handleApply = async () => {
    if (!productImg || !logoImg) return
    setApplying(true)

    // Draw full-resolution watermarked image
    const canvas = document.createElement('canvas')
    canvas.width = productImg.naturalWidth
    canvas.height = productImg.naturalHeight
    const ctx = canvas.getContext('2d')!
    ctx.drawImage(productImg, 0, 0)

    const logoW = canvas.width * (scale / 100)
    const logoH = (logoImg.naturalHeight / logoImg.naturalWidth) * logoW
    const margin = Math.round(canvas.width * 0.02)

    let x = margin, y = margin
    if (position.includes('e')) x = canvas.width - logoW - margin
    if (position === 'n' || position === 's' || position === 'c') x = (canvas.width - logoW) / 2
    if (position.includes('s')) y = canvas.height - logoH - margin
    if (position === 'w' || position === 'e' || position === 'c') y = (canvas.height - logoH) / 2

    ctx.globalAlpha = opacity / 100
    ctx.drawImage(logoImg, x, y, logoW, logoH)
    ctx.globalAlpha = 1

    canvas.toBlob((blob) => {
      if (!blob) { setApplying(false); return }
      const watermarked = new File([blob], file.name, { type: file.type || 'image/png' })
      onApply(watermarked)
    }, file.type || 'image/png', 0.92)
  }

  const overlayStyle: React.CSSProperties = {
    position: 'fixed', inset: 0, zIndex: 9999,
    background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(6px)',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
  }
  const modalStyle: React.CSSProperties = {
    background: 'linear-gradient(160deg, #1a2a44 0%, #111c2e 100%)',
    border: '1px solid rgba(255,255,255,0.1)', borderRadius: '16px',
    padding: '24px', maxWidth: '580px', width: '95vw', maxHeight: '90vh',
    overflow: 'auto', fontFamily: 'Inter, sans-serif', color: '#fff',
  }
  const btnStyle = (bg: string): React.CSSProperties => ({
    padding: '8px 16px', border: 'none', borderRadius: '8px',
    background: bg, color: '#fff', fontSize: '13px', fontWeight: 600,
    cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px',
  })

  return (
    <div style={overlayStyle} onClick={onClose}>
      <div style={modalStyle} onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
          <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 700 }}>Ajouter un logo</h3>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.5)', cursor: 'pointer' }}><HiX size={20} /></button>
        </div>

        {/* Logo upload */}
        <div style={{ marginBottom: '16px' }}>
          <input ref={logoInputRef} type="file" accept="image/png,image/webp,image/svg+xml" onChange={handleLogoUpload} style={{ display: 'none' }} />
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <button onClick={() => logoInputRef.current?.click()} style={btnStyle('rgba(47,111,237,0.3)')}>
              <HiPhotograph size={14} /> {logoSrc ? 'Changer le logo' : 'Charger un logo PNG'}
            </button>
            {logoSrc && (
              <img src={logoSrc} alt="logo" style={{ height: '32px', objectFit: 'contain', background: 'rgba(255,255,255,0.1)', borderRadius: '6px', padding: '4px' }} />
            )}
          </div>
          <p style={{ fontSize: '11px', color: 'rgba(255,255,255,0.35)', marginTop: '6px' }}>
            Le logo est sauvegardé localement pour la prochaine utilisation.
          </p>
        </div>

        {/* Preview */}
        <div style={{ background: 'rgba(0,0,0,0.3)', borderRadius: '10px', padding: '10px', marginBottom: '16px', textAlign: 'center' }}>
          {loadError ? (
            <p style={{ color: '#f87171', fontSize: '13px', padding: '40px 0' }}>{loadError}</p>
          ) : (
            <canvas ref={canvasRef} style={{ maxWidth: '100%', borderRadius: '6px' }} />
          )}
        </div>

        {/* Controls */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' }}>
          {/* Position grid */}
          <div>
            <label style={{ fontSize: '11px', fontWeight: 600, color: 'rgba(255,255,255,0.5)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Position</label>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '4px', marginTop: '8px', maxWidth: '120px' }}>
              {POSITIONS.map((p) => (
                <button
                  key={p.key}
                  onClick={() => setPosition(p.key)}
                  style={{
                    width: '34px', height: '34px', borderRadius: '6px', border: 'none',
                    background: position === p.key ? 'rgba(47,111,237,0.4)' : 'rgba(255,255,255,0.06)',
                    color: position === p.key ? '#6fa3f5' : 'rgba(255,255,255,0.4)',
                    fontSize: '14px', cursor: 'pointer', transition: 'all 0.15s',
                  }}
                >
                  {p.label}
                </button>
              ))}
            </div>
          </div>

          {/* Sliders */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <div>
              <label style={{ fontSize: '11px', fontWeight: 600, color: 'rgba(255,255,255,0.5)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                Taille: {scale}%
              </label>
              <input type="range" min={5} max={50} value={scale} onChange={(e) => setScale(Number(e.target.value))}
                style={{ width: '100%', marginTop: '6px', accentColor: '#2f6fed' }} />
            </div>
            <div>
              <label style={{ fontSize: '11px', fontWeight: 600, color: 'rgba(255,255,255,0.5)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                Opacite: {opacity}%
              </label>
              <input type="range" min={10} max={100} value={opacity} onChange={(e) => setOpacity(Number(e.target.value))}
                style={{ width: '100%', marginTop: '6px', accentColor: '#2f6fed' }} />
            </div>
          </div>
        </div>

        {/* Actions */}
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
          <button onClick={onClose} style={btnStyle('rgba(255,255,255,0.08)')}>Annuler</button>
          <button
            onClick={handleApply}
            disabled={!logoImg || applying}
            style={{
              ...btnStyle(logoImg && !applying ? 'linear-gradient(90deg, #22c55e, #16a34a)' : 'rgba(255,255,255,0.08)'),
              cursor: logoImg && !applying ? 'pointer' : 'not-allowed',
              boxShadow: logoImg && !applying ? '0 4px 14px rgba(34,197,94,0.3)' : 'none',
            }}
          >
            <HiCheck size={14} /> {applying ? 'Application...' : 'Appliquer'}
          </button>
        </div>
      </div>
    </div>
  )
}
