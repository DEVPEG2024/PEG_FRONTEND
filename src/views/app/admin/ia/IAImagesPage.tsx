import { useState, useRef } from 'react';
import { apiGenerateImageAdvanced } from '@/services/ChatbotServices';
import { EXPRESS_BACKEND_URL } from '@/configs/api.config';
import {
  MdOutlineImage,
  MdOutlineUploadFile,
  MdAutoAwesome,
  MdDownload,
  MdHistory,
  MdClose,
  MdOpenInNew,
} from 'react-icons/md';
import { HiOutlinePhotograph } from 'react-icons/hi';

// ─────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────
type Style = 'vetement' | 'impression' | 'objet-pub' | 'signaletique';

type HistoryItem = {
  id: string;
  prompt: string;
  style: Style;
  imageUrl: string;
  createdAt: string;
};

const STYLES: { value: Style; label: string; emoji: string; description: string }[] = [
  { value: 'vetement', label: 'Vêtement', emoji: '👕', description: 'T-shirts, polos, vestes...' },
  { value: 'impression', label: 'Impression', emoji: '🖨️', description: 'Flyers, affiches, brochures...' },
  { value: 'objet-pub', label: 'Objet pub', emoji: '🎁', description: 'Stylos, mugs, goodies...' },
  { value: 'signaletique', label: 'Signalétique', emoji: '🪧', description: 'Panneaux, enseignes, PLV...' },
];

const HISTORY_KEY = 'peg_ia_images_history';

const loadHistory = (): HistoryItem[] => {
  try {
    return JSON.parse(localStorage.getItem(HISTORY_KEY) ?? '[]');
  } catch {
    return [];
  }
};

const saveHistory = (items: HistoryItem[]) => {
  localStorage.setItem(HISTORY_KEY, JSON.stringify(items.slice(0, 20)));
};

// ─────────────────────────────────────────────────────────────────
// Shared styles
// ─────────────────────────────────────────────────────────────────
const PANEL: React.CSSProperties = {
  background: 'linear-gradient(160deg, #16263d 0%, #0f1c2e 100%)',
  border: '1px solid rgba(255,255,255,0.07)',
  borderRadius: '16px',
};

const inputStyle: React.CSSProperties = {
  width: '100%',
  background: 'rgba(0,0,0,0.25)',
  border: '1px solid rgba(255,255,255,0.1)',
  borderRadius: '8px',
  color: 'rgba(255,255,255,0.85)',
  fontSize: '13px',
  padding: '10px 12px',
  outline: 'none',
  boxSizing: 'border-box',
  fontFamily: 'Inter, sans-serif',
};

const labelStyle: React.CSSProperties = {
  color: 'rgba(255,255,255,0.45)',
  fontSize: '11px',
  fontWeight: 600,
  letterSpacing: '0.08em',
  textTransform: 'uppercase',
  display: 'block',
  marginBottom: '8px',
};

// ─────────────────────────────────────────────────────────────────
// Reference image upload
// ─────────────────────────────────────────────────────────────────
const ReferenceUpload = ({
  images,
  onAdd,
  onRemove,
}: {
  images: { url: string; name: string }[];
  onAdd: (url: string, name: string) => void;
  onRemove: (idx: number) => void;
}) => {
  const [uploading, setUploading] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFiles = async (files: FileList) => {
    setUploading(true);
    for (const file of Array.from(files)) {
      if (!file.type.startsWith('image/')) continue;
      try {
        const form = new FormData();
        form.append('file', file);
        const res = await fetch(`${EXPRESS_BACKEND_URL}/upload`, { method: 'POST', body: form });
        const data = await res.json();
        if (data.fileUrl) onAdd(data.fileUrl, file.name);
      } catch {
        // ignore failed upload
      }
    }
    setUploading(false);
  };

  return (
    <div>
      <label style={labelStyle}>Images de référence (optionnel)</label>
      <p style={{ color: 'rgba(255,255,255,0.3)', fontSize: '12px', marginBottom: '10px', marginTop: 0, lineHeight: 1.5 }}>
        Uploadez des photos de référence pour guider le style de génération.
      </p>

      {/* Uploaded thumbnails */}
      {images.length > 0 && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginBottom: '10px' }}>
          {images.map((img, idx) => (
            <div
              key={idx}
              style={{ position: 'relative', width: '72px', height: '72px', borderRadius: '8px', overflow: 'hidden', border: '1px solid rgba(255,255,255,0.1)', flexShrink: 0 }}
            >
              <img src={img.url} alt={img.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              <button
                onClick={() => onRemove(idx)}
                style={{
                  position: 'absolute', top: '3px', right: '3px',
                  background: 'rgba(0,0,0,0.6)', border: 'none', borderRadius: '50%',
                  width: '18px', height: '18px', cursor: 'pointer', color: '#fff',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 0,
                }}
              >
                <MdClose size={11} />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Drop zone */}
      <div
        onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
        onDragLeave={() => setDragOver(false)}
        onDrop={(e) => { e.preventDefault(); setDragOver(false); if (e.dataTransfer.files.length) handleFiles(e.dataTransfer.files); }}
        onClick={() => !uploading && inputRef.current?.click()}
        style={{
          border: `2px dashed ${dragOver ? '#2f6fed' : 'rgba(255,255,255,0.1)'}`,
          borderRadius: '10px',
          padding: '14px 16px',
          textAlign: 'center',
          cursor: uploading ? 'wait' : 'pointer',
          background: dragOver ? 'rgba(47,111,237,0.08)' : 'rgba(0,0,0,0.15)',
          transition: 'border-color 0.2s, background 0.2s',
        }}
      >
        <input
          ref={inputRef}
          type="file"
          multiple
          accept="image/*"
          style={{ display: 'none' }}
          onChange={(e) => { if (e.target.files?.length) handleFiles(e.target.files); e.target.value = ''; }}
        />
        <MdOutlineUploadFile size={20} color={dragOver ? '#6b9eff' : 'rgba(255,255,255,0.25)'} style={{ marginBottom: '4px' }} />
        <div style={{ color: uploading ? '#6b9eff' : 'rgba(255,255,255,0.35)', fontSize: '12px' }}>
          {uploading ? 'Upload en cours...' : 'Glissez des images ici ou cliquez'}
        </div>
      </div>
    </div>
  );
};

// ─────────────────────────────────────────────────────────────────
// History panel
// ─────────────────────────────────────────────────────────────────
const HistoryPanel = ({
  items,
  onSelect,
  onClear,
}: {
  items: HistoryItem[];
  onSelect: (item: HistoryItem) => void;
  onClear: () => void;
}) => {
  if (items.length === 0) {
    return (
      <div style={{ color: 'rgba(255,255,255,0.2)', fontSize: '12px', textAlign: 'center', padding: '32px 16px' }}>
        <MdOutlineImage size={28} style={{ marginBottom: '8px', opacity: 0.3 }} />
        <div>Aucune image générée</div>
      </div>
    );
  }

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
        <span style={{ color: 'rgba(255,255,255,0.3)', fontSize: '11px', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase' }}>
          {items.length} image{items.length > 1 ? 's' : ''}
        </span>
        <button
          onClick={onClear}
          style={{ background: 'none', border: 'none', color: 'rgba(239,68,68,0.6)', fontSize: '11px', cursor: 'pointer' }}
        >
          Effacer tout
        </button>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '8px' }}>
        {items.map((item) => (
          <div
            key={item.id}
            onClick={() => onSelect(item)}
            style={{ cursor: 'pointer', borderRadius: '10px', overflow: 'hidden', border: '1px solid rgba(255,255,255,0.08)', background: 'rgba(0,0,0,0.2)', transition: 'border-color 0.2s' }}
          >
            <img src={item.imageUrl} alt={item.prompt} style={{ width: '100%', aspectRatio: '1/1', objectFit: 'cover', display: 'block' }} />
            <div style={{ padding: '6px 8px' }}>
              <div style={{ color: 'rgba(255,255,255,0.65)', fontSize: '11px', fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {item.prompt}
              </div>
              <div style={{ color: 'rgba(255,255,255,0.25)', fontSize: '10px', marginTop: '2px' }}>
                {STYLES.find((s) => s.value === item.style)?.emoji} {new Date(item.createdAt).toLocaleDateString('fr-FR')}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

// ─────────────────────────────────────────────────────────────────
// Main page
// ─────────────────────────────────────────────────────────────────
const IAImagesPage = () => {
  const [prompt, setPrompt] = useState('');
  const [style, setStyle] = useState<Style>('vetement');
  const [referenceImages, setReferenceImages] = useState<{ url: string; name: string }[]>([]);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState('');
  const [generatedImageUrl, setGeneratedImageUrl] = useState<string | null>(null);
  const [history, setHistory] = useState<HistoryItem[]>(loadHistory);
  const [showHistory, setShowHistory] = useState(false);

  const handleGenerate = async () => {
    if (!prompt.trim()) { setError('Saisissez un nom ou une description du produit.'); return; }
    setError('');
    setGenerating(true);
    try {
      const refUrls = referenceImages.map((img) => img.url);
      const res = await apiGenerateImageAdvanced(prompt.trim(), style, refUrls.length ? refUrls : undefined);
      const url = res.data.imageUrl;
      setGeneratedImageUrl(url);
      // Save to history
      const newItem: HistoryItem = {
        id: Date.now().toString(),
        prompt: prompt.trim(),
        style,
        imageUrl: url,
        createdAt: new Date().toISOString(),
      };
      const updated = [newItem, ...history];
      setHistory(updated);
      saveHistory(updated);
    } catch (e: any) {
      setError(e?.response?.data?.message ?? 'Erreur lors de la génération. Vérifiez que le service IA est disponible.');
    } finally {
      setGenerating(false);
    }
  };

  const handleDownload = async () => {
    if (!generatedImageUrl) return;
    try {
      const res = await fetch(generatedImageUrl);
      const blob = await res.blob();
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = `${prompt.trim().replace(/\s+/g, '-').toLowerCase()}-ia.jpg`;
      a.click();
    } catch {
      window.open(generatedImageUrl, '_blank');
    }
  };

  const handleSelectHistory = (item: HistoryItem) => {
    setGeneratedImageUrl(item.imageUrl);
    setPrompt(item.prompt);
    setStyle(item.style);
    setShowHistory(false);
  };

  const handleClearHistory = () => {
    setHistory([]);
    saveHistory([]);
  };

  return (
    <div style={{ padding: '24px 28px', fontFamily: 'Inter, sans-serif', minHeight: '100vh' }}>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '24px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
          <div style={{ width: '40px', height: '40px', borderRadius: '10px', background: 'linear-gradient(135deg, rgba(168,85,247,0.3), rgba(99,102,241,0.2))', border: '1px solid rgba(168,85,247,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <MdOutlineImage size={22} color="#c084fc" />
          </div>
          <div>
            <h1 style={{ color: '#fff', fontSize: '20px', fontWeight: 700, margin: 0 }}>Génération d'images IA</h1>
            <p style={{ color: 'rgba(255,255,255,0.35)', fontSize: '12px', margin: '2px 0 0' }}>
              Créez des visuels produits avec l'intelligence artificielle
            </p>
          </div>
        </div>
        <button
          onClick={() => setShowHistory(!showHistory)}
          style={{
            display: 'flex', alignItems: 'center', gap: '6px',
            background: showHistory ? 'rgba(168,85,247,0.15)' : 'rgba(255,255,255,0.05)',
            border: `1px solid ${showHistory ? 'rgba(168,85,247,0.3)' : 'rgba(255,255,255,0.1)'}`,
            borderRadius: '8px', padding: '8px 14px',
            color: showHistory ? '#c084fc' : 'rgba(255,255,255,0.55)',
            fontSize: '12px', fontWeight: 600, cursor: 'pointer',
          }}
        >
          <MdHistory size={16} />
          Historique ({history.length})
        </button>
      </div>

      <div style={{ display: 'flex', gap: '16px', alignItems: 'flex-start' }}>

        {/* Left panel — form */}
        <div style={{ ...PANEL, flex: '0 0 380px', padding: '24px', display: 'flex', flexDirection: 'column', gap: '24px' }}>

          {/* Prompt */}
          <div>
            <label style={labelStyle}>Nom / description du produit</label>
            <textarea
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder="Ex: T-shirt blanc avec logo brodé, style minimaliste..."
              rows={3}
              style={{ ...inputStyle, resize: 'vertical', lineHeight: 1.6 }}
            />
          </div>

          {/* Style selector */}
          <div>
            <label style={labelStyle}>Style de génération</label>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
              {STYLES.map((s) => (
                <button
                  key={s.value}
                  onClick={() => setStyle(s.value)}
                  style={{
                    background: style === s.value
                      ? 'linear-gradient(135deg, rgba(168,85,247,0.25), rgba(99,102,241,0.15))'
                      : 'rgba(255,255,255,0.03)',
                    border: `1px solid ${style === s.value ? 'rgba(168,85,247,0.5)' : 'rgba(255,255,255,0.08)'}`,
                    borderRadius: '10px', padding: '10px 12px',
                    cursor: 'pointer', textAlign: 'left', transition: 'all 0.2s',
                  }}
                >
                  <div style={{ fontSize: '18px', marginBottom: '4px' }}>{s.emoji}</div>
                  <div style={{ color: style === s.value ? '#c084fc' : 'rgba(255,255,255,0.7)', fontSize: '12px', fontWeight: 700 }}>{s.label}</div>
                  <div style={{ color: 'rgba(255,255,255,0.3)', fontSize: '10px', marginTop: '2px' }}>{s.description}</div>
                </button>
              ))}
            </div>
          </div>

          {/* Reference images */}
          <ReferenceUpload
            images={referenceImages}
            onAdd={(url, name) => setReferenceImages((prev) => [...prev, { url, name }])}
            onRemove={(idx) => setReferenceImages((prev) => prev.filter((_, i) => i !== idx))}
          />

          {/* Error */}
          {error && (
            <div style={{ color: '#f87171', background: 'rgba(248,113,113,0.08)', border: '1px solid rgba(248,113,113,0.2)', borderRadius: '8px', padding: '10px 12px', fontSize: '12px' }}>
              {error}
            </div>
          )}

          {/* Generate button */}
          <button
            onClick={handleGenerate}
            disabled={generating}
            style={{
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
              background: generating
                ? 'rgba(168,85,247,0.1)'
                : 'linear-gradient(135deg, rgba(168,85,247,0.8), rgba(99,102,241,0.7))',
              border: `1px solid ${generating ? 'rgba(168,85,247,0.2)' : 'rgba(168,85,247,0.5)'}`,
              borderRadius: '10px', padding: '12px 20px',
              color: generating ? 'rgba(192,132,252,0.5)' : '#fff',
              fontSize: '14px', fontWeight: 700, cursor: generating ? 'wait' : 'pointer',
              fontFamily: 'Inter, sans-serif', transition: 'all 0.2s',
            }}
          >
            <MdAutoAwesome size={18} />
            {generating ? 'Génération en cours...' : 'Générer l\'image'}
          </button>
        </div>

        {/* Right panel — result or history */}
        <div style={{ flex: 1, minWidth: 0 }}>
          {showHistory ? (
            <div style={{ ...PANEL, padding: '20px' }}>
              <div style={{ color: '#fff', fontSize: '14px', fontWeight: 700, marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <MdHistory size={18} color="#c084fc" /> Historique des images
              </div>
              <HistoryPanel items={history} onSelect={handleSelectHistory} onClear={handleClearHistory} />
            </div>
          ) : generatedImageUrl ? (
            <div style={{ ...PANEL, padding: '20px' }}>
              <div style={{ color: '#fff', fontSize: '13px', fontWeight: 700, marginBottom: '14px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <MdAutoAwesome size={16} color="#c084fc" />
                Image générée
              </div>

              {/* Generated image */}
              <div style={{ borderRadius: '12px', overflow: 'hidden', border: '1px solid rgba(255,255,255,0.08)', marginBottom: '14px' }}>
                <img
                  src={generatedImageUrl}
                  alt={prompt}
                  style={{ width: '100%', maxHeight: '480px', objectFit: 'contain', display: 'block', background: 'rgba(0,0,0,0.3)' }}
                />
              </div>

              <div style={{ color: 'rgba(255,255,255,0.35)', fontSize: '12px', marginBottom: '14px' }}>
                <span style={{ fontWeight: 600, color: 'rgba(255,255,255,0.55)' }}>{prompt}</span>
                {' · '}
                {STYLES.find((s) => s.value === style)?.emoji} {STYLES.find((s) => s.value === style)?.label}
              </div>

              {/* Action buttons */}
              <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                <button
                  onClick={handleDownload}
                  style={{
                    display: 'flex', alignItems: 'center', gap: '6px',
                    background: 'linear-gradient(135deg, rgba(47,111,237,0.3), rgba(47,111,237,0.15))',
                    border: '1px solid rgba(47,111,237,0.4)', borderRadius: '8px', padding: '9px 16px',
                    color: '#6b9eff', fontSize: '12px', fontWeight: 600, cursor: 'pointer', fontFamily: 'Inter, sans-serif',
                  }}
                >
                  <MdDownload size={16} /> Télécharger
                </button>
                <button
                  onClick={() => window.open(generatedImageUrl, '_blank')}
                  style={{
                    display: 'flex', alignItems: 'center', gap: '6px',
                    background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)',
                    borderRadius: '8px', padding: '9px 16px',
                    color: 'rgba(255,255,255,0.5)', fontSize: '12px', fontWeight: 600, cursor: 'pointer', fontFamily: 'Inter, sans-serif',
                  }}
                >
                  <MdOpenInNew size={16} /> Ouvrir
                </button>
                <button
                  onClick={() => { setGeneratedImageUrl(null); }}
                  style={{
                    display: 'flex', alignItems: 'center', gap: '6px',
                    background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)',
                    borderRadius: '8px', padding: '9px 16px',
                    color: 'rgba(255,255,255,0.3)', fontSize: '12px', cursor: 'pointer', fontFamily: 'Inter, sans-serif',
                  }}
                >
                  Nouvelle génération
                </button>
              </div>
            </div>
          ) : (
            /* Empty state */
            <div style={{ ...PANEL, padding: '60px 40px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '400px' }}>
              <div style={{ width: '80px', height: '80px', borderRadius: '20px', background: 'linear-gradient(135deg, rgba(168,85,247,0.15), rgba(99,102,241,0.1))', border: '1px solid rgba(168,85,247,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '20px' }}>
                <HiOutlinePhotograph size={36} color="rgba(192,132,252,0.5)" />
              </div>
              <div style={{ color: 'rgba(255,255,255,0.45)', fontSize: '15px', fontWeight: 600, marginBottom: '8px' }}>
                Prêt à créer
              </div>
              <div style={{ color: 'rgba(255,255,255,0.2)', fontSize: '13px', textAlign: 'center', maxWidth: '280px', lineHeight: 1.5 }}>
                Remplissez le formulaire et cliquez sur "Générer l'image" pour créer votre visuel produit.
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default IAImagesPage;
