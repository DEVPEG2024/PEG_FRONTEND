import {
  isDeviceLandscape,
  isPhoneDevice,
  shouldAskPortrait,
} from '@/utils/portrait';
import type { OrientationEnv } from '@/utils/portrait';

// Téléphone en paysage → écran « Tournez votre téléphone » (PortraitLock).

const iphone = (over: Partial<OrientationEnv> = {}): OrientationEnv => ({
  coarse: true,
  screenWidth: 402,
  screenHeight: 874,
  orientationType: 'portrait-primary',
  mediaLandscape: false,
  ...over,
});

describe('téléphone en paysage', () => {
  it('iPhone tenu debout : rien', () => {
    expect(shouldAskPortrait(iphone())).toBe(false);
  });

  it('iPhone couché, dans un sens ou dans l’autre : on demande de le tourner', () => {
    expect(
      shouldAskPortrait(iphone({ orientationType: 'landscape-primary' }))
    ).toBe(true);
    expect(
      shouldAskPortrait(iphone({ orientationType: 'landscape-secondary' }))
    ).toBe(true);
  });

  it('Android : l’écran rapporte ses dimensions tournées, c’est toujours un téléphone', () => {
    const env = iphone({
      screenWidth: 915,
      screenHeight: 412,
      orientationType: 'landscape-primary',
    });
    expect(isPhoneDevice(env)).toBe(true);
    expect(shouldAskPortrait(env)).toBe(true);
  });

  it('clavier ouvert sur Android (fenêtre plus large que haute) : pas d’écran de rotation', () => {
    expect(shouldAskPortrait(iphone({ mediaLandscape: true }))).toBe(false);
  });

  it('ancien iOS sans screen.orientation : window.orientation fait foi', () => {
    const env = iphone({ orientationType: undefined });
    expect(isDeviceLandscape({ ...env, windowOrientation: 90 })).toBe(true);
    expect(isDeviceLandscape({ ...env, windowOrientation: -90 })).toBe(true);
    expect(isDeviceLandscape({ ...env, windowOrientation: 0 })).toBe(false);
  });

  it('tablette en paysage : jamais concernée', () => {
    const ipad = iphone({
      screenWidth: 820,
      screenHeight: 1180,
      orientationType: 'landscape-primary',
    });
    expect(shouldAskPortrait(ipad)).toBe(false);
  });

  it('ordinateur (souris) avec une fenêtre étroite : jamais concerné', () => {
    const desk = iphone({
      coarse: false,
      screenWidth: 1440,
      screenHeight: 900,
      orientationType: 'landscape-primary',
    });
    expect(shouldAskPortrait(desk)).toBe(false);
    expect(
      shouldAskPortrait({ ...desk, screenWidth: 500, screenHeight: 400 })
    ).toBe(false);
  });

  it('dimensions d’écran inconnues : on ne bloque rien', () => {
    expect(isPhoneDevice(iphone({ screenWidth: 0, screenHeight: 0 }))).toBe(
      false
    );
  });
});
