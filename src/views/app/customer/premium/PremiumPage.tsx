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
  PREMIUM_PRICE_HT,
} from '@/services/PremiumServices';

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
  const paidHandledRef = useRef<string | null>(null);

  const priceTTC = Math.round(PREMIUM_PRICE_HT * 1.2);

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
    setBusy(true);
    try {
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
              <button onClick={handleCancel} disabled={busy} style={{
                alignSelf: 'flex-start', background: 'rgba(255,255,255,0.05)',
                border: '1px solid rgba(255,255,255,0.12)', borderRadius: '10px',
                padding: '10px 18px', color: 'rgba(255,255,255,0.7)', fontSize: '13px', fontWeight: 600,
                cursor: busy ? 'wait' : 'pointer', fontFamily: 'Inter, sans-serif',
              }}>
                Résilier l’abonnement
              </button>
            </div>
          ) : (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '16px' }}>
              <div>
                <span style={{ color: '#fff', fontSize: '28px', fontWeight: 800 }}>{PREMIUM_PRICE_HT} €</span>
                <span style={{ color: 'rgba(255,255,255,0.5)', fontSize: '14px', fontWeight: 600 }}> HT / mois</span>
                <p style={{ margin: '2px 0 0', color: 'rgba(255,255,255,0.4)', fontSize: '12px' }}>
                  soit {priceTTC} € TTC / mois · sans engagement, résiliable à tout moment
                </p>
              </div>
              <button onClick={handleSubscribe} disabled={busy} style={{
                display: 'flex', alignItems: 'center', gap: '8px',
                background: `linear-gradient(90deg, ${GOLD}, #ca8a04)`, border: 'none', borderRadius: '12px',
                padding: '14px 24px', color: '#1a1505', fontSize: '15px', fontWeight: 800,
                cursor: busy ? 'wait' : 'pointer', opacity: busy ? 0.7 : 1,
                fontFamily: 'Inter, sans-serif', boxShadow: `0 6px 20px ${GOLD}55`,
              }}>
                <TbCrown size={18} />
                {busy ? 'Redirection…' : 'Passer en Premium'}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default PremiumPage;
