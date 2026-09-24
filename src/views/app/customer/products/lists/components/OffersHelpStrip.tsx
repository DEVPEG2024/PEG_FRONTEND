// Bandeau d'aide « Un besoin qui n'apparaît pas ici ? » (vues list, standard, unknown).
// Style de la QuoteCard du menu latéral, à l'horizontale.
import { Link } from 'react-router-dom';
import { TbSparkles } from 'react-icons/tb';
import {
  CTA_CLASS,
  GHOST_BUTTON_STYLE,
  IconTile,
  PANEL_TILE_CLASS,
  VIOLET_BUTTON_STYLE,
} from './offersUi';

const OffersHelpStrip = () => (
  <div
    className="peg-pad-mobile"
    style={{
      display: 'flex',
      alignItems: 'flex-start',
      gap: '16px',
      marginTop: '32px',
      padding: '20px 24px',
      borderRadius: '18px',
      background:
        'linear-gradient(160deg, rgba(139,92,246,0.12), rgba(255,255,255,0.03))',
      border: '1px solid rgba(139,92,246,0.25)',
    }}
  >
    <IconTile
      size={44}
      radius={12}
      background="rgba(139,92,246,0.16)"
      border="1px solid rgba(139,92,246,0.35)"
      className={PANEL_TILE_CLASS}
    >
      <TbSparkles size={22} color="#a78bfa" />
    </IconTile>
    {/* Texte et boutons dans un même bloc à côté de l'icône : repliés, les
        boutons s'alignent sous le texte et non sous l'icône. */}
    <div
      style={{
        flex: '1 1 0',
        minWidth: 0,
        display: 'flex',
        flexWrap: 'wrap',
        alignItems: 'center',
        gap: '16px',
      }}
    >
      <div style={{ flex: '1 1 240px', minWidth: 0 }}>
        <p
          style={{
            margin: 0,
            color: '#fff',
            fontSize: '15px',
            fontWeight: 700,
          }}
        >
          Un besoin qui n&apos;apparaît pas ici ?
        </p>
        <p
          className="peg-text-secondary"
          style={{ margin: '4px 0 0', fontSize: '13px', lineHeight: 1.5 }}
        >
          Décrivez-le dans une demande de devis, l&apos;équipe PEG vous
          accompagne.
        </p>
      </div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px' }}>
        <Link
          to="/customer/devis"
          className={CTA_CLASS}
          style={VIOLET_BUTTON_STYLE}
        >
          Demander un devis
        </Link>
        <Link to="/support" className={CTA_CLASS} style={GHOST_BUTTON_STYLE}>
          Ouvrir un ticket
        </Link>
      </div>
    </div>
  </div>
);

export default OffersHelpStrip;
