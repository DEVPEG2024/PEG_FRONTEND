/**
 * @jest-environment jsdom
 */
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import PegStripeCheckout from '@/components/payment/PegStripeCheckout';
import { summarizeCheckout, pegAppearance } from '@/components/payment/checkoutSummary';

// Fenêtre de paiement PEG (session Stripe `custom`). Stripe.js est simulé : on
// vérifie ce qui relève de PEG — récapitulatif lu dans la session, bouton
// bloqué tant que la carte est incomplète, paiement, erreurs, fermeture.

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const amount = (minorUnitsAmount: number) => ({ minorUnitsAmount, amount: '' });
const line = (id: string, name: string, quantity: number, subtotal: number) => ({
  id, name, quantity, subtotal: amount(subtotal),
});

const session = (over: Record<string, unknown> = {}) => ({
  currency: 'eur',
  minorUnitsAmountDivisor: 100,
  email: 'client@exemple.fr',
  status: { type: 'open' },
  recurring: null,
  lineItems: [line('li_1', 'T-shirt brodé', 25, 36000), line('li_2', 'Livraison', 1, 1188)],
  discountAmounts: [{ ...amount(600), displayName: 'Remise -5€ (BIENVENUE)' }],
  total: { total: amount(36588) },
  ...over,
});

/* ── Stripe.js simulé ── */
type Handler = (e: { complete: boolean }) => void;
const fake = {
  confirm: jest.fn(),
  elementHandlers: {} as Record<string, Handler>,
  mounted: 0,
  destroyed: 0,
  initOptions: null as null | { elementsOptions?: { appearance?: { variables?: Record<string, string> } } },
  session: session(),
};

jest.mock('@/utils/stripeClient', () => ({
  getStripe: () =>
    Promise.resolve({
      initCheckout: (options: typeof fake.initOptions) => {
        fake.initOptions = options;
        return Promise.resolve({
          session: () => fake.session,
          on: jest.fn(),
          confirm: (...args: unknown[]) => fake.confirm(...args),
          createPaymentElement: () => ({
            on: (event: string, handler: Handler) => {
              fake.elementHandlers[event] = handler;
            },
            mount: () => {
              fake.mounted += 1;
            },
            destroy: () => {
              fake.destroyed += 1;
            },
          }),
        });
      },
    }),
}));

let container: HTMLDivElement;
let root: Root;

beforeEach(() => {
  fake.confirm.mockReset();
  fake.elementHandlers = {};
  fake.mounted = 0;
  fake.destroyed = 0;
  fake.session = session();
  document.body.style.overflow = 'auto';
  container = document.createElement('div');
  document.body.appendChild(container);
  root = createRoot(container);
});

afterEach(() => {
  act(() => root.unmount());
  container.remove();
});

const flush = () => act(async () => { await new Promise((r) => setTimeout(r, 0)); });
const payButton = () => document.querySelector<HTMLButtonElement>('.pco-paybtn')!;
const text = () => document.querySelector('[role="dialog"]')?.textContent ?? '';

async function open(props: Partial<Parameters<typeof PegStripeCheckout>[0]> = {}) {
  const onComplete = jest.fn();
  const onClose = jest.fn();
  act(() =>
    root.render(
      <PegStripeCheckout clientSecret="cs_test_1" title="Votre commande" onComplete={onComplete} onClose={onClose} {...props} />
    )
  );
  await flush();
  return { onComplete, onClose };
}

const cardReady = (complete: boolean) =>
  act(() => {
    fake.elementHandlers.ready?.({ complete: false });
    fake.elementHandlers.change?.({ complete });
  });

describe('summarizeCheckout', () => {
  it('affiche les montants de la session Stripe, remise comprise', () => {
    const s = summarizeCheckout(session() as never);
    expect(s.lines.map((l) => [l.name, l.quantity])).toEqual([['T-shirt brodé', 25], ['Livraison', 1]]);
    expect(s.lines[0].amount.replace(/\s/g, ' ')).toBe('360,00 €');
    expect(s.discounts[0].label).toBe('Remise -5€ (BIENVENUE)');
    expect(s.total.replace(/\s/g, ' ')).toBe('365,88 €');
    expect(s.payLabel.replace(/\s/g, ' ')).toBe('Payer 365,88 €');
    expect(s.monthly).toBe(false);
  });

  it('annonce un prélèvement mensuel pour l’abonnement', () => {
    const s = summarizeCheckout(session({ recurring: { interval: 'month' }, discountAmounts: null }) as never);
    expect(s.monthly).toBe(true);
    expect(s.discounts).toEqual([]);
    expect(s.payLabel).toMatch(/\/ mois$/);
  });

  it('habille les champs carte aux couleurs PEG', () => {
    const a = pegAppearance('#2f6fed', '#0e1a2c');
    expect(a.theme).toBe('night');
    expect(a.variables?.colorPrimary).toBe('#2f6fed');
    expect(a.variables?.fontFamily).toMatch(/^Inter/);
    expect(pegAppearance('pas-une-couleur', 'x').variables?.colorPrimary).toBe('#2f6fed');
  });
});

describe('PegStripeCheckout', () => {
  it('ouvre la session, affiche le récapitulatif et fige la page', async () => {
    await open();
    expect(fake.mounted).toBe(1);
    expect(fake.initOptions?.elementsOptions?.appearance?.variables?.colorPrimary).toBe('#2f6fed');
    expect(text()).toContain('Votre commande');
    expect(text()).toContain('T-shirt brodé');
    expect(text()).toContain('Remise -5€ (BIENVENUE)');
    expect(text().replace(/\s/g, ' ')).toContain('Payer 365,88 €');
    expect(document.body.style.overflow).toBe('hidden');
  });

  it('bloque le paiement tant que la carte est incomplète', async () => {
    await open();
    cardReady(false);
    expect(payButton().disabled).toBe(true);
    cardReady(true);
    expect(payButton().disabled).toBe(false);
  });

  it('paie sans redirection et prévient le parent', async () => {
    fake.confirm.mockResolvedValue({ type: 'success', session: fake.session });
    const { onComplete } = await open();
    cardReady(true);
    await act(async () => payButton().click());
    expect(fake.confirm).toHaveBeenCalledWith({ redirect: 'if_required' });
    expect(onComplete).toHaveBeenCalledTimes(1);
  });

  it('passe l’e-mail du compte si la session n’en a pas', async () => {
    fake.session = session({ email: null });
    fake.confirm.mockResolvedValue({ type: 'success', session: fake.session });
    await open({ email: 'moi@exemple.fr' });
    cardReady(true);
    await act(async () => payButton().click());
    expect(fake.confirm).toHaveBeenCalledWith({ redirect: 'if_required', email: 'moi@exemple.fr' });
  });

  it('laisse Stripe afficher le refus de la banque sous la carte, sans doublon', async () => {
    fake.confirm.mockResolvedValue({ type: 'error', error: { code: 'paymentFailed', message: 'Votre carte a été refusée.' } });
    const { onComplete } = await open();
    cardReady(true);
    await act(async () => payButton().click());
    expect(onComplete).not.toHaveBeenCalled();
    expect(document.querySelector('.pco-error')).toBeNull();
    expect(payButton().disabled).toBe(false);
  });

  it('affiche les autres erreurs au-dessus du bouton et laisse réessayer', async () => {
    fake.confirm.mockResolvedValue({ type: 'error', error: { code: null, message: 'Connexion perdue.' } });
    await open();
    cardReady(true);
    await act(async () => payButton().click());
    expect(document.querySelector('.pco-actions .pco-error')?.textContent).toBe('Connexion perdue.');
    expect(payButton().disabled).toBe(false);
  });

  it('se ferme par le bouton et par Échap, et libère les champs carte', async () => {
    const { onClose } = await open();
    const close = document.querySelector<HTMLButtonElement>('button[aria-label="Fermer le paiement"]')!;
    expect(document.activeElement).toBe(document.querySelector('[role="dialog"]'));
    act(() => close.click());
    act(() => { window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' })); });
    expect(onClose).toHaveBeenCalledTimes(2);
    act(() => root.render(<></>));
    expect(fake.destroyed).toBe(1);
    expect(document.body.style.overflow).toBe('auto');
  });

  it('signale une session expirée au lieu d’afficher la carte', async () => {
    fake.session = session({ status: { type: 'expired' } });
    await open();
    expect(text()).toContain('Cette session de paiement a expiré');
    expect(payButton().disabled).toBe(true);
  });
});
