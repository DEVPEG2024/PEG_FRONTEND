import { useState, useRef, useEffect, useCallback } from 'react'
import { HiX, HiPhotograph, HiCheck } from 'react-icons/hi'

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
  // Logo position as % of image (0–1), default bottom-right
  const [logoPos, setLogoPos] = useState({ x: 0.85, y: 0.85 })
  const [scale, setScale] = useState(15)
  const [opacity, setOpacity] = useState(100)
  const [applying, setApplying] = useState(false)
  const [dragging, setDragging] = useState(false)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const logoInputRef = useRef<HTMLInputElement>(null)

  const [productImg, setProductImg] = useState<HTMLImageElement | null>(null)
  const [logoImg, setLogoImg] = useState<HTMLImageElement | null>(null)
  const [loadError, setLoadError] = useState<string | null>(null)

  // Track canvas display ratio for mouse coordinate conversion
  const canvasRatioRef = useRef(1)

  useEffect(() => {
    let blobUrl: string | null = null
    const previewUrl = (file as File & { previewUrl?: string }).previewUrl

    if (file.size > 0) {
      blobUrl = URL.createObjectURL(file)
      const img = new Image()
      img.onload = () => setProductImg(img)
      img.src = blobUrl
    } else if (previewUrl) {
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

  // Compute logo rect from normalized position (center of logo)
  const getLogoRect = useCallback((canvasW: number, canvasH: number) => {
    if (!logoImg) return { x: 0, y: 0, w: 0, h: 0 }
    const w = canvasW * (scale / 100)
    const h = (logoImg.height / logoImg.width) * w
    const x = logoPos.x * canvasW - w / 2
    const y = logoPos.y * canvasH - h / 2
    return { x, y, w, h }
  }, [logoImg, logoPos, scale])

  const drawPreview = useCallback(() => {
    const canvas = canvasRef.current
    if (!canvas || !productImg) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const maxW = 500, maxH = 400
    const ratio = Math.min(maxW / productImg.width, maxH / productImg.height, 1)
    canvas.width = productImg.width * ratio
    canvas.height = productImg.height * ratio
    canvasRatioRef.current = ratio
    ctx.drawImage(productImg, 0, 0, canvas.width, canvas.height)

    if (!logoImg) return
    const { x, y, w, h } = getLogoRect(canvas.width, canvas.height)

    ctx.globalAlpha = opacity / 100
    ctx.drawImage(logoImg, x, y, w, h)
    ctx.globalAlpha = 1

    // Draw subtle border around logo when not applying
    if (!applying) {
      ctx.strokeStyle = 'rgba(47,111,237,0.5)'
      ctx.lineWidth = 1
      ctx.setLineDash([4, 4])
      ctx.strokeRect(x, y, w, h)
      ctx.setLineDash([])
    }
  }, [productImg, logoImg, logoPos, scale, opacity, getLogoRect, applying])

  useEffect(() => { drawPreview() }, [drawPreview])

  // --- Drag handlers ---
  const getCanvasPos = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current
    if (!canvas) return null
    const rect = canvas.getBoundingClientRect()
    const scaleX = canvas.width / rect.width
    const scaleY = canvas.height / rect.height
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY
    return {
      x: (clientX - rect.left) * scaleX,
      y: (clientY - rect.top) * scaleY,
    }
  }

  const handlePointerDown = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (!logoImg || !canvasRef.current) return
    const pos = getCanvasPos(e)
    if (!pos) return
    const { x, y, w, h } = getLogoRect(canvasRef.current.width, canvasRef.current.height)
    // Check if click is within logo bounds
    if (pos.x >= x && pos.x <= x + w && pos.y >= y && pos.y <= y + h) {
      setDragging(true)
      e.preventDefault()
    }
  }

  const handlePointerMove = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (!dragging || !canvasRef.current) return
    const pos = getCanvasPos(e)
    if (!pos) return
    e.preventDefault()
    setLogoPos({
      x: Math.max(0, Math.min(1, pos.x / canvasRef.current.width)),
      y: Math.max(0, Math.min(1, pos.y / canvasRef.current.height)),
    })
  }

  const handlePointerUp = () => { setDragging(false) }

  // Also allow clicking anywhere on canvas to move logo there
  const handleCanvasClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!logoImg || !canvasRef.current || dragging) return
    const pos = getCanvasPos(e)
    if (!pos) return
    const { x, y, w, h } = getLogoRect(canvasRef.current.width, canvasRef.current.height)
    // Only move if click is outside logo (inside = drag start)
    if (pos.x < x || pos.x > x + w || pos.y < y || pos.y > y + h) {
      setLogoPos({
        x: pos.x / canvasRef.current.width,
        y: pos.y / canvasRef.current.height,
      })
    }
  }

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

    const canvas = document.createElement('canvas')
    canvas.width = productImg.naturalWidth
    canvas.height = productImg.naturalHeight
    const ctx = canvas.getContext('2d')!
    ctx.drawImage(productImg, 0, 0)

    const { x, y, w, h } = getLogoRect(canvas.width, canvas.height)

    ctx.globalAlpha = opacity / 100
    ctx.drawImage(logoImg, x, y, w, h)
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
    padding: '24px', maxWidth: '620px', width: '95vw', maxHeight: '90vh',
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
            Le logo est sauvegardé localement. {logoImg && 'Glissez-le sur l\'image pour le positionner.'}
          </p>
        </div>

        {/* Preview — draggable canvas */}
        <div style={{ background: 'rgba(0,0,0,0.3)', borderRadius: '10px', padding: '10px', marginBottom: '16px', textAlign: 'center' }}>
          {loadError ? (
            <p style={{ color: '#f87171', fontSize: '13px', padding: '40px 0' }}>{loadError}</p>
          ) : (
            <canvas
              ref={canvasRef}
              style={{ maxWidth: '100%', borderRadius: '6px', cursor: logoImg ? (dragging ? 'grabbing' : 'grab') : 'default' }}
              onMouseDown={handlePointerDown}
              onMouseMove={handlePointerMove}
              onMouseUp={handlePointerUp}
              onMouseLeave={handlePointerUp}
              onTouchStart={handlePointerDown}
              onTouchMove={handlePointerMove}
              onTouchEnd={handlePointerUp}
              onClick={handleCanvasClick}
            />
          )}
        </div>

        {/* Controls — sliders only */}
        <div style={{ display: 'flex', gap: '20px', marginBottom: '16px' }}>
          <div style={{ flex: 1 }}>
            <label style={{ fontSize: '11px', fontWeight: 600, color: 'rgba(255,255,255,0.5)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Taille: {scale}%
            </label>
            <input type="range" min={3} max={60} value={scale} onChange={(e) => setScale(Number(e.target.value))}
              style={{ width: '100%', marginTop: '6px', accentColor: '#2f6fed' }} />
          </div>
          <div style={{ flex: 1 }}>
            <label style={{ fontSize: '11px', fontWeight: 600, color: 'rgba(255,255,255,0.5)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Opacit&eacute;: {opacity}%
            </label>
            <input type="range" min={10} max={100} value={opacity} onChange={(e) => setOpacity(Number(e.target.value))}
              style={{ width: '100%', marginTop: '6px', accentColor: '#2f6fed' }} />
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
