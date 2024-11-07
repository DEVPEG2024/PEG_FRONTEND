import { CartItem } from '@/@types/cart';
import { AdaptableCard, Container, Loading } from '@/components/shared';
import Empty from '@/components/shared/Empty';
import { Button } from '@/components/ui';
import { RootState, useAppDispatch, useAppSelector } from '@/store';
import {
  editItem,
  removeFromCart,
  clearCart,
} from '@/store/slices/base/cartSlice';
import { HiPencil, HiTrash } from 'react-icons/hi';
import { MdShoppingCart } from 'react-icons/md';
import { useNavigate } from 'react-router-dom';
import dayjs from 'dayjs';
import { apiCreateOrder } from '@/services/OrderServices';
import { apiCreateFormAnswer } from '@/services/FormAnswerService';
import { useState } from 'react';
import { apiCreateProject } from '@/services/ProjectServices';
import { IFormAnswer } from '@/@types/formAnswer';

function Cart() {
  const user = useAppSelector((state) => state.auth.user);
  const cart = useAppSelector((state: RootState) => state.base.cart.cart);
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const [isSubmitting, setSubmitting] = useState<boolean>(false);

  const handleEdit = (item: CartItem) => {
    dispatch(editItem(item));
    navigate('/customer/product/' + item.product._id + '/edit');
  };

  const validatePayment = async () => {
    return true;
  };

  const createFormAnswer = async (
    item: CartItem
  ): Promise<IFormAnswer | null> => {
    if (item.product.form) {
      const respFormAnswerCreation = await apiCreateFormAnswer({
        customer: user._id,
        product: item.product._id,
        answers: item.formAnswer.answers,
        form: item.formAnswer.form,
      });

      return respFormAnswerCreation.data.formAnswer;
    }
    return null;
  };

  const createOrder = async (item: CartItem) => {
    try {
      const formAnswer: IFormAnswer | null = await createFormAnswer(item),
        order = {
          customer: user,
          product: item.product,
          orderNumber: 0,
          sizes: item.sizes,
          total: item.sizes.reduce(
            (amount, size) => amount + size.quantity * item.product.amount,
            0
          ),
        };

      if (formAnswer) {
        (order as any).formAnswer = formAnswer;
      }
      const respOrderCreation = await apiCreateOrder(order);
      // TODO : envoyer mail création commande OK
      try {
        await apiCreateProject({
          title:
            'Commande ' +
            item.product.title +
            ' pour ' +
            user.firstName +
            ' ' +
            user.lastName,
          ref:
            item.product.title +
            '_' +
            user.firstName +
            '_' +
            user.lastName +
            '_' +
            new Date().toISOString().slice(0, 10),
          description: '',
          priority: 'low',
          status: 'pending',
          amount: item.product.amount,
          amountProducers: 0,
          customer: user._id,
          order: respOrderCreation.data.order,
          startDate: dayjs().toDate(),
          endDate: dayjs().add(30, 'day').toDate(),
        });
      } catch (error) {
        // TODO: envoyer mail erreur création projet
      }
      return respOrderCreation.data;
    } catch (error) {
      // TODO: envoyer mail erreur création commande
    }
  };

  const createOrders = async () => {
    try {
      await Promise.allSettled(cart.map((item) => createOrder(item)));
      return { status: 'success' };
    } catch (errors: any) {
      return {
        status: 'failed',
        message: errors?.response?.data?.message || errors.toString(),
      };
    }
  };

  const createOrderAndClearCart = async () => {
    const respOrdersCreation = await createOrders();
    if (respOrdersCreation.status === 'success') {
      dispatch(clearCart());
      navigate('/customer/projects');
    }
  };

  const validateCart = async () => {
    setSubmitting(true);
    const paymentValidated = await validatePayment();
    if (paymentValidated) {
      await createOrderAndClearCart();
    }
    setSubmitting(false);
  };

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
              <div className="py-4">
                {cart?.map((item) => (
                  <div key={item.id}>
                    <div className="flex justify-between items-center">
                      <div className="flex items-center gap-2">
                        <img
                          src={item.product.images[0]?.fileNameBack}
                          alt={item.product.title}
                          className="w-20 h-20 object-cover rounded-md"
                        />
                        <p>{item.product.title}</p>
                      </div>
                      <p>{item.product.amount} €</p>
                      <div className="flex-col justify-center gap-2">
                        {item.sizes.map((size) => (
                          <p>
                            {size.value === 'DEFAULT' ? 'Quantité' : size.value}{' '}
                            : {size.quantity}
                          </p>
                        ))}
                      </div>
                      <p>
                        {item.sizes.reduce(
                          (amount, size) =>
                            amount + size.quantity * item.product.amount,
                          0
                        )}{' '}
                        €
                      </p>
                      <p className="flex gap-1">
                        <Button
                          onClick={() => handleEdit(item)}
                          size="sm"
                          icon={<HiPencil />}
                        />
                        <Button
                          onClick={() => dispatch(removeFromCart(item))}
                          size="sm"
                          icon={<HiTrash />}
                        />
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
                  Total HT :{' '}
                  {cart?.reduce(
                    (total, item) => total + item.product.amount,
                    0
                  )}{' '}
                  €
                </span>
                <span className="font-semibold">
                  Tva :{' '}
                  {cart?.reduce(
                    (total, item) => total + item.product.amount,
                    0
                  )}{' '}
                  €
                </span>
                <span className="font-semibold">
                  Total TTC :{' '}
                  {cart?.reduce(
                    (total, item) => total + item.product.amount,
                    0
                  )}{' '}
                  €
                </span>
              </div>
              <hr className="my-6" />
              <div className="flex flex-col gap-2">
                <div className="flex flex-wrap gap-4">
                  <Button
                    variant="solid"
                    className="w-full"
                    onClick={validateCart}
                    loading={isSubmitting}
                  >
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

export default Cart;
