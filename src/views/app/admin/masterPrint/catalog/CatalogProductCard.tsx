/*
 * Catalogue Master Print — un produit = une carte, comme une offre PEG
 * (22/11/2026) : zone photo claire en haut — photo de la fiche PEG si le produit
 * est importé, sinon celle du modèle (catalogue public Master Print, photos
 * Falk & Ross, lue par le serveur), sinon l'illustration de sa famille —, famille, « Dans PEG »,
 * rang des ventes, marque et référence, nom, prix de vente « dès … » s'il est
 * dans PEG. Styles : design « hub » (hx-pcard-*). Règles : utils/masterPrintCards.ts.
 */
import { memo } from 'react';
import type { MpCatalogResult } from '@/@types/masterPrint';
import {
  type PegCardInfo,
  cardMeta,
  lookOf,
  rankBadge,
} from '@/utils/masterPrintCards';

const fmtPrice = (n: number) =>
  n.toLocaleString('fr-FR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

/** Illustration de famille (produit sans photo : supports, adhésifs, film DTF…). */
export const FamilyArt = ({
  art,
  ink,
}: {
  art: ReturnType<typeof lookOf>['art'];
  ink: string;
}) => {
  const soft = `${ink}22`;
  const common = {
    stroke: ink,
    strokeWidth: 3,
    strokeLinejoin: 'round' as const,
    strokeLinecap: 'round' as const,
  };
  const line = { ...common, fill: 'none' };
  return (
    <svg viewBox="0 0 160 120" className="hx-pcard-art" aria-hidden="true">
      <ellipse cx="80" cy="108" rx="46" ry="6" fill="rgba(15,24,43,0.08)" />
      {art === 'textile' && (
        <>
          <path
            d="M58 20 L40 28 L26 48 L40 56 L46 48 L46 100 L114 100 L114 48 L120 56 L134 48 L120 28 L102 20 Q80 34 58 20 Z"
            fill={soft}
            {...common}
          />
          <path d="M66 22 Q80 30 94 22" {...line} />
          <rect
            x="66"
            y="52"
            width="28"
            height="20"
            rx="4"
            fill={ink}
            opacity="0.85"
          />
        </>
      )}
      {art === 'dtf' && (
        <>
          <rect
            x="30"
            y="30"
            width="22"
            height="66"
            rx="11"
            fill={soft}
            {...common}
          />
          <path
            d="M41 30 L118 30 Q128 30 128 40 L128 96 L41 96"
            fill="#fff"
            {...common}
          />
          <circle cx="70" cy="58" r="10" fill={ink} opacity="0.85" />
          <path
            d="M88 50 L114 50 M88 62 L108 62 M62 80 L112 80"
            {...line}
            strokeWidth={2.5}
          />
        </>
      )}
      {art === 'banner' && (
        <>
          <rect
            x="22"
            y="26"
            width="116"
            height="62"
            rx="4"
            fill={soft}
            {...common}
          />
          {[30, 80, 130].map((cx) => (
            <circle
              key={cx}
              cx={cx}
              cy="34"
              r="3.5"
              fill="#fff"
              stroke={ink}
              strokeWidth="2"
            />
          ))}
          {[30, 80, 130].map((cx) => (
            <circle
              key={`b${cx}`}
              cx={cx}
              cy="80"
              r="3.5"
              fill="#fff"
              stroke={ink}
              strokeWidth="2"
            />
          ))}
          <path
            d="M44 66 L64 48 L78 60 L92 44 L116 66 Z"
            fill={ink}
            opacity="0.85"
          />
        </>
      )}
      {art === 'sticker' && (
        <>
          <path
            d="M40 24 L120 24 Q128 24 128 32 L128 74 L96 104 L40 104 Q32 104 32 96 L32 32 Q32 24 40 24 Z"
            fill={soft}
            {...common}
          />
          <path
            d="M128 74 L104 74 Q96 74 96 82 L96 104"
            fill="#fff"
            {...common}
          />
          <circle cx="66" cy="60" r="16" fill={ink} opacity="0.85" />
        </>
      )}
      {art === 'rollup' && (
        <>
          <rect
            x="56"
            y="14"
            width="48"
            height="84"
            rx="3"
            fill={soft}
            {...common}
          />
          <rect
            x="50"
            y="96"
            width="60"
            height="8"
            rx="4"
            fill={ink}
            opacity="0.85"
          />
          <path d="M62 104 L56 112 M98 104 L104 112" {...line} />
          <path d="M64 34 L96 34 M64 44 L88 44" {...line} strokeWidth={2.5} />
          <rect
            x="64"
            y="56"
            width="32"
            height="26"
            rx="3"
            fill={ink}
            opacity="0.85"
          />
        </>
      )}
      {art === 'print' && (
        <>
          <rect
            x="44"
            y="20"
            width="72"
            height="28"
            rx="3"
            fill="#fff"
            {...common}
          />
          <rect
            x="30"
            y="46"
            width="100"
            height="40"
            rx="8"
            fill={soft}
            {...common}
          />
          <rect
            x="48"
            y="74"
            width="64"
            height="30"
            rx="3"
            fill="#fff"
            {...common}
          />
          <path d="M58 86 L102 86 M58 94 L90 94" {...line} strokeWidth={2.5} />
        </>
      )}
    </svg>
  );
};

type Props = {
  item: MpCatalogResult;
  categoryLabel: string;
  peg: PegCardInfo | null;
  onOpen: (id: string) => void;
};

const CatalogProductCard = ({ item, categoryLabel, peg, onOpen }: Props) => {
  const look = lookOf(item.category);
  // Photo de la fiche PEG (ce que voient les clients), sinon celle du modèle (Falk & Ross).
  const photo = peg?.imageUrl || item.imageUrl || null;
  const rank = rankBadge(item.bestSellerRank);
  const imported = item.imported.length > 0;
  const meta = cardMeta(item);
  return (
    <button
      type="button"
      className="hx-pcard"
      onClick={() => onOpen(item.id)}
      data-testid="hx-pcard"
      aria-label={`${item.name}${imported ? ', déjà dans PEG' : ''} — ouvrir la fiche`}
    >
      <span
        className="hx-pcard-visual"
        style={{
          // Fond « studio » clair et opaque ; l'encre de la famille en halo sous l'illustration.
          background: photo
            ? '#fff'
            : `radial-gradient(60% 62% at 50% 48%, ${look.ink}2e 0%, ${look.ink}00 72%), linear-gradient(160deg, #ffffff 0%, #eef1f9 100%)`,
        }}
      >
        {photo ? (
          <img src={photo} alt="" loading="lazy" decoding="async" />
        ) : (
          <FamilyArt art={look.art} ink={look.ink} />
        )}
        <span className="hx-pcard-cat">{categoryLabel}</span>
        {imported && <span className="hx-pcard-in">Dans PEG</span>}
        {rank && <span className="hx-pcard-rank">{rank}</span>}
      </span>
      <span className="hx-pcard-body">
        {meta && <span className="hx-pcard-meta">{meta}</span>}
        <span className="hx-pcard-name">{item.name}</span>
        <span className="hx-pcard-foot">
          {peg?.priceFrom != null ? (
            <span className="hx-pcard-price">
              <small>dès</small> {fmtPrice(peg.priceFrom)} € <small>HT</small>
            </span>
          ) : (
            <span className="hx-pcard-price is-muted">
              {imported ? 'Prix à régler' : 'Prix d’achat à la fiche'}
            </span>
          )}
          <span className="hx-pcard-cta" aria-hidden="true">
            {imported ? 'Voir' : 'Importer'}
          </span>
        </span>
        {imported && peg && (!peg.active || !peg.inCatalogue) && (
          <span className="hx-pcard-note">
            {!peg.active
              ? 'Fiche PEG inactive'
              : 'Pas encore visible des clients'}
          </span>
        )}
      </span>
    </button>
  );
};

export default memo(CatalogProductCard);
