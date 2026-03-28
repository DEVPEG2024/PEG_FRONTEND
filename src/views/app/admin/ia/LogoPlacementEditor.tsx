import { useRef, useState, useEffect, useCallback } from 'react';
import { HiCheck, HiArrowLeft } from 'react-icons/hi';

interface LogoPlacementEditorProps {
  productImageUrl: string;
  logoFile: File;
  onConfirm: (compositeFile: File) => void;
  onBack: () => void;
}

const LogoPlacementEditor = ({ productImageUrl, logoFile, onConfirm, onBack }: LogoPlacementEditorProps) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [productImg, setProductImg] = useState<HTMLImageElement | null>(null);
  const [logoImg, setLogoImg] = useState<HTMLImageElement | null>(null);
  const [logoPos, setLogoPos] = useState({ x: 0.5, y: 0.4 }); // normalized 0-1
  const [logoScale, setLogoScale] = useState(0.25);
  const [dragging, setDragging] = useState(false);
  const [canvasSize, setCanvasSize] = useState(512);
  const [saving, setSaving] = useState(false);

  // Load images
  useEffect(() => {
    const pImg = new Image();
    pImg.crossOrigin = 'anonymous';
    pImg.onload = () => setProductImg(pImg);
    pImg.src = productImageUrl;

    const lImg = new Image();
    lImg.onload = () => setLogoImg(lImg);
    lImg.src = URL.createObjectURL(logoFile);

    return () => { URL.revokeObjectURL(lImg.src); };
  }, [productImageUrl, logoFile]);

  // Resize canvas to fit container
  useEffect(() => {
    const updateSize = () => {
      if (containerRef.current) {
        const w = Math.min(containerRef.current.clientWidth, 600);
        setCanvasSize(w);
      }
    };
    updateSize();
    window.addEventListener('resize', updateSize);
    return () => window.removeEventListener('resize', updateSize);
  }, []);

  // Draw
  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas || !productImg) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const size = canvasSize;
    canvas.width = size;
    canvas.height = size;

    // Draw product image (cover)
    const pAspect = productImg.width / productImg.height;
    let sx = 0, sy = 0, sw = productImg.width, sh = productImg.height;
    if (pAspect > 1) {
      sx = (productImg.width - productImg.height) / 2;
      sw = productImg.height;
    } else if (pAspect < 1) {
      sy = (productImg.height - productImg.width) / 2;
      sh = productImg.width;
    }
    ctx.drawImage(productImg, sx, sy, sw, sh, 0, 0, size, size);

    // Draw logo
    if (logoImg) {
      const lAspect = logoImg.width / logoImg.height;
      const lw = size * logoScale;
      const lh = lw / lAspect;
      const lx = logoPos.x * size - lw / 2;
      const ly = logoPos.y * size - lh / 2;
      ctx.drawImage(logoImg, lx, ly, lw, lh);
    }
  }, [productImg, logoImg, logoPos, logoScale, canvasSize]);

  useEffect(() => { draw(); }, [draw]);

  // Mouse/touch handlers
  const getPos = (e: React.MouseEvent | React.TouchEvent) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0.5, y: 0.5 };
    const rect = canvas.getBoundingClientRect();
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
    return {
      x: Math.max(0, Math.min(1, (clientX - rect.left) / rect.width)),
      y: Math.max(0, Math.min(1, (clientY - rect.top) / rect.height)),
    };
  };

  const handlePointerDown = (e: React.MouseEvent | React.TouchEvent) => {
    setDragging(true);
    setLogoPos(getPos(e));
  };

  const handlePointerMove = (e: React.MouseEvent | React.TouchEvent) => {
    if (!dragging) return;
    setLogoPos(getPos(e));
  };

  const handlePointerUp = () => { setDragging(false); };

  // Export composite
  const handleConfirm = async () => {
    setSaving(true);
    const exportCanvas = document.createElement('canvas');
    exportCanvas.width = 1024;
    exportCanvas.height = 1024;
    const ctx = exportCanvas.getContext('2d');
    if (!ctx || !productImg) return;

    // Draw product
    const pAspect = productImg.width / productImg.height;
    let sx = 0, sy = 0, sw = productImg.width, sh = productImg.height;
    if (pAspect > 1) { sx = (productImg.width - productImg.height) / 2; sw = productImg.height; }
    else if (pAspect < 1) { sy = (productImg.height - productImg.width) / 2; sh = productImg.width; }
    ctx.drawImage(productImg, sx, sy, sw, sh, 0, 0, 1024, 1024);

    // Draw logo at same relative position
    if (logoImg) {
      const lAspect = logoImg.width / logoImg.height;
      const lw = 1024 * logoScale;
      const lh = lw / lAspect;
      const lx = logoPos.x * 1024 - lw / 2;
      const ly = logoPos.y * 1024 - lh / 2;
      ctx.drawImage(logoImg, lx, ly, lw, lh);
    }

    exportCanvas.toBlob((blob) => {
      if (!blob) return;
      const file = new File([blob], 'produit-avec-logo.png', { type: 'image/png' });
      onConfirm(file);
    }, 'image/png', 1.0);
  };

  return (
    <div style={{ fontFamily: 'Inter, sans-serif' }}>
      <div style={{ paddingBottom: '16px' }}>
        <p style={{ color: 'rgba(255,255,255,0.55)', fontSize: '11px', fontWeight: 600, letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: '4px' }}>
          Agent Produit IA
        </p>
        <h2 style={{ color: '#fff', fontSize: '22px', fontWeight: 700, letterSpacing: '-0.02em', margin: 0 }}>
          Placez le logo sur le produit
        </h2>
        <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: '13px', marginTop: '6px' }}>
          Cliquez ou glissez pour positionner le logo. Ajustez la taille avec le curseur.
        </p>
      </div>

      <div style={{ display: 'flex', gap: '24px', flexWrap: 'wrap' }}>
        {/* Canvas */}
        <div ref={containerRef} style={{ flex: '1 1 400px', minWidth: '300px' }}>
          <div style={{
            background: '#fff',
            borderRadius: '12px',
            overflow: 'hidden',
            border: '1px solid rgba(255,255,255,0.1)',
            boxShadow: '0 8px 32px rgba(0,0,0,0.3)',
          }}>
            <canvas
              ref={canvasRef}
              width={canvasSize}
              height={canvasSize}
              style={{ width: '100%', height: 'auto', cursor: dragging ? 'grabbing' : 'grab', display: 'block' }}
              onMouseDown={handlePointerDown}
              onMouseMove={handlePointerMove}
              onMouseUp={handlePointerUp}
              onMouseLeave={handlePointerUp}
              onTouchStart={handlePointerDown}
              onTouchMove={handlePointerMove}
              onTouchEnd={handlePointerUp}
            />
          </div>
        </div>

        {/* Controls */}
        <div style={{ flex: '0 0 220px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <div style={{
            background: 'linear-gradient(160deg, #16263d 0%, #0f1c2e 100%)',
            border: '1px solid rgba(255,255,255,0.07)',
            borderRadius: '12px', padding: '20px',
          }}>
            <label style={{ display: 'block', color: 'rgba(255,255,255,0.55)', fontSize: '12px', fontWeight: 600, marginBottom: '10px' }}>
              Taille du logo
            </label>
            <input
              type="range"
              min="0.05"
              max="0.6"
              step="0.01"
              value={logoScale}
              onChange={(e) => setLogoScale(parseFloat(e.target.value))}
              style={{ width: '100%', accentColor: '#2f6fed' }}
            />
            <div style={{ display: 'flex', justifyContent: 'space-between', color: 'rgba(255,255,255,0.3)', fontSize: '10px', marginTop: '4px' }}>
              <span>Petit</span>
              <span>{Math.round(logoScale * 100)}%</span>
              <span>Grand</span>
            </div>
          </div>

          <div style={{
            background: 'linear-gradient(160deg, #16263d 0%, #0f1c2e 100%)',
            border: '1px solid rgba(255,255,255,0.07)',
            borderRadius: '12px', padding: '20px',
          }}>
            <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: '12px', lineHeight: 1.5, margin: 0 }}>
              Positionnez le logo en cliquant sur l'image. L'image finale sera exportee en HD.
            </p>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <button
              onClick={handleConfirm}
              disabled={saving || !productImg}
              style={{
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
                padding: '12px 20px',
                background: saving ? 'rgba(5,150,105,0.4)' : 'linear-gradient(90deg, #059669, #047857)',
                border: 'none', borderRadius: '10px', color: '#fff', fontSize: '14px', fontWeight: 600,
                cursor: saving ? 'not-allowed' : 'pointer',
                boxShadow: saving ? 'none' : '0 4px 14px rgba(5,150,105,0.4)',
                fontFamily: 'Inter, sans-serif',
              }}
            >
              <HiCheck size={16} />
              {saving ? 'Export...' : 'Valider le placement'}
            </button>
            <button
              onClick={onBack}
              style={{
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px',
                padding: '10px 16px',
                background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.12)',
                borderRadius: '10px', color: 'rgba(255,255,255,0.6)', fontSize: '13px', fontWeight: 600,
                cursor: 'pointer', fontFamily: 'Inter, sans-serif',
              }}
            >
              <HiArrowLeft size={14} />
              Retour
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LogoPlacementEditor;
