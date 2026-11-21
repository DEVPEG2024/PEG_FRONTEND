import { useNavigate } from 'react-router-dom';
import { UNAVAILABLE_MESSAGE } from '@/utils/deliveryEstimate';
import { C } from './ui';

/*
 * Formulaire d'un produit configurable momentanément indisponible (service de
 * fabrication en panne, 503 « indisponible ») : message calme et « Réessayer ».
 * Surtout pas la fiche habituelle à la place : elle vendrait au mauvais prix.
 */
const OfferUnavailable = ({
  name,
  onRetry,
}: {
  name: string;
  onRetry: () => void;
}) => {
  const navigate = useNavigate();
  return (
    <div
      role="status"
      style={{
        background: 'linear-gradient(160deg, #16263d 0%, #0f1c2e 100%)',
        borderRadius: '20px',
        border: '1px solid rgba(255,255,255,0.07)',
        padding: 'var(--peg-pad-20)',
        textAlign: 'center',
      }}
    >
      <h1
        style={{
          margin: '8px 0 10px',
          fontSize: '20px',
          fontWeight: 800,
          color: C.text,
          lineHeight: 1.25,
        }}
      >
        {name}
      </h1>
      <p style={{ margin: 0, fontSize: '14px', color: C.muted }}>
        {UNAVAILABLE_MESSAGE}
      </p>
      <div
        style={{
          marginTop: '18px',
          display: 'flex',
          gap: '10px',
          justifyContent: 'center',
          flexWrap: 'wrap',
        }}
      >
        <button
          type="button"
          className="peg-tap-target"
          onClick={onRetry}
          style={{
            background: C.accent,
            border: 'none',
            borderRadius: '10px',
            padding: '10px 20px',
            color: '#fff',
            fontWeight: 700,
            fontSize: '13.5px',
            cursor: 'pointer',
          }}
        >
          Réessayer
        </button>
        <button
          type="button"
          className="peg-tap-target"
          onClick={() => navigate(-1)}
          style={{
            background: 'rgba(255,255,255,0.07)',
            border: '1px solid rgba(255,255,255,0.1)',
            borderRadius: '10px',
            padding: '10px 20px',
            color: '#a0b9dc',
            fontSize: '13.5px',
            cursor: 'pointer',
          }}
        >
          ← Retour
        </button>
      </div>
    </div>
  );
};

export default OfferUnavailable;
