import type { Product } from '@/@types/product';
import {
  isChatOffer,
  missingSteps,
  readChatPrefill,
  selectionForLine,
  type ChatOfferLine,
} from '@/components/template/chatOffer';

// Offre de l'assistant → ligne de panier : la sélection doit être STRICTEMENT
// celle que produirait la fiche produit (SizeAndColorsChoice), sinon le panier
// et le paiement divergent.

const opt = (id: string, name: string) => ({ documentId: id, name, value: name.toUpperCase(), description: '' });

const product = (over: Partial<Product> = {}): Product =>
  ({
    documentId: 'p1',
    name: 'Produit',
    sizes: [],
    colors: [],
    priceTiers: [{ minQuantity: 1, price: 10 }],
    pricingMode: 'tiers',
    ...over,
  }) as unknown as Product;

const line = (over: Partial<ChatOfferLine> = {}): ChatOfferLine => ({
  productDocumentId: 'p1',
  productName: 'Produit',
  quantity: 2,
  totalHT: 20,
  ...over,
});

describe('selectionForLine', () => {
  it('produit sans taille ni couleur (oriflamme) : choix DEFAULT, comme la fiche', () => {
    const sel = selectionForLine(product(), line());
    expect(sel).toHaveLength(1);
    expect(sel![0].size.value).toBe('DEFAULT');
    expect(sel![0].color.value).toBe('DEFAULT');
    expect(sel![0].quantity).toBe(2);
  });

  it('taille et couleur précisées par le client : reprises du produit', () => {
    const p = product({ sizes: [opt('s', 'S'), opt('m', 'M')] as never, colors: [opt('b', 'Blanc'), opt('n', 'Noir')] as never });
    const sel = selectionForLine(p, line({ sizeDocumentId: 'm', colorDocumentId: 'b' }));
    expect(sel![0].size.name).toBe('M');
    expect(sel![0].color.name).toBe('Blanc');
  });

  it('une seule taille / couleur possible : choisie automatiquement', () => {
    const p = product({ sizes: [opt('u', 'Unique')] as never, colors: [opt('r', 'Rouge')] as never });
    expect(selectionForLine(p, line())![0].size.name).toBe('Unique');
  });

  it('plusieurs tailles sans précision : au client de répartir (null)', () => {
    const p = product({ sizes: [opt('s', 'S'), opt('m', 'M')] as never });
    expect(selectionForLine(p, line())).toBeNull();
  });

  it('m² : dimensions obligatoires, reprises en mètres', () => {
    const p = product({ pricingMode: 'm2', pricePerM2: 20 } as never);
    expect(selectionForLine(p, line())).toBeNull();
    const sel = selectionForLine(p, line({ width: 2, height: 0.8 }));
    expect(sel![0]).toMatchObject({ width: 2, height: 0.8, quantity: 2 });
  });
});

describe('missingSteps', () => {
  it('rien à faire → ligne prête pour le panier', () => {
    const p = product();
    expect(missingSteps(p, line(), selectionForLine(p, line()))).toEqual([]);
  });

  it('formulaire de personnalisation → étape sur la fiche', () => {
    const p = product({ form: { documentId: 'f' } as never });
    expect(missingSteps(p, line(), selectionForLine(p, line()))).toEqual(['votre personnalisation (logo, texte…)']);
  });

  it('tailles à répartir + couleur connue', () => {
    const p = product({ sizes: [opt('s', 'S'), opt('m', 'M')] as never, colors: [opt('b', 'Blanc'), opt('n', 'Noir')] as never });
    const l = line({ colorDocumentId: 'b' });
    expect(missingSteps(p, l, selectionForLine(p, l))).toEqual(['les tailles']);
  });
});

describe('validation des données reçues', () => {
  it('isChatOffer refuse une offre vide ou malformée', () => {
    expect(isChatOffer({ id: 'o', lines: [line()], totalHT: 1, totalTTC: 1 })).toBe(true);
    expect(isChatOffer({ id: 'o', lines: [] })).toBe(false);
    expect(isChatOffer({ id: 'o', lines: [{ quantity: 1 }] })).toBe(false);
    expect(isChatOffer(null)).toBe(false);
  });

  it('readChatPrefill ignore un state de navigation étranger', () => {
    expect(readChatPrefill(null)).toBeNull();
    expect(readChatPrefill({ from: '/home' })).toBeNull();
    expect(readChatPrefill({ chatOffer: { offerId: 'o', quantity: 3, sizeAndColors: [] } })?.quantity).toBe(3);
  });
});
