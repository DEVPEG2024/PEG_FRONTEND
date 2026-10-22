import { useEffect, useState } from 'react';
import { MdAddShoppingCart, MdCheckCircle, MdArrowForward } from 'react-icons/md';
import { toast } from 'react-toastify';
import { useAppDispatch, useAppSelector } from '@/store';
import { addToCart } from '@/store/slices/base/cartSlice';
import { chatTraceFor } from './chat/chatTrace';
import { RECAP_OFFER_SUFFIX } from './chat/chatForm';
import useUserCart from '@/utils/hooks/useUserCart';
import type { CartItem } from '@/@types/cart';
import type { Color, Product, Size } from '@/@types/product';
import { answerChatQuestion, chatQuestionFor, describeOffer, planOffer, type ChatNavState, type ChatOffer, type ChatQuestion } from './chatOffer';
import type { ChatFormAnswer } from './chat/chatFormTypes';

/**
 * Question en cours sous l'offre : le produit chargé sert à compléter les lignes.
 * `offer` = l'offre déjà complétée par les réponses précédentes (couleur puis taille),
 * sans attendre que le message du chat soit relu.
 */
type PendingQuestion = { question: ChatQuestion; product: Product; lineIds?: string[]; offer: ChatOffer };

const HEX_RE = /^#(?:[0-9a-f]{3}|[0-9a-f]{6})$/i;

// Pastilles au même dessin que celles de la question couleur du serveur (ChatChoiceView) : 40 px sur téléphone.
const CHIP_CSS = `
.pco-chip { display: inline-flex; align-items: center; gap: 7px; min-height: 36px; padding: 7px 13px; border-radius: 999px;
  cursor: pointer; font: inherit; font-size: 13px; font-weight: 600; line-height: 1.25; color: rgba(255,255,255,0.92);
  background: rgba(255,255,255,0.06); border: 1px solid rgba(255,255,255,0.16); transition: background .15s, border-color .15s; }
.pco-chip:hover:not(:disabled), .pco-chip:focus-visible { background: rgba(255,255,255,0.12); border-color: rgba(124,92,255,0.55); outline: none; }
.pco-chip:disabled { opacity: .6; cursor: not-allowed; }
.pco-dot { width: 12px; height: 12px; border-radius: 50%; flex-shrink: 0; border: 1px solid rgba(255,255,255,0.45); }
@media (max-width: 767.98px) { .pco-chip { min-height: 40px; font-size: 14px; } }
`;

type Props = {
  offer: ChatOffer;
  /** Mémorise l'état du bouton dans le message (conservé avec la conversation). */
  onChange: (offer: ChatOffer) => void;
  /** Ferme le chat puis navigue : la fenêtre recouvrait le bouton « Ajouter au panier » de la fiche. */
  onGo: (path: string, state?: ChatNavState) => void;
  /** Réponses de personnalisation remplies dans le chat, par produit. */
  formAnswers?: Record<string, ChatFormAnswer>;
};

const fmt = (n: number) => `${(Math.round(n * 100) / 100).toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €`;

const btn = (primary: boolean): React.CSSProperties => ({
  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', width: '100%',
  padding: '9px 12px', borderRadius: '10px', fontSize: '13px', fontWeight: 700, cursor: 'pointer',
  border: primary ? 'none' : '1px solid rgba(255,255,255,0.15)',
  background: primary ? 'linear-gradient(135deg, #22c55e, #16a34a)' : 'rgba(255,255,255,0.06)',
  color: '#fff',
});

/**
 * « Ajouter au panier » sous une offre de l'assistant. Toute ligne dont la
 * sélection est connue (taille/couleur précisées ou uniques, dimensions m²)
 * entre DIRECTEMENT au panier — y compris un produit à personnaliser : sa
 * personnalisation (logo…) se complète ensuite depuis le panier. Seules les
 * lignes dont les tailles sont à répartir ouvrent la fiche pré-remplie.
 */
const ChatOfferAction = ({ offer, onChange, onGo, formAnswers }: Props) => {
  const dispatch = useAppDispatch();
  const user = useAppSelector((state) => state.auth.user.user);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(false);
  const [pending, setPending] = useState<PendingQuestion | null>(null);
  const userCart = useUserCart(user?.documentId ?? '');

  // Une ligne à finaliser est considérée faite dès qu'une NOUVELLE ligne du même
  // produit entre au panier (ajout depuis la fiche pré-remplie) : le bouton
  // « Finaliser » disparaît, ce qui évite un second ajout par erreur.
  useEffect(() => {
    if (offer.status !== 'completing' || !offer.pendingIds?.length) return;
    const before = new Set(offer.cartIdsBefore ?? []);
    const done = new Set(userCart.filter((c) => !before.has(c.id)).map((c) => c.product?.documentId));
    const still = offer.pendingIds.filter((id) => !done.has(id));
    if (still.length === offer.pendingIds.length) return;
    onChange(still.length ? { ...offer, pendingIds: still } : { ...offer, status: 'added', pendingIds: [] });
  }, [userCart, offer, onChange]);

  // Tailles et couleurs visibles : le client vérifie que sa demande est respectée.
  const summary = describeOffer(offer);
  const pendingLines = offer.lines.filter((l) => offer.pendingIds?.includes(l.productDocumentId));
  // Offre du récapitulatif de personnalisation : « Modifier » l'a ouverte sur la fiche.
  const fromRecap = offer.id.endsWith(RECAP_OFFER_SUFFIX);

  /**
   * Planifie les lignes demandées, ajoute celles qui sont prêtes, ouvre la première à
   * finaliser. Une couleur, une taille ou un format manque : la question est posée ICI,
   * sous l'offre, avant tout ajout — on ne quitte jamais le chat sans la couleur.
   * `current` : l'offre complétée par une réponse (la prop n'est pas encore à jour).
   * `toSheet` : « Répartir les tailles sur la fiche » (plusieurs tailles pour un produit).
   */
  const run = async (lineIds?: string[], current: ChatOffer = offer, opts: { toSheet?: boolean } = {}) => {
    if (busy || !user?.documentId) return;
    setBusy(true);
    setError(false);
    try {
      const subset = lineIds ? { ...current, lines: current.lines.filter((l) => lineIds.includes(l.productDocumentId)) } : current;
      const plan = await planOffer(subset, { answers: formAnswers });
      for (const p of plan) {
        if (p.kind !== 'complete') continue;
        const question = chatQuestionFor(p.product, current, p.line.productDocumentId);
        // La taille peut se répartir sur la fiche ; la couleur, jamais sans l'avoir dite.
        if (question && !(opts.toSheet && question.label === 'taille')) {
          setPending({ question, product: p.product, lineIds, offer: current });
          return;
        }
      }
      setPending(null);
      const ready = plan.filter((p) => p.kind === 'ready');
      const todo = plan.filter((p) => p.kind === 'complete');
      const addedIds: string[] = [];
      for (const r of ready) {
        if (r.kind !== 'ready') continue;
        const id = Math.random().toString(16).slice(2);
        addedIds.push(id);
        dispatch(addToCart({
          id,
          product: r.product,
          formAnswer: r.formAnswer,
          sizeAndColors: r.sizeAndColors,
          userDocumentId: user.documentId,
          ...chatTraceFor(current.id, user),
        } as unknown as CartItem));
      }
      const toPersonalize = ready.some((r) => r.kind === 'ready' && r.formAnswer);
      if (!todo.length) {
        // La pop-up « Ajoutez votre logo » s'ouvre d'elle-même au panier si besoin.
        toast.success(ready.length > 1 ? 'Offre ajoutée au panier' : 'Article ajouté au panier');
        const remaining = lineIds ? (current.pendingIds ?? []).filter((id) => !lineIds.includes(id)) : [];
        onChange(remaining.length ? { ...current, pendingIds: remaining } : { ...current, status: 'added', pendingIds: [] });
        // Article à personnaliser : le panier ouvre directement la pop-up « Ajoutez votre logo ».
        onGo('/customer/cart', toPersonalize ? { openPersonalization: true } : undefined);
        return;
      }
      const first = todo[0];
      if (first.kind !== 'complete') return;
      onChange({
        ...current,
        status: 'completing',
        // « Finaliser » d'une seule ligne : les autres lignes en attente le restent.
        pendingIds: Array.from(new Set([
          ...(lineIds ? (current.pendingIds ?? []).filter((id) => !lineIds.includes(id)) : []),
          ...todo.map((t) => t.line.productDocumentId),
        ])),
        // Inclut les lignes « prêtes » qu'on vient d'ajouter (dispatch synchrone) : elles ne
        // doivent pas passer pour une finalisation.
        cartIdsBefore: [...userCart.map((c) => c.id), ...addedIds],
      });
      if (ready.length) toast.success(`${ready.length} article${ready.length > 1 ? 's' : ''} ajouté${ready.length > 1 ? 's' : ''} au panier`);
      onGo(`/customer/product/${first.product.documentId}`, { chatOffer: first.prefill });
    } catch (e) {
      console.error('[chat] ajout de l’offre au panier impossible :', e);
      setError(true);
    } finally {
      setBusy(false);
    }
  };

  /** Réponse à la question : les lignes sont complétées puis l'ajout reprend (nouvelle question ou panier). */
  const answer = (option: Size | Color) => {
    if (!pending || busy) return;
    const next = answerChatQuestion(pending.offer, pending.product, pending.question, option);
    onChange(next);
    run(pending.lineIds, next);
  };

  const q = pending?.question;
  // Espaces insécables : le « ? » ne passe jamais seul à la ligne (comme la question du serveur).
  const nb = '\u00a0';
  const pieces = q ? `${q.quantity > 1 ? `vos ${q.quantity} pièces` : 'votre pièce'} «${nb}${q.productName}${nb}»${nb}` : '';

  return (
    <div style={{ marginTop: '10px', paddingTop: '10px', borderTop: '1px solid rgba(255,255,255,0.08)', display: 'flex', flexDirection: 'column', gap: '6px', whiteSpace: 'normal' }}>
      <div style={{ fontSize: '11.5px', color: 'rgba(255,255,255,0.65)' }}>
        {summary} — <strong style={{ color: '#fff' }}>{fmt(offer.totalHT)} HT</strong> · {fmt(offer.totalTTC)} TTC
      </div>

      {q && <style>{CHIP_CSS}</style>}
      {q ? (
        <div role="group" aria-label={`Choisir ${q.label === 'format' ? 'le' : 'la'} ${q.label} — ${q.productName}`} style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <div style={{ fontSize: '12.5px', color: '#fff', fontWeight: 600 }}>
            {q.label === 'format' ? 'Quel' : 'Quelle'} {q.label} pour {pieces}?
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
            {q.options.map((o) => {
              const hex = q.dimension === 'color' && HEX_RE.test(String(o.value ?? '').trim()) ? String(o.value).trim() : null;
              return (
                <button key={o.documentId ?? o.name} type="button" className="pco-chip" disabled={busy} onClick={() => answer(o)}>
                  {hex && <span className="pco-dot" aria-hidden="true" style={{ background: hex }} />}
                  {o.name}
                </button>
              );
            })}
          </div>
          {q.label === 'taille' && (
            <button type="button" style={btn(false)} disabled={busy} onClick={() => pending && run(pending.lineIds, pending.offer, { toSheet: true })}>
              Plusieurs tailles ? Répartir sur la fiche <MdArrowForward size={15} />
            </button>
          )}
        </div>
      ) : offer.status === 'added' ? (
        <>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#4ade80', fontSize: '12.5px', fontWeight: 600 }}>
            <MdCheckCircle size={16} /> Dans votre panier
          </div>
          <button type="button" style={btn(false)} onClick={() => onGo('/customer/cart')}>
            Voir le panier <MdArrowForward size={15} />
          </button>
        </>
      ) : offer.status === 'completing' && pendingLines.length ? (
        <>
          <div style={{ fontSize: '12px', color: '#fcd34d' }}>
            {fromRecap
              ? 'Votre personnalisation est ouverte sur la fiche produit.'
              : 'Plus qu’une étape sur la fiche : répartir les tailles, indiquer les dimensions ou valider le BAT.'}
          </div>
          {pendingLines.map((l) => (
            <button key={l.productDocumentId} type="button" style={btn(true)} disabled={busy} onClick={() => run([l.productDocumentId])}>
              Finaliser {l.productName} <MdArrowForward size={15} />
            </button>
          ))}
        </>
      ) : (
        <button type="button" style={{ ...btn(true), opacity: busy ? 0.7 : 1 }} disabled={busy} onClick={() => run()} aria-label="Ajouter l'offre au panier">
          <MdAddShoppingCart size={16} /> {busy ? 'Ajout en cours…' : 'Ajouter au panier'}
        </button>
      )}

      {error && (
        <div role="alert" style={{ fontSize: '11.5px', color: '#fcd34d' }}>
          Ajout impossible pour le moment. Réessayez, ou ouvrez la fiche produit.
        </div>
      )}
    </div>
  );
};

export default ChatOfferAction;
