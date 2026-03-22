import { useState } from 'react';
import { apiGenerateProductContent, apiAiFillProduct } from '@/services/ChatbotServices';
import {
  MdOutlineArticle,
  MdAutoAwesome,
  MdContentCopy,
  MdCheck,
  MdOutlineStar,
  MdOutlineSell,
  MdOutlineDescription,
} from 'react-icons/md';

// ─────────────────────────────────────────────────────────────────
// Styles
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
// CopyButton
// ─────────────────────────────────────────────────────────────────
const CopyButton = ({ text }: { text: string }) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  return (
    <button
      onClick={handleCopy}
      title="Copier"
      style={{
        display: 'flex', alignItems: 'center', gap: '5px',
        background: copied ? 'rgba(34,197,94,0.1)' : 'rgba(255,255,255,0.05)',
        border: `1px solid ${copied ? 'rgba(34,197,94,0.3)' : 'rgba(255,255,255,0.1)'}`,
        borderRadius: '6px', padding: '5px 10px',
        color: copied ? '#4ade80' : 'rgba(255,255,255,0.6)',
        fontSize: '11px', fontWeight: 600, cursor: 'pointer', fontFamily: 'Inter, sans-serif',
        transition: 'all 0.2s', whiteSpace: 'nowrap',
      }}
    >
      {copied ? <MdCheck size={13} /> : <MdContentCopy size={13} />}
      {copied ? 'Copié !' : 'Copier'}
    </button>
  );
};

// ─────────────────────────────────────────────────────────────────
// Content block
// ─────────────────────────────────────────────────────────────────
type ContentBlockProps = {
  icon: React.ReactNode;
  title: string;
  color: string;
  children: React.ReactNode;
  copyText: string;
};

const ContentBlock = ({ icon, title, color, children, copyText }: ContentBlockProps) => (
  <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: '12px', overflow: 'hidden' }}>
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 16px', borderBottom: '1px solid rgba(255,255,255,0.05)', background: 'rgba(0,0,0,0.15)' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
        <span style={{ color }}>{icon}</span>
        <span style={{ color: 'rgba(255,255,255,0.55)', fontSize: '11px', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase' }}>{title}</span>
      </div>
      <CopyButton text={copyText} />
    </div>
    <div style={{ padding: '14px 16px' }}>{children}</div>
  </div>
);

// ─────────────────────────────────────────────────────────────────
// Generated content type
// ─────────────────────────────────────────────────────────────────
type GeneratedContent = {
  description: string;
  highlights: string[];
  sellingPoints: string[];
};

// ─────────────────────────────────────────────────────────────────
// Main page
// ─────────────────────────────────────────────────────────────────
const IAContentPage = () => {
  const [productName, setProductName] = useState('');
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState('');
  const [content, setContent] = useState<GeneratedContent | null>(null);

  const handleGenerate = async () => {
    if (!productName.trim()) { setError('Saisissez un nom de produit.'); return; }
    setError('');
    setGenerating(true);
    try {
      // Try the dedicated endpoint first, fall back to ai-fill-product
      try {
        const res = await apiGenerateProductContent(productName.trim());
        setContent({
          description: res.data.description,
          highlights: res.data.highlights ?? [],
          sellingPoints: res.data.sellingPoints ?? [],
        });
      } catch {
        // Fallback: use existing ai-fill-product and generate highlights/points from description
        const res = await apiAiFillProduct(productName.trim(), [], [], [], [], []);
        const desc = res.data.description ?? '';
        // Extract bullet points from description as highlights
        const sentences = desc
          .split(/[.!?]\s+/)
          .map((s: string) => s.trim())
          .filter((s: string) => s.length > 20)
          .slice(0, 4);
        setContent({
          description: desc,
          highlights: sentences.length ? sentences : ['Produit de qualité professionnelle', 'Adapté à vos besoins', 'Livraison rapide'],
          sellingPoints: [
            'Personnalisation complète',
            'Rapport qualité/prix excellent',
            'Délais respectés',
            'Service client dédié',
          ],
        });
      }
    } catch (e: any) {
      setError(e?.response?.data?.message ?? 'Erreur lors de la génération. Vérifiez que le service IA est disponible.');
    } finally {
      setGenerating(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') handleGenerate();
  };

  const fullContent = content
    ? `DESCRIPTION\n${content.description}\n\nPOINTS FORTS\n${content.highlights.map((h) => `• ${h}`).join('\n')}\n\nARGUMENTS DE VENTE\n${content.sellingPoints.map((s) => `• ${s}`).join('\n')}`
    : '';

  return (
    <div style={{ padding: '24px 28px', fontFamily: 'Inter, sans-serif', minHeight: '100vh' }}>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '14px', marginBottom: '28px' }}>
        <div style={{ width: '40px', height: '40px', borderRadius: '10px', background: 'linear-gradient(135deg, rgba(16,185,129,0.3), rgba(5,150,105,0.2))', border: '1px solid rgba(16,185,129,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <MdOutlineArticle size={22} color="#34d399" />
        </div>
        <div>
          <h1 style={{ color: '#fff', fontSize: '20px', fontWeight: 700, margin: 0 }}>Génération de contenu IA</h1>
          <p style={{ color: 'rgba(255,255,255,0.35)', fontSize: '12px', margin: '2px 0 0' }}>
            Générez description, points forts et arguments de vente via GROQ
          </p>
        </div>
      </div>

      {/* Input area */}
      <div style={{ ...PANEL, padding: '24px', marginBottom: '20px' }}>
        <label style={labelStyle}>Nom du produit</label>
        <div style={{ display: 'flex', gap: '10px', alignItems: 'flex-start' }}>
          <input
            value={productName}
            onChange={(e) => setProductName(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Ex: T-shirt coton bio logo brodé, Mug personnalisé 350ml..."
            style={{ ...inputStyle, flex: 1 }}
          />
          <button
            onClick={handleGenerate}
            disabled={generating}
            style={{
              display: 'flex', alignItems: 'center', gap: '7px',
              background: generating
                ? 'rgba(16,185,129,0.1)'
                : 'linear-gradient(135deg, rgba(16,185,129,0.8), rgba(5,150,105,0.6))',
              border: `1px solid ${generating ? 'rgba(16,185,129,0.2)' : 'rgba(16,185,129,0.5)'}`,
              borderRadius: '9px', padding: '10px 18px',
              color: generating ? 'rgba(52,211,153,0.5)' : '#fff',
              fontSize: '13px', fontWeight: 700, cursor: generating ? 'wait' : 'pointer',
              fontFamily: 'Inter, sans-serif', whiteSpace: 'nowrap', flexShrink: 0,
            }}
          >
            <MdAutoAwesome size={16} />
            {generating ? 'Génération...' : 'Générer'}
          </button>
        </div>

        {error && (
          <div style={{ color: '#f87171', background: 'rgba(248,113,113,0.08)', border: '1px solid rgba(248,113,113,0.2)', borderRadius: '8px', padding: '10px 12px', fontSize: '12px', marginTop: '10px' }}>
            {error}
          </div>
        )}
      </div>

      {/* Generated content */}
      {generating && (
        <div style={{ ...PANEL, padding: '48px', textAlign: 'center' }}>
          <div style={{ color: 'rgba(52,211,153,0.6)', fontSize: '14px', marginBottom: '8px' }}>✨ Génération en cours...</div>
          <div style={{ color: 'rgba(255,255,255,0.2)', fontSize: '12px' }}>GROQ analyse le produit et rédige le contenu</div>
        </div>
      )}

      {!generating && content && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>

          {/* Top bar — copy all */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ color: 'rgba(255,255,255,0.6)', fontSize: '12px' }}>
              Contenu généré pour <span style={{ color: '#fff', fontWeight: 600 }}>{productName}</span>
            </div>
            <CopyButton text={fullContent} />
          </div>

          {/* Description */}
          <ContentBlock
            icon={<MdOutlineDescription size={15} />}
            title="Description"
            color="#34d399"
            copyText={content.description}
          >
            <p style={{ color: 'rgba(255,255,255,0.75)', fontSize: '13.5px', lineHeight: 1.7, margin: 0 }}>
              {content.description}
            </p>
          </ContentBlock>

          {/* Highlights */}
          <ContentBlock
            icon={<MdOutlineStar size={15} />}
            title="Points forts"
            color="#fbbf24"
            copyText={content.highlights.map((h) => `• ${h}`).join('\n')}
          >
            <ul style={{ margin: 0, padding: 0, listStyle: 'none', display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {content.highlights.map((h, i) => (
                <li key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: '10px' }}>
                  <span style={{ color: '#fbbf24', flexShrink: 0, marginTop: '2px' }}>✦</span>
                  <span style={{ color: 'rgba(255,255,255,0.75)', fontSize: '13.5px', lineHeight: 1.6 }}>{h}</span>
                </li>
              ))}
            </ul>
          </ContentBlock>

          {/* Selling points */}
          <ContentBlock
            icon={<MdOutlineSell size={15} />}
            title="Arguments de vente"
            color="#60a5fa"
            copyText={content.sellingPoints.map((s) => `• ${s}`).join('\n')}
          >
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
              {content.sellingPoints.map((point, i) => (
                <div
                  key={i}
                  style={{
                    display: 'flex', alignItems: 'center', gap: '8px',
                    background: 'rgba(96,165,250,0.06)', border: '1px solid rgba(96,165,250,0.15)',
                    borderRadius: '8px', padding: '10px 12px',
                  }}
                >
                  <span style={{ color: '#60a5fa', fontSize: '12px', flexShrink: 0 }}>→</span>
                  <span style={{ color: 'rgba(255,255,255,0.7)', fontSize: '12.5px', lineHeight: 1.4 }}>{point}</span>
                </div>
              ))}
            </div>
          </ContentBlock>

          {/* Regenerate */}
          <div style={{ textAlign: 'center', paddingTop: '8px' }}>
            <button
              onClick={handleGenerate}
              style={{
                display: 'inline-flex', alignItems: 'center', gap: '6px',
                background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)',
                borderRadius: '8px', padding: '9px 18px',
                color: 'rgba(255,255,255,0.35)', fontSize: '12px', cursor: 'pointer', fontFamily: 'Inter, sans-serif',
              }}
            >
              <MdAutoAwesome size={14} /> Régénérer
            </button>
          </div>
        </div>
      )}

      {!generating && !content && (
        <div style={{ ...PANEL, padding: '60px 40px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '280px' }}>
          <div style={{ width: '72px', height: '72px', borderRadius: '18px', background: 'linear-gradient(135deg, rgba(16,185,129,0.15), rgba(5,150,105,0.1))', border: '1px solid rgba(16,185,129,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '18px' }}>
            <MdOutlineArticle size={32} color="rgba(52,211,153,0.5)" />
          </div>
          <div style={{ color: 'rgba(255,255,255,0.45)', fontSize: '15px', fontWeight: 600, marginBottom: '8px' }}>
            Prêt à rédiger
          </div>
          <div style={{ color: 'rgba(255,255,255,0.2)', fontSize: '13px', textAlign: 'center', maxWidth: '300px', lineHeight: 1.5 }}>
            Saisissez le nom de votre produit et cliquez sur "Générer" pour obtenir une description professionnelle.
          </div>
        </div>
      )}
    </div>
  );
};

export default IAContentPage;
