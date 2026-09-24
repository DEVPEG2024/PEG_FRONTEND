// Recherche sans résultat (ni suggestions ni bandeau).
import { Link } from 'react-router-dom';
import { HiSearch } from 'react-icons/hi';
import {
  CTA_CLASS,
  GHOST_BUTTON_STYLE,
  IconTile,
  VIOLET_BUTTON_STYLE,
} from './offersUi';

const OffersNoResult = ({
  searchTerm,
  onClearSearch,
}: {
  searchTerm: string;
  onClearSearch: () => void;
}) => (
  <div
    aria-live="polite"
    className="peg-pad-mobile"
    style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      textAlign: 'center',
      gap: '14px',
      padding: '40px 24px',
      borderRadius: '18px',
      border: '1.5px dashed rgba(255,255,255,0.12)',
    }}
  >
    <IconTile
      size={56}
      radius={16}
      background="rgba(255,255,255,0.04)"
      border="1px solid rgba(255,255,255,0.08)"
    >
      <HiSearch size={24} color="rgba(255,255,255,0.6)" />
    </IconTile>
    <div>
      <p
        style={{ margin: 0, color: '#fff', fontSize: '16px', fontWeight: 700 }}
      >
        Aucun résultat
      </p>
      <p
        className="peg-text-secondary"
        style={{ margin: '6px 0 0', fontSize: '13px', lineHeight: 1.5 }}
      >
        Aucune offre ne correspond à « {searchTerm} ». La recherche porte sur le
        nom des produits.
      </p>
    </div>
    <div
      style={{
        display: 'flex',
        flexWrap: 'wrap',
        justifyContent: 'center',
        gap: '10px',
      }}
    >
      <button
        type="button"
        className={CTA_CLASS}
        onClick={onClearSearch}
        style={GHOST_BUTTON_STYLE}
      >
        Effacer la recherche
      </button>
      <Link
        to="/customer/devis"
        className={CTA_CLASS}
        style={VIOLET_BUTTON_STYLE}
      >
        Demander un devis
      </Link>
    </div>
  </div>
);

export default OffersNoResult;
