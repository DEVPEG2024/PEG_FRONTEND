import { useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';

const DURATION_MS = 180;

/**
 * Fondu d'entrée du contenu à chaque changement de page, comme dans une
 * application. Opacité seulement : un `transform` ferait du conteneur de page
 * le bloc conteneur des éléments `position: fixed` qu'il contient (bouton de
 * livraison, bulles…), qui sauteraient le temps de l'animation. Rien au premier
 * affichage, rien si l'utilisateur réduit les animations.
 */
const usePageFade = () => {
  const { pathname } = useLocation();
  const first = useRef(true);

  useEffect(() => {
    if (first.current) {
      first.current = false;
      return;
    }
    if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return;
    const page = document.querySelector<HTMLElement>('.page-container');
    page?.animate?.([{ opacity: 0 }, { opacity: 1 }], {
      duration: DURATION_MS,
      easing: 'ease-out',
    });
  }, [pathname]);
};

export default usePageFade;
