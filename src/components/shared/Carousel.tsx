import { Children, isValidElement, useEffect, useMemo, useState } from 'react';
import type { CSSProperties, ReactNode } from 'react';
import classNames from 'classnames';
import useEmblaCarousel from 'embla-carousel-react';
import AutoScroll from 'embla-carousel-auto-scroll';
import type { EmblaCarouselType, EmblaOptionsType } from 'embla-carousel';
import useCarouselMotion, { type CarouselAutoplay } from '@/utils/hooks/useCarouselMotion';

/**
 * LE carrousel de PEG — tout carrousel passe par lui (garde-fou :
 * src/__tests__/carouselGuard.test.ts).
 *
 * Pourquoi : quatre carrousels « maison » ont échoué au téléphone, chacun à sa
 * façon (mesuré dans Safari iOS le 25/09/2026) :
 * - panier : scrollLeft augmenté de 0,6 px à chaque image — Safari arrondit
 *   scrollLeft à l'entier, la piste restait à 0 pour toujours ; `overflow:
 *   hidden` en plus, impossible à glisser au doigt ;
 * - accueil ordinateur / iPad : défilé CSS en boucle, ni glissable ni pausable
 *   au doigt (la pause n'existait qu'au survol) ;
 * - accueil téléphone : défilement natif piloté en JS (scroll-snap + scrollBy
 *   fluide, capricieux selon la version d'iOS), mis en pause 6 s au moindre
 *   contact — même quand le doigt ne faisait que faire défiler la page ;
 * - fiche produit : balayage sans retour visuel sous le doigt.
 *
 * Ici la piste est déplacée par `transform` (Embla) : même rendu sur tous les
 * navigateurs et toutes les versions d'iOS, glisser qui suit le doigt, élan,
 * verrouillage d'axe (un geste vertical fait défiler la page, pas la piste),
 * clic annulé après un glisser — et une tape qui reste une tape (installTapGuard).
 * Le mouvement automatique est piloté par useCarouselMotion (pauses et
 * reprises sûres au tactile).
 */

export type { CarouselAutoplay };

type CarouselProps = {
  children: ReactNode;
  /** Nom du carrousel pour les lecteurs d'écran (« Suggestions pour vous ») */
  label: string;
  /** 'step' : une carte à la fois ; 'continuous' : défilé en continu ; défaut : aucun */
  autoplay?: CarouselAutoplay;
  /** Mode 'step' : délai entre deux cartes (ms) */
  interval?: number;
  /** Mode 'continuous' : vitesse en px par 1/60 s */
  speed?: number;
  /** Délai de reprise après un glisser du client (ms) */
  resumeDelay?: number;
  /** Boucle sans fin — par défaut dès qu'il y a un mouvement automatique */
  loop?: boolean;
  /** Espace entre deux cartes (px) */
  gap?: number;
  align?: 'start' | 'center';
  /** Glisser libre (sans calage sur une carte) — par défaut en défilé continu */
  dragFree?: boolean;
  /** Glisser au doigt seulement (la souris garde ses usages, ex. loupe) */
  touchOnlyDrag?: boolean;
  /** Fenêtre visible (c'est elle qui porte les marges « plein écran ») */
  className?: string;
  style?: CSSProperties;
  /** Chaque carte : sa largeur se règle ici (classe ou style) */
  slideClassName?: string;
  slideStyle?: CSSProperties;
  /** Carte affichée (index), à chaque changement */
  onSelect?: (index: number) => void;
  /** Accès à l'API Embla (flèches, vignettes…) */
  setApi?: (api: EmblaCarouselType | undefined) => void;
};

const REDUCED_MOTION_QUERY = '(prefers-reduced-motion: reduce)';
/** Tolérance d'une tape (px) — égale au seuil de clic d'Embla (dragThreshold) */
export const TAP_SLOP = 10;

/**
 * Garde de tape. Embla annule (`preventDefault`) chaque `touchmove` horizontal
 * dès le premier pixel ; Safari iOS supprime alors le clic de la tape. Or un
 * doigt bouge presque toujours de 1 à 3 px en tapant : sans cette garde, taper
 * une carte n'ouvrait rien une fois sur deux (mesuré dans Safari iOS 26 :
 * tape immobile → clic, tape de 2 px → aucun clic). Tant que le doigt reste
 * dans la tolérance, ces micro-mouvements ne parviennent pas à Embla ; au-delà,
 * le glisser démarre et rattrape la distance parcourue.
 */
export function installTapGuard(root: HTMLElement, slop = TAP_SLOP): () => void {
  let startX = 0;
  let startY = 0;
  let released = true;
  const onStart = (e: TouchEvent) => {
    released = e.touches.length !== 1; // pincement : laissé à Embla
    if (released) return;
    startX = e.touches[0].clientX;
    startY = e.touches[0].clientY;
  };
  const onMove = (e: TouchEvent) => {
    if (released) return;
    const t = e.touches[0];
    if (!t || e.touches.length !== 1) {
      released = true;
      return;
    }
    if (Math.abs(t.clientX - startX) < slop && Math.abs(t.clientY - startY) < slop) {
      // Phase de capture : l'écouteur d'Embla (même élément, en bouillonnement) ne le reçoit pas
      e.stopPropagation();
      return;
    }
    released = true;
  };
  root.addEventListener('touchstart', onStart, { capture: true, passive: true });
  root.addEventListener('touchmove', onMove, { capture: true, passive: true });
  return () => {
    root.removeEventListener('touchstart', onStart, { capture: true });
    root.removeEventListener('touchmove', onMove, { capture: true });
  };
}

const usePrefersReducedMotion = () => {
  const [reduced, setReduced] = useState(() => {
    try {
      return window.matchMedia?.(REDUCED_MOTION_QUERY).matches ?? false;
    } catch {
      return false;
    }
  });
  useEffect(() => {
    let mq: MediaQueryList | undefined;
    try {
      mq = window.matchMedia?.(REDUCED_MOTION_QUERY);
    } catch {
      return;
    }
    if (!mq) return;
    const list = mq as MediaQueryList & { addEventListener?: MediaQueryList['addEventListener'] };
    const onChange = () => setReduced(list.matches);
    // Safari < 14 : addListener seulement
    if (typeof list.addEventListener === 'function') list.addEventListener('change', onChange);
    else list.addListener?.(onChange);
    return () => {
      if (typeof list.removeEventListener === 'function') list.removeEventListener('change', onChange);
      else list.removeListener?.(onChange);
    };
  }, []);
  return reduced;
};

const Carousel = ({
  children,
  label,
  autoplay = 'none',
  interval = 3500,
  speed = 0.8,
  resumeDelay = 1500,
  loop,
  gap = 12,
  align = 'start',
  dragFree,
  touchOnlyDrag = false,
  className,
  style,
  slideClassName,
  slideStyle,
  onSelect,
  setApi,
}: CarouselProps) => {
  const reducedMotion = usePrefersReducedMotion();
  const slides = Children.toArray(children).filter(isValidElement);
  const count = slides.length;

  const options = useMemo<EmblaOptionsType>(
    () => ({
      align,
      loop: loop ?? autoplay !== 'none',
      dragFree: dragFree ?? autoplay === 'continuous',
      duration: 28,
      dragThreshold: TAP_SLOP,
      watchDrag: touchOnlyDrag ? (_api, evt) => 'touches' in evt : true,
    }),
    [align, loop, autoplay, dragFree, touchOnlyDrag],
  );
  // Le greffon n'est branché que pour le défilé continu ; il ne démarre jamais
  // seul (useCarouselMotion décide), ne gère ni survol ni focus (voir pourquoi
  // dans useCarouselMotion).
  const plugins = useMemo(
    () =>
      autoplay === 'continuous'
        ? [AutoScroll({ speed, startDelay: 0, playOnInit: false, stopOnInteraction: true, stopOnMouseEnter: false, stopOnFocusIn: false })]
        : [],
    [autoplay, speed],
  );
  const [viewportRef, api] = useEmblaCarousel(options, plugins);

  useCarouselMotion(api, { autoplay, interval, resumeDelay, reducedMotion });

  useEffect(() => {
    if (!api) return;
    return installTapGuard(api.rootNode());
  }, [api]);

  useEffect(() => {
    setApi?.(api);
  }, [api, setApi]);

  useEffect(() => {
    if (!api || !onSelect) return;
    const emit = () => onSelect(api.selectedScrollSnap());
    emit();
    api.on('select', emit).on('reInit', emit);
    return () => {
      api.off('select', emit).off('reInit', emit);
    };
  }, [api, onSelect]);

  return (
    <div
      ref={viewportRef}
      className={classNames('peg-carousel', className)}
      style={{ overflow: 'hidden', touchAction: 'pan-y pinch-zoom', ...style }}
      role="region"
      aria-roledescription="carrousel"
      aria-label={label}
    >
      <div className="peg-carousel-track" style={{ display: 'flex' }}>
        {slides.map((child, i) => (
          <div
            key={child.key ?? i}
            className={classNames('peg-carousel-slide', slideClassName)}
            style={{ flex: '0 0 auto', minWidth: 0, marginRight: gap, ...slideStyle }}
            role="group"
            aria-roledescription="diapositive"
            aria-label={`${i + 1} sur ${count}`}
          >
            {child}
          </div>
        ))}
      </div>
    </div>
  );
};

export default Carousel;
