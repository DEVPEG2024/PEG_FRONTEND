import { useCallback, useEffect, useRef, useState } from 'react';
import { useParams } from 'react-router-dom';
import { FaWhatsapp } from 'react-icons/fa';
import { HiCheckCircle, HiLockClosed } from 'react-icons/hi';
import Logo from '@/components/template/Logo';
import PegStripeCheckout from '@/components/payment/PegStripeCheckout';
import type { WhatsappPayView } from '@/@types/whatsapp';
import {
  apiCreateWhatsappPaySession,
  apiGetWhatsappPay,
} from '@/services/WhatsappServices';
import { errorText, eurFr } from '@/views/app/admin/whatsapp/whatsappFormat';

// Page de paiement d'une commande préparée sur WhatsApp : la seule étape qui quitte la
// conversation. Elle s'ouvre sans compte ni mot de passe : le lien porte un jeton à usage
// unique, qui ne donne accès qu'au récapitulatif et au formulaire de carte. Le montant
// vient toujours du serveur ; le compte et la commande naissent au paiement (webhook).

const CONFIRM_POLL_MS = 2000;
const CONFIRM_MAX_TRIES = 30;

const CSS = `
.wap { position: fixed; inset: 0; z-index: 10010; overflow-y: auto; display: flex; justify-content: center; padding: calc(24px + env(safe-area-inset-top, 0px)) 16px calc(32px + env(safe-area-inset-bottom, 0px)); font-family: Inter, sans-serif; color: rgba(255,255,255,0.86); background: radial-gradient(120% 80% at 50% 0%, rgba(47,111,237,0.28), transparent 60%), #070d16; }
.wap-card { width: 100%; max-width: 480px; margin: auto; display: flex; flex-direction: column; gap: 16px; }
.wap-logo { display: flex; justify-content: center; }
.wap-title { margin: 0; text-align: center; font-size: 22px; font-weight: 800; letter-spacing: -0.02em; color: #fff; }
.wap-sub { margin: -8px 0 0; text-align: center; font-size: 13.5px; line-height: 1.45; color: rgba(255,255,255,0.55); }
.wap-box { padding: 14px 16px; border-radius: 16px; background: rgba(255,255,255,0.045); border: 1px solid rgba(255,255,255,0.08); }
.wap-line { display: flex; gap: 10px; padding: 9px 0; border-bottom: 1px solid rgba(255,255,255,0.06); font-size: 14px; }
.wap-line:last-child { border-bottom: none; }
.wap-line-name { flex: 1; min-width: 0; color: #fff; font-weight: 600; overflow-wrap: anywhere; }
.wap-line-name small { display: block; margin-top: 2px; font-size: 12px; font-weight: 500; color: rgba(255,255,255,0.5); }
.wap-line-amount { flex-shrink: 0; font-weight: 700; font-variant-numeric: tabular-nums; color: #fff; }
.wap-muted { color: rgba(255,255,255,0.6); font-weight: 500; }
.wap-total { display: flex; align-items: flex-end; justify-content: space-between; gap: 12px; }
.wap-total-label { font-size: 13px; font-weight: 700; color: rgba(255,255,255,0.7); }
.wap-total-label small { display: block; margin-top: 2px; font-size: 11.5px; font-weight: 500; color: rgba(255,255,255,0.45); }
.wap-total-amount { font-size: 28px; font-weight: 800; letter-spacing: -0.03em; color: #fff; font-variant-numeric: tabular-nums; white-space: nowrap; }
.wap-bill { margin: 0; font-size: 13px; line-height: 1.5; color: rgba(255,255,255,0.65); overflow-wrap: anywhere; }
.wap-bill strong { display: block; margin-bottom: 2px; font-size: 11px; font-weight: 700; letter-spacing: 0.06em; text-transform: uppercase; color: rgba(255,255,255,0.4); }
.wap-pay { display: flex; align-items: center; justify-content: center; gap: 8px; width: 100%; min-height: 52px; border-radius: 14px; border: none; cursor: pointer; font-size: 16px; font-weight: 800; font-family: inherit; color: #fff; background: linear-gradient(90deg, #2f6fed, #1f4bb6); box-shadow: 0 8px 24px rgba(47,111,237,0.35); }
.wap-pay:disabled { opacity: 0.6; cursor: wait; }
.wap-safe { margin: -6px 0 0; text-align: center; font-size: 12px; color: rgba(255,255,255,0.45); }
.wap-error { margin: 0; padding: 10px 12px; border-radius: 12px; font-size: 13.5px; line-height: 1.45; color: #fecaca; background: rgba(248,113,113,0.12); border: 1px solid rgba(248,113,113,0.3); }
.wap-test { margin: 0; padding: 9px 12px; border-radius: 12px; text-align: center; font-size: 12.5px; color: #fde68a; background: rgba(251,191,36,0.1); border: 1px solid rgba(251,191,36,0.25); }
.wap-done { text-align: center; }
.wap-done svg { margin: 0 auto 10px; }
.wap-wa { display: flex; align-items: center; justify-content: center; gap: 8px; min-height: 48px; border-radius: 14px; font-size: 15px; font-weight: 800; color: #06210f; background: #25d366; text-decoration: none; }
`;

const Shell = ({ children }: { children: React.ReactNode }) => (
  <div className="wap">
    <style>{CSS}</style>
    <div className="wap-card">
      <div className="wap-logo">
        <Logo
          type="wordmark"
          imgStyle={{ height: 30, width: 'auto', display: 'block' }}
        />
      </div>
      {children}
    </div>
  </div>
);

const backToWhatsapp = (view: WhatsappPayView | null) =>
  view?.whatsappNumber ? (
    <a className="wap-wa" href={`https://wa.me/${view.whatsappNumber}`}>
      <FaWhatsapp size={20} /> Retourner sur WhatsApp
    </a>
  ) : null;

const WhatsappPayPage = () => {
  const { token = '' } = useParams();
  const [view, setView] = useState<WhatsappPayView | null>(null);
  const [notFound, setNotFound] = useState(false);
  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [opening, setOpening] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirming, setConfirming] = useState(() =>
    new URLSearchParams(window.location.search).has('retour')
  );
  const tries = useRef(0);

  const load = useCallback(async () => {
    try {
      const res = await apiGetWhatsappPay(token);
      setView(res.data);
      return res.data;
    } catch (e: any) {
      if (e?.response?.status === 404) setNotFound(true);
      else
        setError(
          errorText(
            e,
            'Page momentanément indisponible. Réessayez dans un instant.'
          )
        );
      return null;
    }
  }, [token]);

  useEffect(() => {
    void load();
  }, [load]);

  // Le paiement est abouti côté Stripe : la confirmation fiable reste le webhook, qui crée
  // la commande. On l'attend quelques secondes pour afficher le bon état.
  useEffect(() => {
    if (!confirming) return undefined;
    const timer = window.setInterval(async () => {
      tries.current += 1;
      const fresh = await load();
      if (fresh?.status === 'paid' || tries.current >= CONFIRM_MAX_TRIES) {
        window.clearInterval(timer);
        setConfirming(false);
      }
    }, CONFIRM_POLL_MS);
    return () => window.clearInterval(timer);
  }, [confirming, load]);

  const pay = async () => {
    setOpening(true);
    setError(null);
    try {
      const res = await apiCreateWhatsappPaySession(token);
      setClientSecret(res.data.clientSecret);
      void load();
    } catch (e) {
      setError(
        errorText(
          e,
          "Le paiement n'a pas pu s'ouvrir. Réessayez dans un instant."
        )
      );
      void load();
    } finally {
      setOpening(false);
    }
  };

  if (notFound) {
    return (
      <Shell>
        <h1 className="wap-title">Lien introuvable</h1>
        <p className="wap-sub">
          Ce lien de paiement n’existe pas. Demandez-en un nouveau dans votre
          conversation WhatsApp.
        </p>
      </Shell>
    );
  }
  if (!view) {
    return (
      <Shell>
        {error ? (
          <p className="wap-error">{error}</p>
        ) : (
          <p className="wap-sub">Chargement…</p>
        )}
      </Shell>
    );
  }
  if (view.status === 'paid') {
    return (
      <Shell>
        <div className="wap-done">
          <HiCheckCircle size={56} color="#4ade80" />
          <h1 className="wap-title">Paiement reçu, merci !</h1>
        </div>
        <p className="wap-sub">
          Votre commande est enregistrée. La suite se passe dans votre
          conversation WhatsApp.
        </p>
        {backToWhatsapp(view)}
      </Shell>
    );
  }
  if (confirming) {
    return (
      <Shell>
        <h1 className="wap-title">Confirmation du paiement…</h1>
        <p className="wap-sub">
          Quelques secondes. Si vous avez bien payé, vous recevrez aussi la
          confirmation sur WhatsApp.
        </p>
      </Shell>
    );
  }
  if (view.status !== 'pending') {
    return (
      <Shell>
        <h1 className="wap-title">
          {view.status === 'expired'
            ? 'Ce lien a expiré'
            : 'Ce lien a été remplacé'}
        </h1>
        <p className="wap-sub">
          {view.status === 'expired'
            ? 'Demandez-en un nouveau dans votre conversation WhatsApp : c’est immédiat.'
            : 'Utilisez le dernier lien reçu dans votre conversation WhatsApp.'}
        </p>
        {backToWhatsapp(view)}
      </Shell>
    );
  }

  const b = view.billing;
  return (
    <Shell>
      <h1 className="wap-title">Votre commande</h1>
      <p className="wap-sub">
        Vérifiez le récapitulatif, puis réglez par carte.
      </p>
      {view.test && (
        <p className="wap-test">Conversation d’essai : aucun vrai paiement.</p>
      )}
      <div className="wap-box">
        {view.lines.map((l, i) => (
          <div className="wap-line" key={`${l.name}-${i}`}>
            <span className="wap-line-name">
              {l.quantity} × {l.name}
              {l.detail ? <small>{l.detail}</small> : null}
            </span>
            <span className="wap-line-amount">{eurFr(l.totalHT)} HT</span>
          </div>
        ))}
        <div className="wap-line">
          <span className="wap-line-name wap-muted">Livraison</span>
          <span className="wap-line-amount wap-muted">
            {eurFr(view.shippingHT)} HT
          </span>
        </div>
      </div>
      <div className="wap-box wap-total">
        <span className="wap-total-label">
          Total à régler<small>dont TVA, soit {eurFr(view.totalHT)} HT</small>
        </span>
        <span className="wap-total-amount">{eurFr(view.totalTTC)}</span>
      </div>
      <div className="wap-box">
        <p className="wap-bill">
          <strong>Facturé à</strong>
          {b.company ? (
            <>
              {b.company}
              <br />
            </>
          ) : null}
          {b.name}
          <br />
          {b.address}, {b.zipCode} {b.city}
          <br />
          {b.email}
        </p>
      </div>
      {error && <p className="wap-error">{error}</p>}
      <button
        type="button"
        className="wap-pay"
        disabled={opening}
        onClick={() => void pay()}
      >
        <HiLockClosed size={18} />{' '}
        {opening ? 'Ouverture…' : `Payer ${eurFr(view.totalTTC)}`}
      </button>
      <p className="wap-safe">
        Paiement sécurisé par Stripe. Une correction à faire ? Dites-le sur
        WhatsApp, vous recevrez un nouveau lien.
      </p>
      {clientSecret && (
        <PegStripeCheckout
          clientSecret={clientSecret}
          title="Votre commande"
          subtitle={b.company || b.name}
          email={b.email ?? undefined}
          onComplete={() => {
            setClientSecret(null);
            tries.current = 0;
            setConfirming(true);
          }}
          onClose={() => setClientSecret(null)}
        />
      )}
    </Shell>
  );
};

export default WhatsappPayPage;
