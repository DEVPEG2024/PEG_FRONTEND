import { useEffect, useState } from 'react';
import { MdAddShoppingCart, MdCheckCircle, MdArrowForward } from 'react-icons/md';
import { toast } from 'react-toastify';
import { useAppDispatch, useAppSelector } from '@/store';
import { addToCart } from '@/store/slices/base/cartSlice';
import useUserCart from '@/utils/hooks/useUserCart';
import type { CartItem } from '@/@types/cart';
import { planOffer, type ChatOffer, type ChatPrefill } from './chatOffer';

type Props = {
  offer: ChatOffer;
  /** Mémorise l'état du bouton dans le message (conservé avec la conversation). */
  onChange: (offer: ChatOffer) => void;
  /** Ferme le chat puis navigue : la fenêtre recouvrait le bouton « Ajouter au panier » de la fiche. */
  onGo: (path: string, state?: { chatOffer: ChatPrefill }) => void;
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
const ChatOfferAction = ({ offer, onChange, onGo }: Props) => {
  const dispatch = useAppDispatch();
  const user = useAppSelector((state) => state.auth.user.user);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(false);
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

  const summary = offer.lines.map((l) => `${l.quantity} × ${l.productName}`).join(' · ');
  const pendingLines = offer.lines.filter((l) => offer.pendingIds?.includes(l.productDocumentId));

  /** Planifie les lignes demandées, ajoute celles qui sont prêtes, ouvre la première à finaliser. */
  const run = async (lineIds?: string[]) => {
    if (busy || !user?.documentId) return;
    setBusy(true);
    setError(false);
    try {
      const subset = lineIds ? { ...offer, lines: offer.lines.filter((l) => lineIds.includes(l.productDocumentId)) } : offer;
      const plan = await planOffer(subset);
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
        } as unknown as CartItem));
      }
      const toPersonalize = ready.some((r) => r.kind === 'ready' && r.formAnswer);
      if (!todo.length) {
        toast.success(`${ready.length > 1 ? 'Offre ajoutée au panier' : 'Article ajouté au panier'}${toPersonalize ? ' — ajoutez votre logo depuis le panier' : ''}`);
        const remaining = lineIds ? (offer.pendingIds ?? []).filter((id) => !lineIds.includes(id)) : [];
        onChange(remaining.length ? { ...offer, pendingIds: remaining } : { ...offer, status: 'added', pendingIds: [] });
        onGo('/customer/cart');
        return;
      }
      const first = todo[0];
      if (first.kind !== 'complete') return;
      onChange({
        ...offer,
        status: 'completing',
        // « Finaliser » d'une seule ligne : les autres lignes en attente le restent.
        pendingIds: Array.from(new Set([
          ...(lineIds ? (offer.pendingIds ?? []).filter((id) => !lineIds.includes(id)) : []),
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

  return (
    <div style={{ marginTop: '10px', paddingTop: '10px', borderTop: '1px solid rgba(255,255,255,0.08)', display: 'flex', flexDirection: 'column', gap: '6px', whiteSpace: 'normal' }}>
      <div style={{ fontSize: '11.5px', color: 'rgba(255,255,255,0.65)' }}>
        {summary} — <strong style={{ color: '#fff' }}>{fmt(offer.totalHT)} HT</strong> · {fmt(offer.totalTTC)} TTC
      </div>

      {offer.status === 'added' ? (
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
          <div style={{ fontSize: '12px', color: '#fcd34d' }}>Plus qu’une étape sur la fiche : répartir les tailles.</div>
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
