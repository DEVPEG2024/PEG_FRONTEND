/**
 * Client unique vers peg-backend (Express).
 *
 * - Dev  : `http://localhost:3000`
 * - Prod : `/peg-api` — proxy same-origin Vercel vers peg-backend.vercel.app
 *   (le header Authorization traverse le rewrite, aucun CORS à gérer).
 *
 * peg-backend exige un JWT Strapi sur TOUTES ses routes et résout l'appelant
 * lui-même (`/api/users/me`) : le front n'envoie plus d'identifiant « de
 * confiance » dans le body. Le token est lu dans le store Redux de CET onglet
 * d'abord, puis dans la persistance par onglet — jamais le localStorage partagé
 * en priorité (un onglet client partirait sinon avec le token admin d'un autre
 * onglet).
 *
 * Un 401/403 est rendu tel quel à l'appelant : aucune déconnexion, aucune
 * redirection, aucun retry — les appelants restent silencieux et non bloquants.
 */
import store from '@/store';
import { getPersistedAuthToken } from '@/store/tabSessionStorage';

export const PEG_BACKEND_BASE = import.meta.env.DEV ? 'http://localhost:3000' : '/peg-api';

/** Token JWT Strapi de la session courante (null si déconnecté). */
export function getPegBackendToken(): string | null {
  try {
    return store.getState().auth.session.token || getPersistedAuthToken() || null;
  } catch {
    return null;
  }
}

/**
 * `fetch` vers peg-backend : préfixe `PEG_BACKEND_BASE`, ajoute le Bearer et
 * `Content-Type: application/json` quand le body est une chaîne JSON (un
 * FormData/Blob garde son propre type). Comme `fetch`, ne lève pas sur un
 * statut HTTP d'erreur : à l'appelant de vérifier `res.ok`.
 */
export function pegBackendFetch(path: string, init: RequestInit = {}): Promise<Response> {
  const headers = new Headers(init.headers);
  const token = getPegBackendToken();
  if (token && !headers.has('Authorization')) {
    headers.set('Authorization', `Bearer ${token}`);
  }
  if (typeof init.body === 'string' && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }
  const url = `${PEG_BACKEND_BASE}${path.startsWith('/') ? path : `/${path}`}`;
  return fetch(url, { ...init, headers });
}
