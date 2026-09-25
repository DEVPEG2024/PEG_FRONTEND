import { loadStripe, type Stripe } from '@stripe/stripe-js';
import { env } from '@/configs/env.config';

// Stripe.js est chargé une seule fois, au premier paiement : aucune page qui ne
// paie pas ne télécharge le script Stripe.
let stripePromise: Promise<Stripe | null> | null = null;

export function getStripe(): Promise<Stripe | null> {
  if (!stripePromise) stripePromise = loadStripe(env?.STRIPE_PUBLIC_KEY as string);
  return stripePromise;
}

/**
 * Réponse des routes `/checkout/*` (commande, devis, Premium).
 * `clientSecret` présent = paiement intégré à PEG (Embedded Checkout) ;
 * absent = backend plus ancien → page Stripe hébergée.
 */
export type StripeSessionResponse = { id?: string; clientSecret?: string };

/** Repli : paiement sur la page hébergée par Stripe (redirection). */
export async function redirectToHostedCheckout(sessionId: string): Promise<void> {
  const stripe = await getStripe();
  if (!stripe) throw new Error('Stripe.js indisponible.');
  const { error } = await stripe.redirectToCheckout({ sessionId });
  if (error) throw error;
}
