import type { Appearance, StripeCheckoutSession } from '@stripe/stripe-js';

// Récapitulatif de la fenêtre de paiement PEG, lu dans la session Stripe :
// ce qui s'affiche est exactement ce qui sera débité (montants recalculés par
// le serveur, remise et livraison comprises), jamais un calcul du navigateur.

export type CheckoutSummary = {
  lines: { id: string; name: string; quantity: number; amount: string }[];
  discounts: { label: string; amount: string }[];
  total: string;
  monthly: boolean;
  payLabel: string;
};

type SessionForSummary = Pick<
  StripeCheckoutSession,
  'currency' | 'minorUnitsAmountDivisor' | 'lineItems' | 'discountAmounts' | 'total' | 'recurring'
>;

export const formatMoney = (minorUnits: number, currency = 'eur', divisor = 100): string =>
  (minorUnits / (divisor || 100)).toLocaleString('fr-FR', {
    style: 'currency',
    currency: currency.toUpperCase(),
  });

export function summarizeCheckout(session: SessionForSummary): CheckoutSummary {
  const money = (minor: number) => formatMoney(minor, session.currency, session.minorUnitsAmountDivisor);
  const total = money(session.total.total.minorUnitsAmount);
  const monthly = session.recurring?.interval === 'month';
  return {
    lines: session.lineItems.map((li) => ({
      id: li.id,
      name: li.name,
      quantity: li.quantity,
      amount: money(li.subtotal.minorUnitsAmount),
    })),
    discounts: (session.discountAmounts ?? [])
      .filter((d) => d.minorUnitsAmount > 0)
      .map((d) => ({ label: d.displayName || 'Remise', amount: `−${money(d.minorUnitsAmount)}` })),
    total,
    monthly,
    payLabel: monthly ? `Payer ${total} / mois` : `Payer ${total}`,
  };
}

const isHex = (v: string) => /^#[0-9a-f]{6}$/i.test(v);
const rgba = (hex: string, alpha: number) => {
  const [r, g, b] = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16));
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
};

/**
 * Champs carte Stripe aux couleurs de PEG : fond bleu nuit, bordures et
 * libellés du récapitulatif du panier, accent PEG (bleu sur ordinateur,
 * couleur choisie sur le tableau de bord sur téléphone).
 */
export function pegAppearance(accent: string, background: string): Appearance {
  const a = isHex(accent) ? accent : '#2f6fed';
  return {
    theme: 'night',
    labels: 'above',
    variables: {
      colorPrimary: a,
      colorBackground: isHex(background) ? background : '#0f1c2e',
      colorText: '#ffffff',
      colorTextSecondary: 'rgba(255, 255, 255, 0.55)',
      colorTextPlaceholder: 'rgba(255, 255, 255, 0.28)',
      colorIcon: 'rgba(255, 255, 255, 0.55)',
      colorDanger: '#f87171',
      fontFamily: 'Inter, system-ui, sans-serif',
      fontSizeBase: '14px',
      fontWeightNormal: '500',
      borderRadius: '12px',
      spacingUnit: '4px',
    },
    rules: {
      '.Input': {
        backgroundColor: 'rgba(255, 255, 255, 0.04)',
        border: '1px solid rgba(255, 255, 255, 0.1)',
        boxShadow: 'none',
        padding: '13px 14px',
      },
      '.Input:hover': { border: '1px solid rgba(255, 255, 255, 0.18)' },
      '.Input:focus': { border: `1px solid ${a}`, boxShadow: `0 0 0 3px ${rgba(a, 0.18)}` },
      '.Input--invalid': { border: '1px solid rgba(248, 113, 113, 0.6)', boxShadow: 'none' },
      '.Label': {
        fontSize: '11px',
        fontWeight: '700',
        letterSpacing: '0.06em',
        textTransform: 'uppercase',
        color: 'rgba(255, 255, 255, 0.45)',
        marginBottom: '8px',
      },
      '.Error': { fontSize: '12px', fontWeight: '600' },
      '.TermsText': { color: 'rgba(255, 255, 255, 0.35)', fontSize: '11px' },
    },
  };
}
