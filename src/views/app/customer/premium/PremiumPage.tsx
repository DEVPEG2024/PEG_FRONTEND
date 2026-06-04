import { useEffect, useRef, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { loadStripe } from '@stripe/stripe-js';
import { env } from '@/configs/env.config';
import { RootState, useAppSelector } from '@/store';
import { User } from '@/@types/user';
import { toast } from 'react-toastify';
import { TbArrowLeft, TbCrown, TbCheck, TbDiscount, TbGift } from 'react-icons/tb';
import {
  apiStartPremiumCheckout,
  apiCancelPremium,
  apiRecordPremiumContractAcceptance,
  PREMIUM_PRICE_HT,
  PREMIUM_MIN_MONTHS,
  canCancelPremium,
  premiumCancellableFrom,
} from '@/services/PremiumServices';
import {
  PREMIUM_CONTRACT_TEXT,
  PREMIUM_CONTRACT_TITLE,
  PREMIUM_CONTRACT_VERSION,
  downloadPremiumContract,
} from './contract';

const GOLD = '#eab308';

const ADVANTAGES = [
  { icon: <TbDiscount size={20} color={GOLD} />, title: '-15 % sur tout le catalogue', desc: 'Remise automatique appliquée sur l’ensemble des produits standard.' },
  { icon: <TbGift size={20} color={GOLD} />, title: 'Offres personnalisées', desc: 'Accès à « Mes offres » : des propositions sur-mesure préparées par notre équipe.' },
  { icon: <TbCrown size={20} color={GOLD} />, title: 'Accompagnement prioritaire', desc: 'Un suivi dédié pour vos projets.' },
];

const PremiumPage = () => {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const user = useAppSelector((state: RootState) => state.auth.user.user) as User | undefined;
  const { token } = useAppSelector((state: RootState) => state.auth.session);
  const isPremium = !!user?.customer?.premium;
  const customerDocumentId = user?.customer?.documentId;

  const [busy, setBusy] = useState(false);
  const [accepted, setAccepted] = useState(false);
  const [showContract, setShowContract] = useState(false);
  const paidHandledRef = useRef<string | null>(null);

  const priceTTC = Math.round(PREMIUM_PRICE_HT * 1.2);
  const premiumSince = user?.customer?.premiumSince;
  const cancellable = canCancelPremium(premiumSince);
  const cancelFromDate = premiumCancellableFrom(premiumSince);
  const fmtDate = (d?: Date | null) =>
    d ? d.toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' }) : '';

  // Retour de paiement Stripe : l'activation premium est faite par le webhook (asynchrone)
  useEffect(() => {
    if (params.get('canceled')) {
      toast.info('Paiement annulé — vous n’êtes pas passé Premium.');
      navigate('/customer/premium', { replace: true });
      return;
    }
    const paid = params.get('paid');
    if (!paid) return;
    if (paidHandledRef.current === paid) return;
    paidHandledRef.current = paid;
    toast.success('Paiement reçu ! Votre abonnement Premium s’active dans un instant.');
    navigate('/customer/premium', { replace: true });
  }, [params, navigate]);

  const handleSubscribe = async () => {
    if (!customerDocumentId) {
      toast.error('Profil client introuvable.');
      return;
    }
    if (!accepted) {
      toast.info('Veuillez accepter le contrat Premium avant de payer.');
      return;
    }
    setBusy(true);
    try {
      // Trace juridique : on enregistre l'acceptation du contrat AVANT le paiement (best-effort).
      await apiRecordPremiumContractAcceptance({
        customerId: customerDocumentId,
        customerName: user?.customer?.name || `${user?.firstName ?? ''} ${user?.lastName ?? ''}`.trim(),
        email: user?.email || user?.customer?.companyInformations?.email,
        contractVersion: PREMIUM_CONTRACT_VERSION,
      });
      const { id } = await apiStartPremiumCheckout(customerDocumentId, token as string);
      const stripe = await loadStripe(env?.STRIPE_PUBLIC_KEY as string);
      if (!stripe || !id) throw new Error('stripe');
      await stripe.redirectToCheckout({ sessionId: id });
    } catch {
      toast.error('Impossible de démarrer le paiement. Réessayez.');
      setBusy(false);
    }
  };

  const handleCancel = async () => {
    if (!customerDocumentId) return;
    if (!cancellable) {
      toast.info(`Engagement de ${PREMIUM_MIN_MONTHS} mois : résiliation possible à partir du ${fmtDate(cancelFromDate)}.`);
      return;
    }
    if (!confirm('Résilier votre abonnement Premium ? Il restera actif jusqu’à la fin de la période en cours.')) return;
    setBusy(true);
    try {
      await apiCancelPremium(customerDocumentId, token as string);
      toast.success('Résiliation enregistrée. Premium reste actif jusqu’à la fin de la période payée.');
    } catch {
      toast.error('Échec de la résiliation. Contactez-nous.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div style={{ fontFamily: 'Inter, sans-serif', maxWidth: '760px', margin: '0 auto', padding: '24px 20px 48px' }}>
      <button onClick={() => navigate(-1)} style={{
        display: 'inline-flex', alignItems: 'center', gap: '6px', background: 'none', border: 'none',
        color: 'rgba(255,255,255,0.5)', fontSize: '13px', fontWeight: 600, cursor: 'pointer',
        fontFamily: 'Inter, sans-serif', marginBottom: '20px', padding: 0,
      }}>
        <TbArrowLeft size={16} /> Retour
      </button>

      {/* En-tête */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '14px', marginBottom: '8px' }}>
        <div style={{
          width: '44px', height: '44px', borderRadius: '12px',
          background: 'rgba(234,179,8,0.16)', border: '1px solid rgba(234,179,8,0.35)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <TbCrown size={22} color={GOLD} />
        </div>
        <div>
          <h2 style={{ color: '#fff', fontSize: '24px', fontWeight: 800, margin: 0, letterSpacing: '-0.02em' }}>
            {isPremium ? 'Votre abonnement Premium' : 'Passer en Premium'}
          </h2>
          <p style={{ color: 'rgba(255,255,255,0.45)', fontSize: '13px', margin: '2px 0 0' }}>
            {isPremium ? 'Vous profitez de tous les avantages Premium.' : 'Débloquez la remise catalogue et vos offres personnalisées.'}
          </p>
        </div>
      </div>

      <div style={{
        marginTop: '24px',
        background: 'linear-gradient(160deg, rgba(34,30,12,0.95), rgba(13,16,24,0.95))',
        border: '1px solid rgba(234,179,8,0.2)', borderRadius: '18px', padding: '24px',
      }}>
        {/* Avantages */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          {ADVANTAGES.map((a) => (
            <div key={a.title} style={{ display: 'flex', gap: '12px', alignItems: 'flex-start' }}>
              <div style={{
                width: '38px', height: '38px', borderRadius: '10px', flexShrink: 0,
                background: 'rgba(234,179,8,0.12)', border: '1px solid rgba(234,179,8,0.25)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                {a.icon}
              </div>
              <div>
                <p style={{ margin: 0, color: '#fff', fontSize: '14px', fontWeight: 700 }}>{a.title}</p>
                <p style={{ margin: '2px 0 0', color: 'rgba(255,255,255,0.5)', fontSize: '12.5px', lineHeight: 1.4 }}>{a.desc}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Tarif + CTA */}
        <div style={{ marginTop: '24px', paddingTop: '20px', borderTop: '1px solid rgba(255,255,255,0.08)' }}>
          {isPremium ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div style={{
                display: 'flex', alignItems: 'center', gap: '8px',
                color: '#34d399', fontSize: '15px', fontWeight: 700,
              }}>
                <TbCheck size={20} /> Abonnement Premium actif
              </div>
              <p style={{ margin: 0, color: 'rgba(255,255,255,0.45)', fontSize: '12.5px' }}>
                {cancellable
                  ? `Engagement de ${PREMIUM_MIN_MONTHS} mois atteint — résiliable à tout moment.`
                  : `Engagement de ${PREMIUM_MIN_MONTHS} mois — résiliable à partir du ${fmtDate(cancelFromDate)}.`}
              </p>
              <button onClick={handleCancel} disabled={busy || !cancellable} title={!cancellable ? `Résiliable à partir du ${fmtDate(cancelFromDate)}` : undefined} style={{
                alignSelf: 'flex-start', background: 'rgba(255,255,255,0.05)',
                border: '1px solid rgba(255,255,255,0.12)', borderRadius: '10px',
                padding: '10px 18px', color: 'rgba(255,255,255,0.7)', fontSize: '13px', fontWeight: 600,
                cursor: busy ? 'wait' : (cancellable ? 'pointer' : 'not-allowed'),
                opacity: cancellable ? 1 : 0.5, fontFamily: 'Inter, sans-serif',
              }}>
                Résilier l’abonnement
              </button>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {/* Acceptation du contrat — obligatoire avant paiement */}
              <label htmlFor="premium-contract-accept" style={{
                display: 'flex', alignItems: 'flex-start', gap: '10px',
                background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)',
                borderRadius: '12px', padding: '12px 14px', cursor: 'pointer',
              }}>
                <input
                  id="premium-contract-accept"
                  type="checkbox"
                  checked={accepted}
                  onChange={(e) => setAccepted(e.target.checked)}
                  style={{ marginTop: '2px', width: '16px', height: '16px', accentColor: GOLD, cursor: 'pointer', flexShrink: 0 }}
                />
                <span style={{ color: 'rgba(255,255,255,0.7)', fontSize: '13px', lineHeight: 1.5 }}>
                  J'ai lu et j'accepte le{' '}
                  <button type="button" onClick={(e) => { e.preventDefault(); setShowContract(true); }} style={{
                    background: 'none', border: 'none', padding: 0, color: GOLD, fontWeight: 700,
                    textDecoration: 'underline', cursor: 'pointer', fontFamily: 'Inter, sans-serif', fontSize: '13px',
                  }}>
                    contrat d'abonnement Premium
                  </button>
                  {' '}(v{PREMIUM_CONTRACT_VERSION}).{' '}
                  <button type="button" onClick={(e) => { e.preventDefault(); downloadPremiumContract(); }} style={{
                    background: 'none', border: 'none', padding: 0, color: 'rgba(255,255,255,0.5)', fontWeight: 600,
                    textDecoration: 'underline', cursor: 'pointer', fontFamily: 'Inter, sans-serif', fontSize: '12.5px',
                  }}>
                    Télécharger
                  </button>
                </span>
              </label>

              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '16px' }}>
                <div>
                  <span style={{ color: '#fff', fontSize: '28px', fontWeight: 800 }}>{PREMIUM_PRICE_HT} €</span>
                  <span style={{ color: 'rgba(255,255,255,0.5)', fontSize: '14px', fontWeight: 600 }}> HT / mois</span>
                  <p style={{ margin: '2px 0 0', color: 'rgba(255,255,255,0.4)', fontSize: '12px' }}>
                    soit {priceTTC} € TTC / mois · engagement {PREMIUM_MIN_MONTHS} mois minimum
                  </p>
                </div>
                <button onClick={handleSubscribe} disabled={busy || !accepted} title={!accepted ? 'Acceptez le contrat pour continuer' : undefined} style={{
                  display: 'flex', alignItems: 'center', gap: '8px',
                  background: `linear-gradient(90deg, ${GOLD}, #ca8a04)`, border: 'none', borderRadius: '12px',
                  padding: '14px 24px', color: '#1a1505', fontSize: '15px', fontWeight: 800,
                  cursor: busy ? 'wait' : (accepted ? 'pointer' : 'not-allowed'), opacity: (busy || !accepted) ? 0.55 : 1,
                  fontFamily: 'Inter, sans-serif', boxShadow: `0 6px 20px ${GOLD}55`,
                }}>
                  <TbCrown size={18} />
                  {busy ? 'Redirection…' : 'Passer en Premium'}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Modale : contrat complet */}
      {showContract && (
        <div
          onClick={() => setShowContract(false)}
          style={{
            position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', zIndex: 1000,
            display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px',
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              background: '#0d1018', border: '1px solid rgba(234,179,8,0.25)', borderRadius: '16px',
              maxWidth: '720px', width: '100%', maxHeight: '85vh', display: 'flex', flexDirection: 'column',
            }}
          >
            <div style={{
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              padding: '18px 20px', borderBottom: '1px solid rgba(255,255,255,0.08)',
            }}>
              <h3 style={{ margin: 0, color: '#fff', fontSize: '16px', fontWeight: 800 }}>{PREMIUM_CONTRACT_TITLE}</h3>
              <button onClick={() => setShowContract(false)} style={{
                background: 'none', border: 'none', color: 'rgba(255,255,255,0.5)', fontSize: '22px',
                cursor: 'pointer', lineHeight: 1, padding: 0,
              }}>×</button>
            </div>
            <div style={{
              padding: '20px', overflowY: 'auto', whiteSpace: 'pre-wrap',
              color: 'rgba(255,255,255,0.75)', fontSize: '12.5px', lineHeight: 1.6, fontFamily: 'Inter, sans-serif',
            }}>
              {PREMIUM_CONTRACT_TEXT}
            </div>
            <div style={{
              display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px',
              padding: '16px 20px', borderTop: '1px solid rgba(255,255,255,0.08)', flexWrap: 'wrap',
            }}>
              <button onClick={downloadPremiumContract} style={{
                background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.12)', borderRadius: '10px',
                padding: '10px 16px', color: 'rgba(255,255,255,0.7)', fontSize: '13px', fontWeight: 600,
                cursor: 'pointer', fontFamily: 'Inter, sans-serif',
              }}>
                Télécharger le contrat
              </button>
              <button onClick={() => { setAccepted(true); setShowContract(false); }} style={{
                background: `linear-gradient(90deg, ${GOLD}, #ca8a04)`, border: 'none', borderRadius: '10px',
                padding: '10px 18px', color: '#1a1505', fontSize: '13px', fontWeight: 800,
                cursor: 'pointer', fontFamily: 'Inter, sans-serif',
              }}>
                J'accepte le contrat
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PremiumPage;
