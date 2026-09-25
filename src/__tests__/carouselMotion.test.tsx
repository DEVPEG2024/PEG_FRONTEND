/**
 * @jest-environment jsdom
 */
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import type { EmblaCarouselType } from 'embla-carousel';
import useCarouselMotion, {
  MOTION_HEARTBEAT,
  REDUCED_MOTION_INTERVAL,
  type CarouselMotionOptions,
} from '@/utils/hooks/useCarouselMotion';

// Mouvement automatique des carrousels : chaque scénario qui a fait échouer
// les carrousels au téléphone est rejoué ici (voir components/shared/Carousel).

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

type Handler = () => void;
type FakeApi = ReturnType<typeof makeApi>;

function makeApi({
  snaps = 5,
  canNext = true,
  canPrev = false,
  loop = true,
  autoScroll = false,
}: { snaps?: number; canNext?: boolean; canPrev?: boolean; loop?: boolean; autoScroll?: boolean } = {}) {
  const handlers: Record<string, Set<Handler>> = {};
  const root = document.createElement('div');
  document.body.appendChild(root);
  let location = 0;
  let playing = false;
  const scroller = {
    play: jest.fn(() => { playing = true; }),
    stop: jest.fn(() => { playing = false; }),
    isPlaying: () => playing,
  };
  const state = { canNext, canPrev, snaps, loop };
  const api = {
    on(ev: string, cb: Handler) { (handlers[ev] ??= new Set()).add(cb); return api; },
    off(ev: string, cb: Handler) { handlers[ev]?.delete(cb); return api; },
    emit(ev: string) { handlers[ev]?.forEach((cb) => cb()); },
    listeners: (ev: string) => handlers[ev]?.size ?? 0,
    rootNode: () => root,
    scrollSnapList: () => Array.from({ length: state.snaps }, (_, i) => i),
    canScrollNext: () => state.canNext,
    canScrollPrev: () => state.canPrev,
    scrollNext: jest.fn(),
    scrollTo: jest.fn(),
    plugins: () => (autoScroll ? { autoScroll: scroller } : {}),
    internalEngine: () => ({
      ownerWindow: window,
      ownerDocument: document,
      options: { loop: state.loop },
      location: { get: () => location },
    }),
    // Outils du test
    root,
    state,
    scroller,
    /** Embla arrête lui-même le défilé continu quand on pose le doigt */
    pluginStopsItself() { playing = false; },
    moveTo(px: number) { location = px; api.emit('scroll'); },
  };
  return api;
}

const asEmbla = (api: FakeApi) => api as unknown as EmblaCarouselType;

let ioCallback: ((entries: Partial<IntersectionObserverEntry>[]) => void) | null = null;
class FakeIO {
  constructor(cb: (entries: Partial<IntersectionObserverEntry>[]) => void) { ioCallback = cb; }
  observe() {}
  disconnect() {}
}

let finePointer = false;
const setMedia = () => {
  window.matchMedia = ((q: string) => ({
    matches: q.includes('hover: hover') ? finePointer : false,
    addEventListener() {},
    removeEventListener() {},
  })) as never;
};

const Harness = ({ api, opts }: { api: FakeApi; opts: CarouselMotionOptions }) => {
  useCarouselMotion(asEmbla(api), opts);
  return null;
};

const base: CarouselMotionOptions = { autoplay: 'step', interval: 1000, resumeDelay: 1500, reducedMotion: false };

let container: HTMLDivElement;
let root: Root;
beforeEach(() => {
  jest.useFakeTimers();
  finePointer = false;
  setMedia();
  ioCallback = null;
  (globalThis as { IntersectionObserver?: unknown }).IntersectionObserver = FakeIO;
  Object.defineProperty(document, 'visibilityState', { configurable: true, value: 'visible' });
  container = document.createElement('div');
  document.body.appendChild(container);
  root = createRoot(container);
});
afterEach(() => {
  act(() => root.unmount());
  container.remove();
  jest.useRealTimers();
});

const mount = (api: FakeApi, opts: Partial<CarouselMotionOptions> = {}) =>
  act(() => root.render(<Harness api={api} opts={{ ...base, ...opts }} />));
const wait = (ms: number) => act(() => { jest.advanceTimersByTime(ms); });

describe('carte par carte (step)', () => {
  test('avance d’une carte à chaque intervalle, en glissant', () => {
    const api = makeApi();
    mount(api);
    wait(1000);
    expect(api.scrollNext).toHaveBeenCalledWith(false);
    wait(2000);
    expect(api.scrollNext).toHaveBeenCalledTimes(3);
  });

  test('en bout de piste (sans boucle), revient au début', () => {
    const api = makeApi({ canNext: false, canPrev: true, loop: false });
    mount(api);
    wait(1000);
    expect(api.scrollTo).toHaveBeenCalledWith(0, false);
  });

  test('ne bouge pas quand tout tient à l’écran', () => {
    const one = makeApi({ snaps: 1 });
    mount(one);
    wait(5000);
    expect(one.scrollNext).not.toHaveBeenCalled();

    const fits = makeApi({ canNext: false, canPrev: false });
    mount(fits);
    wait(5000);
    expect(fits.scrollNext).not.toHaveBeenCalled();
  });

  test('autoplay « none » : aucune écoute, aucun mouvement', () => {
    const api = makeApi();
    mount(api, { autoplay: 'none' });
    wait(5000);
    expect(api.scrollNext).not.toHaveBeenCalled();
    expect(api.listeners('pointerDown')).toBe(0);
  });

  test('le doigt qui fait défiler la PAGE en passant sur la piste ne la retarde pas', () => {
    // Ancien défaut : 6 s de pause au moindre contact → piste « morte » à l'œil
    const api = makeApi();
    mount(api);
    wait(400);
    act(() => { api.emit('pointerDown'); api.emit('pointerUp'); }); // geste vertical : la piste n'a pas bougé
    wait(600);
    expect(api.scrollNext).toHaveBeenCalledTimes(1);
  });

  test('un vrai glisser du client met en pause, puis reprend', () => {
    const api = makeApi();
    mount(api);
    act(() => { api.emit('pointerDown'); api.moveTo(-80); });
    wait(3000);
    expect(api.scrollNext).not.toHaveBeenCalled();
    act(() => { api.emit('pointerUp'); });
    wait(1500); // délai de reprise
    expect(api.scrollNext).not.toHaveBeenCalled();
    wait(1100); // + un intervalle
    expect(api.scrollNext).toHaveBeenCalledTimes(1);
  });

  test('sous un doigt posé immobile, la piste attend le relâcher', () => {
    const api = makeApi();
    mount(api);
    act(() => { api.emit('pointerDown'); });
    wait(2500);
    expect(api.scrollNext).not.toHaveBeenCalled();
    act(() => { api.emit('pointerUp'); });
    wait(450);
    expect(api.scrollNext).toHaveBeenCalledTimes(1);
  });
});

describe('réduire les animations', () => {
  test('plus aucun glissement : saut direct, 5 s au plus vite', () => {
    const api = makeApi();
    mount(api, { reducedMotion: true });
    wait(REDUCED_MOTION_INTERVAL - 10);
    expect(api.scrollNext).not.toHaveBeenCalled();
    wait(20);
    expect(api.scrollNext).toHaveBeenCalledWith(true);
  });

  test('le défilé continu devient carte par carte, sans glissement', () => {
    const api = makeApi({ autoScroll: true });
    mount(api, { autoplay: 'continuous', reducedMotion: true });
    wait(REDUCED_MOTION_INTERVAL + 10);
    expect(api.scroller.play).not.toHaveBeenCalled();
    expect(api.scrollNext).toHaveBeenCalledWith(true);
  });
});

describe('survol — piège iOS', () => {
  test('au tactile, le mouseenter émulé par une tape n’arrête rien', () => {
    finePointer = false; // téléphone : pas de vraie souris
    const api = makeApi();
    mount(api);
    act(() => { api.root.dispatchEvent(new MouseEvent('mouseenter')); });
    wait(3000);
    expect(api.scrollNext).toHaveBeenCalledTimes(3);
  });

  test('avec une vraie souris : pause au survol, reprise en sortant', () => {
    finePointer = true;
    const api = makeApi();
    mount(api);
    act(() => { api.root.dispatchEvent(new MouseEvent('mouseenter')); });
    wait(3000);
    expect(api.scrollNext).not.toHaveBeenCalled();
    act(() => { api.root.dispatchEvent(new MouseEvent('mouseleave')); });
    wait(1000);
    expect(api.scrollNext).toHaveBeenCalledTimes(1);
  });
});

describe('défilé continu', () => {
  test('démarre le défilé quand la boucle est possible', () => {
    const api = makeApi({ autoScroll: true });
    mount(api, { autoplay: 'continuous' });
    expect(api.scroller.play).toHaveBeenCalled();
    expect(api.scroller.isPlaying()).toBe(true);
  });

  test('sans boucle (trop peu de cartes), bascule en carte par carte', () => {
    const api = makeApi({ autoScroll: true, loop: false });
    mount(api, { autoplay: 'continuous' });
    expect(api.scroller.play).not.toHaveBeenCalled();
    wait(1000);
    expect(api.scrollNext).toHaveBeenCalled();
  });

  test('un contact sans glisser : reprise immédiate au relâcher', () => {
    const api = makeApi({ autoScroll: true });
    mount(api, { autoplay: 'continuous' });
    act(() => { api.pluginStopsItself(); api.emit('pointerDown'); });
    expect(api.scroller.isPlaying()).toBe(false);
    act(() => { api.emit('pointerUp'); });
    expect(api.scroller.isPlaying()).toBe(true);
  });

  test('après un glisser : reprise garantie après le délai (sans attendre Embla)', () => {
    const api = makeApi({ autoScroll: true });
    mount(api, { autoplay: 'continuous' });
    act(() => { api.pluginStopsItself(); api.emit('pointerDown'); api.moveTo(-200); api.emit('pointerUp'); });
    expect(api.scroller.isPlaying()).toBe(false);
    wait(1600);
    expect(api.scroller.isPlaying()).toBe(true);
  });

  test('battement de contrôle : un défilé arrêté par erreur repart', () => {
    const api = makeApi({ autoScroll: true });
    mount(api, { autoplay: 'continuous' });
    act(() => { api.pluginStopsItself(); }); // arrêt que rien n'a signalé
    wait(MOTION_HEARTBEAT + 10);
    expect(api.scroller.isPlaying()).toBe(true);
  });
});

describe('économie et cycle de vie', () => {
  test('rien ne bouge hors écran, reprise à l’écran', () => {
    const api = makeApi();
    mount(api);
    act(() => { ioCallback?.([{ isIntersecting: false, intersectionRatio: 0 }]); });
    wait(3000);
    expect(api.scrollNext).not.toHaveBeenCalled();
    act(() => { ioCallback?.([{ isIntersecting: true, intersectionRatio: 1 }]); });
    wait(1000);
    expect(api.scrollNext).toHaveBeenCalledTimes(1);
  });

  test('onglet masqué : aucun mouvement', () => {
    const api = makeApi();
    mount(api);
    Object.defineProperty(document, 'visibilityState', { configurable: true, value: 'hidden' });
    act(() => { document.dispatchEvent(new Event('visibilitychange')); });
    wait(3000);
    expect(api.scrollNext).not.toHaveBeenCalled();
    Object.defineProperty(document, 'visibilityState', { configurable: true, value: 'visible' });
    act(() => { document.dispatchEvent(new Event('visibilitychange')); });
    wait(1000);
    expect(api.scrollNext).toHaveBeenCalledTimes(1);
  });

  test('cartes arrivées après coup (reInit) : la piste se met à défiler', () => {
    const api = makeApi({ snaps: 1 });
    mount(api);
    wait(3000);
    expect(api.scrollNext).not.toHaveBeenCalled();
    act(() => { api.state.snaps = 6; api.emit('reInit'); });
    wait(1000);
    expect(api.scrollNext).toHaveBeenCalledTimes(1);
  });

  test('démonté : plus aucune minuterie ni écoute', () => {
    const api = makeApi();
    mount(api);
    act(() => root.unmount());
    root = createRoot(container);
    wait(5000);
    expect(api.scrollNext).not.toHaveBeenCalled();
    expect(api.listeners('pointerDown')).toBe(0);
    expect(api.listeners('reInit')).toBe(0);
  });
});
