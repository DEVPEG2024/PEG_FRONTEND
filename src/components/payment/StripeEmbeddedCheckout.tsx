import { useEffect, useMemo, useRef } from 'react';
import { createPortal } from 'react-dom';
import { EmbeddedCheckout, EmbeddedCheckoutProvider } from '@stripe/react-stripe-js';
import { HiShieldCheck, HiX } from 'react-icons/hi';
import { getStripe } from '@/utils/stripeClient';

// Paiement Stripe DANS PEG (Embedded Checkout) : le formulaire de carte de la
// session Stripe s'affiche dans cette fenêtre au lieu d'envoyer le client sur
// checkout.stripe.com. Même session, même webhook côté Strapi.
// Commun aux trois paiements : commande (panier), devis, abonnement Premium.

type Props = {
  clientSecret: string;
  /** Paiement abouti (3-D Secure compris). La confirmation fiable reste le webhook. */
  onComplete: () => void;
  /** Fenêtre fermée sans payer. */
  onClose: () => void;
  title?: string;
};

// Au-dessus de la pop-up de campagne (10050), de la barre du bas (10002) et de
// la bulle d'aide (9999) ; sous l'écran « tournez le téléphone » (20000).
const CSS = `
.peg-pay-scrim { position: fixed; inset: 0; z-index: 10060; display: flex; align-items: center; justify-content: center; padding: 24px 16px; background: rgba(5, 8, 14, 0.72); backdrop-filter: blur(6px); -webkit-backdrop-filter: blur(6px); }
.peg-pay { width: min(560px, 100%); max-height: calc(100dvh - 48px); display: flex; flex-direction: column; overflow: hidden; border-radius: 18px; background: #fff; box-shadow: 0 24px 80px rgba(0, 0, 0, 0.45); font-family: Inter, sans-serif; }
.peg-pay-head { flex-shrink: 0; display: flex; align-items: center; gap: 10px; padding: 14px 16px; background: linear-gradient(160deg, #16263d 0%, #0f1c2e 100%); color: #fff; }
.peg-pay-title { margin: 0; font-size: 14px; font-weight: 800; letter-spacing: -0.01em; }
.peg-pay-sub { margin: 1px 0 0; font-size: 11px; color: rgba(255, 255, 255, 0.5); }
.peg-pay-close { margin-left: auto; flex-shrink: 0; width: 36px; height: 36px; display: flex; align-items: center; justify-content: center; border-radius: 10px; border: 1px solid rgba(255, 255, 255, 0.1); background: rgba(255, 255, 255, 0.06); color: rgba(255, 255, 255, 0.8); cursor: pointer; }
.peg-pay-close:hover { background: rgba(255, 255, 255, 0.12); }
.peg-pay-body { flex: 1; min-height: 320px; overflow-y: auto; overscroll-behavior: contain; -webkit-overflow-scrolling: touch; padding: 8px 0; }
@media (max-width: 767.98px) {
  .peg-pay-scrim { padding: 0; align-items: stretch; }
  .peg-pay { width: 100%; height: 100dvh; max-height: none; border-radius: 0; }
  .peg-pay-head { padding-top: calc(12px + var(--peg-safe-top, 0px)); }
  .peg-pay-body { min-height: 0; padding-bottom: var(--peg-safe-bottom, 0px); }
}
`;

function StripeEmbeddedCheckout({ clientSecret, onComplete, onClose, title = 'Paiement sécurisé' }: Props) {
  // Stripe refuse qu'on change `onComplete` après le montage : on lui passe une
  // fonction stable qui appelle toujours la dernière version du rappel.
  const onCompleteRef = useRef(onComplete);
  const onCloseRef = useRef(onClose);
  onCompleteRef.current = onComplete;
  onCloseRef.current = onClose;
  const options = useMemo(
    () => ({ clientSecret, onComplete: () => onCompleteRef.current() }),
    [clientSecret]
  );
  const closeRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    closeRef.current?.focus();
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onCloseRef.current();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener('keydown', onKeyDown);
    };
  }, []);

  return createPortal(
    <div className="peg-pay-scrim">
      <style>{CSS}</style>
      <div className="peg-pay" role="dialog" aria-modal="true" aria-labelledby="peg-pay-title">
        <div className="peg-pay-head">
          <HiShieldCheck size={20} color="#34d399" aria-hidden />
          <div>
            <p id="peg-pay-title" className="peg-pay-title">{title}</p>
            <p className="peg-pay-sub">Carte bancaire traitée par Stripe, sans quitter PEG</p>
          </div>
          <button
            ref={closeRef}
            type="button"
            className="peg-pay-close"
            aria-label="Fermer le paiement"
            onClick={() => onCloseRef.current()}
          >
            <HiX size={18} />
          </button>
        </div>
        <div className="peg-pay-body">
          {/* Une session = une instance : Stripe interdit de changer le secret. */}
          <EmbeddedCheckoutProvider key={clientSecret} stripe={getStripe()} options={options}>
            <EmbeddedCheckout />
          </EmbeddedCheckoutProvider>
        </div>
      </div>
    </div>,
    document.body
  );
}

export default StripeEmbeddedCheckout;
