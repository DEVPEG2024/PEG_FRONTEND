import { useEffect, useRef, useState } from 'react';
import classNames from 'classnames';
import { HiArrowDown } from 'react-icons/hi';
import { MdRefresh } from 'react-icons/md';
import { isStandalone } from '@/utils/pwa';

/*
 * « Tirer pour rafraîchir », dans l'application installée uniquement : elle n'a
 * ni barre d'adresse ni bouton pour recharger (dans le navigateur, celui-ci a
 * déjà son propre geste). Tirer la page vers le bas depuis le haut, relâcher
 * au-delà du seuil : la page se recharge. Écouteurs passifs — le défilement
 * n'est jamais bloqué. Styles : `.peg-ptr` dans _mobile.css.
 */

const THRESHOLD = 72; // distance (après amortissement) qui déclenche
const MAX_PULL = 110;
const DAMPING = 0.5; // le doigt parcourt deux fois la distance affichée
const DECIDE_DISTANCE = 8; // en deçà, on ne sait pas encore si c'est vertical

// Un geste né dans une zone qui défile elle-même (liste, modale, menu, onglets)
// lui appartient : pas de rafraîchissement.
const belongsToInnerScroll = (target: EventTarget | null): boolean => {
  if (!(target instanceof Element)) return false;
  if (target.closest('.drawer, .dialog, [role="dialog"], .peg-dock'))
    return true;
  for (
    let el: Element | null = target;
    el && el !== document.body;
    el = el.parentElement
  ) {
    const overflowY = getComputedStyle(el).overflowY;
    if ((overflowY === 'auto' || overflowY === 'scroll') && el.scrollTop > 0)
      return true;
  }
  return false;
};

type Gesture = { x: number; y: number; decided: boolean };

const PullToRefresh = ({ disabled = false }: { disabled?: boolean }) => {
  const [enabled] = useState(isStandalone);
  const [pull, setPull] = useState(0);
  const [dragging, setDragging] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const gesture = useRef<Gesture | null>(null);
  const pullRef = useRef(0);

  useEffect(() => {
    if (!enabled || disabled) return;

    const reset = () => {
      gesture.current = null;
      pullRef.current = 0;
      setDragging(false);
      setPull(0);
    };

    const onStart = (e: TouchEvent) => {
      gesture.current = null;
      if (e.touches.length !== 1 || window.scrollY > 0) return;
      if (
        document.body.classList.contains('dialog-open') ||
        belongsToInnerScroll(e.target)
      )
        return;
      gesture.current = {
        x: e.touches[0].clientX,
        y: e.touches[0].clientY,
        decided: false,
      };
    };

    const onMove = (e: TouchEvent) => {
      const g = gesture.current;
      if (!g) return;
      const dx = e.touches[0].clientX - g.x;
      const dy = e.touches[0].clientY - g.y;
      if (!g.decided) {
        if (Math.abs(dx) < DECIDE_DISTANCE && Math.abs(dy) < DECIDE_DISTANCE)
          return;
        // Seul un geste vers le bas, franchement vertical, depuis le haut de page
        if (dy <= 0 || Math.abs(dx) > Math.abs(dy) || window.scrollY > 0) {
          gesture.current = null;
          return;
        }
        g.decided = true;
        setDragging(true);
      }
      const next = Math.min(MAX_PULL, Math.max(0, dy * DAMPING));
      // Petite vibration au franchissement du seuil (Android ; ignorée ailleurs)
      if (pullRef.current < THRESHOLD && next >= THRESHOLD)
        navigator.vibrate?.(8);
      pullRef.current = next;
      setPull(next);
    };

    const onEnd = () => {
      if (!gesture.current?.decided) {
        gesture.current = null;
        return;
      }
      if (pullRef.current >= THRESHOLD) {
        gesture.current = null;
        setDragging(false);
        setPull(THRESHOLD);
        setRefreshing(true);
        window.location.reload();
        return;
      }
      reset();
    };

    document.addEventListener('touchstart', onStart, { passive: true });
    document.addEventListener('touchmove', onMove, { passive: true });
    document.addEventListener('touchend', onEnd);
    document.addEventListener('touchcancel', reset);
    return () => {
      document.removeEventListener('touchstart', onStart);
      document.removeEventListener('touchmove', onMove);
      document.removeEventListener('touchend', onEnd);
      document.removeEventListener('touchcancel', reset);
    };
  }, [enabled, disabled]);

  if (!enabled) return null;

  const progress = Math.min(1, pull / THRESHOLD);
  return (
    <div
      className={classNames('peg-ptr', !dragging && 'peg-ptr--settle')}
      style={{
        transform: `translate(-50%, ${pull - 48}px)`,
        opacity: refreshing ? 1 : Math.min(1, progress * 1.5),
      }}
      aria-hidden="true"
    >
      <span
        className={classNames('peg-ptr-icon', refreshing && 'is-spinning')}
        style={
          refreshing
            ? undefined
            : {
                transform: `rotate(${progress >= 1 ? 180 : progress * 140}deg)`,
              }
        }
      >
        {refreshing ? <MdRefresh /> : <HiArrowDown />}
      </span>
    </div>
  );
};

export default PullToRefresh;
