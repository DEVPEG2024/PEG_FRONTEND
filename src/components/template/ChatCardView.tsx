import { MdInventory2, MdFolder, MdReceiptLong, MdRequestQuote, MdChevronRight } from 'react-icons/md';

/**
 * Carte visuelle du chatbot client (produit, projet, facture, devis).
 * Construite par le SERVEUR à partir des données lues par les outils de l'agent
 * (peg_strapi chatbot.ts → `ChatCard`) : le modèle choisit quelle carte montrer
 * en citant son lien, mais n'en écrit jamais le contenu.
 */
export type ChatCardTone = 'blue' | 'teal' | 'green' | 'yellow' | 'red' | 'orange' | 'magenta' | 'gray';
export type ChatCard = {
  url: string;
  kind: 'produit' | 'projet' | 'facture' | 'devis';
  title: string;
  subtitle?: string | null;
  image?: string | null;
  badge?: { label: string; tone: ChatCardTone } | null;
  meta?: string | null;
  progress?: number | null;
};

// Couleurs alignées sur les statuts projet (constants.ts) : teal = pending_paid,
// magenta = « Terminé impayé ».
const TONES: Record<ChatCardTone, { fg: string; bg: string; border: string }> = {
  blue: { fg: '#6b9eff', bg: 'rgba(47,111,237,0.15)', border: 'rgba(47,111,237,0.35)' },
  teal: { fg: '#2dd4bf', bg: 'rgba(45,212,191,0.15)', border: 'rgba(45,212,191,0.35)' },
  green: { fg: '#4ade80', bg: 'rgba(74,222,128,0.15)', border: 'rgba(74,222,128,0.35)' },
  yellow: { fg: '#facc15', bg: 'rgba(250,204,21,0.15)', border: 'rgba(250,204,21,0.35)' },
  red: { fg: '#f87171', bg: 'rgba(248,113,113,0.15)', border: 'rgba(248,113,113,0.35)' },
  orange: { fg: '#fb923c', bg: 'rgba(251,146,60,0.15)', border: 'rgba(251,146,60,0.35)' },
  magenta: { fg: '#e879f9', bg: 'rgba(232,121,249,0.15)', border: 'rgba(232,121,249,0.35)' },
  gray: { fg: 'rgba(255,255,255,0.6)', bg: 'rgba(255,255,255,0.08)', border: 'rgba(255,255,255,0.15)' },
};

const ICONS = { produit: MdInventory2, projet: MdFolder, facture: MdReceiptLong, devis: MdRequestQuote };

const isHttp = (u?: string | null): u is string => !!u && /^https?:\/\//i.test(u);

/** Chemin interne si l'url pointe vers l'application ouverte (navigation sans rechargement). */
const internalPath = (url: string): string | null => {
  try {
    const u = new URL(url);
    return typeof window !== 'undefined' && u.origin === window.location.origin ? `${u.pathname}${u.search}${u.hash}` : null;
  } catch {
    return null;
  }
};

type Props = { card: ChatCard; onNavigate?: (path: string) => void };

const ChatCardView = ({ card, onNavigate }: Props) => {
  if (!isHttp(card.url)) return null;
  const Icon = ICONS[card.kind] ?? MdInventory2;
  const tone = card.badge ? TONES[card.badge.tone] ?? TONES.gray : null;
  const path = internalPath(card.url);
  const progress = typeof card.progress === 'number' ? Math.max(0, Math.min(100, card.progress)) : null;

  const handleClick = (e: React.MouseEvent<HTMLAnchorElement>) => {
    if (!path || !onNavigate || e.metaKey || e.ctrlKey || e.shiftKey || e.button !== 0) return;
    e.preventDefault();
    onNavigate(path);
  };

  return (
    <a
      href={card.url}
      onClick={handleClick}
      {...(path ? {} : { target: '_blank', rel: 'noopener noreferrer' })}
      aria-label={`${card.title}${card.badge ? ` — ${card.badge.label}` : ''}`}
      style={{
        display: 'flex', alignItems: 'center', gap: '10px',
        margin: '6px 0', padding: '8px', borderRadius: '12px',
        background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)',
        color: 'inherit', textDecoration: 'none', whiteSpace: 'normal', minWidth: 0,
      }}
    >
      <div style={{
        width: '48px', height: '48px', borderRadius: '8px', flexShrink: 0, overflow: 'hidden',
        background: 'rgba(47,111,237,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>
        {isHttp(card.image)
          ? <img src={card.image} alt="" loading="lazy" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
          : <Icon size={22} color="#6b9eff" />}
      </div>
      <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: '2px' }}>
        <div style={{ color: '#fff', fontWeight: 600, fontSize: '13px', lineHeight: 1.3, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {card.title}
        </div>
        {(card.subtitle || card.badge) && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', minWidth: 0 }}>
            {card.badge && tone && (
              <span style={{
                flexShrink: 0, fontSize: '10px', fontWeight: 600, lineHeight: 1.4, padding: '1px 6px', borderRadius: '999px',
                color: tone.fg, background: tone.bg, border: `1px solid ${tone.border}`,
              }}>
                {card.badge.label}
              </span>
            )}
            {card.subtitle && (
              <span style={{ fontSize: '11px', color: 'rgba(255,255,255,0.5)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {card.subtitle}
              </span>
            )}
          </div>
        )}
        {card.meta && <div style={{ fontSize: '11.5px', color: 'rgba(255,255,255,0.75)' }}>{card.meta}</div>}
        {progress !== null && (
          <div
            role="progressbar" aria-valuenow={progress} aria-valuemin={0} aria-valuemax={100} aria-label="Avancement"
            style={{ height: '4px', borderRadius: '2px', background: 'rgba(255,255,255,0.1)', marginTop: '3px', overflow: 'hidden' }}
          >
            <div style={{ width: `${progress}%`, height: '100%', background: '#2f6fed' }} />
          </div>
        )}
      </div>
      <MdChevronRight size={18} color="rgba(255,255,255,0.35)" style={{ flexShrink: 0 }} />
    </a>
  );
};

export default ChatCardView;
