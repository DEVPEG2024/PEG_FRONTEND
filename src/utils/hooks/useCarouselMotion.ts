import { useEffect } from 'react';
import type { EmblaCarouselType } from 'embla-carousel';

/**
 * Mouvement automatique des carrousels (composant `Carousel`, sur Embla).
 *
 * Pourquoi un contrôleur à nous plutôt que les réglages des greffons Embla :
 * - « pause au survol » : iOS émule un `mouseenter` à chaque tape et n'envoie
 *   jamais le `mouseleave` → un carrousel touché une fois restait figé. Le
 *   survol n'est écouté que sur un appareil à vraie souris.
 * - le défilé continu (greffon AutoScroll) ne repart qu'à la fin d'une
 *   animation ; après un contact sans mouvement, elle peut ne jamais venir. Ici
 *   la reprise est une minuterie, plus un battement de contrôle qui relance
 *   tout mouvement qui aurait dû reprendre.
 * - le doigt qui fait défiler la PAGE en passant sur la piste ne l'arrête pas :
 *   seul un vrai glisser du carrousel la met en pause.
 *
 * Rien ne bouge hors écran ni onglet masqué. « Réduire les animations » : plus
 * aucun glissement — la piste change de carte d'un coup, toutes les 5 s au plus
 * vite (demande de mouvement réduit respectée, carrousel toujours vivant).
 */

export type CarouselAutoplay = 'none' | 'step' | 'continuous';
export type CarouselMotion = 'idle' | 'step' | 'continuous';

export type CarouselMotionOptions = {
  autoplay: CarouselAutoplay;
  /** Mode « step » : délai entre deux cartes (ms) */
  interval: number;
  /** Délai de reprise après un glisser du client (ms) */
  resumeDelay: number;
  reducedMotion: boolean;
};

/** Cadence minimale quand le système demande de réduire les animations */
export const REDUCED_MOTION_INTERVAL = 5000;
/** Battement de contrôle : relance un mouvement qui aurait dû reprendre */
export const MOTION_HEARTBEAT = 1500;
/** Déplacement (px) au-delà duquel un contact devient un glisser de la piste */
const DRAG_TOLERANCE = 3;
/** Sous un doigt posé immobile, on ne fait pas avancer la piste : on réessaie */
const HELD_RETRY = 400;

type AutoScrollApi = {
  play: (startDelay?: number) => void;
  stop: () => void;
  isPlaying: () => boolean;
};

const autoScrollOf = (api: EmblaCarouselType): AutoScrollApi | undefined =>
  (api.plugins() as unknown as Record<string, AutoScrollApi | undefined>).autoScroll;

/** Mouvement à appliquer, compte tenu de la piste réelle (après mesure par Embla) */
export function resolveMotion(
  api: EmblaCarouselType,
  autoplay: CarouselAutoplay,
  reducedMotion: boolean,
): CarouselMotion {
  if (autoplay === 'none') return 'idle';
  // Tout tient à l'écran : rien à faire défiler
  if (api.scrollSnapList().length < 2) return 'idle';
  if (!api.canScrollNext() && !api.canScrollPrev()) return 'idle';
  // Le défilé continu exige une boucle (Embla la retire s'il y a trop peu de
  // cartes) : sinon il s'arrêterait en bout de piste → carte par carte.
  if (
    autoplay === 'continuous' &&
    !reducedMotion &&
    api.internalEngine().options.loop &&
    autoScrollOf(api)
  )
    return 'continuous';
  return 'step';
}

const hasRealHover = (win: Window): boolean => {
  try {
    return win.matchMedia?.('(hover: hover) and (pointer: fine)').matches ?? false;
  } catch {
    return false;
  }
};

const isKeyboardFocus = (target: EventTarget | null): boolean => {
  try {
    return target instanceof Element && target.matches(':focus-visible');
  } catch {
    return false; // Safari < 15.4 : pas de :focus-visible → on laisse défiler
  }
};

export default function useCarouselMotion(
  api: EmblaCarouselType | undefined,
  { autoplay, interval, resumeDelay, reducedMotion }: CarouselMotionOptions,
) {
  useEffect(() => {
    if (!api || autoplay === 'none') return;
    const engine = api.internalEngine();
    const win = engine.ownerWindow as Window;
    const doc = engine.ownerDocument;
    const root = api.rootNode();
    const jump = reducedMotion;
    const stepEvery = reducedMotion ? Math.max(interval, REDUCED_MOTION_INTERVAL) : interval;

    let running: CarouselMotion = 'idle';
    let visible = true;
    let hovered = false;
    let focused = false;
    let held = false; // doigt / bouton posé sur la piste
    let dragged = false; // … et la piste a bougé sous lui
    let downAt = 0;
    let holdUntil = 0;
    let stepTimer = 0;
    let holdTimer = 0;

    const location = () => engine.location.get();

    const canRun = () =>
      visible &&
      doc.visibilityState !== 'hidden' &&
      !hovered &&
      !focused &&
      !dragged &&
      Date.now() >= holdUntil;

    const halt = () => {
      win.clearTimeout(stepTimer);
      stepTimer = 0;
      if (running === 'continuous') autoScrollOf(api)?.stop();
      running = 'idle';
    };

    const scheduleStep = (delay = stepEvery) => {
      win.clearTimeout(stepTimer);
      stepTimer = win.setTimeout(() => {
        stepTimer = 0;
        if (!canRun()) return evaluate();
        if (held) return scheduleStep(HELD_RETRY);
        if (api.canScrollNext()) api.scrollNext(jump);
        else api.scrollTo(0, jump);
        scheduleStep();
      }, delay);
    };

    function evaluate() {
      // Le défilé continu est stoppé par Embla lui-même quand on pose le doigt
      const next = canRun() && !(held && running !== 'step') ? resolveMotion(api!, autoplay, reducedMotion) : 'idle';
      const autoScroll = autoScrollOf(api!);
      if (next === running && (next !== 'continuous' || autoScroll?.isPlaying())) return;
      halt();
      running = next;
      if (next === 'step') scheduleStep();
      else if (next === 'continuous') autoScroll?.play(0);
    }

    const onPointerDown = () => {
      held = true;
      dragged = false;
      downAt = location();
      evaluate();
    };
    const onScroll = () => {
      if (!held || dragged) return;
      if (Math.abs(location() - downAt) > DRAG_TOLERANCE) {
        dragged = true;
        evaluate();
      }
    };
    const onPointerUp = () => {
      held = false;
      if (dragged) {
        dragged = false;
        holdUntil = Date.now() + resumeDelay;
        win.clearTimeout(holdTimer);
        holdTimer = win.setTimeout(evaluate, resumeDelay + 20);
      }
      evaluate();
    };
    // Embla a tout remesuré et relancé ses greffons (redimensionnement, cartes
    // ajoutées) : on repart de zéro.
    const onReInit = () => {
      halt();
      evaluate();
    };

    api.on('pointerDown', onPointerDown).on('pointerUp', onPointerUp).on('scroll', onScroll).on('reInit', onReInit);

    const onVisibility = () => evaluate();
    doc.addEventListener('visibilitychange', onVisibility);

    const io =
      typeof IntersectionObserver !== 'undefined'
        ? new IntersectionObserver(
            ([entry]) => {
              visible = entry.isIntersecting && entry.intersectionRatio >= 0.2;
              evaluate();
            },
            { threshold: [0, 0.2, 0.5] },
          )
        : null;
    io?.observe(root);

    const hover = hasRealHover(win);
    const onEnter = () => { hovered = true; evaluate(); };
    const onLeave = () => { hovered = false; evaluate(); };
    if (hover) {
      root.addEventListener('mouseenter', onEnter);
      root.addEventListener('mouseleave', onLeave);
    }
    const onFocusIn = (e: FocusEvent) => { focused = isKeyboardFocus(e.target); evaluate(); };
    const onFocusOut = () => { focused = false; evaluate(); };
    root.addEventListener('focusin', onFocusIn);
    root.addEventListener('focusout', onFocusOut);

    const heartbeat = win.setInterval(evaluate, MOTION_HEARTBEAT);
    evaluate();

    return () => {
      halt();
      win.clearTimeout(holdTimer);
      win.clearInterval(heartbeat);
      api.off('pointerDown', onPointerDown).off('pointerUp', onPointerUp).off('scroll', onScroll).off('reInit', onReInit);
      doc.removeEventListener('visibilitychange', onVisibility);
      io?.disconnect();
      if (hover) {
        root.removeEventListener('mouseenter', onEnter);
        root.removeEventListener('mouseleave', onLeave);
      }
      root.removeEventListener('focusin', onFocusIn);
      root.removeEventListener('focusout', onFocusOut);
    };
  }, [api, autoplay, interval, resumeDelay, reducedMotion]);
}
