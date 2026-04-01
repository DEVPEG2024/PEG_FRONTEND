import { CartItem } from '@/@types/cart';
import {
  getProductPriceForSizeAndColors,
  getTotalPriceForCartItem,
} from '@/utils/productHelpers';
import { Checkout, ShippingAddress } from '@/@types/checkout';
import { useState } from 'react';
import { loadStripe } from '@stripe/stripe-js';
import { env } from '@/configs/env.config';
import { API_BASE_URL } from '@/configs/api.config';
import { useAppDispatch, useAppSelector } from '@/store';
import { TOKEN_TYPE } from '@/constants/api.constant';
import { FormAnswer } from '@/@types/formAnswer';
import { apiCreateFormAnswer } from '@/services/FormAnswerService';
import { unwrapData } from '@/utils/serviceHelper';
import { TVA_RATE } from '@/utils/priceHelpers';
import { apiCreateOrderItem } from '@/services/OrderItemServices';
import { OrderItem } from '@/@types/orderItem';
import { User } from '@/@types/user';
import {
  editOrderItemDocumentIdCartItem,
  removeFromCartItemOfOrderItem,
} from '@/store/slices/base/cartSlice';
import { useNavigate } from 'react-router-dom';

function PaymentContent({ cart, shipping }: { cart: CartItem[]; shipping: ShippingAddress }) {
  const [isSubmitting, setSubmitting] = useState<boolean>(false);
  const { token } = useAppSelector((state) => state.auth.session);
  const stripePromise = loadStripe(env?.STRIPE_PUBLIC_KEY as string);
  const { user }: { user: User } = useAppSelector((state) => state.auth.user);
  const dispatch = useAppDispatch();
  const navigate = useNavigate();

  const SHIPPING_HT = 9.90;

  const subtotalHT: number = cart.reduce((total: number, item: CartItem) => {
    return total + getTotalPriceForCartItem(item.product, item.sizeAndColors);
  }, 0);

  const totalPrice: number = Math.round((subtotalHT + SHIPPING_HT) * 100) / 100;
  const totalPriceWithVAT: number = Math.round(totalPrice * (1 + TVA_RATE) * 100) / 100;
  const tva = Math.round((totalPriceWithVAT - totalPrice) * 100) / 100;

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

  const createOrderItem = async (
    item: CartItem
  ): Promise<OrderItem | undefined> => {
    try {
      const formAnswer: FormAnswer | null = await createFormAnswer(item),
        orderItem: Omit<OrderItem, 'documentId'> = {
          product: item.product,
          sizeAndColorSelections: item.sizeAndColors,
          formAnswer,
          price: getTotalPriceForCartItem(item.product, item.sizeAndColors),
          state: 'pending',
          customer: user.customer!,
        },
        { createOrderItem: orderItemCreated }: { createOrderItem: OrderItem } =
          await unwrapData(apiCreateOrderItem(orderItem));

      return orderItemCreated;
    } catch (error) {}
  };

  const createOrdersAndUpdateCartItems = async (): Promise<OrderItem[]> => {
    const promises = await Promise.allSettled(
      cart.map(async (item) => {
        const orderItemCreated: OrderItem | undefined =
          await createOrderItem(item);

        if (orderItemCreated) {
          dispatch(
            editOrderItemDocumentIdCartItem({
              cartItemId: item.id,
              orderItemDocumentId: orderItemCreated.documentId,
            })
          );
        }

        return orderItemCreated;
      })
    );

    return promises
      .filter((result) => result.status === 'fulfilled')
      .map((result) => (result as PromiseFulfilledResult<OrderItem>).value);
  };

  const validateCart = async () => {
    setSubmitting(true);
    const orderItems: OrderItem[] = await createOrdersAndUpdateCartItems();
    await validatePayment(orderItems);
    setSubmitting(false);
  };

  const createCheckout = (orderItems: OrderItem[]): Checkout => {
    return {
      orderItemsCheckout: orderItems.map((orderItem: OrderItem) => ({
        documentId: orderItem.documentId,
        productName: orderItem.product.name,
        productPrice: Math.trunc(getProductPriceForSizeAndColors(orderItem.product, orderItem.sizeAndColorSelections) * 100 * (1 + TVA_RATE)),
        productQuantity: orderItem.sizeAndColorSelections.reduce(
          (total, sizeAndColor) => total + sizeAndColor.quantity,
          0
        ),
        totalPrice: orderItem.price,
      })),
      totalPrice,
      totalPriceWithVAT,
      customerDocumentId: user.customer!.documentId,
      userFirstName: user.firstName,
      userLastName: user.lastName,
      userEmail: user.email,
      shippingAddress: shipping,
    };
  };

  const validatePayment = async (orderItems: OrderItem[]): Promise<void> => {
    if (user.customer!.deferredPayment) {
      await createProjectAndDeferredInvoice(orderItems);
    } else {
      await redirectToStripeCheckout(orderItems);
    }
  };

  const createProjectAndDeferredInvoice = async (
    orderItems: OrderItem[]
  ): Promise<void> => {
    await fetch(API_BASE_URL + '/checkout/deferred', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `${TOKEN_TYPE}${token}`,
      },
      body: JSON.stringify(createCheckout(orderItems)),
    });

    orderItems.map((orderItem: OrderItem) =>
      dispatch(removeFromCartItemOfOrderItem(orderItem.documentId))
    );
    navigate('/common/projects');
  };

  const redirectToStripeCheckout = async (
    orderItems: OrderItem[]
  ): Promise<void> => {
    const response = await fetch(API_BASE_URL + '/checkout/stripe', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `${TOKEN_TYPE}${token}`,
        },
        body: JSON.stringify(createCheckout(orderItems)),
      }),
      { id }: { id: string } = await response.json(),
      stripe = await stripePromise;

    if (stripe) {
      await stripe.redirectToCheckout({ sessionId: id });
    }
  };

  return (
    <div style={{
      background: 'linear-gradient(160deg, #16263d 0%, #0f1c2e 100%)',
      border: '1.5px solid rgba(255,255,255,0.07)',
      borderRadius: '16px', padding: '20px',
      fontFamily: 'Inter, sans-serif',
    }}>
      <h4 style={{ color: '#fff', fontWeight: 700, fontSize: '15px', margin: '0 0 20px 0' }}>
        Récapitulatif
      </h4>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '16px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
          <span style={{ color: 'rgba(255,255,255,0.45)', fontSize: '13px' }}>Sous-total HT</span>
          <span style={{ color: '#fff', fontWeight: 600, fontSize: '13px' }}>{subtotalHT.toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €</span>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
          <span style={{ color: 'rgba(255,255,255,0.45)', fontSize: '13px' }}>Livraison HT</span>
          <span style={{ color: '#fff', fontWeight: 600, fontSize: '13px' }}>{SHIPPING_HT.toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €</span>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
          <span style={{ color: 'rgba(255,255,255,0.45)', fontSize: '13px' }}>TVA (20%)</span>
          <span style={{ color: 'rgba(255,255,255,0.6)', fontSize: '13px' }}>{tva.toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €</span>
        </div>
      </div>

      <div style={{ height: '1px', background: 'rgba(255,255,255,0.07)', margin: '16px 0' }} />

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
        <span style={{ color: '#fff', fontWeight: 700, fontSize: '15px' }}>Total TTC</span>
        <span style={{ color: '#6b9eff', fontWeight: 800, fontSize: '18px' }}>
          {totalPriceWithVAT.toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €
        </span>
      </div>

      <button
        disabled={!user.customer || isSubmitting}
        onClick={validateCart}
        style={{
          width: '100%', padding: '12px',
          background: !user.customer || isSubmitting ? 'rgba(47,111,237,0.3)' : 'linear-gradient(90deg, #2f6fed, #1f4bb6)',
          border: 'none', borderRadius: '10px',
          color: '#fff', fontSize: '14px', fontWeight: 700,
          cursor: !user.customer || isSubmitting ? 'not-allowed' : 'pointer',
          boxShadow: isSubmitting ? 'none' : '0 4px 16px rgba(47,111,237,0.4)',
          fontFamily: 'Inter, sans-serif',
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
        }}
      >
        🔒 {isSubmitting ? 'Traitement…' : 'Valider la commande'}
      </button>

      <p style={{ color: 'rgba(255,255,255,0.2)', fontSize: '11px', textAlign: 'center', marginTop: '10px' }}>
        Paiement sécurisé
      </p>
    </div>
  );
}

export default PaymentContent;
