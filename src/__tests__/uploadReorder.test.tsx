/**
 * @jest-environment jsdom
 */
import { act, useState } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import Upload from '@/components/ui/Upload';
import { moveOrder } from '@/components/ui/Upload/Upload';

// Ordre des photos d'un produit (création / modification) : poignée à faire
// glisser, ou flèches haut/bas au clavier sur la poignée (22/10/2026). La 1re photo
// est la photo principale du diaporama.

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
jest.mock('react-toastify', () => ({ toast: { error: jest.fn() } }));
jest.mock('@/components/ui/ConfigProvider', () => ({ useConfig: () => ({ themeColor: 'indigo', primaryColorLevel: 600 }) }));
(URL as unknown as { createObjectURL: () => string }).createObjectURL = () => 'blob:x';

const photo = (name: string) => {
  const f = new File(['x'], name, { type: 'image/jpeg' }) as File & { previewUrl?: string; displayName?: string };
  f.previewUrl = `https://cdn/${name}`;
  f.displayName = name;
  return f;
};

let container: HTMLDivElement;
let root: Root;
beforeEach(() => {
  container = document.createElement('div');
  document.body.appendChild(container);
  root = createRoot(container);
});
afterEach(() => {
  act(() => root.unmount());
  container.remove();
});

const names = () => [...container.querySelectorAll('.upload-file-name')].map((n) => n.textContent);
const handles = () => [...container.querySelectorAll<HTMLButtonElement>('.upload-file-handle')];
const press = (el: Element, key: string) =>
  act(() => { el.dispatchEvent(new KeyboardEvent('keydown', { key, bubbles: true })); });

describe('moveOrder', () => {
  it('déplace un élément d’un cran, refuse de sortir de la liste', () => {
    expect(moveOrder(3, 0, 1)).toEqual([1, 0, 2]);
    expect(moveOrder(3, 2, -1)).toEqual([0, 2, 1]);
    expect(moveOrder(3, 0, -1)).toBeNull();
    expect(moveOrder(3, 2, 1)).toBeNull();
  });
});

describe('Upload — ordre des photos', () => {
  // Même usage que le formulaire produit : l'état des photos vit chez le parent.
  const Harness = ({ onRemove }: { onRemove?: (index: number) => void }) => {
    const [files, setFiles] = useState([photo('a.jpg'), photo('b.jpg'), photo('c.jpg')]);
    return (
      <>
        <Upload
          showList
          draggable
          fileList={files}
          onReorder={(order) => setFiles((prev) => order.map((i) => prev[i]))}
          onFileRemove={(_, index) => {
            onRemove?.(index);
            setFiles((prev) => prev.filter((__, i) => i !== index));
          }}
        />
        <output data-testid="parent">{files.map((f) => f.name).join(',')}</output>
      </>
    );
  };
  const parentOrder = () => container.querySelector('[data-testid="parent"]')!.textContent;

  it('sans onReorder : aucune poignée (autres écrans inchangés)', () => {
    act(() => root.render(<Upload showList fileList={[photo('a.jpg'), photo('b.jpg')]} />));
    expect(handles()).toHaveLength(0);
    expect(names()).toEqual(['a.jpg', 'b.jpg']);
  });

  it('une poignée par photo, nommée pour les lecteurs d’écran', () => {
    act(() => root.render(<Harness />));
    expect(handles()).toHaveLength(3);
    expect(handles()[1].getAttribute('aria-label')).toBe('Déplacer « b.jpg » (flèches haut et bas)');
  });

  it('flèches du clavier : la photo change de place, chez le parent aussi', () => {
    act(() => root.render(<Harness />));
    press(handles()[0], 'ArrowDown');
    expect(names()).toEqual(['b.jpg', 'a.jpg', 'c.jpg']);
    expect(parentOrder()).toBe('b.jpg,a.jpg,c.jpg');
    press(handles()[2], 'ArrowUp');
    expect(parentOrder()).toBe('b.jpg,c.jpg,a.jpg');
    press(handles()[0], 'ArrowUp'); // déjà en tête : rien ne bouge
    expect(parentOrder()).toBe('b.jpg,c.jpg,a.jpg');
  });

  it('après un déplacement, la croix retire bien la photo affichée à cet endroit', () => {
    const onRemove = jest.fn();
    act(() => root.render(<Harness onRemove={onRemove} />));
    press(handles()[0], 'ArrowDown'); // b, a, c
    const removeButtons = container.querySelectorAll<HTMLButtonElement>('.upload-file-remove');
    act(() => removeButtons[1].click()); // « a.jpg »
    expect(onRemove).toHaveBeenCalledWith(1);
    expect(parentOrder()).toBe('b.jpg,c.jpg');
    expect(names()).toEqual(['b.jpg', 'c.jpg']);
  });

  it('une seule photo : pas de poignée', () => {
    act(() => root.render(<Upload showList fileList={[photo('a.jpg')]} onReorder={() => {}} />));
    expect(handles()).toHaveLength(0);
  });
});
