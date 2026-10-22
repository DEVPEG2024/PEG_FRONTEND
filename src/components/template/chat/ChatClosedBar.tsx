import { MdAddComment, MdCheckCircle } from 'react-icons/md';
import { CHAT_CLOSED_NEW, CHAT_CLOSED_TEXT } from './chatClosing';

type Props = {
  /** « Nouvelle question » : nouvelle conversation (le verrou tombe avec l'ancien identifiant). */
  onNew: () => void;
  isPhone: boolean;
};

/**
 * Remplace la zone de saisie d'une conversation conclue par une commande : le
 * remerciement reste lisible au-dessus, et une nouvelle question repart d'une
 * conversation vierge (la commande n'est jamais mélangée à la suite).
 */
const ChatClosedBar = ({ onNew, isPhone }: Props) => (
  <div
    role="status"
    style={{
      display: 'flex',
      alignItems: 'center',
      gap: '10px',
      flexWrap: 'wrap',
      margin: '0',
      padding: isPhone
        ? '12px 12px calc(12px + env(safe-area-inset-bottom, 0px))'
        : '12px 14px 14px',
      borderTop: '1px solid var(--pcw-border, rgba(255,255,255,0.08))',
    }}
  >
    <span
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
        flex: '1 1 180px',
        minWidth: 0,
        fontSize: '13px',
        lineHeight: 1.4,
        color: 'var(--pcw-muted, rgba(255,255,255,0.6))',
      }}
    >
      <MdCheckCircle
        size={18}
        color="#22c55e"
        aria-hidden="true"
        style={{ flexShrink: 0 }}
      />
      {CHAT_CLOSED_TEXT}
    </span>
    <button
      type="button"
      onClick={onNew}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '6px',
        padding: '9px 14px',
        minHeight: '40px',
        borderRadius: '999px',
        border: 'none',
        cursor: 'pointer',
        font: 'inherit',
        fontSize: '13px',
        fontWeight: 700,
        color: '#fff',
        flexShrink: 0,
        background:
          'linear-gradient(135deg, var(--pcw-a1, #4f7cff), var(--pcw-a2, #7c5cff))',
        boxShadow: '0 6px 16px rgba(92,108,255,0.3)',
        ...(isPhone ? { flex: '1 1 100%' } : {}),
      }}
    >
      <MdAddComment size={16} aria-hidden="true" /> {CHAT_CLOSED_NEW}
    </button>
  </div>
);

export default ChatClosedBar;
