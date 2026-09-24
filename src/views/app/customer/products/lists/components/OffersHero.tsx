// En-tête de « Mes offres » : titre, pastilles de chiffres et recherche.
import type { ChangeEvent, ReactNode, RefObject } from 'react';
import { HiOutlineCube, HiSearch, HiX } from 'react-icons/hi';
import { TbDiscount } from 'react-icons/tb';
import { HERO_SUBTITLE_CLASS, PREMIUM_PCT, VIOLET_HERO_BG } from './offersUi';

type OffersHeroProps = {
  customerName?: string;
  /** Total des offres sans recherche ; null = pas encore connu. */
  baseTotal: number | null;
  premium?: boolean | null;
  searchTerm: string;
  onSearchChange: (e: ChangeEvent<HTMLInputElement>) => void;
  onClearSearch: () => void;
  inputRef: RefObject<HTMLInputElement>;
};

// Pastille compacte (une ligne) : le hero ne repousse plus les offres sous la
// ligne de flottaison. Pas de squelette pendant le chargement : la grille de
// squelettes le signale déjà, et un squelette de pastille faisait sauter la
// hauteur du hero dans les états vides (où aucune pastille ne s'affiche).
const StatChip = ({
  icon,
  value,
  label,
}: {
  icon: ReactNode;
  value: ReactNode;
  label: string;
}) => (
  <span
    style={{
      display: 'inline-flex',
      alignItems: 'center',
      gap: '6px',
      minHeight: '30px',
      padding: '5px 12px 5px 10px',
      borderRadius: '999px',
      background: 'rgba(255,255,255,0.04)',
      border: '1px solid rgba(255,255,255,0.08)',
      fontSize: '12.5px',
      lineHeight: 1.3,
      boxSizing: 'border-box',
    }}
  >
    {icon}
    <strong style={{ color: '#fff', fontWeight: 800 }}>{value}</strong>
    <span className="peg-text-caption">{label}</span>
  </span>
);

const OffersHero = ({
  customerName,
  baseTotal,
  premium,
  searchTerm,
  onSearchChange,
  onClearSearch,
  inputRef,
}: OffersHeroProps) => {
  const hasOffers = (baseTotal ?? 0) > 0;
  const showSearch = hasOffers || searchTerm !== '';

  return (
    <div
      className="peg-pad-mobile"
      style={{
        borderRadius: '20px',
        border: '1px solid rgba(255,255,255,0.08)',
        background: VIOLET_HERO_BG,
        padding: '24px 32px',
        marginBottom: '24px',
        display: 'flex',
        flexWrap: 'wrap',
        justifyContent: 'space-between',
        alignItems: 'flex-end',
        gap: '16px 20px',
      }}
    >
      <div style={{ minWidth: 0, flex: '1 1 320px' }}>
        {customerName && (
          <p
            style={{
              margin: '0 0 6px',
              fontSize: '12px',
              fontWeight: 700,
              textTransform: 'uppercase',
              letterSpacing: '0.1em',
              color: '#a99bff',
            }}
          >
            {customerName}
          </p>
        )}
        <h1
          style={{
            margin: 0,
            fontSize: 'var(--peg-fs-24)',
            fontWeight: 800,
            letterSpacing: '-0.02em',
            color: '#fff',
          }}
        >
          Mes offres personnalisées
        </h1>
        {/* Sous-titre seulement au-dessus d'offres réelles : au-dessus d'un
            état vide (« Aucune offre… »), « prêts à commander » se contredisait.
            Masqué sur téléphone (HERO_SUBTITLE_CLASS) pour garder les offres
            au-dessus de la ligne de flottaison. */}
        {hasOffers && (
          <p
            className={`peg-text-secondary ${HERO_SUBTITLE_CLASS}`}
            style={{ margin: '6px 0 0', fontSize: '13.5px', lineHeight: 1.5 }}
          >
            Les produits préparés pour votre entreprise par l&apos;équipe PEG,
            prêts à commander.
          </p>
        )}

        {hasOffers && (
          <div
            style={{
              display: 'flex',
              flexWrap: 'wrap',
              gap: '8px',
              marginTop: '12px',
            }}
          >
            <StatChip
              icon={
                <HiOutlineCube aria-hidden="true" size={15} color="#a99bff" />
              }
              value={baseTotal}
              label={
                (baseTotal ?? 0) > 1 ? 'offres disponibles' : 'offre disponible'
              }
            />
            {premium === true && (
              <StatChip
                icon={
                  <TbDiscount aria-hidden="true" size={15} color="#eab308" />
                }
                value={`-${PREMIUM_PCT} %`}
                label="remise Premium appliquée"
              />
            )}
          </div>
        )}
      </div>

      {showSearch && (
        <div
          style={{
            position: 'relative',
            flex: '1 1 240px',
            minWidth: 'min(100%, 240px)',
            maxWidth: '360px',
          }}
        >
          <HiSearch
            aria-hidden="true"
            size={16}
            style={{
              position: 'absolute',
              left: '12px',
              top: '50%',
              transform: 'translateY(-50%)',
              color: 'rgba(255,255,255,0.55)',
              pointerEvents: 'none',
            }}
          />
          <input
            ref={inputRef}
            value={searchTerm}
            onChange={onSearchChange}
            placeholder="Rechercher un produit…"
            aria-label="Rechercher dans mes offres"
            style={{
              width: '100%',
              background: 'rgba(255,255,255,0.05)',
              border: '1px solid rgba(255,255,255,0.1)',
              borderRadius: '12px',
              padding: searchTerm ? '9px 40px 9px 36px' : '9px 14px 9px 36px',
              color: '#fff',
              fontSize: '13px',
              fontFamily: 'Inter, sans-serif',
              outline: 'none',
              boxSizing: 'border-box',
              transition: 'border-color 0.15s',
            }}
            onFocus={(e) => {
              e.target.style.borderColor = 'rgba(47,111,237,0.5)';
            }}
            onBlur={(e) => {
              e.target.style.borderColor = 'rgba(255,255,255,0.1)';
            }}
          />
          {searchTerm && (
            <button
              type="button"
              className="peg-tap-target"
              aria-label="Effacer la recherche"
              onClick={onClearSearch}
              style={{
                position: 'absolute',
                right: '4px',
                top: '50%',
                transform: 'translateY(-50%)',
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                width: '30px',
                height: '30px',
                borderRadius: '8px',
                border: 'none',
                background: 'transparent',
                color: 'rgba(255,255,255,0.7)',
                cursor: 'pointer',
                padding: 0,
              }}
            >
              <HiX aria-hidden="true" size={16} />
            </button>
          )}
        </div>
      )}
    </div>
  );
};

export default OffersHero;
