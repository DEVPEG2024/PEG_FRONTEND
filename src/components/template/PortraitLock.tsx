import { useEffect, useState } from 'react';
import type { CSSProperties } from 'react';
import { createPortal } from 'react-dom';
import {
  isPhoneDevice,
  readOrientationEnv,
  shouldAskPortrait,
} from '@/utils/portrait';
import { accentVars, readAccent } from '@/utils/mobileShell';
import { isStandalone } from '@/utils/pwa';

/*
 * Téléphone en paysage : écran « Tournez votre téléphone », au style des
 * tableaux de bord, par-dessus tout PEG (connexion comprise) — la version
 * ordinateur n'apparaît plus sur un téléphone. De retour en portrait, on
 * retrouve la page telle qu'on l'avait laissée. Tablettes et ordinateurs ne
 * sont jamais concernés (utils/portrait.ts). Styles : « TÉLÉPHONE EN PAYSAGE »
 * de _mobile.css.
 */

// Application installée sur Android : le navigateur accepte de verrouiller le
// portrait. Ailleurs (Safari, onglet de navigateur) il refuse : sans effet.
const tryLockPortrait = () => {
  const orientation = window.screen?.orientation as
    | (ScreenOrientation & { lock?: (o: string) => Promise<void> })
    | undefined;
  orientation?.lock?.('portrait-primary').catch(() => undefined);
};

const PortraitLock = () => {
  const [ask, setAsk] = useState(() => shouldAskPortrait(readOrientationEnv()));

  useEffect(() => {
    if (isStandalone() && isPhoneDevice(readOrientationEnv()))
      tryLockPortrait();
    const update = () => setAsk(shouldAskPortrait(readOrientationEnv()));
    const orientation = window.screen?.orientation;
    orientation?.addEventListener?.('change', update);
    window.addEventListener('orientationchange', update);
    window.addEventListener('resize', update);
    return () => {
      orientation?.removeEventListener?.('change', update);
      window.removeEventListener('orientationchange', update);
      window.removeEventListener('resize', update);
    };
  }, []);

  // Le reste de l'application est inerte et ne défile plus derrière l'écran
  useEffect(() => {
    if (!ask) return;
    const root = document.getElementById('root');
    root?.setAttribute('inert', '');
    const html = document.documentElement;
    const previous = html.style.overflow;
    html.style.overflow = 'hidden';
    return () => {
      root?.removeAttribute('inert');
      html.style.overflow = previous;
    };
  }, [ask]);

  if (!ask) return null;
  return createPortal(
    <div
      className="peg-rotate"
      role="alertdialog"
      aria-modal="true"
      aria-labelledby="peg-rotate-title"
      aria-describedby="peg-rotate-text"
      style={accentVars(readAccent()) as CSSProperties}
    >
      <svg
        className="peg-rotate-logo"
        viewBox="0 0 1130 467"
        aria-hidden="true"
      >
        <path d="M20.2,50h133c83.1,0,151,28,151,115.7s-69.1,122.8-148.7,122.8h-44.7v118.4H20.2V50ZM150.3,221.1c44.7,0,65.6-19.7,65.6-55.4s-23.8-48.2-68-48.2h-37.2v103.6h39.5Z" />
        <path d="M336.5,50h239.3v71.3h-148.7v66.9h127.2v71.3h-127.2v76.2h154.5v71.3h-245.1V50Z" />
        <path d="M587.9,230.9c0-119,84.8-187.5,185.9-187.5s104.2,30.5,130.4,56.3l-51.8,44.3c-18.6-15.9-43.8-27.1-75.7-27.1-55.8,0-96.4,41.7-96.4,110.7s34.3,112.4,104.5,112.4,27.9-3.3,36-9.3v-57.6h-60.4v-35.5l40.2-34.1h100.3v166.7c-26.1,24.1-72.6,43.3-126,43.3-104.5,0-187-61.9-187-182.5Z" />
        <circle className="peg-rotate-dot" cx="1027.8" cy="331.5" r="82" />
      </svg>
      <div className="peg-rotate-phone" aria-hidden="true">
        <span className="peg-rotate-screen" />
      </div>
      <h2 id="peg-rotate-title" className="peg-rotate-title">
        Tournez votre téléphone
      </h2>
      <p id="peg-rotate-text" className="peg-rotate-text">
        MyPEG s&apos;utilise en mode portrait sur téléphone.
      </p>
    </div>,
    document.body
  );
};

export default PortraitLock;
