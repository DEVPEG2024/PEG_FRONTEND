import { RefObject, useEffect } from 'react';

/**
 * Piste horizontale qui avance seule, carte par carte (suggestions de l'accueil
 * au téléphone). Pensée pour le tactile, contrairement à un défilé CSS en boucle :
 * - avance d'une carte toutes les `intervalMs`, revient au début en fin de piste ;
 * - s'arrête dès que le client touche la piste, reprend après `resumeMs` sans contact ;
 * - rien hors écran, onglet masqué, piste sans débordement, ou « réduire les
 *   animations » demandé par le système.
 * Compatible avec scroll-snap : le navigateur cale chaque arrêt sur une carte.
 */
export default function useAutoAdvance(
  ref: RefObject<HTMLElement>,
  enabled: boolean,
  { intervalMs = 3200, resumeMs = 6000 }: { intervalMs?: number; resumeMs?: number } = {},
) {
  useEffect(() => {
    const el = ref.current;
    if (!enabled || !el) return;
    if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return;

    let pausedUntil = 0;
    let visible = true;
    const pause = () => { pausedUntil = Date.now() + resumeMs; };
    const events = ['pointerdown', 'touchstart', 'wheel'] as const;
    events.forEach((ev) => el.addEventListener(ev, pause, { passive: true }));

    const io = typeof IntersectionObserver !== 'undefined'
      ? new IntersectionObserver(([entry]) => { visible = entry.isIntersecting; }, { threshold: 0.4 })
      : null;
    io?.observe(el);

    const tick = () => {
      if (!visible || document.hidden || Date.now() < pausedUntil) return;
      const max = el.scrollWidth - el.clientWidth;
      if (max <= 4) return;
      if (el.scrollLeft >= max - 4) {
        el.scrollTo({ left: 0, behavior: 'smooth' });
        return;
      }
      const first = el.firstElementChild as HTMLElement | null;
      const style = getComputedStyle(el);
      const gap = parseFloat(style.columnGap || style.gap || '0') || 0;
      const step = (first?.getBoundingClientRect().width || el.clientWidth * 0.8) + gap;
      el.scrollBy({ left: step, behavior: 'smooth' });
    };
    const timer = setInterval(tick, intervalMs);

    return () => {
      clearInterval(timer);
      io?.disconnect();
      events.forEach((ev) => el.removeEventListener(ev, pause));
    };
  }, [ref, enabled, intervalMs, resumeMs]);
}
