// Vue d'accueil de l'admin sur cet appareil : le village PEG (par défaut) ou le
// tableau de bord classique (bannière, pense-bête, widgets).

export type HomeView = 'village' | 'classic';

const KEY = 'peg:adminHomeView';

export const readHomeView = (): HomeView => {
  try {
    return localStorage.getItem(KEY) === 'classic' ? 'classic' : 'village';
  } catch {
    return 'village';
  }
};

export const writeHomeView = (view: HomeView) => {
  try {
    localStorage.setItem(KEY, view);
  } catch {
    // Stockage indisponible (navigation privée) : le choix vaut pour la session.
  }
};
