/**
 * Stub jest de src/configs/env.config.ts.
 *
 * Le vrai module utilise `import.meta.env` (spécifique à Vite), non
 * interprétable par ts-jest en environnement Node. Ce stub reproduit la
 * MÊME forme (`env` avec les mêmes clés) pour que les modules qui importent
 * les services (donc api.config -> env.config) soient testables.
 *
 * Câblé via moduleNameMapper dans jest.config.js — n'affecte PAS le build Vite.
 */
export const env = {
  API_ENDPOINT_URL: 'http://localhost:1337',
  EXPRESS_BACKEND_URL: 'http://localhost:3000',
  STRIPE_PUBLIC_KEY: '',
};
