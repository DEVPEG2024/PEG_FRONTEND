/** L'application tourne-t-elle installée (écran d'accueil), hors du navigateur ? */
export const isStandalone = (): boolean => {
  try {
    if (window.matchMedia?.('(display-mode: standalone)').matches) return true;
  } catch {
    /* matchMedia indisponible */
  }
  return (
    (window.navigator as Navigator & { standalone?: boolean }).standalone ===
    true
  );
};
