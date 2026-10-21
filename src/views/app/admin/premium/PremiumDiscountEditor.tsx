// Remise catalogue d'un client Premium, réglable depuis l'onglet Premium.
// Vide = 15 % (l'offre Premium). Le taux est relu par le serveur au paiement
// (checkout) et par l'assistant : l'écran ne fait que l'enregistrer.
import { useEffect, useState } from 'react';
import { toast } from 'react-toastify';
import { TbDiscount, TbRotate } from 'react-icons/tb';
import { apiSetPremiumDiscount } from '@/services/PremiumServices';
import {
  formatPremiumDiscount,
  parsePremiumDiscountInput,
  PREMIUM_DISCOUNT_MAX_PERCENT,
  PREMIUM_DISCOUNT_RATE,
} from '@/utils/productHelpers';

const GOLD = '#eab308';
const DEFAULT_PCT = Math.round(PREMIUM_DISCOUNT_RATE * 100);

const isSet = (v: number | string | null | undefined) => v !== null && v !== undefined && v !== '';

const PremiumDiscountEditor = ({
  customerDocumentId,
  customerName,
  value,
  onChange,
}: {
  customerDocumentId: string;
  customerName: string;
  /** Taux saisi (%), null = 15 % par défaut. */
  value: number | string | null;
  onChange: (value: number | string | null) => void;
}) => {
  const current = isSet(value) ? formatPremiumDiscount({ premiumDiscountPercent: value }) : '';
  const [draft, setDraft] = useState(current);
  const [busy, setBusy] = useState(false);
  useEffect(() => setDraft(current), [current]);

  const parsed = draft.trim() === '' ? null : parsePremiumDiscountInput(draft);
  const invalid = draft.trim() !== '' && parsed === null;
  const dirty = draft.trim() !== current;
  const shown = invalid ? null : parsed ?? DEFAULT_PCT;

  const save = async (percent: number | null) => {
    setBusy(true);
    try {
      const saved = await apiSetPremiumDiscount(customerDocumentId, percent);
      onChange(saved);
      toast.success(
        percent === null
          ? `${customerName} : retour à la remise de ${DEFAULT_PCT} % (par défaut)`
          : `${customerName} : remise catalogue de ${formatPremiumDiscount({ premiumDiscountPercent: saved })} %`
      );
    } catch {
      toast.error("Échec de l'enregistrement de la remise");
    } finally {
      setBusy(false);
    }
  };

  const submit = () => {
    if (busy || invalid || !dirty) return;
    save(parsed);
  };

  return (
    <div style={{
      flexBasis: '100%', display: 'flex', flexDirection: 'column', gap: '8px',
      borderTop: '1px solid rgba(255,255,255,0.06)', paddingTop: '12px',
    }}>
      <span style={{ color: 'rgba(255,255,255,0.5)', fontSize: '11px', fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase' }}>
        Remise sur le catalogue
      </span>
      <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '8px 10px' }}>
        <label style={{
          display: 'inline-flex', alignItems: 'center', gap: '6px',
          background: 'rgba(0,0,0,0.3)', borderRadius: '8px', padding: '0 10px',
          border: `1px solid ${invalid ? 'rgba(239,68,68,0.5)' : 'rgba(255,255,255,0.12)'}`,
        }}>
          <TbDiscount size={14} color={GOLD} aria-hidden />
          <span style={{ color: 'rgba(255,255,255,0.6)', fontSize: '13px', fontWeight: 700 }}>−</span>
          <input
            type="text"
            inputMode="decimal"
            value={draft}
            placeholder={String(DEFAULT_PCT)}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') submit(); }}
            disabled={busy}
            aria-label={`Remise catalogue de ${customerName}, en pourcentage`}
            aria-invalid={invalid}
            style={{
              // Largeur du contenu : « −15 % » reste collé, « −12,5 % » aussi
              width: `${Math.min(6, Math.max(2, draft.length)) + 0.6}ch`,
              background: 'transparent', border: 'none', outline: 'none',
              color: '#fff', fontSize: '14px', fontWeight: 700, fontFamily: 'Inter, sans-serif',
              padding: '7px 0', textAlign: 'center',
            }}
          />
          <span style={{ color: 'rgba(255,255,255,0.6)', fontSize: '13px', fontWeight: 700 }}>%</span>
        </label>
        <button
          type="button"
          onClick={submit}
          disabled={busy || invalid || !dirty}
          className="peg-tap-target"
          style={{
            display: 'inline-flex', alignItems: 'center', gap: '5px',
            background: dirty && !invalid ? 'rgba(234,179,8,0.14)' : 'rgba(255,255,255,0.04)',
            border: `1px solid ${dirty && !invalid ? 'rgba(234,179,8,0.35)' : 'rgba(255,255,255,0.1)'}`,
            borderRadius: '8px', padding: '6px 12px',
            color: dirty && !invalid ? GOLD : 'rgba(255,255,255,0.35)',
            fontSize: '12px', fontWeight: 700, fontFamily: 'Inter, sans-serif',
            cursor: busy ? 'wait' : dirty && !invalid ? 'pointer' : 'default',
          }}
        >
          {busy ? 'Enregistrement…' : 'Enregistrer'}
        </button>
        {isSet(value) && (
          <button
            type="button"
            onClick={() => save(null)}
            disabled={busy}
            className="peg-tap-target"
            title={`Revenir aux ${DEFAULT_PCT} % de l'offre Premium`}
            style={{
              display: 'inline-flex', alignItems: 'center', gap: '5px',
              background: 'transparent', border: '1px solid rgba(255,255,255,0.1)',
              borderRadius: '8px', padding: '6px 10px', color: 'rgba(255,255,255,0.55)',
              fontSize: '12px', fontWeight: 600, fontFamily: 'Inter, sans-serif',
              cursor: busy ? 'wait' : 'pointer',
            }}
          >
            <TbRotate size={13} /> Taux par défaut
          </button>
        )}
      </div>
      <span role={invalid ? 'alert' : undefined} style={{ color: invalid ? '#f87171' : 'rgba(255,255,255,0.4)', fontSize: '11px', lineHeight: 1.5 }}>
        {invalid
          ? `Saisissez un taux entre 0 et ${PREMIUM_DISCOUNT_MAX_PERCENT} % (ex. 20 ou 12,5).`
          : `${isSet(value) ? 'Taux propre à ce client' : `Taux par défaut de l'offre Premium (champ vide = ${DEFAULT_PCT} %)`}. Appliqué aux produits du catalogue, aux prix affichés comme au montant payé ; les offres personnalisées gardent leur prix.`}
        {!invalid && shown !== null && shown < DEFAULT_PCT && (
          <span style={{ display: 'block', color: GOLD }}>
            Moins que les {DEFAULT_PCT} % annoncés dans le contrat Premium.
          </span>
        )}
      </span>
    </div>
  );
};

export default PremiumDiscountEditor;
