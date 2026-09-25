import type { MotionProps } from 'framer-motion';
import type { PopupAnimation } from '@/@types/campaign';

/**
 * Animations d'apparition de la pop-up des campagnes (framer-motion).
 * `reduced` (préférence système « réduire les animations ») → fondu simple.
 * `compact` : amplitudes réduites pour l'aperçu de l'éditeur.
 */

export const POPUP_ANIMATION_LABELS: Record<PopupAnimation, string> = {
  zoom: 'Zoom rebondi',
  slide: 'Glissement depuis le bas',
  bounce: 'Chute avec rebond',
  fade: 'Fondu',
};
export const POPUP_ANIMATIONS = Object.keys(POPUP_ANIMATION_LABELS) as PopupAnimation[];

type CardMotion = { initial: MotionProps['initial']; animate: MotionProps['animate']; exit: MotionProps['exit']; contentDelay: number };

export function cardMotion(anim: PopupAnimation, reduced: boolean, compact = false): CardMotion {
  const exitQuick = { duration: 0.18, ease: 'easeIn' as const };
  if (reduced || anim === 'fade') {
    return {
      initial: { opacity: 0 },
      animate: { opacity: 1, transition: { duration: 0.35 } },
      exit: { opacity: 0, transition: exitQuick },
      contentDelay: 0.1,
    };
  }
  if (anim === 'slide') {
    return {
      initial: { opacity: 0, y: compact ? 140 : '55vh' },
      animate: { opacity: 1, y: 0, transition: { type: 'spring', stiffness: 170, damping: 22, mass: 1 } },
      exit: { opacity: 0, y: 80, transition: exitQuick },
      contentDelay: 0.18,
    };
  }
  if (anim === 'bounce') {
    return {
      initial: { opacity: 0, y: compact ? -160 : '-65vh', rotate: -3 },
      animate: { opacity: 1, y: 0, rotate: 0, transition: { type: 'spring', stiffness: 380, damping: 12, mass: 1 } },
      exit: { opacity: 0, y: 60, transition: exitQuick },
      contentDelay: 0.25,
    };
  }
  // zoom (défaut) : la carte « éclot » avec un léger dépassement.
  return {
    initial: { opacity: 0, scale: 0.55, y: 24 },
    animate: { opacity: 1, scale: 1, y: 0, transition: { type: 'spring', stiffness: 320, damping: 17, mass: 0.9 } },
    exit: { opacity: 0, scale: 0.9, transition: exitQuick },
    contentDelay: 0.12,
  };
}

export const backdropMotion = {
  initial: { opacity: 0 },
  animate: { opacity: 1, transition: { duration: 0.3 } },
  exit: { opacity: 0, transition: { duration: 0.2, delay: 0.05 } },
};
