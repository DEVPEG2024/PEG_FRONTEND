import { CartItem } from '@/@types/cart';
import { Checkout } from '@/@types/checkout';
import { AdaptableCard } from '@/components/shared';
import { Button } from '@/components/ui';
import { useState } from 'react';
import { loadStripe } from '@stripe/stripe-js';
import { env } from "@/configs/env.config";
import { API_BASE_URL } from '@/configs/api.config';
import { useAppDispatch, useAppSelector } from '@/store';
import { TOKEN_TYPE } from '@/constants/api.constant';
import { FormAnswer } from '@/@types/formAnswer';
import { apiCreateFormAnswer } from '@/services/FormAnswerService';
import { unwrapData } from '@/utils/serviceHelper';
import { apiCreateOrderItem } from '@/services/OrderItemServices';
import { OrderItem } from '@/@types/orderItem';
import { User } from '@/@types/user';
import { removeFromCart } from '@/store/slices/base/cartSlice';

function PaymentContent({
  cart
}: {
  cart: CartItem[]
}) {
  const [isSubmitting, setSubmitting] = useState<boolean>(false);
  const { token } = useAppSelector((state) => state.auth.session)
  const stripePromise = loadStripe(env?.STRIPE_PUBLIC_KEY as string);
  const { user }: { user: User } = useAppSelector((state) => state.auth.user);
  const dispatch = useAppDispatch();

  const createFormAnswer = async (
    item: CartItem
  ): Promise<FormAnswer | null> => {
    if (item.product.form) {
      const { createFormAnswer }: { createFormAnswer: FormAnswer } =
        await unwrapData(apiCreateFormAnswer(item.formAnswer));

      return createFormAnswer;
    }
    return null;
  };

  const createOrderItemAndRemoveFromCart = async(item: CartItem): Promise<OrderItem | undefined> => {
    try {
      const formAnswer: FormAnswer | null = await createFormAnswer(item),
        orderItem: Omit<OrderItem, 'documentId'> = {
          product: item.product,
          sizeAndColorSelections: item.sizeAndColors,
          formAnswer,
          price: item.sizeAndColors.reduce(
            (amount, size) => amount + size.quantity * item.product.price,
            0
          ),
          state: 'pending',
          customer: user.customer!,
        },
        { createOrderItem }: { createOrderItem: OrderItem } =
        await unwrapData(apiCreateOrderItem(orderItem));
      
      dispatch(removeFromCart(item))
      return createOrderItem;
    } catch (error) {
      // TODO: envoyer mail erreur création commande
    }
  }

  const createOrdersAndClearCart = async (): Promise<OrderItem[]> => {
    const promises = await Promise.allSettled(
      cart.map((item) =>
        createOrderItemAndRemoveFromCart(item)
      )
    )
    
    return promises
        .filter((result) => result.status === 'fulfilled')
        .map(
          (result) =>
            (result as PromiseFulfilledResult<OrderItem>).value
        )
  };

  const validateCart = async () => {
    setSubmitting(true);
    const orderItems: OrderItem[] = await createOrdersAndClearCart();
    await validatePayment(orderItems);
    setSubmitting(false);
  };

  const createCheckout = (orderItems: OrderItem[]): Checkout => {
    return {
      orderItemsCheckout: orderItems.map((orderItem: OrderItem) => ({
        documentId: orderItem.documentId,
        productName: orderItem.product.name,
        productPrice: Math.trunc(orderItem.product.price * 100 * 1.2),
        productQuantity: orderItem.sizeAndColorSelections.reduce((total, sizeAndColor) => total + sizeAndColor.quantity, 0),
        totalPrice: orderItem.price
      })),
      totalPrice,
      totalPriceWithVAT,
      customerDocumentId: user.customer!.documentId,
      userFirstName: user.firstName,
      userLastName: user.lastName,
    };
  };

  const validatePayment = async (orderItems: OrderItem[]) : Promise<void> => {
    const response = await fetch(API_BASE_URL + '/stripe/checkout', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `${TOKEN_TYPE}${token}`
      },
      body: JSON.stringify(createCheckout(orderItems)),
    }),
      { id } = await response.json(),
      stripe = await stripePromise;

    if (stripe) {
      await stripe.redirectToCheckout({ sessionId: id });
    }
  };

  const totalPrice: number = cart.reduce((total: number, item: CartItem) => {
    const itemPrice: number = item.sizeAndColors.reduce(
      (amount, sizeAndColor) => amount + sizeAndColor.quantity * Math.trunc(item.product.price * 100) / 100,
      0
    );
    return total + itemPrice;
  }, 0);

  const totalPriceWithVAT: number = cart.reduce((total: number, item: CartItem) => {
    const itemPrice: number = item.sizeAndColors.reduce(
      (amount, sizeAndColor) => amount + sizeAndColor.quantity * Math.trunc(item.product.price * 100 * 1.2) / 100,
      0
    );
    return total + itemPrice;
  }, 0);
  return (
    <div>
      <AdaptableCard bodyClass="p-5">
        <h4 className="mb-6">Détails</h4>
        <div className="flex flex-col gap-2">
          <span className="font-semibold">
            Total HT : {totalPrice.toFixed(2)} €
          </span>
          <span className="font-semibold">
            Tva : {(totalPriceWithVAT - totalPrice).toFixed(2)} €
          </span>
          <span className="font-semibold">
            Total TTC : {totalPriceWithVAT.toFixed(2)} €
          </span>
        </div>
        <hr className="my-6" />
        <div className="flex flex-col gap-2">
          <div className="flex flex-wrap gap-4">
            <Button
              disabled={!user.customer}
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
  );
}

export default PaymentContent;
