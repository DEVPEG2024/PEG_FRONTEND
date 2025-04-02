import { CartItem } from '@/@types/cart';
import { AdaptableCard, Container, DataTable, Loading } from '@/components/shared';
import Empty from '@/components/shared/Empty';
import { RootState, useAppDispatch, useAppSelector } from '@/store';
import {
  editItem,
  removeFromCart,
} from '@/store/slices/base/cartSlice';
import { MdShoppingCart } from 'react-icons/md';
import { useNavigate } from 'react-router-dom';
import PaymentContent from './PaymentContent';
import { useColumns } from './CartColumns';


function Cart() {
  const cart = useAppSelector((state: RootState) => state.base.cart.cart);
  const dispatch = useAppDispatch();
  const navigate = useNavigate();

  const handleEdit = (item: CartItem) => {
    dispatch(editItem(item));
    navigate('/customer/product/' + item.product.documentId + '/edit');
  };

  const handleDelete = (item: CartItem) => {
    dispatch(removeFromCart(item));
  }

  const columns = useColumns(
      handleEdit,
      handleDelete
    );

  if (cart.length === 0) {
    return (
      <Empty icon={<MdShoppingCart size={120} />}>Votre panier est vide</Empty>
    );
  }
  return (
    <Container className="h-full">
      <Loading>
        <div className="grid md:grid-cols-1 lg:grid-cols-4 gap-4">
          <div className="lg:col-span-3">
            <AdaptableCard rightSideBorder bodyClass="p-5">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                  <h3 className="mb-2 font-bold">Panier</h3>
                  <p>
                    <span className="font-semibold text-gray-900 dark:text-gray-100 mx-1 cursor-pointer">
                      Total : {cart?.length}
                    </span>
                  </p>
                </div>
              </div>
              <hr className="my-4" />
              <DataTable
                columns={columns}
                data={cart}
              />
              
            </AdaptableCard>
          </div>
          <PaymentContent
            cart={cart}
          />
        </div>
      </Loading>
    </Container>
  );
}

export default Cart;
