import { useState, useRef, useEffect, useCallback } from 'react'
import { HiX, HiPhotograph, HiCheck, HiRefresh } from 'react-icons/hi'

const LOGO_STORAGE_KEY = 'peg_watermark_logo'

function saveLogo(dataUrl: string) {
  try { localStorage.setItem(LOGO_STORAGE_KEY, dataUrl) } catch { /* quota */ }
}
function loadLogo(): string | null {
  try { return localStorage.getItem(LOGO_STORAGE_KEY) } catch { return null }
}

type Pt = { x: number; y: number }

const ZERO_OFFSETS: Pt[] = [
  { x: 0, y: 0 },
  { x: 0, y: 0 },
  { x: 0, y: 0 },
  { x: 0, y: 0 },
]

const HANDLE_RADIUS = 9

// ─── Transparence PNG ────────────────────────────────────────────────────────

function isNearWhite(r: number, g: number, b: number) {
  return r > 235 && g > 235 && b > 235
}

/**
 * Détecte si le logo a un fond blanc opaque (échantillonne les 4 coins).
 * Sert à pré-cocher « Supprimer le fond blanc ».
 */
function detectWhiteBackground(img: HTMLImageElement): boolean {
  try {
    const c = document.createElement('canvas')
    c.width = img.width
    c.height = img.height
    const ctx = c.getContext('2d')
    if (!ctx) return false
    ctx.drawImage(img, 0, 0)
    const corners = [
      [1, 1],
      [img.width - 2, 1],
      [img.width - 2, img.height - 2],
      [1, img.height - 2],
    ]
    let whiteCorners = 0
    for (const [x, y] of corners) {
      const d = ctx.getImageData(x, y, 1, 1).data
      if (d[3] > 200 && isNearWhite(d[0], d[1], d[2])) whiteCorners++
    }
    return whiteCorners >= 3
  } catch {
    return false
  }
}

/**
 * Rend transparent le fond blanc d'un logo par remplissage depuis les bords
 * (flood fill) : le blanc À L'INTÉRIEUR du logo (texte, détails) est préservé,
 * seul le fond connecté aux bords devient transparent.
 */
function removeWhiteBackground(img: HTMLImageElement): HTMLCanvasElement {
  const c = document.createElement('canvas')
  c.width = img.width
  c.height = img.height
  const ctx = c.getContext('2d')!
  ctx.drawImage(img, 0, 0)
  try {
    const w = c.width, h = c.height
    const imageData = ctx.getImageData(0, 0, w, h)
    const d = imageData.data
    const visited = new Uint8Array(w * h)
    const queue: number[] = []

    const tryPush = (x: number, y: number) => {
      if (x < 0 || y < 0 || x >= w || y >= h) return
      const idx = y * w + x
      if (visited[idx]) return
      const p = idx * 4
      if (d[p + 3] > 0 && isNearWhite(d[p], d[p + 1], d[p + 2])) {
        visited[idx] = 1
        queue.push(idx)
      } else {
        visited[idx] = 1
      }
    }

    // Amorce : tous les pixels du bord
    for (let x = 0; x < w; x++) { tryPush(x, 0); tryPush(x, h - 1) }
    for (let y = 0; y < h; y++) { tryPush(0, y); tryPush(w - 1, y) }
    // Ne garder dans la queue que les blancs du bord (visited des non-blancs déjà posé)
    let head = 0
    while (head < queue.length) {
      const idx = queue[head++]
      d[idx * 4 + 3] = 0
      const x = idx % w, y = (idx / w) | 0
      const neighbors: [number, number][] = [[x + 1, y], [x - 1, y], [x, y + 1], [x, y - 1]]
      for (const [nx, ny] of neighbors) {
        if (nx < 0 || ny < 0 || nx >= w || ny >= h) continue
        const nIdx = ny * w + nx
        if (visited[nIdx]) continue
        const p = nIdx * 4
        if (d[p + 3] > 0 && isNearWhite(d[p], d[p + 1], d[p + 2])) {
          visited[nIdx] = 1
          queue.push(nIdx)
        } else {
          visited[nIdx] = 1
        }
      }
    }
    ctx.putImageData(imageData, 0, 0)
  } catch {
    // getImageData peut échouer (CORS) — on garde le logo tel quel
  }
  return c
}

// ─── Perspective (homographie carré unité → quadrilatère) ───────────────────

type Homography = { a: number; b: number; c: number; d: number; e: number; f: number; g: number; h: number }

function computeHomography(q: Pt[]): Homography {
  // Carré unité (0,0)(1,0)(1,1)(0,1) → q[0..3] (TL, TR, BR, BL)
  const [p0, p1, p2, p3] = q
  const dx1 = p1.x - p2.x, dx2 = p3.x - p2.x, dx3 = p0.x - p1.x + p2.x - p3.x
  const dy1 = p1.y - p2.y, dy2 = p3.y - p2.y, dy3 = p0.y - p1.y + p2.y - p3.y
  let g = 0, h = 0
  if (dx3 !== 0 || dy3 !== 0) {
    const denom = dx1 * dy2 - dx2 * dy1
    if (denom !== 0) {
      g = (dx3 * dy2 - dx2 * dy3) / denom
      h = (dx1 * dy3 - dx3 * dy1) / denom
    }
  }
  return {
    a: p1.x - p0.x + g * p1.x,
    b: p3.x - p0.x + h * p3.x,
    c: p0.x,
    d: p1.y - p0.y + g * p1.y,
    e: p3.y - p0.y + h * p3.y,
    f: p0.y,
    g,
    h,
  }
}

function mapPoint(H: Homography, u: number, v: number): Pt {
  const denom = H.g * u + H.h * v + 1
  return {
    x: (H.a * u + H.b * v + H.c) / denom,
    y: (H.d * u + H.e * v + H.f) / denom,
  }
}

/** Dessine un triangle du logo source vers sa destination (transformation affine + clip). */
function drawTriangle(
  ctx: CanvasRenderingContext2D,
  img: CanvasImageSource,
  s0: Pt, s1: Pt, s2: Pt,
  d0: Pt, d1: Pt, d2: Pt,
) {
  // Dilatation légère du triangle destination autour de son centre pour éviter
  // les fines coutures entre triangles adjacents
  const cx = (d0.x + d1.x + d2.x) / 3
  const cy = (d0.y + d1.y + d2.y) / 3
  const grow = (p: Pt): Pt => ({ x: cx + (p.x - cx) * 1.04, y: cy + (p.y - cy) * 1.04 })
  const g0 = grow(d0), g1 = grow(d1), g2 = grow(d2)

  const denom = s0.x * (s1.y - s2.y) + s1.x * (s2.y - s0.y) + s2.x * (s0.y - s1.y)
  if (denom === 0) return
  const a = (d0.x * (s1.y - s2.y) + d1.x * (s2.y - s0.y) + d2.x * (s0.y - s1.y)) / denom
  const b = (d0.y * (s1.y - s2.y) + d1.y * (s2.y - s0.y) + d2.y * (s0.y - s1.y)) / denom
  const cc = (d0.x * (s2.x - s1.x) + d1.x * (s0.x - s2.x) + d2.x * (s1.x - s0.x)) / denom
  const dd = (d0.y * (s2.x - s1.x) + d1.y * (s0.x - s2.x) + d2.y * (s1.x - s0.x)) / denom
  const e = (d0.x * (s1.x * s2.y - s2.x * s1.y) + d1.x * (s2.x * s0.y - s0.x * s2.y) + d2.x * (s0.x * s1.y - s1.x * s0.y)) / denom
  const f = (d0.y * (s1.x * s2.y - s2.x * s1.y) + d1.y * (s2.x * s0.y - s0.x * s2.y) + d2.y * (s0.x * s1.y - s1.x * s0.y)) / denom

  ctx.save()
  ctx.beginPath()
  ctx.moveTo(g0.x, g0.y)
  ctx.lineTo(g1.x, g1.y)
  ctx.lineTo(g2.x, g2.y)
  ctx.closePath()
  ctx.clip()
  ctx.transform(a, b, cc, dd, e, f)
  ctx.drawImage(img, 0, 0)
  ctx.restore()
}

/**
 * Dessine le logo déformé en perspective : le logo est découpé en une grille
 * de triangles, chacun projeté via l'homographie vers le quadrilatère cible.
 * Rendu sur un canvas intermédiaire pour appliquer l'opacité sans coutures.
 */
function drawWarpedLogo(
  ctx: CanvasRenderingContext2D,
  logo: CanvasImageSource,
  logoW: number,
  logoH: number,
  corners: Pt[],
  canvasW: number,
  canvasH: number,
  opacity: number,
  gridSize: number,
) {
  const off = document.createElement('canvas')
  off.width = canvasW
  off.height = canvasH
  const octx = off.getContext('2d')
  if (!octx) return
  const H = computeHomography(corners)
  const N = gridSize
  for (let i = 0; i < N; i++) {
    for (let j = 0; j < N; j++) {
      const u0 = i / N, u1 = (i + 1) / N
      const v0 = j / N, v1 = (j + 1) / N
      const sTL = { x: u0 * logoW, y: v0 * logoH }
      const sTR = { x: u1 * logoW, y: v0 * logoH }
      const sBR = { x: u1 * logoW, y: v1 * logoH }
      const sBL = { x: u0 * logoW, y: v1 * logoH }
      const dTL = mapPoint(H, u0, v0)
      const dTR = mapPoint(H, u1, v0)
      const dBR = mapPoint(H, u1, v1)
      const dBL = mapPoint(H, u0, v1)
      drawTriangle(octx, logo, sTL, sTR, sBR, dTL, dTR, dBR)
      drawTriangle(octx, logo, sTL, sBR, sBL, dTL, dBR, dBL)
    }
  }
  ctx.globalAlpha = opacity / 100
  ctx.drawImage(off, 0, 0)
  ctx.globalAlpha = 1
}

function pointInQuad(p: Pt, q: Pt[]): boolean {
  // Test par signe des produits vectoriels (quad convexe ou légèrement déformé)
  let sign = 0
  for (let i = 0; i < 4; i++) {
    const a = q[i], b = q[(i + 1) % 4]
    const cross = (b.x - a.x) * (p.y - a.y) - (b.y - a.y) * (p.x - a.x)
    if (cross !== 0) {
      const s = cross > 0 ? 1 : -1
      if (sign === 0) sign = s
      else if (s !== sign) return false
    }
  }
  return true
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
  const [rotation, setRotation] = useState(0)
  // Décalages des 4 coins (normalisés canvas) — la « perspective »
  const [cornerOffsets, setCornerOffsets] = useState<Pt[]>(ZERO_OFFSETS)
  const [removeBg, setRemoveBg] = useState(false)
  const [applying, setApplying] = useState(false)
  const [dragging, setDragging] = useState<null | 'body' | 0 | 1 | 2 | 3>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const logoInputRef = useRef<HTMLInputElement>(null)

  const [productImg, setProductImg] = useState<HTMLImageElement | null>(null)
  const [logoImg, setLogoImg] = useState<HTMLImageElement | null>(null)
  // Logo effectivement dessiné : PNG d'origine ou version fond-blanc-supprimé
  const [logoSource, setLogoSource] = useState<{ img: CanvasImageSource; w: number; h: number } | null>(null)
  const [loadError, setLoadError] = useState<string | null>(null)

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
    img.onload = () => {
      setLogoImg(img)
      // Pré-cocher la suppression du fond si le logo a un fond blanc opaque
      setRemoveBg(detectWhiteBackground(img))
    }
    img.src = logoSrc
  }, [logoSrc])

  // Version du logo réellement dessinée (transparence préservée dans les deux cas)
  useEffect(() => {
    if (!logoImg) { setLogoSource(null); return }
    if (removeBg) {
      const cleaned = removeWhiteBackground(logoImg)
      setLogoSource({ img: cleaned, w: cleaned.width, h: cleaned.height })
    } else {
      setLogoSource({ img: logoImg, w: logoImg.width, h: logoImg.height })
    }
  }, [logoImg, removeBg])

  const hasPerspective = cornerOffsets.some((o) => o.x !== 0 || o.y !== 0)

  // Coins de base (rectangle positionné/mis à l'échelle/tourné), en px canvas
  const getBaseCorners = useCallback((canvasW: number, canvasH: number): Pt[] => {
    if (!logoSource) return ZERO_OFFSETS
    const w = canvasW * (scale / 100)
    const h = (logoSource.h / logoSource.w) * w
    const cx = logoPos.x * canvasW
    const cy = logoPos.y * canvasH
    const rad = (rotation * Math.PI) / 180
    const cos = Math.cos(rad), sin = Math.sin(rad)
    const rel: [number, number][] = [[-w / 2, -h / 2], [w / 2, -h / 2], [w / 2, h / 2], [-w / 2, h / 2]]
    return rel.map(([px, py]) => ({
      x: cx + px * cos - py * sin,
      y: cy + px * sin + py * cos,
    }))
  }, [logoSource, logoPos, scale, rotation])

  // Coins finaux = base + décalages perspective (TL, TR, BR, BL)
  const getCorners = useCallback((canvasW: number, canvasH: number): Pt[] => {
    const base = getBaseCorners(canvasW, canvasH)
    return base.map((p, i) => ({
      x: p.x + cornerOffsets[i].x * canvasW,
      y: p.y + cornerOffsets[i].y * canvasH,
    }))
  }, [getBaseCorners, cornerOffsets])

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

    if (!logoSource) return
    const corners = getCorners(canvas.width, canvas.height)
    drawWarpedLogo(ctx, logoSource.img, logoSource.w, logoSource.h, corners, canvas.width, canvas.height, opacity, 12)

    // Contour + poignées pendant l'édition
    if (!applying) {
      ctx.strokeStyle = 'rgba(47,111,237,0.6)'
      ctx.lineWidth = 1
      ctx.setLineDash([4, 4])
      ctx.beginPath()
      ctx.moveTo(corners[0].x, corners[0].y)
      for (let i = 1; i < 4; i++) ctx.lineTo(corners[i].x, corners[i].y)
      ctx.closePath()
      ctx.stroke()
      ctx.setLineDash([])
      for (const p of corners) {
        ctx.beginPath()
        ctx.arc(p.x, p.y, HANDLE_RADIUS - 3, 0, Math.PI * 2)
        ctx.fillStyle = '#fff'
        ctx.fill()
        ctx.lineWidth = 2
        ctx.strokeStyle = '#2f6fed'
        ctx.stroke()
      }
    }
  }, [productImg, logoSource, getCorners, opacity, applying])

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
    if (!logoSource || !canvasRef.current) return
    const pos = getCanvasPos(e)
    if (!pos) return
    const canvas = canvasRef.current
    const corners = getCorners(canvas.width, canvas.height)
    // Priorité aux poignées de coin
    for (let i = 0; i < 4; i++) {
      const dx = pos.x - corners[i].x, dy = pos.y - corners[i].y
      if (dx * dx + dy * dy <= HANDLE_RADIUS * HANDLE_RADIUS * 2.5) {
        setDragging(i as 0 | 1 | 2 | 3)
        e.preventDefault()
        return
      }
    }
    if (pointInQuad(pos, corners)) {
      setDragging('body')
      e.preventDefault()
    }
  }

  const handlePointerMove = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (dragging === null || !canvasRef.current) return
    const pos = getCanvasPos(e)
    if (!pos) return
    e.preventDefault()
    const canvas = canvasRef.current
    if (dragging === 'body') {
      setLogoPos({
        x: Math.max(0, Math.min(1, pos.x / canvas.width)),
        y: Math.max(0, Math.min(1, pos.y / canvas.height)),
      })
    } else {
      const base = getBaseCorners(canvas.width, canvas.height)
      const i = dragging
      setCornerOffsets((prev) => {
        const next = [...prev]
        next[i] = {
          x: Math.max(-0.5, Math.min(1.5, (pos.x - base[i].x) / canvas.width)),
          y: Math.max(-0.5, Math.min(1.5, (pos.y - base[i].y) / canvas.height)),
        }
        return next
      })
    }
  }

  const handlePointerUp = () => { setDragging(null) }

  // Also allow clicking anywhere on canvas to move logo there
  const handleCanvasClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!logoSource || !canvasRef.current || dragging) return
    const pos = getCanvasPos(e)
    if (!pos) return
    const canvas = canvasRef.current
    const corners = getCorners(canvas.width, canvas.height)
    for (let i = 0; i < 4; i++) {
      const dx = pos.x - corners[i].x, dy = pos.y - corners[i].y
      if (dx * dx + dy * dy <= HANDLE_RADIUS * HANDLE_RADIUS * 2.5) return
    }
    if (!pointInQuad(pos, corners)) {
      setLogoPos({
        x: pos.x / canvas.width,
        y: pos.y / canvas.height,
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

  const resetTransform = () => {
    setCornerOffsets(ZERO_OFFSETS)
    setRotation(0)
  }

  const [applyError, setApplyError] = useState<string | null>(null)

  const handleApply = async () => {
    if (!productImg || !logoSource) return
    setApplying(true)
    setApplyError(null)

    try {
      const canvas = document.createElement('canvas')
      canvas.width = productImg.naturalWidth
      canvas.height = productImg.naturalHeight
      const ctx = canvas.getContext('2d')!
      ctx.drawImage(productImg, 0, 0)

      // Coordonnées normalisées → même rendu qu'en preview, à pleine résolution
      const corners = getCorners(canvas.width, canvas.height)
      drawWarpedLogo(ctx, logoSource.img, logoSource.w, logoSource.h, corners, canvas.width, canvas.height, opacity, 32)

      canvas.toBlob((blob) => {
        if (!blob) {
          setApplying(false)
          setApplyError('Erreur lors de la génération de l\'image. Réessayez.')
          return
        }
        const watermarked = new File([blob], file.name, { type: file.type || 'image/png' })
        onApply(watermarked)
      }, file.type || 'image/png', 0.92)
    } catch {
      setApplying(false)
      setApplyError('Impossible d\'exporter l\'image (CORS). Essayez avec une image uploadée localement.')
    }
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
  const sliderLabelStyle: React.CSSProperties = {
    fontSize: '11px', fontWeight: 600, color: 'rgba(255,255,255,0.5)',
    textTransform: 'uppercase', letterSpacing: '0.05em',
  }
  // Damier pour visualiser la transparence du PNG (pas de fond blanc)
  const checkerStyle: React.CSSProperties = {
    height: '32px', objectFit: 'contain', borderRadius: '6px', padding: '4px',
    background: 'repeating-conic-gradient(rgba(255,255,255,0.22) 0% 25%, rgba(255,255,255,0.06) 0% 50%) 0 0 / 12px 12px',
  }

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
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
            <button onClick={() => logoInputRef.current?.click()} style={btnStyle('rgba(47,111,237,0.3)')}>
              <HiPhotograph size={14} /> {logoSrc ? 'Changer le logo' : 'Charger un logo PNG'}
            </button>
            {logoSrc && (
              <img src={logoSrc} alt="logo" style={checkerStyle} />
            )}
            {logoImg && (
              <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', color: 'rgba(255,255,255,0.7)', cursor: 'pointer', userSelect: 'none' }}>
                <input
                  type="checkbox"
                  checked={removeBg}
                  onChange={(e) => setRemoveBg(e.target.checked)}
                  style={{ accentColor: '#2f6fed' }}
                />
                Supprimer le fond blanc
              </label>
            )}
          </div>
          <p style={{ fontSize: '11px', color: 'rgba(255,255,255,0.35)', marginTop: '6px' }}>
            Le logo est sauvegardé localement. {logoImg && 'Glissez-le pour le positionner, tirez les 4 coins pour la perspective.'}
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

        {/* Controls — sliders */}
        <div style={{ display: 'flex', gap: '16px', marginBottom: '12px' }}>
          <div style={{ flex: 1 }}>
            <label style={sliderLabelStyle}>Taille: {scale}%</label>
            <input type="range" min={3} max={60} value={scale} onChange={(e) => setScale(Number(e.target.value))}
              style={{ width: '100%', marginTop: '6px', accentColor: '#2f6fed' }} />
          </div>
          <div style={{ flex: 1 }}>
            <label style={sliderLabelStyle}>Opacit&eacute;: {opacity}%</label>
            <input type="range" min={10} max={100} value={opacity} onChange={(e) => setOpacity(Number(e.target.value))}
              style={{ width: '100%', marginTop: '6px', accentColor: '#2f6fed' }} />
          </div>
          <div style={{ flex: 1 }}>
            <label style={sliderLabelStyle}>Rotation: {rotation}&deg;</label>
            <input type="range" min={-180} max={180} value={rotation} onChange={(e) => setRotation(Number(e.target.value))}
              style={{ width: '100%', marginTop: '6px', accentColor: '#2f6fed' }} />
          </div>
        </div>

        {/* Reset perspective/rotation */}
        {(hasPerspective || rotation !== 0) && (
          <div style={{ marginBottom: '12px' }}>
            <button onClick={resetTransform} style={{ ...btnStyle('rgba(255,255,255,0.08)'), padding: '6px 12px', fontSize: '12px' }}>
              <HiRefresh size={13} /> Réinitialiser la perspective
            </button>
          </div>
        )}

        {/* Error */}
        {applyError && (
          <p style={{ color: '#f87171', fontSize: '12px', marginBottom: '12px', textAlign: 'center' }}>{applyError}</p>
        )}

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
