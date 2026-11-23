/**
 * @jest-environment jsdom
 */
// Store de l'application chargé EN PREMIER : les slices et @/store forment un
// cycle d'imports (même précaution que chatOfferForm.test.tsx).
import '@/store';
import { act } from 'react';
import { createRoot } from 'react-dom/client';
import { Provider } from 'react-redux';
import { configureStore, combineReducers } from '@reduxjs/toolkit';
import auth, { setPriceDisplay } from '@/store/slices/auth';
import { setOwnUser } from '@/store/slices/auth/userSlice';
import {
  customerSeesTTC,
  isAssociationSector,
  priceView,
} from '@/utils/priceDisplay';
import usePriceView from '@/utils/hooks/usePriceView';
import { buildOfferShowcase } from '@/views/app/customer/home/offerShowcase';
import type { Product } from '@/@types/product';
import type { User } from '@/@types/user';

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

describe('règle HT / TTC', () => {
  it('secteur associatif → TTC, accents et casse ignorés', () => {
    expect(isAssociationSector('Secteur associatif et social')).toBe(true);
    expect(isAssociationSector('ASSOCIATION SPORTIVE')).toBe(true);
    expect(isAssociationSector('Clubs et associations')).toBe(true);
    expect(isAssociationSector('Industrie')).toBe(false);
    expect(isAssociationSector('Transport et logistique')).toBe(false);
    expect(isAssociationSector('')).toBe(false);
    expect(isAssociationSector(null)).toBe(false);
  });

  it("le réglage de l'admin l'emporte sur le secteur", () => {
    expect(customerSeesTTC('ttc', 'Industrie')).toBe(true);
    expect(customerSeesTTC('ht', 'Secteur associatif et social')).toBe(false);
    expect(customerSeesTTC(null, 'Secteur associatif et social')).toBe(true);
    expect(customerSeesTTC(undefined, 'Industrie')).toBe(false);
    expect(customerSeesTTC(null, null)).toBe(false);
  });

  it('affichage : HT tel quel, TTC = HT × 1,2 arrondi au centime', () => {
    const nbsp = (s: string) => s.replace(/\s/g, ' ');
    expect(nbsp(priceView(false).fmt(8.5))).toBe('8,50 € HT');
    expect(priceView(false).amount(8.5)).toBe(8.5);
    expect(nbsp(priceView(true).fmt(8.5))).toBe('10,20 € TTC');
    expect(priceView(true).amount(9.9)).toBe(11.88);
    expect(priceView(true).label).toBe('TTC');
  });
});

describe('offres à la une', () => {
  const product = {
    documentId: 'p1',
    name: 'Maillot',
    pricingMode: 'tiers',
    priceTiers: [
      { minQuantity: 1, price: 20 },
      { minQuantity: 50, price: 15 },
    ],
    images: [],
  } as unknown as Product;

  it('HT par défaut, TTC pour un compte association', () => {
    const [ht] = buildOfferShowcase([product], null);
    expect(ht.unit).toBe("HT l'unité");
    expect(ht.price.replace(/\s/g, ' ')).toBe('20,00 €');
    expect(ht.steps.map((s) => s.price.replace(/\s/g, ' '))).toEqual(['20,00 €', '15,00 €']);

    const [ttc] = buildOfferShowcase([product], null, new Date(), priceView(true));
    expect(ttc.unit).toBe("TTC l'unité");
    expect(ttc.price.replace(/\s/g, ' ')).toBe('24,00 €');
    expect(ttc.steps.map((s) => s.price.replace(/\s/g, ' '))).toEqual(['24,00 €', '18,00 €']);
  });
});

describe('usePriceView', () => {
  const makeStore = () => configureStore({ reducer: combineReducers({ auth }) });
  const customerUser = (documentId: string) =>
    ({ id: 1, documentId: 'u1', authority: ['customer'], customer: { documentId } } as unknown as User);

  const read = (store: ReturnType<typeof makeStore>) => {
    let seen: boolean | null = null;
    const Probe = () => {
      seen = usePriceView().ttc;
      return null;
    };
    const div = document.createElement('div');
    const root = createRoot(div);
    act(() => root.render(<Provider store={store}><Probe /></Provider>));
    act(() => root.unmount());
    return seen;
  };

  it('TTC seulement pour le client résolu, jamais hérité par un autre compte', () => {
    const store = makeStore();
    store.dispatch(setOwnUser(customerUser('c1')));
    expect(read(store)).toBe(false);

    store.dispatch(setPriceDisplay({ customerDocumentId: 'c1', ttc: true }));
    expect(read(store)).toBe(true);

    // Un autre client ouvre une session dans le même onglet
    store.dispatch(setOwnUser(customerUser('c2')));
    expect(read(store)).toBe(false);
  });
});
