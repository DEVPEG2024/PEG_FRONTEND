import { AdaptableCard, Container, Loading } from '@/components/shared';
import Empty from '@/components/shared/Empty';
import { Button } from '@/components/ui';
import { API_URL_IMAGE } from '@/configs/api.config';
import { RootState, useAppDispatch, useAppSelector } from '@/store'
import { editItem, removeFromCart } from '@/store/slices/base/cartSlice';
import { HiPencil, HiTrash } from 'react-icons/hi';
import { MdShoppingCart } from 'react-icons/md';
import { useNavigate } from 'react-router-dom';

function Cart() {
  const cart = useAppSelector((state: RootState) => state.base.cart.cart);
  const dispatch = useAppDispatch();
  const navigate = useNavigate();

  const handleEdit = (productId: string) => {
    dispatch(editItem(productId))
    navigate('/customer/product/' + productId + '/edit')
  }
  if (cart.length === 0) {
    return <Empty icon={<MdShoppingCart size={120} />}>Votre panier est vide</Empty>;
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
              <div className="py-4">
                {cart?.map((item) => (
                  <div key={item.product._id}>
                    <div className="flex justify-between items-center">
                      <div className='flex items-center gap-2'>
                        <img
                          src={API_URL_IMAGE + item.product.images[0]}
                          alt={item.product.title}
                          className="w-20 h-20 object-cover rounded-md"
                        />
                        <p>{item.product.title}</p>
                      </div>
                      <p>{item.product.amount} €</p>
                      <div className='flex-col justify-center gap-2'>
                        {item.sizes.map((size) => (
                          <p>{size.value} : {size.amount}</p>
                        ))}
                      </div>
                      <p>{item.sizes.reduce((amount, size) => amount + size.amount * item.product.amount, 0)} €</p>
                      <p className='flex gap-1'>
                        <Button onClick={() => handleEdit(item.product._id)} size="sm" icon={<HiPencil />} />
                        <Button onClick={() => dispatch(removeFromCart(item.product._id))} size="sm" icon={<HiTrash />} />
                      </p>
                    </div>
                    <hr className="w-full my-4" />
                  </div>
                ))}
              </div>
            </AdaptableCard>
          </div>
          <div>
            <AdaptableCard bodyClass="p-5">
              <h4 className="mb-6">Détails</h4>
              <div className="flex flex-col gap-2">
                <span className="font-semibold">
                  Total HT :{" "}
                  {cart?.reduce((total, item) => total + item.product.amount, 0)} €
                </span>
                <span className="font-semibold">
                  Tva : {cart?.reduce((total, item) => total + item.product.amount, 0)}{" "}
                  €
                </span>
                <span className="font-semibold">
                  Total TTC :{" "}
                  {cart?.reduce((total, item) => total + item.product.amount, 0)} €
                </span>
              </div>
              <hr className="my-6" />
              <div className="flex flex-col gap-2">
                <div className="flex flex-wrap gap-4">
                  <Button variant="solid" className="w-full">
                    Valider le panier
                  </Button>
                </div>
              </div>
            </AdaptableCard>
          </div>
        </div>
      </Loading>
    </Container>
  );
}

export default Cart
