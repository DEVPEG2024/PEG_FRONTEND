/**
 * @jest-environment jsdom
 */
import { act, useState } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import ProductBadgesEditor from '@/views/app/admin/products/product/Forms/ProductBadgesEditor';
import type { ProductBadge } from '@/utils/productBadges';

// Éditeur « Badges » de la fiche produit (admin) et coin des offres de l'accueil.

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
const mockLoad = jest.fn();
jest.mock('@/services/ProductBadgeServices', () => ({
  loadProductBadges: (id: string) => mockLoad(id),
  cachedProductBadges: () => undefined,
  subscribeProductBadges: () => () => {},
}));

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
const flush = () => act(async () => { for (let i = 0; i < 10; i++) await Promise.resolve(); });
const button = (text: string) =>
  [...container.querySelectorAll('button')].find((b) => b.textContent?.trim() === text) as HTMLButtonElement | undefined;
const typeIn = (el: HTMLInputElement, value: string) =>
  act(() => {
    Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')!.set!.call(el, value);
    el.dispatchEvent(new Event('input', { bubbles: true }));
  });

describe('ProductBadgesEditor', () => {
  let saved: ProductBadge[] = [];
  const Harness = ({ library = [] as ProductBadge[] }) => {
    const [value, setValue] = useState<ProductBadge[]>([]);
    saved = value;
    return <ProductBadgesEditor value={value} onChange={setValue} library={library} />;
  };

  it('préréglage, badge personnalisé, bibliothèque ; 3 au plus', async () => {
    act(() => root.render(<Harness library={[{ kind: 'custom', label: 'Club', color: '#ec4899' }]} />));
    act(() => button('Nouveau')!.click());
    expect(saved).toEqual([{ kind: 'new' }]);
    expect(button('Nouveau')).toBeUndefined(); // déjà posé : plus proposé

    const input = container.querySelector('input[type="text"]') as HTMLInputElement;
    typeIn(input, '  Made in France ');
    act(() => (container.querySelector('button[aria-label="Couleur #a855f7"]') as HTMLButtonElement).click());
    expect(container.textContent).toContain('Aperçu');
    act(() => button('Ajouter')!.click());
    expect(saved[1]).toEqual({ kind: 'custom', label: 'Made in France', color: '#a855f7' });
    expect(input.value).toBe('');

    act(() => button('Club')!.click()); // repris de la bibliothèque
    expect(saved.map((b) => b.label ?? b.kind)).toEqual(['new', 'Made in France', 'Club']);
    expect(container.textContent).toContain('3 badges au plus');
    expect(button('Promo')!.disabled).toBe(true);
  });

  it('date de fin, puis retrait', async () => {
    act(() => root.render(<Harness />));
    act(() => button('Promo')!.click());
    const date = container.querySelector('input[type="date"]') as HTMLInputElement;
    typeIn(date, '2026-11-30');
    expect(saved).toEqual([{ kind: 'promo', until: '2026-11-30' }]);
    act(() => (container.querySelector('button[aria-label="Retirer le badge « Promo »"]') as HTMLButtonElement).click());
    expect(saved).toEqual([]);
  });
});

describe('OfferCornerBadges (offres de l’accueil)', () => {
  it('« Nouveau » posé à la main : l’étiquette automatique ne double pas', async () => {
    const { OfferCornerBadges } = await import('@/views/app/customer/home/components/OfferVisuals');
    mockLoad.mockResolvedValue([{ kind: 'new' }, { kind: 'promo' }]);
    act(() => root.render(<OfferCornerBadges documentId="p1" autoLabel="Nouveau" style={{ top: 0, right: 0 }} />));
    await flush();
    const texts = [...container.querySelectorAll('span')].map((s) => s.textContent).filter((t) => t === 'Nouveau');
    expect(texts).toHaveLength(1);
    expect(container.textContent).toContain('Promo');
  });

  it('sans badge « Nouveau » manuel : l’automatique reste, avec les autres badges', async () => {
    const { OfferCornerBadges } = await import('@/views/app/customer/home/components/OfferVisuals');
    mockLoad.mockResolvedValue([{ kind: 'promo' }]);
    act(() => root.render(<OfferCornerBadges documentId="p2" autoLabel="Nouveau" style={{ top: 0, right: 0 }} />));
    await flush();
    expect(container.textContent).toContain('Nouveau');
    expect(container.textContent).toContain('Promo');
  });
});
