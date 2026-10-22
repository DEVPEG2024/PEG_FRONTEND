import {
  CHAT_STYLE_LABELS,
  type ChatStyle,
} from '@/components/template/chat/chatStyle';

const ORDER: ChatStyle[] = ['quick', 'advice'];

// Styles propres au composant (CHAT_CSS du widget n'est pas modifié) — classes
// `pcw-style-*`, mêmes variables que la fenêtre (`--pcw-*`). Les deux boutons
// passent l'un sous l'autre quand la place manque (petits téléphones).
const CSS = `
.pcw-style-choose { width: 100%; margin-top: 14px; display: flex; flex-direction: column; gap: 8px; }
.pcw-style-q { font-size: 13px; font-weight: 600; color: var(--pcw-text, #fff); }
.pcw-style-opts { display: flex; flex-wrap: wrap; gap: 8px; }
.pcw-style-opt { flex: 1 1 140px; min-width: 0; display: flex; flex-direction: column; align-items: flex-start; gap: 4px;
  text-align: left; padding: 11px 12px; border-radius: 16px; cursor: pointer; font: inherit;
  color: var(--pcw-text, #fff); background: rgba(124,92,255,0.10); border: 1px solid rgba(124,92,255,0.35);
  transition: transform .15s, background .15s, border-color .15s; }
.pcw-style-opt:hover, .pcw-style-opt:focus-visible { background: rgba(124,92,255,0.18); border-color: rgba(124,92,255,0.65);
  transform: translateY(-1px); outline: none; }
.pcw-style-name { font-size: 14px; font-weight: 700; color: #fff; }
.pcw-style-hint { font-size: 12px; line-height: 1.35; color: var(--pcw-muted, rgba(255,255,255,0.55)); }
@media (prefers-reduced-motion: reduce) { .pcw-style-opt { transition: none; } .pcw-style-opt:hover { transform: none; } }
`;

/**
 * Bulle d'accueil : « Comment préférez-vous que je vous réponde ? » ⚡ Rapide /
 * 💬 Conseil. Affichée tant que le client n'a pas choisi (pour ce compte, sur cet
 * appareil) ; s'il écrit sans choisir, le widget retient Conseil.
 */
const ChatStyleChooser = ({
  onChoose,
}: {
  onChoose: (style: ChatStyle) => void;
}) => (
  <div className="pcw-style-choose" role="group" aria-labelledby="pcw-style-q">
    <style>{CSS}</style>
    <div id="pcw-style-q" className="pcw-style-q">
      Comment préférez-vous que je vous réponde ?
    </div>
    <div className="pcw-style-opts">
      {ORDER.map((style) => {
        const l = CHAT_STYLE_LABELS[style];
        return (
          <button
            key={style}
            type="button"
            className="pcw-style-opt"
            data-style={style}
            onClick={() => onChoose(style)}
          >
            <span className="pcw-style-name">
              {l.emoji} {l.label}
            </span>
            <span className="pcw-style-hint">{l.hint}</span>
          </button>
        );
      })}
    </div>
  </div>
);

export default ChatStyleChooser;
