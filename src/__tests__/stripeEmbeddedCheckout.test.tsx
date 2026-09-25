/**
 * @jest-environment jsdom
 */
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import StripeEmbeddedCheckout from '@/components/payment/StripeEmbeddedCheckout';

// Fenêtre de paiement Stripe intégrée à PEG. Stripe.js est simulé : on vérifie
// ce qui relève de PEG — secret transmis, rappel de fin de paiement toujours à
// jour (Stripe interdit de le changer après montage), fermeture, défilement.

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

type ProviderOptions = { clientSecret: string; onComplete: () => void };
const providerOptions: ProviderOptions[] = [];

jest.mock('@stripe/react-stripe-js', () => ({
  EmbeddedCheckoutProvider: ({ options, children }: { options: ProviderOptions; children: unknown }) => {
    providerOptions.push(options);
    return children;
  },
  EmbeddedCheckout: () => null,
}));
jest.mock('@/utils/stripeClient', () => ({ getStripe: () => Promise.resolve(null) }));

let container: HTMLDivElement;
let root: Root;

beforeEach(() => {
  providerOptions.length = 0;
  document.body.style.overflow = 'auto';
  container = document.createElement('div');
  document.body.appendChild(container);
  root = createRoot(container);
});

afterEach(() => {
  act(() => root.unmount());
  container.remove();
});

const dialog = () => document.querySelector('[role="dialog"]');

it('affiche la session et bloque le défilement de la page', () => {
  act(() => root.render(<StripeEmbeddedCheckout clientSecret="cs_1" onComplete={jest.fn()} onClose={jest.fn()} />));
  expect(dialog()).not.toBeNull();
  expect(providerOptions.at(-1)?.clientSecret).toBe('cs_1');
  expect(document.body.style.overflow).toBe('hidden');
  act(() => root.render(<></>));
  expect(document.body.style.overflow).toBe('auto');
});

it('garde les mêmes options entre deux rendus et appelle le dernier onComplete', () => {
  const first = jest.fn();
  const second = jest.fn();
  act(() => root.render(<StripeEmbeddedCheckout clientSecret="cs_1" onComplete={first} onClose={jest.fn()} />));
  act(() => root.render(<StripeEmbeddedCheckout clientSecret="cs_1" onComplete={second} onClose={jest.fn()} />));
  const [a, b] = providerOptions;
  expect(b).toBe(a);
  act(() => b.onComplete());
  expect(first).not.toHaveBeenCalled();
  expect(second).toHaveBeenCalledTimes(1);
});

it('se ferme par le bouton et par Échap', () => {
  const onClose = jest.fn();
  act(() => root.render(<StripeEmbeddedCheckout clientSecret="cs_1" onComplete={jest.fn()} onClose={onClose} />));
  const close = document.querySelector<HTMLButtonElement>('button[aria-label="Fermer le paiement"]');
  expect(document.activeElement).toBe(close);
  act(() => close!.click());
  act(() => { window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' })); });
  expect(onClose).toHaveBeenCalledTimes(2);
});
