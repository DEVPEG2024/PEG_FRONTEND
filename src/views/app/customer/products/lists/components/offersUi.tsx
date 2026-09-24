// Briques visuelles partagées par la page « Mes offres » (/customer/products).
// Styles inline, thème sombre — mêmes jetons que SideNav / PremiumPage / DevisForm.
import type { CSSProperties, ReactNode } from 'react';
import { PREMIUM_DISCOUNT_RATE } from '@/utils/productHelpers';

/** Remise Premium en pourcentage entier (15) — dérivée de la constante, jamais en dur. */
export const PREMIUM_PCT = Math.round(PREMIUM_DISCOUNT_RATE * 100);

/** Classe portant l'animation `pulse` (coupée si prefers-reduced-motion). */
export const PULSE_CLASS = 'peg-offers-pulse';
/** Classe des cartes-actions (bordure au survol et au focus-visible). */
export const ACTION_CARD_CLASS = 'peg-offers-action';
/** Sous-titre du hero : masqué sur téléphone (offres au-dessus de la ligne de flottaison). */
export const HERO_SUBTITLE_CLASS = 'peg-offers-hero-sub';
/** Tuile d'icône des panneaux : masquée sur petit écran (elle occupait seule une ligne). */
export const PANEL_TILE_CLASS = 'peg-offers-panel-tile';
/** Sélection du catalogue : limitée à 4 cartes sur téléphone. */
export const SELECTION_GRID_CLASS = 'peg-offers-selection';
const EVEN_WRAP_CLASS = 'peg-offers-even';
const EVEN_GRID_CLASS = 'peg-offers-even-grid';

/**
 * Feuille de style de la page, déclarée UNE seule fois (CustomerProducts) :
 * animation des squelettes et de la frise, coupée par prefers-reduced-motion,
 * et bordure des cartes-actions (impossible en style inline pour :focus-visible).
 */
export const OFFERS_PAGE_CSS = `
@keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.5; } }
.${ACTION_CARD_CLASS} { border: 1px solid rgba(255,255,255,0.1); transition: border-color 0.15s, background 0.15s; }
.${ACTION_CARD_CLASS}:hover, .${ACTION_CARD_CLASS}:focus-visible { border-color: rgba(255,255,255,0.2); background: rgba(255,255,255,0.035); }
.${ACTION_CARD_CLASS}:focus-visible { outline: 2px solid #a99bff; outline-offset: 2px; }
@media (prefers-reduced-motion: reduce) {
  .${PULSE_CLASS} { animation: none !important; }
}
@media (max-width: 767.98px) {
  .${HERO_SUBTITLE_CLASS} { display: none; }
  /* !important : la carte produit porte un display:flex inline. */
  .${SELECTION_GRID_CLASS} > :nth-child(n+5) { display: none !important; }
}
@media (max-width: 559.98px) {
  .${PANEL_TILE_CLASS} { display: none !important; }
}
.${EVEN_WRAP_CLASS} { container-type: inline-size; }
.${EVEN_GRID_CLASS} {
  display: grid;
  gap: 12px;
  margin: 0;
  padding: 0;
  grid-template-columns: repeat(auto-fit, minmax(min(100%, 220px), 1fr));
}
@container (max-width: 599.98px) {
  .${EVEN_GRID_CLASS} { grid-template-columns: minmax(0, 1fr); }
}
@container (min-width: 600px) {
  .${EVEN_GRID_CLASS} { grid-template-columns: repeat(var(--peg-offers-cols, 3), minmax(0, 1fr)); }
}
`;

/** Équivalent inline de la classe Tailwind `sr-only` (repli si la classe n'est pas générée). */
export const SR_ONLY_STYLE: CSSProperties = {
  position: 'absolute',
  width: '1px',
  height: '1px',
  padding: 0,
  margin: '-1px',
  overflow: 'hidden',
  clip: 'rect(0, 0, 0, 0)',
  whiteSpace: 'nowrap',
  borderWidth: 0,
};

/** Grille de cartes produit : auto-fill (jamais auto-fit sur une liste). */
export const PRODUCT_GRID_STYLE: CSSProperties = {
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fill, minmax(min(100%, 220px), 1fr))',
  gap: '20px',
};

/**
 * Grille d'un petit ensemble (frise, avantages, cartes-actions) : TOUS sur une
 * rangée ou UN par rangée, jamais « 2 + 1 ». Le seuil porte sur la largeur du
 * CONTENEUR (container query), pas de l'écran : la barre latérale de 290px
 * laissait 2 colonnes + 1 orpheline entre ~768 et ~1040px. Sans prise en
 * charge des container queries : grille auto-fit historique.
 */
export const EvenGrid = ({
  cols,
  as = 'div',
  ariaLabel,
  style,
  children,
}: {
  cols: number;
  as?: 'div' | 'ol';
  ariaLabel?: string;
  style?: CSSProperties;
  children: ReactNode;
}) => {
  const Tag = as;
  return (
    <div className={EVEN_WRAP_CLASS} style={style}>
      <Tag
        className={EVEN_GRID_CLASS}
        aria-label={ariaLabel}
        style={{ '--peg-offers-cols': cols } as CSSProperties}
      >
        {children}
      </Tag>
    </div>
  );
};

const BUTTON_BASE: CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  gap: '8px',
  borderRadius: '12px',
  padding: '12px 20px',
  fontSize: '14px',
  fontFamily: 'Inter, sans-serif',
  textDecoration: 'none',
  cursor: 'pointer',
  whiteSpace: 'nowrap',
  boxSizing: 'border-box',
};

export const GOLD_BUTTON_STYLE: CSSProperties = {
  ...BUTTON_BASE,
  background: 'linear-gradient(135deg,#eab308,#ca8a04)',
  color: '#1a1505',
  fontWeight: 800,
  border: 'none',
  boxShadow: '0 6px 20px #eab30855',
};

export const VIOLET_BUTTON_STYLE: CSSProperties = {
  ...BUTTON_BASE,
  background: 'linear-gradient(135deg,#8b5cf6,#6d28d9)',
  color: '#fff',
  fontWeight: 700,
  border: 'none',
};

export const GHOST_BUTTON_STYLE: CSSProperties = {
  ...BUTTON_BASE,
  background: 'rgba(255,255,255,0.06)',
  border: '1px solid rgba(255,255,255,0.12)',
  color: '#fff',
  fontWeight: 600,
};

/** Classes des CTA : cible tactile 44px + pleine largeur sur mobile. */
export const CTA_CLASS = 'peg-tap-target peg-full-mobile';

/** Fond « héros violet » (héros de page, panneaux violets). */
export const VIOLET_HERO_BG =
  'radial-gradient(120% 160% at 80% 12%, rgba(124,107,255,0.22) 0%, rgba(91,71,224,0.07) 42%, rgba(10,12,22,0.2) 72%), linear-gradient(160deg,#12152a,#0a0c16)';

/** Surtitre 12/700 majuscules. */
export const EYEBROW_STYLE: CSSProperties = {
  margin: 0,
  fontSize: '12px',
  fontWeight: 700,
  textTransform: 'uppercase',
  letterSpacing: '0.1em',
};

/** Titre de section (h2 17/700). */
export const SECTION_TITLE_STYLE: CSSProperties = {
  margin: 0,
  color: '#fff',
  fontSize: '17px',
  fontWeight: 700,
};

/** Tuile d'icône carrée. */
export const IconTile = ({
  size,
  background,
  border,
  radius = 14,
  className,
  children,
}: {
  size: number;
  background: string;
  border?: string;
  radius?: number;
  className?: string;
  children: ReactNode;
}) => (
  <div
    aria-hidden="true"
    className={className}
    style={{
      width: `${size}px`,
      height: `${size}px`,
      flexShrink: 0,
      borderRadius: `${radius}px`,
      background,
      border,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
    }}
  >
    {children}
  </div>
);

/** Carte squelette (même gabarit que CustomerProductCard). */
export const SkeletonCard = () => (
  <div
    style={{
      background: 'linear-gradient(160deg, #16263d 0%, #0f1c2e 100%)',
      borderRadius: '18px',
      overflow: 'hidden',
      boxShadow: '0 4px 20px rgba(0,0,0,0.3)',
    }}
  >
    <div
      className={PULSE_CLASS}
      style={{
        height: '200px',
        background: 'rgba(255,255,255,0.04)',
        animation: 'pulse 1.5s ease-in-out infinite',
      }}
    />
    <div
      style={{
        padding: '14px 16px 16px',
        display: 'flex',
        flexDirection: 'column',
        gap: '10px',
      }}
    >
      <div
        style={{
          height: '14px',
          borderRadius: '6px',
          background: 'rgba(255,255,255,0.07)',
          width: '75%',
        }}
      />
      <div
        style={{
          height: '10px',
          borderRadius: '6px',
          background: 'rgba(255,255,255,0.04)',
          width: '55%',
        }}
      />
      <div
        style={{
          height: '32px',
          borderRadius: '10px',
          background: 'rgba(255,255,255,0.04)',
          marginTop: '8px',
        }}
      />
    </div>
  </div>
);

/** Date longue FR (« 12 septembre 2026 ») ; '' si absente ou invalide. */
export function fmtLongDate(iso?: string | null): string {
  if (!iso) return '';
  const d = new Date(iso);
  if (isNaN(d.getTime())) return '';
  return d.toLocaleDateString('fr-FR', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
}
