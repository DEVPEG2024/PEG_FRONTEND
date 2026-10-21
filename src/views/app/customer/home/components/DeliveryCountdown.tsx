/**
 * Accueil client — compte à rebours avant la livraison prévue d'un projet
 * (« J − 7 »). Rien quand la date manque ou est passée (daysUntil → null).
 */
type Props = {
  days: number;
  size: number;
  /** Couleur du « J − », fond et bordure : celles de l'écran (violet, accent du téléphone) */
  accent: string;
  soft: string;
  line: string;
};

const DeliveryCountdown = ({ days, size, accent, soft, line }: Props) => (
  <span
    role="img"
    aria-label={days === 0 ? "Livraison prévue aujourd'hui" : `Livraison dans ${days} jour${days > 1 ? 's' : ''}`}
    style={{
      width: `${size}px`, height: `${size}px`, flexShrink: 0, borderRadius: `${Math.round(size * 0.29)}px`,
      background: soft, border: `1px solid ${line}`,
      display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', lineHeight: 1,
    }}
  >
    <span aria-hidden="true" style={{ fontSize: `${Math.round(size * 0.17)}px`, fontWeight: 700, color: accent, whiteSpace: 'nowrap' }}>
      {days === 0 ? "aujourd'hui" : 'J −'}
    </span>
    <span aria-hidden="true" style={{ marginTop: '3px', fontSize: `${Math.round(size * 0.35)}px`, fontWeight: 800, letterSpacing: '-0.03em', color: '#fff' }}>
      {days === 0 ? 'J' : days}
    </span>
  </span>
);

export default DeliveryCountdown;
