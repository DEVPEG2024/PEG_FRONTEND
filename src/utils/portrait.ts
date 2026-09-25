/*
 * Téléphone tenu en paysage (demande Nova du 25/09/2026) : sa largeur dépasse
 * alors 768px et PEG basculait sur la version ordinateur. Une page web ne peut
 * pas bloquer la rotation (Safari l'interdit) : PortraitLock.tsx affiche un
 * écran « Tournez votre téléphone », et verrouille le portrait quand le
 * navigateur le permet (application installée sur Android).
 *
 * L'orientation est lue sur l'APPAREIL (screen.orientation), pas sur la
 * fenêtre : sur Android, le clavier ouvert rend la fenêtre plus large que
 * haute, et `(orientation: landscape)` s'y déclencherait en pleine saisie.
 */

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
export const shouldAskPortrait = (env: OrientationEnv) =>
  isPhoneDevice(env) && isDeviceLandscape(env);

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
