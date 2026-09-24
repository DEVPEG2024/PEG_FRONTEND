// Échec de chargement : ne JAMAIS le présenter comme « aucune offre ».
import { Link } from 'react-router-dom';
import { HiOutlineExclamation } from 'react-icons/hi';
import { CTA_CLASS, GHOST_BUTTON_STYLE, IconTile } from './offersUi';

const OffersErrorState = ({ onRetry }: { onRetry: () => void }) => (
  <div
    role="alert"
    style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      textAlign: 'center',
      gap: '16px',
      padding: '64px 20px',
    }}
  >
    <IconTile
      size={72}
      radius={20}
      background="rgba(251,191,36,0.1)"
      border="1px solid rgba(251,191,36,0.25)"
    >
      <HiOutlineExclamation size={30} color="#fbbf24" />
    </IconTile>
    <div>
      <p
        style={{ margin: 0, color: '#fff', fontSize: '16px', fontWeight: 700 }}
      >
        Impossible de charger vos offres pour le moment
      </p>
      <p
        className="peg-text-secondary"
        style={{ margin: '6px 0 0', fontSize: '13px' }}
      >
        Vérifiez votre connexion puis réessayez.
      </p>
    </div>
    <div
      style={{
        display: 'flex',
        flexWrap: 'wrap',
        justifyContent: 'center',
        alignItems: 'center',
        gap: '10px',
      }}
    >
      <button
        type="button"
        className={CTA_CLASS}
        onClick={onRetry}
        style={GHOST_BUTTON_STYLE}
      >
        Réessayer
      </button>
      <Link
        to="/support"
        className="peg-tap-target"
        style={{
          color: '#a99bff',
          fontSize: '13px',
          fontWeight: 600,
          textDecoration: 'none',
          padding: '8px 10px',
        }}
      >
        Ouvrir un ticket
      </Link>
    </div>
  </div>
);

export default OffersErrorState;
