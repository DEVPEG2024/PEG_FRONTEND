import {
  buildDuplicateProductInput,
  duplicateName,
  DUPLICATE_SUFFIX,
} from '@/views/app/admin/products/store/productDuplicate';
import { Product } from '@/@types/product';

// « Dupliquer » une offre (23/10/2026) : la Bâche standard PVC ne se copiait
// plus (400 GraphQL) parce que `checklist { documentId }` et `batFile` partaient
// tels quels dans la mutation de création.

// Lecture telle que la renvoie apiGetProductForEditById
const bache = {
  documentId: 'kmj476hteybzdx0lkfa4ah1b',
  name: 'Bache standard PVC',
  description: '<p>Bâche PVC 500 g/m²</p>',
  price: 25,
  priceTiers: [{ minQuantity: 1, price: 25 }],
  pricingMode: 'm2',
  pricePerM2: 25,
  minM2: 1,
  cost: 9,
  images: [
    {
      documentId: 'tpbewp8ghd2450ej35w7s07i',
      url: 'https://s3/bache.png',
      name: 'bache.png',
    },
  ],
  active: true,
  inCatalogue: false,
  sizes: [{ documentId: 's1', name: 'M', value: 'M' }],
  colors: [{ documentId: 'c1', name: 'Blanc', value: '#FFFFFF' }],
  form: { documentId: 'f1', fields: [] },
  checklist: { documentId: 'chk1' },
  requiresBat: true,
  catalogPrice: null,
  batFile: { url: 'https://s3/bat-client-A.pdf', name: 'bat-client-A.pdf' },
  productRef: 'REF-1',
  refVisibleToCustomer: false,
  customerCategories: [{ documentId: 'cat1' }],
  productCategory: { documentId: 'pc1', name: 'Bâches' },
  customers: [{ documentId: 'cust1' }, { documentId: 'cust2' }],
} as unknown as Product;

const isScalar = (v: unknown) =>
  v === null || ['string', 'number', 'boolean'].includes(typeof v);

describe('duplication d’un produit', () => {
  it('relations envoyées en identifiants, checklist comprise', () => {
    const input = buildDuplicateProductInput(bache, ['1721']);
    expect(input.checklist).toBe('chk1');
    expect(input.form).toBe('f1');
    expect(input.productCategory).toBe('pc1');
    expect(input.sizes).toEqual(['s1']);
    expect(input.colors).toEqual(['c1']);
    expect(input.customerCategories).toEqual(['cat1']);
    expect(input.customers).toEqual(['cust1', 'cust2']);
    expect(input.images).toEqual(['1721']);
  });

  it('aucun objet lu ne part en écriture (seuls les paliers sont des objets)', () => {
    const input = buildDuplicateProductInput(bache, ['1721']) as Record<
      string,
      unknown
    >;
    for (const [key, value] of Object.entries(input)) {
      if (key === 'priceTiers' || value === undefined) continue;
      const ok = Array.isArray(value) ? value.every(isScalar) : isScalar(value);
      expect({ key, ok }).toEqual({ key, ok: true });
    }
    expect(input).not.toHaveProperty('documentId');
  });

  it('le BAT d’un client n’est pas recopié, l’obligation de BAT oui', () => {
    const input = buildDuplicateProductInput(bache, []);
    expect(input).not.toHaveProperty('batFile');
    expect(input.requiresBat).toBe(true);
  });

  it('copie inactive et nommée « (copie) » : les clients ne voient pas deux offres identiques', () => {
    const input = buildDuplicateProductInput(bache, []);
    expect(input.active).toBe(false);
    expect(input.name).toBe('Bache standard PVC' + DUPLICATE_SUFFIX);
  });

  it('tarifs et réglages recopiés', () => {
    const input = buildDuplicateProductInput(bache, []);
    expect(input).toMatchObject({
      description: '<p>Bâche PVC 500 g/m²</p>',
      price: 25,
      priceTiers: [{ minQuantity: 1, price: 25 }],
      pricingMode: 'm2',
      pricePerM2: 25,
      minM2: 1,
      cost: 9,
      catalogPrice: null,
      inCatalogue: false,
      productRef: 'REF-1',
      refVisibleToCustomer: false,
    });
  });

  it('produit sans relations : listes vides et null, jamais d’erreur', () => {
    const bare = {
      documentId: 'x',
      name: 'Mug',
      priceTiers: [],
    } as unknown as Product;
    const input = buildDuplicateProductInput(bare, []);
    expect(input).toMatchObject({
      sizes: [],
      colors: [],
      customers: [],
      customerCategories: [],
      form: null,
      checklist: null,
      productCategory: null,
      description: '',
      inCatalogue: false,
      requiresBat: false,
    });
  });

  it('nom de copie nettoyé', () => {
    expect(duplicateName('  Meug (x10) ')).toBe('Meug (x10) (copie)');
    expect(duplicateName(undefined)).toBe('(copie)');
  });
});
