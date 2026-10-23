/**
 * Accueil client — pièces visuelles des offres personnalisées, communes à
 * l'ordinateur et au téléphone : visuel « studio », autocollant d'économie,
 * étiquettes, escalier des paliers. Affichage seul : offerShowcase.ts calcule.
 */
import type { CSSProperties, ReactNode } from 'react';
import { HiOutlineCube, HiOutlineTag } from 'react-icons/hi';
import { buildImageSources } from '@/utils/strapiImage';
import ProductBadges from '@/components/shared/ProductBadges';
import useProductBadges from '@/utils/hooks/useProductBadges';
import { hasNewBadge } from '@/utils/productBadges';
import type { OfferShowcaseItem, OfferStep } from '../offerShowcase';

export const OFFER_YELLOW = '#ffd23f';
export const OFFER_ON_YELLOW = '#2a1d00';

/**
 * Animations de l'accueil (offres, raccourcis ronds, polaroïds) — à poser une
 * fois par écran (<style>{OFFER_CSS}</style>). Survols réservés aux souris.
 */
export const OFFER_CSS = `
.pco-sticker { transition: transform .3s cubic-bezier(.3, 1.6, .5, 1); }
.pco-lift { transition: transform .2s ease, box-shadow .2s ease, border-color .2s ease; }
.pco-round-icon { transition: transform .2s ease; }
.pco-pola { transition: transform .25s ease; }
@media (hover: hover) {
  .pco-lift:hover { transform: translateY(-4px); box-shadow: 0 18px 40px rgba(0, 0, 0, .45); border-color: rgba(255, 255, 255, .2) !important; }
  .pco-lift:hover .pco-sticker { transform: rotate(4deg) scale(1.08) !important; }
  .pco-round:hover .pco-round-icon { transform: translateY(-3px) rotate(-6deg); }
  .pco-pola:hover { transform: rotate(0deg) scale(1.04) !important; }
}
.pco-lift:focus-visible { outline: 2px solid #ffffff; outline-offset: 2px; }
.pco-step-bar { transform-origin: bottom; animation: pco-grow .6s cubic-bezier(.22, 1, .36, 1) both; }
@keyframes pco-grow { from { transform: scaleY(0); } to { transform: scaleY(1); } }
@media (prefers-reduced-motion: reduce) {
  .pco-sticker, .pco-lift, .pco-round-icon, .pco-pola { transition: none; }
  .pco-step-bar { animation: none; }
}
`;

/** Visuel d'une offre : la photo entière, jamais rognée, sur son fond studio */
export const OfferVisual = ({
  offer,
  sizes,
  padding = '10%',
  style,
  children,
}: {
  offer: OfferShowcaseItem;
  /** Largeur affichée, pour choisir la bonne taille d'image */
  sizes: string;
  padding?: string;
  style?: CSSProperties;
  children?: ReactNode;
}) => {
  const sources = buildImageSources(offer.image);
  return (
    <span
      style={{
        position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center',
        overflow: 'hidden', background: offer.tile, ...style,
      }}
    >
      {sources ? (
        <img
          src={sources.src}
          srcSet={sources.srcSet}
          sizes={sizes}
          alt=""
          loading="lazy"
          decoding="async"
          draggable={false}
          style={{
            width: '100%', height: '100%', objectFit: 'contain', padding, boxSizing: 'border-box',
            mixBlendMode: 'multiply', display: 'block',
          }}
          // Une image en 404 afficherait son cadre vide : le fond studio suffit
          onError={(e) => { (e.currentTarget as HTMLImageElement).style.visibility = 'hidden'; }}
        />
      ) : (
        <HiOutlineCube size={42} color="rgba(20,26,46,0.25)" />
      )}
      {children}
    </span>
  );
};

/** Autocollant jaune penché : « −24 % vs catalogue » */
export const SavingsSticker = ({
  percent,
  size,
  caption = true,
  style,
}: {
  percent: number;
  size: number;
  caption?: boolean;
  style?: CSSProperties;
}) => (
  <span
    className="pco-sticker"
    aria-label={`${percent} % moins cher que le catalogue`}
    style={{
      position: 'absolute', width: `${size}px`, height: `${size}px`, borderRadius: '50%',
      background: OFFER_YELLOW, color: OFFER_ON_YELLOW,
      display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
      transform: 'rotate(-10deg)', boxShadow: '0 8px 18px rgba(27,31,58,0.22)', lineHeight: 1,
      ...style,
    }}
  >
    <span aria-hidden="true" style={{ fontSize: `${Math.round(size * 0.26)}px`, fontWeight: 800, letterSpacing: '-0.03em', whiteSpace: 'nowrap' }}>
      −{percent} %
    </span>
    {caption && (
      <span aria-hidden="true" style={{ fontSize: `${Math.max(9, Math.round(size * 0.11))}px`, fontWeight: 700, marginTop: '4px' }}>
        vs catalogue
      </span>
    )}
  </span>
);

/** Étiquette posée sur le visuel (« Prix réservé », « Nouveau ») */
export const OfferBadge = ({
  children,
  tone = 'dark',
  icon = false,
  style,
}: {
  children: ReactNode;
  tone?: 'dark' | 'light';
  icon?: boolean;
  style?: CSSProperties;
}) => (
  <span
    style={{
      position: 'absolute', display: 'inline-flex', alignItems: 'center', gap: '6px',
      padding: '6px 11px', borderRadius: '999px', fontSize: '11.5px', fontWeight: 700, whiteSpace: 'nowrap',
      background: tone === 'dark' ? '#0b0e1a' : '#ffffff', color: tone === 'dark' ? '#ffffff' : '#141a2e',
      ...style,
    }}
  >
    {icon && <HiOutlineTag size={14} aria-hidden="true" />}
    {children}
  </span>
);

/**
 * « Plus vous en prenez, moins c'est cher » : une marche par palier, la moins
 * chère en jaune. `height` = hauteur totale (prix + marche + quantité).
 */
export const OfferSteps = ({
  steps,
  height,
  compact = false,
}: {
  steps: OfferStep[];
  height: number;
  compact?: boolean;
}) => {
  const labels = compact ? 40 : 46;
  return (
    <ul
      aria-label="Prix à l'unité selon la quantité"
      style={{ listStyle: 'none', margin: 0, padding: 0, display: 'flex', alignItems: 'flex-end', gap: compact ? '8px' : '10px', height: `${height}px` }}
    >
      {steps.map((s, i) => (
        <li key={s.key} style={{ flex: '1 1 0', minWidth: 0, display: 'flex', flexDirection: 'column', justifyContent: 'flex-end', gap: '5px' }}>
          <span style={{ fontSize: compact ? '12px' : '13.5px', fontWeight: 800, color: s.best ? OFFER_YELLOW : 'rgba(255,255,255,0.8)', whiteSpace: 'nowrap' }}>
            {s.price}
          </span>
          <span
            className="pco-step-bar"
            aria-hidden="true"
            style={{
              display: 'block', height: `${Math.round(((height - labels) * s.height) / 100)}px`,
              borderRadius: compact ? '9px 9px 4px 4px' : '12px 12px 5px 5px',
              background: s.best ? OFFER_YELLOW : 'rgba(255,255,255,0.14)',
              animationDelay: `${i * 0.08}s`,
            }}
          />
          <span style={{ fontSize: compact ? '11px' : '12px', fontWeight: 600, color: 'rgba(255,255,255,0.66)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            {s.quantity}
          </span>
        </li>
      ))}
    </ul>
  );
};

/**
 * Coin d'un visuel d'offre : badges posés par l'admin (« Promo », personnalisés…)
 * et, s'il y a lieu, l'étiquette automatique (« Nouveau », offre de moins de
 * 30 jours). Un « Nouveau » posé à la main remplace l'automatique (pas de doublon).
 */
export const OfferCornerBadges = ({
  documentId,
  autoLabel,
  tone = 'dark',
  style,
}: {
  documentId: string;
  /** Étiquette automatique (« Nouveau », « Nouvelle offre »), ou rien. */
  autoLabel?: string | null;
  tone?: 'dark' | 'light';
  style: CSSProperties;
}) => {
  const badges = useProductBadges(documentId);
  const showAuto = !!autoLabel && !hasNewBadge(badges);
  return (
    <span style={{ position: 'absolute', display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '6px', ...style }}>
      {showAuto && <OfferBadge tone={tone} style={{ position: 'static', fontWeight: tone === 'light' ? 800 : 700 }}>{autoLabel}</OfferBadge>}
      <ProductBadges badges={badges} layout="stack" size="md" style={{ alignItems: style.left !== undefined ? 'flex-start' : 'flex-end' }} />
    </span>
  );
};

