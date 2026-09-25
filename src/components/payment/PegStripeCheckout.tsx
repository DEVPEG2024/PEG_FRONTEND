import { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import type { StripeCheckout, StripeCheckoutSession, StripePaymentElement } from '@stripe/stripe-js';
import { HiChevronDown, HiLockClosed, HiShieldCheck, HiX } from 'react-icons/hi';
import Logo from '@/components/template/Logo';
import { getStripe } from '@/utils/stripeClient';
import { accentVars, readAccent } from '@/utils/mobileShell';
import { pegAppearance, summarizeCheckout } from './checkoutSummary';

// Fenêtre de paiement PEG. Tout ce qui s'affiche est dessiné par PEG ; Stripe
// ne fournit que les champs carte (session Checkout en `ui_mode: 'custom'`),
// habillés aux couleurs de PEG. Même session, même webhook côté Strapi.
// Commune aux trois paiements : commande (panier), devis, abonnement Premium.
// Ordinateur : récapitulatif bleu nuit à gauche, carte à droite.
// Téléphone : style « app » des tableaux de bord — fond noir, halo et bouton
// de la couleur choisie sur le tableau de bord, montant en grand.

type Props = {
  clientSecret: string;
  /** « Votre commande », « Devis — … », « Abonnement Premium » */
  title: string;
  subtitle?: string;
  /** E-mail du compte, si la session n'en porte pas (reçu Stripe). */
  email?: string;
  /** Paiement abouti (3-D Secure compris). La confirmation fiable reste le webhook. */
  onComplete: () => void;
  /** Fenêtre fermée sans payer. */
  onClose: () => void;
};

const PEG_BLUE = '#2f6fed';
const INTER_CSS = 'https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap';
const PHONE_QUERY = '(max-width: 767.98px)';

const isPhoneScreen = () =>
  typeof window !== 'undefined' && typeof window.matchMedia === 'function' && window.matchMedia(PHONE_QUERY).matches;

// Au-dessus de la pop-up de campagne (10050), de la barre du bas (10002) et de
// la bulle d'aide (9999) ; sous l'écran « tournez le téléphone » (20000).
const CSS = `
.pco-scrim { position: fixed; inset: 0; z-index: 10060; display: flex; align-items: center; justify-content: center; padding: 24px; background: rgba(4, 8, 15, 0.72); backdrop-filter: blur(10px); -webkit-backdrop-filter: blur(10px); animation: pco-fade 0.2s ease-out; }
.pco { position: relative; width: min(940px, 100%); height: min(700px, calc(100dvh - 48px)); display: grid; grid-template-columns: minmax(0, 1fr) minmax(0, 1.08fr); grid-template-rows: minmax(0, 1fr); overflow: hidden; outline: none; border-radius: 24px; background: #0e1a2c; border: 1px solid rgba(255, 255, 255, 0.08); box-shadow: 0 40px 120px rgba(0, 0, 0, 0.6), 0 0 0 1px rgba(47, 111, 237, 0.06); font-family: Inter, system-ui, sans-serif; color: #fff; animation: pco-in 0.32s cubic-bezier(0.2, 0.8, 0.2, 1); }
.pco-corner { position: absolute; top: 16px; right: 16px; z-index: 2; display: flex; align-items: center; gap: 14px; }
.pco-logo { flex-shrink: 0; opacity: 0.92; pointer-events: none; }
.pco-close { width: 38px; height: 38px; display: flex; align-items: center; justify-content: center; border-radius: 12px; border: 1px solid rgba(255, 255, 255, 0.1); background: rgba(255, 255, 255, 0.05); color: rgba(255, 255, 255, 0.75); cursor: pointer; transition: background 0.15s ease, color 0.15s ease; }
.pco-close:hover:not(:disabled) { background: rgba(255, 255, 255, 0.1); color: #fff; }
.pco-close:disabled { opacity: 0.35; cursor: not-allowed; }
.pco-close:focus { outline: none; }
.pco-close:focus-visible { outline: 2px solid rgba(143, 180, 255, 0.7); outline-offset: 2px; }

.pco-summary { display: flex; flex-direction: column; gap: 18px; min-height: 0; overflow-y: auto; padding: 32px 30px 28px; background: radial-gradient(120% 70% at 0% 0%, rgba(47, 111, 237, 0.22) 0%, rgba(47, 111, 237, 0) 60%), linear-gradient(160deg, #16263d 0%, #0f1c2e 100%); border-right: 1px solid rgba(255, 255, 255, 0.06); }
.pco-eyebrow { display: inline-flex; align-items: center; gap: 7px; margin: 0; font-size: 11px; font-weight: 700; letter-spacing: 0.08em; text-transform: uppercase; color: rgba(255, 255, 255, 0.5); }
.pco-eyebrow svg { color: #34d399; }
.pco-title { margin: 8px 0 0; color: #fff; font-size: 24px; font-weight: 800; letter-spacing: -0.025em; line-height: 1.15; overflow-wrap: anywhere; }
.pco-subtitle { margin: 5px 0 0; font-size: 13px; color: rgba(255, 255, 255, 0.45); }
.pco-hero-total, .pco-toggle { display: none; }
.pco-detail { display: flex; flex-direction: column; gap: 12px; }
.pco-lines { list-style: none; margin: 0; padding: 4px 16px; border-radius: 16px; background: rgba(255, 255, 255, 0.025); border: 1px solid rgba(255, 255, 255, 0.05); }
.pco-line { display: flex; align-items: center; gap: 10px; padding: 12px 0; border-bottom: 1px solid rgba(255, 255, 255, 0.05); }
.pco-line:last-child { border-bottom: none; }
.pco-line-name { flex: 1; min-width: 0; font-size: 13px; font-weight: 600; color: rgba(255, 255, 255, 0.82); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.pco-line-qty { flex-shrink: 0; padding: 2px 8px; border-radius: 999px; font-size: 11px; font-weight: 700; color: rgba(143, 180, 255, 0.9); background: rgba(47, 111, 237, 0.13); }
.pco-line-amount { flex-shrink: 0; font-size: 13px; font-weight: 700; font-variant-numeric: tabular-nums; }
.pco-discount { display: flex; justify-content: space-between; gap: 12px; padding: 0 4px; font-size: 13px; font-weight: 600; color: #4ade80; }
.pco-total { margin-top: auto; display: flex; align-items: flex-end; justify-content: space-between; gap: 12px; padding: 16px 18px; border-radius: 16px; background: rgba(47, 111, 237, 0.08); border: 1px solid rgba(47, 111, 237, 0.2); }
.pco-total-label { font-size: 13px; font-weight: 700; color: rgba(255, 255, 255, 0.72); }
.pco-total-label small { display: block; margin-top: 3px; font-size: 11px; font-weight: 500; color: rgba(255, 255, 255, 0.4); }
.pco-total-amount { font-size: 30px; font-weight: 800; letter-spacing: -0.035em; line-height: 1; font-variant-numeric: tabular-nums; white-space: nowrap; }
.pco-total-amount small, .pco-hero-total small { margin-left: 5px; font-size: 13px; font-weight: 600; letter-spacing: 0; color: rgba(255, 255, 255, 0.5); }

.pco-pay { display: flex; flex-direction: column; min-height: 0; overflow-y: auto; overscroll-behavior: contain; padding: 32px 30px 0; }
.pco-pay-head { margin: 0 124px 20px 0; }
.pco-pay-title { margin: 0; color: #fff; font-size: 16px; font-weight: 800; letter-spacing: -0.015em; }
.pco-pay-sub { margin: 4px 0 0; font-size: 12px; color: rgba(255, 255, 255, 0.4); }
.pco-card { position: relative; min-height: 200px; }
.pco-element { transition: opacity 0.25s ease; }
.pco-card.is-loading .pco-element { opacity: 0; }
.pco-card-skel { position: absolute; inset: 0; display: flex; flex-direction: column; gap: 10px; pointer-events: none; }
.pco-message { padding: 14px 16px; border-radius: 14px; font-size: 13px; font-weight: 600; line-height: 1.5; color: rgba(255, 255, 255, 0.8); background: rgba(255, 255, 255, 0.04); border: 1px solid rgba(255, 255, 255, 0.08); }
.pco-error { margin: 0 0 12px; padding: 11px 13px; border-radius: 12px; font-size: 12.5px; font-weight: 600; line-height: 1.45; color: #fca5a5; background: rgba(248, 113, 113, 0.08); border: 1px solid rgba(248, 113, 113, 0.25); }
.pco-actions { position: sticky; bottom: 0; z-index: 1; margin: auto -30px 0; padding: 22px 30px 24px; background: linear-gradient(180deg, rgba(14, 26, 44, 0) 0%, #0e1a2c 28%); }
.pco-paybtn { width: 100%; height: 54px; display: flex; align-items: center; justify-content: center; gap: 9px; border: none; border-radius: 16px; cursor: pointer; font: inherit; font-size: 15px; font-weight: 800; color: #fff; background: linear-gradient(135deg, #2f6fed 0%, #1f4bb6 50%, #2f6fed 100%); background-size: 200% 100%; box-shadow: 0 10px 30px rgba(47, 111, 237, 0.38); transition: transform 0.15s ease, box-shadow 0.2s ease, background-position 0.4s ease, opacity 0.2s ease; }
.pco-paybtn:hover:not(:disabled) { transform: translateY(-1px); background-position: 100% 0; box-shadow: 0 14px 36px rgba(47, 111, 237, 0.5); }
.pco-paybtn:disabled { cursor: not-allowed; opacity: 0.42; box-shadow: none; }
.pco-paybtn.is-paying { opacity: 1; cursor: progress; }
.pco-spinner { width: 17px; height: 17px; border-radius: 50%; border: 2px solid currentColor; border-right-color: transparent; animation: pco-spin 0.7s linear infinite; }
.pco-trust { display: flex; align-items: center; justify-content: center; gap: 6px; margin: 12px 0 0; font-size: 11px; font-weight: 500; color: rgba(255, 255, 255, 0.35); text-align: center; }

.pco-skel { border-radius: 10px; background: linear-gradient(90deg, rgba(255, 255, 255, 0.04) 0%, rgba(255, 255, 255, 0.09) 50%, rgba(255, 255, 255, 0.04) 100%); background-size: 200% 100%; animation: pco-shimmer 1.3s ease-in-out infinite; }

@keyframes pco-fade { from { opacity: 0; } }
@keyframes pco-in { from { opacity: 0; transform: translateY(10px) scale(0.985); } }
@keyframes pco-up { from { transform: translateY(24px); opacity: 0; } }
@keyframes pco-spin { to { transform: rotate(360deg); } }
@keyframes pco-shimmer { from { background-position: 100% 0; } to { background-position: -100% 0; } }

@media (max-width: 767.98px) {
  .pco-scrim { padding: 0; align-items: stretch; background: #070a08; backdrop-filter: none; -webkit-backdrop-filter: none; }
  .pco { width: 100%; height: 100dvh; max-height: none; display: flex; flex-direction: column; overflow-y: auto; overscroll-behavior: contain; -webkit-overflow-scrolling: touch; border: none; border-radius: 0; box-shadow: none; background: radial-gradient(90% 38% at 88% 0%, rgba(var(--pdm-accent-rgb, 47, 111, 237), 0.3) 0%, rgba(var(--pdm-accent-rgb, 47, 111, 237), 0) 70%), radial-gradient(70% 30% at 0% 34%, rgba(var(--pdm-accent-rgb, 47, 111, 237), 0.12) 0%, rgba(var(--pdm-accent-rgb, 47, 111, 237), 0) 70%), #070a08; animation: pco-up 0.34s cubic-bezier(0.2, 0.8, 0.2, 1); }
  .pco-corner { top: calc(12px + var(--peg-safe-top, 0px)); right: 14px; gap: 12px; }
  .pco-close { width: 40px; height: 40px; border-radius: 999px; background: rgba(255, 255, 255, 0.07); }
  .pco-summary { flex-shrink: 0; overflow: visible; gap: 14px; padding: calc(20px + var(--peg-safe-top, 0px)) 20px 6px; background: none; border-right: none; }
  .pco-title { margin-top: 18px; font-size: 14px; font-weight: 700; letter-spacing: 0; color: rgba(255, 255, 255, 0.6); }
  .pco-subtitle { font-size: 12px; }
  .pco-hero-total { display: block; margin: 4px 0 0; font-size: 42px; font-weight: 800; letter-spacing: -0.045em; line-height: 1.02; font-variant-numeric: tabular-nums; }
  .pco-hero-total small { font-size: 15px; }
  .pco-toggle { display: inline-flex; align-self: flex-start; align-items: center; gap: 6px; padding: 8px 13px; border-radius: 999px; border: 1px solid rgba(255, 255, 255, 0.1); background: rgba(255, 255, 255, 0.06); color: rgba(255, 255, 255, 0.78); font: inherit; font-size: 12px; font-weight: 700; cursor: pointer; }
  .pco-toggle svg { transition: transform 0.2s ease; }
  .pco.is-detail-open .pco-toggle svg { transform: rotate(180deg); }
  .pco-detail { display: none; }
  .pco.is-detail-open .pco-detail { display: flex; }
  .pco-lines { background: rgba(255, 255, 255, 0.04); border-color: rgba(255, 255, 255, 0.08); }
  .pco-line-qty { color: rgba(255, 255, 255, 0.75); background: rgba(255, 255, 255, 0.08); }
  .pco-total { display: none; }
  .pco-pay { flex: 1; overflow: visible; padding: 18px 20px 0; }
  .pco-pay-head { margin: 0 0 14px; }
  .pco-card { padding: 18px 16px 14px; border-radius: 22px; background: rgba(255, 255, 255, 0.04); border: 1px solid rgba(255, 255, 255, 0.08); }
  .pco-card-skel { inset: 18px 16px 14px; }
  .pco-actions { position: sticky; bottom: 0; margin: auto -20px 0; padding: 18px 20px calc(14px + var(--peg-safe-bottom, 0px)); background: linear-gradient(180deg, rgba(7, 10, 8, 0) 0%, #070a08 34%); }
  .pco-paybtn { height: 56px; border-radius: 18px; font-size: 16px; font-weight: 900; letter-spacing: -0.01em; color: var(--pdm-on-accent, #fff); background: var(--pdm-accent, #2f6fed); box-shadow: 0 12px 34px rgba(var(--pdm-accent-rgb, 47, 111, 237), 0.35); }
  .pco-paybtn:hover:not(:disabled) { transform: none; box-shadow: 0 12px 34px rgba(var(--pdm-accent-rgb, 47, 111, 237), 0.35); }
  .pco-paybtn:disabled { opacity: 1; color: rgba(255, 255, 255, 0.45); background: rgba(255, 255, 255, 0.08); box-shadow: none; }
  .pco-paybtn.is-paying { color: var(--pdm-on-accent, #fff); background: var(--pdm-accent, #2f6fed); }
}

@media (prefers-reduced-motion: reduce) {
  .pco-scrim, .pco { animation: none; }
  .pco-skel { animation: none; }
}
`;

function PegStripeCheckout({ clientSecret, title, subtitle, email, onComplete, onClose }: Props) {
  // Rappels toujours à jour sans relancer l'ouverture de la session.
  const onCompleteRef = useRef(onComplete);
  const onCloseRef = useRef(onClose);
  onCompleteRef.current = onComplete;
  onCloseRef.current = onClose;

  // Téléphone : couleur choisie sur le tableau de bord (même clé que le fond
  // « app ») ; ordinateur : bleu PEG. Figé à l'ouverture de la fenêtre.
  const [phone] = useState(isPhoneScreen);
  const accent = phone ? readAccent() : PEG_BLUE;
  const accentStyle = useMemo(() => (phone ? accentVars(accent) : undefined), [phone, accent]);

  const mountRef = useRef<HTMLDivElement>(null);
  const checkoutRef = useRef<StripeCheckout | null>(null);
  const dialogRef = useRef<HTMLDivElement>(null);

  const [status, setStatus] = useState<'loading' | 'ready' | 'failed'>('loading');
  const [session, setSession] = useState<StripeCheckoutSession | null>(null);
  const [elementReady, setElementReady] = useState(false);
  const [cardComplete, setCardComplete] = useState(false);
  const [paying, setPaying] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);

  const payingRef = useRef(false);
  payingRef.current = paying;

  useEffect(() => {
    let cancelled = false;
    let element: StripePaymentElement | null = null;
    getStripe()
      .then((stripe) => {
        if (!stripe) throw new Error('Stripe.js indisponible');
        return stripe.initCheckout({
          fetchClientSecret: () => Promise.resolve(clientSecret),
          elementsOptions: {
            appearance: pegAppearance(accent, phone ? '#0b0f0d' : '#0e1a2c'),
            fonts: [{ cssSrc: INTER_CSS }],
          },
        });
      })
      .then((checkout) => {
        if (cancelled || !mountRef.current) return;
        checkoutRef.current = checkout;
        setSession(checkout.session());
        checkout.on('change', (s) => {
          if (!cancelled) setSession(s);
        });
        element = checkout.createPaymentElement({ layout: { type: 'tabs' } });
        element.on('ready', () => {
          if (!cancelled) setElementReady(true);
        });
        element.on('change', (e) => {
          if (!cancelled) setCardComplete(e.complete);
        });
        element.mount(mountRef.current);
        setStatus('ready');
      })
      .catch((err) => {
        console.error('[Paiement] Ouverture de la session impossible :', err);
        if (!cancelled) setStatus('failed');
      });
    return () => {
      cancelled = true;
      element?.destroy();
      checkoutRef.current = null;
    };
    // Une fenêtre = une session ; l'accent est figé à l'ouverture.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clientSecret]);

  // Page figée derrière la fenêtre, focus sur « Fermer », Échap pour fermer
  // (sauf pendant un paiement en cours).
  useEffect(() => {
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    dialogRef.current?.focus();
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !payingRef.current) onCloseRef.current();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener('keydown', onKeyDown);
    };
  }, []);

  const summary = useMemo(() => (session ? summarizeCheckout(session) : null), [session]);
  const expired = session?.status.type === 'expired';
  const canPay = status === 'ready' && elementReady && cardComplete && !paying && !expired;

  const pay = async () => {
    const checkout = checkoutRef.current;
    if (!checkout || !canPay) return;
    setPaying(true);
    setError(null);
    try {
      const needsEmail = !checkout.session().email && !!email;
      const result = await checkout.confirm({ redirect: 'if_required', ...(needsEmail ? { email } : {}) });
      if (result.type === 'success') {
        onCompleteRef.current();
        return; // la fenêtre est refermée par le parent
      }
      // Refus de la banque : Stripe l'affiche déjà sous le numéro de carte et
      // invalide le champ (le bouton se réactive quand la carte change).
      if (result.error.code !== 'paymentFailed') {
        setError(result.error.message || 'Le paiement n’a pas pu aboutir.');
      }
    } catch (err) {
      console.error('[Paiement] Confirmation impossible :', err);
      setError('Le paiement n’a pas pu aboutir. Vérifiez votre connexion puis réessayez.');
    }
    setPaying(false);
  };

  const cardLoading = status === 'loading' || (status === 'ready' && !elementReady);

  return createPortal(
    <div className="pco-scrim">
      <style>{CSS}</style>
      <div
        className={`pco${detailOpen ? ' is-detail-open' : ''}`}
        ref={dialogRef}
        tabIndex={-1}
        role="dialog"
        aria-modal="true"
        aria-labelledby="pco-title"
        style={accentStyle}
      >
        <div className="pco-corner">
          <Logo type="wordmark" className="pco-logo" imgStyle={{ height: 20, width: 'auto', display: 'block' }} />
          <button
            type="button"
            className="pco-close"
            aria-label="Fermer le paiement"
            disabled={paying}
            onClick={() => onCloseRef.current()}
          >
            <HiX size={18} />
          </button>
        </div>

        <section className="pco-summary" aria-label="Récapitulatif">
          <div>
            <p className="pco-eyebrow">
              <HiShieldCheck size={15} aria-hidden /> Paiement sécurisé
            </p>
            <h2 id="pco-title" className="pco-title">{title}</h2>
            {subtitle && <p className="pco-subtitle">{subtitle}</p>}
            <p className="pco-hero-total" aria-hidden={!summary}>
              {summary ? (
                <>
                  {summary.total}
                  {summary.monthly && <small>/ mois</small>}
                </>
              ) : (
                <span className="pco-skel" style={{ display: 'inline-block', width: 180, height: 40 }} />
              )}
            </p>
          </div>

          {summary && (
            <button type="button" className="pco-toggle" aria-expanded={detailOpen} onClick={() => setDetailOpen((v) => !v)}>
              {detailOpen ? 'Masquer le détail' : 'Voir le détail'}
              <HiChevronDown size={14} aria-hidden />
            </button>
          )}

          <div className="pco-detail">
            {summary ? (
              <ul className="pco-lines">
                {summary.lines.map((line) => (
                  <li key={line.id} className="pco-line">
                    <span className="pco-line-name" title={line.name}>{line.name}</span>
                    {line.quantity > 1 && <span className="pco-line-qty">× {line.quantity}</span>}
                    <span className="pco-line-amount">{line.amount}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <div className="pco-lines" aria-hidden>
                {[0, 1, 2].map((i) => (
                  <div key={i} className="pco-line">
                    <span className="pco-skel" style={{ flex: 1, height: 12 }} />
                    <span className="pco-skel" style={{ width: 64, height: 12 }} />
                  </div>
                ))}
              </div>
            )}
            {summary?.discounts.map((d) => (
              <div key={d.label} className="pco-discount">
                <span>{d.label}</span>
                <span>{d.amount}</span>
              </div>
            ))}
          </div>

          <div className="pco-total">
            <span className="pco-total-label">
              Total TTC
              <small>{summary?.monthly ? 'Prélevé chaque mois' : 'Livraison et TVA comprises'}</small>
            </span>
            <span className="pco-total-amount">
              {summary ? (
                <>
                  {summary.total}
                  {summary.monthly && <small>/ mois</small>}
                </>
              ) : (
                <span className="pco-skel" style={{ display: 'inline-block', width: 130, height: 28 }} />
              )}
            </span>
          </div>
        </section>

        <section className="pco-pay" aria-label="Paiement par carte">
          <div className="pco-pay-head">
            <h3 className="pco-pay-title">Carte bancaire</h3>
            <p className="pco-pay-sub">Visa, Mastercard, CB, American Express</p>
          </div>

          {status === 'failed' ? (
            <div className="pco-message" role="alert">
              Le paiement n’a pas pu s’ouvrir. Vérifiez votre connexion, fermez cette fenêtre puis relancez le paiement.
            </div>
          ) : expired ? (
            <div className="pco-message" role="alert">
              Cette session de paiement a expiré. Fermez cette fenêtre puis relancez le paiement.
            </div>
          ) : (
            <div className={`pco-card${cardLoading ? ' is-loading' : ''}`}>
              {cardLoading && (
                <div className="pco-card-skel" aria-hidden>
                  <span className="pco-skel" style={{ width: 110, height: 10 }} />
                  <span className="pco-skel" style={{ height: 46 }} />
                  <span style={{ display: 'flex', gap: 10 }}>
                    <span className="pco-skel" style={{ flex: 1, height: 46 }} />
                    <span className="pco-skel" style={{ flex: 1, height: 46 }} />
                  </span>
                  <span className="pco-skel" style={{ width: 90, height: 10, marginTop: 6 }} />
                  <span className="pco-skel" style={{ height: 46 }} />
                </div>
              )}
              <div ref={mountRef} className="pco-element" />
            </div>
          )}

          <div className="pco-actions">
            {error && (
              <div className="pco-error" role="alert">
                {error}
              </div>
            )}
            <button
              type="button"
              className={`pco-paybtn${paying ? ' is-paying' : ''}`}
              disabled={!canPay}
              onClick={pay}
            >
              {paying ? (
                <>
                  <span className="pco-spinner" aria-hidden /> Paiement en cours…
                </>
              ) : (
                <>
                  <HiLockClosed size={17} aria-hidden /> {summary?.payLabel ?? 'Payer'}
                </>
              )}
            </button>
            <p className="pco-trust">
              <HiLockClosed size={12} aria-hidden /> Paiement chiffré par Stripe · 3-D Secure · vous restez sur PEG
            </p>
          </div>
        </section>
      </div>
    </div>,
    document.body
  );
}

export default PegStripeCheckout;
