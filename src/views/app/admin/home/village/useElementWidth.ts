import { useEffect, useRef, useState } from 'react';

/**
 * Largeur d'un élément, suivie au redimensionnement. Sans ResizeObserver
 * (vieux navigateur, tests), on se rabat sur le redimensionnement de fenêtre.
 */
export const useElementWidth = <T extends HTMLElement>(fallback = 1100) => {
  const ref = useRef<T>(null);
  const [width, setWidth] = useState(fallback);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const measure = () => {
      const w = el.getBoundingClientRect().width;
      if (w > 0) setWidth(Math.round(w));
    };
    measure();
    if (typeof ResizeObserver !== 'undefined') {
      const ro = new ResizeObserver(measure);
      ro.observe(el);
      return () => ro.disconnect();
    }
    window.addEventListener('resize', measure);
    return () => window.removeEventListener('resize', measure);
  }, []);

  return [ref, width] as const;
};
