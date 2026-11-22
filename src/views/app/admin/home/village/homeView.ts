// Vue d'accueil de l'admin sur cet appareil : le tableau de bord (par défaut
// depuis le 22/11/2026, design « hub ») ou la ville « PEG DISTRICTS ».
//
// Nouvelle clé au 22/11/2026 : avec l'ancienne (`peg:adminHomeView`, ville par
// défaut), un admin qui avait un jour ouvert la ville y serait resté sans voir le
// nouveau tableau de bord. Tout le monde repart donc du tableau de bord ; le
// bouton « Ville PEG » mémorise ensuite le choix.

export type HomeView = 'village' | 'classic';

const KEY = 'peg:adminHomeChoice';

export const readHomeView = (): HomeView => {
  try {
    return localStorage.getItem(KEY) === 'village' ? 'village' : 'classic';
  } catch {
    return 'classic';
  }
};

export const writeHomeView = (view: HomeView) => {
  try {
    localStorage.setItem(KEY, view);
  } catch {
    // Stockage indisponible (navigation privée) : le choix vaut pour la session.
  }
};
