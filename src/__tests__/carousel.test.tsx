/**
 * @jest-environment jsdom
 */
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import Carousel, { installTapGuard, TAP_SLOP } from '@/components/shared/Carousel';

// Rendu du composant partagé avec le vrai Embla (jsdom ne mesure rien : on
// vérifie la structure, l'accessibilité et l'absence de duplication).

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

class Noop {
  observe() {}
  unobserve() {}
  disconnect() {}
  takeRecords() { return []; }
}

let container: HTMLDivElement;
let root: Root;
beforeEach(() => {
  (globalThis as Record<string, unknown>).ResizeObserver = Noop;
  (globalThis as Record<string, unknown>).IntersectionObserver = Noop;
  (globalThis as Record<string, unknown>).MutationObserver ??= Noop;
  window.matchMedia = ((q: string) => ({
    matches: false,
    media: q,
    addEventListener() {},
    removeEventListener() {},
    addListener() {},
    removeListener() {},
  })) as never;
  container = document.createElement('div');
  document.body.appendChild(container);
  root = createRoot(container);
});
afterEach(() => {
  act(() => root.unmount());
  container.remove();
});

const cards = (n: number) => Array.from({ length: n }, (_, i) => <button key={`p${i}`} type="button">Produit {i + 1}</button>);

test('une carte par enfant, jamais dupliquée (le défilé en boucle ne clone pas le DOM)', () => {
  act(() => root.render(<Carousel label="Suggestions pour vous" autoplay="continuous">{cards(6)}</Carousel>));
  expect(container.querySelectorAll('.peg-carousel-slide')).toHaveLength(6);
  expect(container.querySelectorAll('button')).toHaveLength(6);
});

test('région nommée, diapositives numérotées', () => {
  act(() => root.render(<Carousel label="Vos réalisations">{cards(3)}</Carousel>));
  const region = container.querySelector('[role="region"]') as HTMLElement;
  expect(region.getAttribute('aria-label')).toBe('Vos réalisations');
  expect(region.getAttribute('aria-roledescription')).toBe('carrousel');
  const slides = container.querySelectorAll('[role="group"]');
  expect(slides[2].getAttribute('aria-label')).toBe('3 sur 3');
});

test('la fenêtre laisse le geste vertical à la page et garde le glisser horizontal', () => {
  act(() => root.render(<Carousel label="Piste" className="pcm-products">{cards(4)}</Carousel>));
  const region = container.querySelector('.peg-carousel') as HTMLElement;
  expect(region.classList.contains('pcm-products')).toBe(true);
  expect(region.style.overflow).toBe('hidden');
  expect(region.style.touchAction).toBe('pan-y pinch-zoom');
});

test('espacement et largeur de carte appliqués à chaque diapositive', () => {
  act(() => root.render(<Carousel label="Piste" gap={14} slideStyle={{ width: '260px' }}>{cards(2)}</Carousel>));
  const slide = container.querySelector('.peg-carousel-slide') as HTMLElement;
  expect(slide.style.marginRight).toBe('14px');
  expect(slide.style.width).toBe('260px');
});

test('fournit son API (flèches, vignettes) et la carte affichée', () => {
  const setApi = jest.fn();
  const onSelect = jest.fn();
  act(() => root.render(<Carousel label="Photos" setApi={setApi} onSelect={onSelect}>{cards(3)}</Carousel>));
  const api = setApi.mock.calls.map((c) => c[0]).find(Boolean);
  expect(api).toBeTruthy();
  expect(typeof api.scrollTo).toBe('function');
  expect(onSelect).toHaveBeenCalledWith(0);
});

describe('garde de tape (Safari iOS supprime le clic si touchmove est annulé)', () => {
  // Simule l'écouteur d'Embla : sur l'élément racine, en bouillonnement
  const setup = () => {
    const root = document.createElement('div');
    const card = document.createElement('button');
    root.appendChild(card);
    document.body.appendChild(root);
    const seen: number[] = [];
    root.addEventListener('touchmove', (e) => seen.push((e as TouchEvent).touches[0].clientX));
    const off = installTapGuard(root);
    const touch = (type: string, x: number, y = 100, fingers = 1) => {
      const e = new Event(type, { bubbles: true, cancelable: true }) as TouchEvent;
      const list = Array.from({ length: fingers }, (_, i) => ({ clientX: x + i * 50, clientY: y }));
      Object.defineProperty(e, 'touches', { value: list });
      card.dispatchEvent(e);
    };
    return { root, seen, off, touch };
  };

  test('les micro-mouvements d’une tape ne parviennent pas au carrousel', () => {
    const { seen, touch } = setup();
    touch('touchstart', 100);
    touch('touchmove', 102);
    touch('touchmove', 100 + TAP_SLOP - 1);
    expect(seen).toEqual([]);
  });

  test('au-delà de la tolérance, le glisser passe (et continue de passer)', () => {
    const { seen, touch } = setup();
    touch('touchstart', 100);
    touch('touchmove', 103);
    touch('touchmove', 100 + TAP_SLOP + 2);
    touch('touchmove', 104); // retour près du départ : on reste en glisser
    expect(seen).toEqual([112, 104]);
  });

  test('un geste vertical franc passe aussi (la page doit pouvoir défiler)', () => {
    const { seen, touch } = setup();
    touch('touchstart', 100, 100);
    touch('touchmove', 101, 100 + TAP_SLOP + 5);
    expect(seen).toHaveLength(1);
  });

  test('pincement à deux doigts : laissé à Embla', () => {
    const { seen, touch } = setup();
    touch('touchstart', 100, 100, 2);
    touch('touchmove', 101, 100, 2);
    expect(seen).toHaveLength(1);
  });

  test('retirée proprement', () => {
    const { seen, touch, off } = setup();
    off();
    touch('touchstart', 100);
    touch('touchmove', 102);
    expect(seen).toHaveLength(1);
  });
});
