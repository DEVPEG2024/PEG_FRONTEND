import { useSelector } from 'react-redux';
import type { RootState } from '@/store';
import { CartItem } from '@/@types/cart';

const useUserCart = (userDocumentId: string) : CartItem[] => {
  const cart = useSelector((state: RootState) => state.base.cart.cart);

  return cart.filter((cartItem: CartItem) => cartItem.userDocumentId === userDocumentId)
};

export default useUserCart;