import {
  CHAT_STYLE_LABELS,
  otherChatStyle,
  type ChatStyle,
} from '@/components/template/chat/chatStyle';

// Styles propres au composant (CHAT_CSS du widget n'est pas modifié). `compact` :
// emoji seul, bouton rond resserré — sur téléphone, et sur ordinateur dès que la
// conversation a commencé (le bouton « Nouvelle conversation » s'ajoute alors au
// micro et à la fermeture : avec « 💬 Conseil » en toutes lettres, il ne restait
// qu'≈ 70 px au titre dans la fenêtre de 400 px).
// Le titre de l'en-tête reste sur UNE ligne tant que la bascule est affichée : sur un
// téléphone de 360 px il n'a plus que ≈ 96 px et passait sur deux lignes.
const CSS = `
.pcw-style-toggle { flex-shrink: 0; display: inline-flex; align-items: center; gap: 5px; height: 32px; padding: 0 11px;
  border-radius: 999px; cursor: pointer; font: inherit; font-size: 12.5px; font-weight: 600; white-space: nowrap;
  color: #e0e7ff; background: rgba(124,92,255,0.13); border: 1px solid rgba(124,92,255,0.32);
  transition: background .15s, border-color .15s; }
.pcw-style-toggle:hover, .pcw-style-toggle:focus-visible { background: rgba(124,92,255,0.22); border-color: rgba(124,92,255,0.6); outline: none; }
.pcw-style-toggle--compact { width: 32px; padding: 0; justify-content: center; margin: 0 -4px; font-size: 15px; }
.pcw-head .pcw-title { white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
`;

/**
 * Bascule du style de réponse dans l'en-tête du chat : « ⚡ Rapide » / « 💬 Conseil »
 * (emoji seul si `compact`). Un clic passe à l'autre style, pour le message suivant.
 */
const ChatStyleToggle = ({
  style,
  onToggle,
  compact = false,
}: {
  style: ChatStyle;
  onToggle: () => void;
  compact?: boolean;
}) => {
  const current = CHAT_STYLE_LABELS[style];
  const label = `Style de réponse : ${current.label} — passer en ${CHAT_STYLE_LABELS[otherChatStyle(style)].label}`;
  return (
    <>
      <style>{CSS}</style>
      <button
        type="button"
        className={`pcw-style-toggle${compact ? ' pcw-style-toggle--compact' : ''}`}
        data-style={style}
        onClick={onToggle}
        aria-label={label}
        title={label}
      >
        <span aria-hidden="true">{current.emoji}</span>
        {!compact && <span aria-hidden="true">{current.label}</span>}
      </button>
    </>
  );
};

export default ChatStyleToggle;
