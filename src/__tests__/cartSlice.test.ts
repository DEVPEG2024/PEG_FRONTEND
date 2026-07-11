/**
 * Tests unitaires — reducer panier (cartSlice).
 *
 * Le panier a ete a l'origine d'un bug reel (confirmation de paiement qui
 * echouait a vider le panier -> repli sur clearCart). On verrouille ici le
 * comportement de chaque reducer, testes comme des fonctions pures
 * reducer(state, action).
 */

import reducer, {
  addToCart,
  removeFromCart,
  removeFromCartItemOfOrderItem,
  editSizeAndColorsCartItem,
  editFormAnswerCartItem,
  editOrderItemDocumentIdCartItem,
  clearCart,
  initialState,
  CartState,
} from '@/store/slices/base/cartSlice';
import { CartItem } from '@/@types/cart';

// Fabrique un CartItem minimal (on ne renseigne que les champs manipules).
const makeItem = (id: string, extra: Partial<CartItem> = {}): CartItem =>
  ({
    id,
    userDocumentId: 'user-1',
    sizeAndColors: [],
    formAnswer: { answers: [] },
    product: { name: `p-${id}` },
    ...extra,
  } as unknown as CartItem);

const stateWith = (...items: CartItem[]): CartState => ({ cart: items });

describe('cartSlice — ajout / suppression', () => {
  test('etat initial : panier vide', () => {
    expect(initialState).toEqual({ cart: [] });
  });

  test('addToCart ajoute un article', () => {
    const next = reducer(initialState, addToCart(makeItem('a')));
    expect(next.cart).toHaveLength(1);
    expect(next.cart[0].id).toBe('a');
  });

  test('addToCart n\'altere pas l\'etat d\'origine (immutabilite)', () => {
    const start = stateWith(makeItem('a'));
    const next = reducer(start, addToCart(makeItem('b')));
    expect(start.cart).toHaveLength(1); // inchange
    expect(next.cart).toHaveLength(2);
  });

  test('addToCart empile les articles dans l\'ordre', () => {
    let s = reducer(initialState, addToCart(makeItem('a')));
    s = reducer(s, addToCart(makeItem('b')));
    expect(s.cart.map((i) => i.id)).toEqual(['a', 'b']);
  });

  test('removeFromCart retire l\'article par id', () => {
    const start = stateWith(makeItem('a'), makeItem('b'), makeItem('c'));
    const next = reducer(start, removeFromCart(makeItem('b')));
    expect(next.cart.map((i) => i.id)).toEqual(['a', 'c']);
  });

  test('removeFromCart sur un id absent ne change rien', () => {
    const start = stateWith(makeItem('a'));
    const next = reducer(start, removeFromCart(makeItem('zzz')));
    expect(next.cart.map((i) => i.id)).toEqual(['a']);
  });

  test('removeFromCartItemOfOrderItem retire par orderItemDocumentId', () => {
    const start = stateWith(
      makeItem('a', { orderItemDocumentId: 'oi-1' }),
      makeItem('b', { orderItemDocumentId: 'oi-2' })
    );
    const next = reducer(start, removeFromCartItemOfOrderItem('oi-1'));
    expect(next.cart.map((i) => i.id)).toEqual(['b']);
  });

  test('clearCart vide le panier', () => {
    const start = stateWith(makeItem('a'), makeItem('b'));
    const next = reducer(start, clearCart());
    expect(next.cart).toEqual([]);
  });

  test('clearCart sur un panier deja vide reste vide', () => {
    const next = reducer(initialState, clearCart());
    expect(next.cart).toEqual([]);
  });
});

describe('cartSlice — edition d\'un article', () => {
  test('editSizeAndColorsCartItem met a jour tailles/couleurs du bon article', () => {
    const start = stateWith(makeItem('a'), makeItem('b'));
    const sizeAndColors = [{ quantity: 3 }] as any;
    const next = reducer(
      start,
      editSizeAndColorsCartItem({
        cartItemId: 'b',
        formAnswer: { answers: [] } as any,
        sizeAndColors,
      })
    );
    expect(next.cart[1].sizeAndColors).toBe(sizeAndColors);
    expect(next.cart[0].sizeAndColors).toEqual([]); // 'a' inchange
  });

  test('editFormAnswerCartItem met a jour la reponse de formulaire', () => {
    const start = stateWith(makeItem('a'));
    const formAnswer = { answers: [{ fieldId: 'f1', value: 'x' }] } as any;
    const next = reducer(
      start,
      editFormAnswerCartItem({ cartItemId: 'a', formAnswer })
    );
    expect(next.cart[0].formAnswer).toEqual(formAnswer);
  });

  test('editOrderItemDocumentIdCartItem rattache l\'orderItem', () => {
    const start = stateWith(makeItem('a'));
    const next = reducer(
      start,
      editOrderItemDocumentIdCartItem({
        cartItemId: 'a',
        orderItemDocumentId: 'oi-42',
      })
    );
    expect(next.cart[0].orderItemDocumentId).toBe('oi-42');
  });

  test('editer un cartItemId inexistant ne casse pas l\'etat', () => {
    const start = stateWith(makeItem('a'));
    const next = reducer(
      start,
      editOrderItemDocumentIdCartItem({
        cartItemId: 'absent',
        orderItemDocumentId: 'oi-99',
      })
    );
    expect(next.cart[0].orderItemDocumentId).toBeUndefined();
  });
});
