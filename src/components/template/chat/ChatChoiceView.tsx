import type { ChatChoice, ChatChoiceOption } from './chatChoice';

type Props = {
  choice: ChatChoice;
  /** Dernier message, aucune réponse en cours : boutons utilisables. */
  active: boolean;
  onChoose: (choice: ChatChoice, option: ChatChoiceOption) => void;
};

// Même langage que les boutons de la personnalisation (pcf-btn) : pilules, 40 px sur téléphone.
const CSS = `
.pcc { margin-top: 10px; display: flex; flex-wrap: wrap; gap: 6px; white-space: normal; }
.pcc-btn { display: inline-flex; align-items: center; gap: 7px; min-height: 36px; padding: 7px 13px; border-radius: 999px;
  cursor: pointer; font: inherit; font-size: 13px; font-weight: 600; line-height: 1.25; color: rgba(255,255,255,0.92);
  background: rgba(255,255,255,0.06); border: 1px solid rgba(255,255,255,0.16); transition: background .15s, border-color .15s; }
.pcc-btn:hover:not(:disabled), .pcc-btn:focus-visible { background: rgba(255,255,255,0.12); border-color: rgba(124,92,255,0.55); outline: none; }
.pcc-btn:disabled { opacity: .45; cursor: not-allowed; }
.pcc-dot { width: 12px; height: 12px; border-radius: 50%; flex-shrink: 0; border: 1px solid rgba(255,255,255,0.45); }
@media (max-width: 767.98px) { .pcc-btn { min-height: 40px; font-size: 14px; } }
`;

/**
 * Couleurs proposées sous « Quelle couleur pour vos 3 pièces « Bonnet » ? ». Une fois la
 * conversation repartie (message plus ancien), les boutons disparaissent : la couleur
 * choisie figure déjà dans la conversation.
 */
const ChatChoiceView = ({ choice, active, onChoose }: Props) => {
  if (!active) return null;
  return (
    <div className="pcc" role="group" aria-label={`Couleur — ${choice.productName}, ${choice.quantity} pièce${choice.quantity > 1 ? 's' : ''}`}>
      <style>{CSS}</style>
      {choice.options.map((option) => (
        <button key={option.documentId} type="button" className="pcc-btn" onClick={() => onChoose(choice, option)}>
          {option.hex && <span className="pcc-dot" aria-hidden="true" style={{ background: option.hex }} />}
          {option.name}
        </button>
      ))}
    </div>
  );
};

export default ChatChoiceView;
