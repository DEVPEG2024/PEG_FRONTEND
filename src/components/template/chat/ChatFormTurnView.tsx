import { useState } from 'react';
import { MdEdit } from 'react-icons/md';
import { useAppSelector } from '@/store';
import useUserCart from '@/utils/hooks/useUserCart';
import {
  prefillForProduct,
  type ChatNavState,
  type ChatOffer,
} from '@/components/template/chatOffer';
import { parseChatFormTurn, recapOfferOf } from './chatForm';
import ChatAttachButton from './ChatAttachButton';
import type {
  ChatFormAsk,
  ChatFormInput,
  ChatFormRecap,
} from './chatFormTypes';

type Props = {
  /** `form` du message (relu du stockage : vérifié ici avant affichage). */
  turn: unknown;
  /** Offre du message (offre `<id>-perso` du récapitulatif). */
  offer?: ChatOffer;
  /** Dernier message de la conversation : seuls ses boutons sont utilisables. */
  active: boolean;
  /** Requête en cours : boutons inactifs. */
  loading?: boolean;
  onAct: (input: ChatFormInput, text: string) => boolean | void;
  /** Ferme le chat puis navigue (fiche produit pré-remplie). */
  onGo: (path: string, state?: ChatNavState) => void;
  /** Mémorise l'état de l'offre du message (« Modifier » : la fiche prend le relais). */
  onOfferChange?: (offer: ChatOffer) => void;
};

const VIEW_CSS = `
.pcf { margin-top: 10px; display: flex; flex-direction: column; gap: 8px; white-space: normal; }
.pcf-row { display: flex; flex-wrap: wrap; gap: 6px; }
.pcf-btn { display: inline-flex; align-items: center; justify-content: center; gap: 6px; min-height: 36px;
  padding: 7px 13px; border-radius: 999px; cursor: pointer; font: inherit; font-size: 13px; font-weight: 600;
  line-height: 1.25; text-align: center; color: rgba(255,255,255,0.92); background: rgba(255,255,255,0.06);
  border: 1px solid rgba(255,255,255,0.16); transition: background .15s, border-color .15s; }
.pcf-btn:hover:not(:disabled), .pcf-btn:focus-visible { background: rgba(255,255,255,0.12); border-color: rgba(124,92,255,0.55); outline: none; }
.pcf-btn:disabled { opacity: .45; cursor: not-allowed; }
.pcf-btn--primary { color: #fff; border: none; background: linear-gradient(135deg, #4f7cff, #7c5cff); }
.pcf-btn--primary:hover:not(:disabled) { background: linear-gradient(135deg, #5d88ff, #8a6cff); }
.pcf-btn[aria-pressed="true"] { background: rgba(124,92,255,0.28); border-color: rgba(124,92,255,0.75); color: #fff; }
.pcf-logos { display: flex; flex-direction: column; gap: 6px; }
.pcf-logo { display: flex; align-items: center; gap: 10px; padding: 6px 6px 6px 8px; border-radius: 14px;
  background: rgba(255,255,255,0.04); border: 1px solid rgba(255,255,255,0.1); }
.pcf-logo img, .pcf-logo-ph { width: 36px; height: 36px; border-radius: 8px; object-fit: contain; background: #f8faff; flex-shrink: 0; }
.pcf-logo-ph { background: rgba(255,255,255,0.08); display: flex; align-items: center; justify-content: center; font-size: 16px; }
.pcf-logo-name { flex: 1; min-width: 0; font-size: 12.5px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.pcf-recap { border-radius: 16px; padding: 12px 14px; background: rgba(79,124,255,0.08); border: 1px solid rgba(124,92,255,0.3); }
.pcf-recap-title { font-size: 13.5px; font-weight: 700; color: #fff; }
.pcf-recap-product { font-size: 12px; color: rgba(255,255,255,0.6); margin-top: 1px; }
.pcf-recap dl { margin: 10px 0 0; display: flex; flex-direction: column; gap: 6px; }
.pcf-recap-item { display: flex; justify-content: space-between; gap: 12px; font-size: 12.5px; }
.pcf-recap dt { color: rgba(255,255,255,0.6); min-width: 0; }
.pcf-recap dd { margin: 0; color: #fff; font-weight: 600; text-align: right; overflow-wrap: anywhere; }
.pcf-recap dd.pcf-later { color: #fcd34d; }
.pcf-recap .pcf-row { margin-top: 10px; }
@media (max-width: 767.98px) {
  .pcf-btn { min-height: 40px; font-size: 14px; }
  .pcf-recap-item { flex-direction: column; gap: 1px; }
  .pcf-recap dd { text-align: left; }
}
`;

/** Question posée : boutons aux options exactes, fichier, « Passer ». */
const AskButtons = ({
  ask,
  enabled,
  onAct,
}: {
  ask: ChatFormAsk;
  enabled: boolean;
  onAct: Props['onAct'];
}) => {
  const [picked, setPicked] = useState<string[]>([]);
  const options = ask.options ?? [];
  const act = (input: ChatFormInput, text: string) =>
    onAct(input, text) !== false;

  return (
    <>
      {(ask.kind === 'choice' || ask.kind === 'boolean') && (
        <div className="pcf-row">
          {options.map((o) => (
            <button
              key={o.value}
              type="button"
              className="pcf-btn"
              disabled={!enabled}
              onClick={() =>
                act({ kind: 'choice', key: ask.key, value: o.value }, o.label)
              }
            >
              {o.label}
            </button>
          ))}
        </div>
      )}
      {ask.kind === 'multichoice' && (
        <>
          <div className="pcf-row">
            {options.map((o) => {
              const on = picked.includes(o.value);
              return (
                <button
                  key={o.value}
                  type="button"
                  className="pcf-btn"
                  aria-pressed={on}
                  disabled={!enabled}
                  onClick={() =>
                    setPicked((p) =>
                      on ? p.filter((v) => v !== o.value) : [...p, o.value]
                    )
                  }
                >
                  {o.label}
                </button>
              );
            })}
          </div>
          <div className="pcf-row">
            <button
              type="button"
              className="pcf-btn pcf-btn--primary"
              disabled={!enabled || !picked.length}
              onClick={() =>
                act(
                  { kind: 'choice', key: ask.key, value: picked },
                  options
                    .filter((o) => picked.includes(o.value))
                    .map((o) => o.label)
                    .join(', ')
                )
              }
            >
              Valider la sélection
            </button>
          </div>
        </>
      )}
      {ask.kind === 'file' && (
        <>
          <div className="pcf-row">
            <ChatAttachButton ask={ask} disabled={!enabled} onAct={act} />
          </div>
          {!!ask.logos?.length && (
            <div className="pcf-logos">
              {ask.logos.map((l) => (
                <div key={l.clientFileDocumentId} className="pcf-logo">
                  {l.thumbnailUrl ? (
                    <img src={l.thumbnailUrl} alt="" />
                  ) : (
                    <span className="pcf-logo-ph" aria-hidden="true">
                      🖼️
                    </span>
                  )}
                  <span className="pcf-logo-name">{l.name}</span>
                  <button
                    type="button"
                    className="pcf-btn"
                    disabled={!enabled}
                    aria-label={`Utiliser ce logo : ${l.name}`}
                    onClick={() =>
                      act(
                        {
                          kind: 'logo',
                          key: ask.key,
                          clientFileDocumentId: l.clientFileDocumentId,
                        },
                        `Logo : ${l.name}`
                      )
                    }
                  >
                    Utiliser ce logo
                  </button>
                </div>
              ))}
            </div>
          )}
          <div className="pcf-row">
            <button
              type="button"
              className="pcf-btn"
              disabled={!enabled}
              onClick={() =>
                act({ kind: 'later', key: ask.key }, "Je l'enverrai plus tard")
              }
            >
              Je l&apos;enverrai plus tard
            </button>
          </div>
        </>
      )}
      {ask.optional && (
        <div className="pcf-row">
          <button
            type="button"
            className="pcf-btn"
            disabled={!enabled}
            onClick={() => act({ kind: 'skip', key: ask.key }, 'Passer')}
          >
            Passer
          </button>
        </div>
      )}
    </>
  );
};

/** Carte « Votre personnalisation » (statut review). */
const RecapCard = ({
  recap,
  canModify,
  onModify,
}: {
  recap: ChatFormRecap;
  canModify: boolean;
  onModify: () => void;
}) => (
  <div className="pcf-recap">
    <div className="pcf-recap-title">Votre personnalisation</div>
    <div className="pcf-recap-product">{recap.productName}</div>
    <dl>
      {recap.items.map((it) => (
        <div key={it.key} className="pcf-recap-item">
          <dt>{it.label}</dt>
          <dd className={it.status === 'later' ? 'pcf-later' : undefined}>
            {it.display || '—'}
          </dd>
        </div>
      ))}
    </dl>
    <div className="pcf-row">
      <button
        type="button"
        className="pcf-btn"
        disabled={!canModify}
        onClick={onModify}
      >
        <MdEdit size={15} aria-hidden="true" /> Modifier
      </button>
    </div>
  </div>
);

/**
 * Sous une réponse de l'assistant : proposition (Rapide), coordonnées à
 * confirmer, boutons de la question en cours (options exactes, 📎, logos
 * déjà transmis, « Passer »), « Voir le récapitulatif », puis la carte
 * « Votre personnalisation ». Chaque clic envoie son libellé comme message du
 * client ET l'action structurée (réponse écrite par le serveur, sans IA).
 */
const ChatFormTurnView = ({
  turn: rawTurn,
  offer,
  active,
  loading,
  onAct,
  onGo,
  onOfferChange,
}: Props) => {
  const user = useAppSelector((state) => state.auth.user.user);
  const userCart = useUserCart(user?.documentId ?? '');
  const turn = parseChatFormTurn(rawTurn);
  if (!turn) return null;
  const enabled = active && !loading;
  // Boutons d'une question passée : retirés (seul le récapitulatif reste lisible).
  const interactive = active;
  const { recap } = turn;

  /** « Modifier » : la fiche produit s'ouvre sur le formulaire, pré-rempli. */
  const modify = () => {
    if (!recap) return;
    const recapOffer = offer?.lines.some(
      (l) => l.productDocumentId === recap.productDocumentId
    )
      ? offer
      : recapOfferOf(turn);
    const prefill = recapOffer
      ? prefillForProduct(recapOffer, recap.productDocumentId)
      : null;
    if (!prefill) return;
    // L'ajout au panier se fait alors depuis la fiche : l'offre du récapitulatif
    // ne propose plus « Ajouter au panier » (évite un second ajout), et passe à
    // « Dans votre panier » dès que la fiche l'y a mis.
    if (recapOffer && offer && recapOffer === offer && offer.status !== 'added')
      onOfferChange?.({
        ...offer,
        status: 'completing',
        pendingIds: [recap.productDocumentId],
        cartIdsBefore: userCart.map((c) => c.id),
      });
    onGo(`/customer/product/${recap.productDocumentId}`, {
      chatOffer: { ...prefill, answer: recap.answer, openForm: true },
    });
  };

  const parts =
    interactive &&
    (turn.proposal || !!turn.contacts?.length || !!turn.ask || turn.canFinish);
  if (!parts && !recap) return null;

  return (
    <div
      className="pcf"
      role="group"
      aria-label="Personnalisation de votre commande"
    >
      <style>{VIEW_CSS}</style>
      {interactive && turn.proposal && (
        <div className="pcf-row">
          <button
            type="button"
            className="pcf-btn pcf-btn--primary"
            disabled={!enabled}
            onClick={() =>
              onAct({ kind: 'proposal', accept: true }, 'Oui, remplissons-la')
            }
          >
            Oui, remplissons-la
          </button>
          <button
            type="button"
            className="pcf-btn"
            disabled={!enabled}
            onClick={() =>
              onAct({ kind: 'proposal', accept: false }, 'Plus tard')
            }
          >
            Plus tard
          </button>
        </div>
      )}
      {interactive && !!turn.contacts?.length && (
        <div className="pcf-row">
          <button
            type="button"
            className="pcf-btn pcf-btn--primary"
            disabled={!enabled}
            onClick={() =>
              onAct({ kind: 'contacts', confirm: true }, "C'est bon")
            }
          >
            C&apos;est bon
          </button>
          <button
            type="button"
            className="pcf-btn"
            disabled={!enabled}
            onClick={() =>
              onAct(
                { kind: 'contacts', confirm: false },
                'Je veux modifier mes coordonnées'
              )
            }
          >
            Modifier
          </button>
        </div>
      )}
      {interactive && turn.ask && (
        <AskButtons
          key={turn.ask.key}
          ask={turn.ask}
          enabled={enabled}
          onAct={onAct}
        />
      )}
      {interactive && turn.canFinish && (
        <div className="pcf-row">
          <button
            type="button"
            className="pcf-btn"
            disabled={!enabled}
            onClick={() => onAct({ kind: 'finish' }, 'Voir le récapitulatif')}
          >
            Voir le récapitulatif
          </button>
        </div>
      )}
      {recap && (
        <RecapCard
          recap={recap}
          canModify={enabled && offer?.status !== 'added'}
          onModify={modify}
        />
      )}
    </div>
  );
};

export default ChatFormTurnView;
