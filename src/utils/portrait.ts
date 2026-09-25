/*
 * Téléphone tenu en paysage (demande Nova du 25/09/2026) : sa largeur dépasse
 * alors 768px et PEG basculait sur la version ordinateur. Une page web ne peut
 * pas bloquer la rotation (Safari l'interdit) : PortraitLock.tsx affiche un
 * écran « Tournez votre téléphone », et verrouille le portrait quand le
 * navigateur le permet (application installée sur Android).
 *
 * Deux signaux, pour ne jamais laisser voir la version ordinateur :
 * - la FENÊTRE plus large que haute : sur iPhone, Safari élargit la page avant
 *   d'annoncer la rotation ; l'écran doit apparaître dans la même image que la
 *   mise en page (CSS « TÉLÉPHONE EN PAYSAGE », classe PHONE_CLASS sur <html>).
 *   Sauf pendant une saisie (TYPING_CLASS) : sur Android, le clavier ouvert rend
 *   la fenêtre plus large que haute sans que le téléphone ait tourné ;
 * - l'orientation de l'APPAREIL (screen.orientation / window.orientation), qui
 *   fait foi pendant une saisie et sur les navigateurs qui annoncent tôt.
 */

/** Posées sur <html> : l'appareil est un téléphone / un champ de saisie est actif */
export const PHONE_CLASS = 'peg-phone';
export const TYPING_CLASS = 'peg-typing';

/** Plus petit côté d'un téléphone (430px au plus) ; une tablette en a 744 et plus. */
export const PHONE_MAX_SHORT_SIDE = 600;

export type OrientationEnv = {
  /** Écran tactile (pointeur grossier) */
  coarse: boolean;
  screenWidth: number;
  screenHeight: number;
  /** screen.orientation.type, s'il existe */
  orientationType?: string;
  /** window.orientation (ancien iOS) : 0, 90, -90, 180 */
  windowOrientation?: number;
  /** Repli : la fenêtre est plus large que haute */
  mediaLandscape: boolean;
};

export const isPhoneDevice = (env: OrientationEnv) =>
  env.coarse &&
  Math.min(env.screenWidth, env.screenHeight) > 0 &&
  Math.min(env.screenWidth, env.screenHeight) < PHONE_MAX_SHORT_SIDE;

export const isDeviceLandscape = (env: OrientationEnv) => {
  if (env.orientationType) return env.orientationType.startsWith('landscape');
  if (typeof env.windowOrientation === 'number')
    return Math.abs(env.windowOrientation) === 90;
  return env.mediaLandscape;
};

/** Faut-il demander de tourner le téléphone ? */
export const shouldAskPortrait = (env: OrientationEnv, typing = false) =>
  isPhoneDevice(env) &&
  (isDeviceLandscape(env) || (env.mediaLandscape && !typing));

/** Marque <html> d'un téléphone (avant le premier rendu, puis à chaque changement). */
export function markPhoneDevice(): boolean {
  const phone = isPhoneDevice(readOrientationEnv());
  document.documentElement.classList.toggle(PHONE_CLASS, phone);
  return phone;
}

export function readOrientationEnv(): OrientationEnv {
  const media = (q: string) => {
    try {
      return window.matchMedia?.(q).matches ?? false;
    } catch {
      return false;
    }
  };
  const legacy = (window as Window & { orientation?: number }).orientation;
  return {
    coarse: media('(pointer: coarse)'),
    screenWidth: window.screen?.width ?? 0,
    screenHeight: window.screen?.height ?? 0,
    orientationType: window.screen?.orientation?.type,
    windowOrientation: typeof legacy === 'number' ? legacy : undefined,
    mediaLandscape: media('(orientation: landscape)'),
  };
}
