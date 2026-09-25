// Masquage des CHIFFRES DU TABLEAU DE BORD ADMIN — et de rien d'autre.
//
// L'œil du tableau de bord posait auparavant un réglage GLOBAL (`peg:hidePrices`)
// lu par tous les formateurs de prix : cacher le CA masquait aussi les prix des
// fiches produit, devis, factures, dépenses, panier… (demande du 25/09/2026 :
// « c'est seulement les chiffres du dashboard admin, rien d'autre à cacher »).

const KEY = 'peg:dashboardFiguresHidden';
/** Ancien réglage global, plus lu par personne : repris ici puis effacé. */
const LEGACY_KEY = 'peg:hidePrices';

export const DASHBOARD_FIGURES_EVENT = 'peg:dashboardFiguresToggled';
export const HIDDEN_FIGURE = '•••••';

const storage = (): Storage | null => {
  try {
    return localStorage;
  } catch {
    return null;
  }
};

// Un admin qui avait masqué les chiffres les retrouve masqués sur le seul
// tableau de bord ; l'ancien réglage disparaît.
const migrateLegacy = (store: Storage) => {
  const legacy = store.getItem(LEGACY_KEY);
  if (legacy === null) return;
  if (store.getItem(KEY) === null)
    store.setItem(KEY, legacy === '1' ? '1' : '0');
  store.removeItem(LEGACY_KEY);
};

export const areDashboardFiguresHidden = (): boolean => {
  const store = storage();
  if (!store) return false;
  migrateLegacy(store);
  return store.getItem(KEY) === '1';
};

export const toggleDashboardFiguresHidden = (): boolean => {
  const next = !areDashboardFiguresHidden();
  storage()?.setItem(KEY, next ? '1' : '0');
  window.dispatchEvent(new Event(DASHBOARD_FIGURES_EVENT));
  return next;
};
