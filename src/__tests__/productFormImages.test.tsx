/**
 * @jest-environment jsdom
 */
import { act, useState } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import ProductForm from '@/views/app/admin/products/product/Forms/ProductForm';
import type { PegFile } from '@/@types/pegFile';

// Photos d'une fiche produit qui « disparaissent » (23/10/2026) :
// - plusieurs photos choisies d'un coup → seule la dernière restait ;
// - retirer une photo retirait aussi celles qui portaient le même nom.
// Vrai formulaire et vrai composant d'envoi ; seuls les champs de gauche, la
// fenêtre de logo et la médiathèque sont simulés.

(
  globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }
).IS_REACT_ACT_ENVIRONMENT = true;

jest.mock('react-toastify', () => ({
  toast: { success: jest.fn(), error: jest.fn(), info: jest.fn() },
}));
jest.mock(
  '@/views/app/admin/products/product/Forms/ProductFields',
  () => () => null
);
jest.mock('@/components/ui/Upload/WatermarkModal', () => () => null);
jest.mock('@/services/FileServices', () => ({ apiGetFile: jest.fn() }));
jest.mock('@/components/shared', () => ({
  Loading: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

let current: PegFile[] = [];

const Harness = ({ initial }: { initial: PegFile[] }) => {
  const [images, setImages] = useState<PegFile[]>(initial);
  current = images;
  return (
    <ProductForm
      type="edit"
      onFormSubmit={jest.fn()}
      sizes={[]}
      colors={[]}
      customerCategories={[]}
      categories={[]}
      customers={[]}
      forms={[]}
      checklists={[]}
      images={images}
      setImages={setImages}
      imagesLoading={false}
      currentStep={0}
      setCurrentStep={jest.fn()}
      filterSizesListByProductCategory={jest.fn()}
      filterColorsListByProductCategory={jest.fn()}
    />
  );
};

const png = (name: string) => new File(['x'], name, { type: 'image/png' });
const serverImage = (id: string, name: string): PegFile =>
  ({
    id,
    documentId: `doc-${id}`,
    name,
    url: `https://s3/${id}.png`,
    file: new File([], name),
  }) as PegFile;

let container: HTMLDivElement;
let root: Root;

beforeAll(() => {
  // jsdom n'implémente pas les URL d'objet (vignettes des fichiers choisis)
  (URL as unknown as { createObjectURL: () => string }).createObjectURL = () =>
    'blob:preview';
});

beforeEach(() => {
  container = document.createElement('div');
  document.body.appendChild(container);
  root = createRoot(container);
});

afterEach(() => {
  act(() => root.unmount());
  container.remove();
});

const pickFiles = (files: File[]) => {
  const input = container.querySelector(
    'input[type="file"]'
  ) as HTMLInputElement;
  Object.defineProperty(input, 'files', { value: files, configurable: true });
  act(() => {
    input.dispatchEvent(new Event('change', { bubbles: true }));
  });
};

const shownNames = () =>
  Array.from(container.querySelectorAll('.upload-file-name')).map(
    (el) => el.textContent
  );

describe('photos du formulaire produit', () => {
  it('trois photos choisies d’un coup restent toutes les trois', () => {
    act(() =>
      root.render(<Harness initial={[serverImage('1', 'face.png')]} />)
    );
    pickFiles([png('dos.png'), png('profil.png'), png('detail.png')]);

    expect(current.map((i) => i.name)).toEqual([
      'face.png',
      'dos.png',
      'profil.png',
      'detail.png',
    ]);
    expect(shownNames()).toEqual([
      'face.png',
      'dos.png',
      'profil.png',
      'detail.png',
    ]);
  });

  it('retirer une photo ne retire pas sa jumelle de même nom', () => {
    act(() =>
      root.render(
        <Harness
          initial={[
            serverImage('1691', 'Bonnet noir à écusson ESD&L (1).png'),
            serverImage('1692', 'Tour de cou.png'),
            serverImage('1722', 'Bonnet noir à écusson ESD&L (1).png'),
          ]}
        />
      )
    );
    const removeButtons = container.querySelectorAll('.upload-file-remove');
    act(() => {
      (removeButtons[2] as HTMLElement).click();
    });

    expect(current.map((i) => i.id)).toEqual(['1691', '1692']);
    expect(shownNames()).toHaveLength(2);
  });
});
