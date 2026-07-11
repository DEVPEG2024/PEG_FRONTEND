/**
 * Moteur de stockage redux-persist « par onglet » pour la session (auth).
 *
 * Problème résolu : la session était persistée uniquement en localStorage,
 * PARTAGÉ entre tous les onglets. Connecté admin dans un onglet et client
 * dans un autre, l'onglet actif réécrivait la session en continu (polling
 * notifications) → un hard refresh sur l'onglet client rechargeait la
 * session ADMIN.
 *
 * Stratégie :
 * - lecture : sessionStorage d'abord (session propre à l'onglet, survit au
 *   refresh), sinon localStorage (un NOUVEL onglet hérite de la dernière
 *   connexion) ;
 * - écriture : les deux (l'onglet garde sa session ; les nouveaux onglets
 *   héritent de la dernière session active) ;
 * - suppression (déconnexion) : les deux.
 */
/**
 * Migration douce : avant ce mécanisme, la session vivait dans le persist
 * RACINE (clé « peg », champ auth). On la récupère une fois pour ne pas
 * déconnecter tout le monde au déploiement, en la convertissant au format
 * du persist imbriqué (chaque sous-clé sérialisée individuellement).
 */
function migrateLegacyRootAuth(): string | null {
  try {
    const legacyRoot = window.localStorage.getItem('peg');
    if (!legacyRoot) return null;
    const root = JSON.parse(legacyRoot);
    if (!root?.auth) return null;
    const authState = JSON.parse(root.auth);
    if (!authState?.session) return null;
    return JSON.stringify({
      session: JSON.stringify(authState.session),
      user: JSON.stringify(authState.user ?? {}),
      _persist: JSON.stringify({ version: -1, rehydrated: true }),
    });
  } catch {
    return null;
  }
}

/**
 * Token de session persisté, en lecture directe (repli hors store Redux).
 * Respecte la priorité par onglet : sessionStorage → localStorage → legacy.
 */
export function getPersistedAuthToken(): string | null {
  try {
    const raw =
      window.sessionStorage.getItem('peg_auth') ??
      window.localStorage.getItem('peg_auth') ??
      migrateLegacyRootAuth();
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    const session = parsed?.session ? JSON.parse(parsed.session) : null;
    return session?.token ?? null;
  } catch {
    return null;
  }
}

const tabSessionStorage = {
  getItem(key: string): Promise<string | null> {
    try {
      const tabValue = window.sessionStorage.getItem(key);
      if (tabValue !== null) return Promise.resolve(tabValue);
      const shared = window.localStorage.getItem(key);
      if (shared !== null) return Promise.resolve(shared);
      return Promise.resolve(migrateLegacyRootAuth());
    } catch {
      return Promise.resolve(null);
    }
  },
  setItem(key: string, value: string): Promise<void> {
    try {
      window.sessionStorage.setItem(key, value);
      window.localStorage.setItem(key, value);
    } catch {
      /* stockage plein/inaccessible — session en mémoire uniquement */
    }
    return Promise.resolve();
  },
  removeItem(key: string): Promise<void> {
    try {
      window.sessionStorage.removeItem(key);
      window.localStorage.removeItem(key);
    } catch {
      /* ignore */
    }
    return Promise.resolve();
  },
};

export default tabSessionStorage;
