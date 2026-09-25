/**
 * @jest-environment jsdom
 */
import { act, useRef } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import useAutoAdvance from '@/utils/hooks/useAutoAdvance';

// Suggestions de l'accueil au téléphone : la piste avance seule, carte par carte,
// et s'efface devant le doigt du client.

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

let el: HTMLDivElement | null = null;
const Track = ({ enabled = true }: { enabled?: boolean }) => {
  const ref = useRef<HTMLDivElement>(null);
  useAutoAdvance(ref, enabled, { intervalMs: 1000, resumeMs: 3000 });
  return (
    <div ref={(node) => { (ref as { current: HTMLDivElement | null }).current = node; el = node; }} style={{ gap: '12px' }}>
      <span /><span /><span />
    </div>
  );
};

let container: HTMLDivElement;
let root: Root;
const layout = (node: HTMLDivElement, scrollLeft: number) => {
  Object.defineProperty(node, 'scrollWidth', { configurable: true, value: 600 });
  Object.defineProperty(node, 'clientWidth', { configurable: true, value: 300 });
  node.scrollLeft = scrollLeft;
  (node.firstElementChild as HTMLElement).getBoundingClientRect = () => ({ width: 150 } as DOMRect);
  node.scrollBy = jest.fn() as never;
  node.scrollTo = jest.fn() as never;
};
const reduceMotion = (on: boolean) => {
  window.matchMedia = ((q: string) => ({ matches: on && q.includes('reduce'), addEventListener() {}, removeEventListener() {} })) as never;
};

beforeEach(() => {
  jest.useFakeTimers();
  reduceMotion(false);
  container = document.createElement('div');
  document.body.appendChild(container);
  root = createRoot(container);
});
afterEach(() => { act(() => root.unmount()); container.remove(); jest.useRealTimers(); });

const mount = (enabled = true, scrollLeft = 0) => {
  act(() => root.render(<Track enabled={enabled} />));
  layout(el as HTMLDivElement, scrollLeft);
};

test('avance d’une carte (largeur + espacement) à chaque intervalle', () => {
  mount();
  act(() => { jest.advanceTimersByTime(1000); });
  expect(el!.scrollBy).toHaveBeenCalledWith({ left: 162, behavior: 'smooth' });
  act(() => { jest.advanceTimersByTime(2000); });
  expect(el!.scrollBy).toHaveBeenCalledTimes(3);
});

test('en fin de piste, revient au début', () => {
  mount(true, 300);
  act(() => { jest.advanceTimersByTime(1000); });
  expect(el!.scrollTo).toHaveBeenCalledWith({ left: 0, behavior: 'smooth' });
  expect(el!.scrollBy).not.toHaveBeenCalled();
});

test('le doigt du client arrête la piste, qui repart après la pause', () => {
  mount();
  act(() => { el!.dispatchEvent(new Event('touchstart')); });
  act(() => { jest.advanceTimersByTime(2000); });
  expect(el!.scrollBy).not.toHaveBeenCalled();
  act(() => { jest.advanceTimersByTime(2000); });
  expect(el!.scrollBy).toHaveBeenCalled();
});

test('« réduire les animations » : aucun mouvement', () => {
  reduceMotion(true);
  mount();
  act(() => { jest.advanceTimersByTime(5000); });
  expect(el!.scrollBy).not.toHaveBeenCalled();
});

test('désactivée (offres, ou une seule carte) : aucun mouvement', () => {
  mount(false);
  act(() => { jest.advanceTimersByTime(5000); });
  expect(el!.scrollBy).not.toHaveBeenCalled();
});
